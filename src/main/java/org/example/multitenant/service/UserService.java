package org.example.multitenant.service;

import org.example.multitenant.config.TokenProperties;
import org.example.multitenant.dto.Request.UserRequest;
import org.example.multitenant.dto.Response.MeResponse;
import org.example.multitenant.dto.Response.UserPermissionResponse;
import org.example.multitenant.dto.Response.UserResponse;
import org.example.multitenant.entity.RoleEntity;
import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.entity.UserRoleEntity;
import org.example.multitenant.enums.TenantType;
import org.example.multitenant.exception.BadRequestException;
import org.example.multitenant.exception.ConflictException;
import org.example.multitenant.exception.ResourceNotFoundException;
import org.example.multitenant.repository.RoleRepo;
import org.example.multitenant.repository.UserRepo;
import org.example.multitenant.repository.UserRoleRepo;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.DutyChecker;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class UserService {

    private final UserRepo userRepo;
    private final EffectivePermissionService effectivePermissionService;
    private final RoleRepo roleRepo;
    private final UserRoleRepo userRoleRepo;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final TokenProperties tokenProperties;
    private final DutyChecker dutyChecker;


    public UserService(UserRepo userRepo, EffectivePermissionService effectivePermissionService, RoleRepo roleRepo, UserRoleRepo userRoleRepo, AuditService auditService, PasswordEncoder passwordEncoder, TokenProperties tokenProperties, DutyChecker dutyChecker) {
        this.userRepo = userRepo;
        this.effectivePermissionService = effectivePermissionService;
        this.roleRepo = roleRepo;
        this.userRoleRepo = userRoleRepo;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
        this.tokenProperties = tokenProperties;
        this.dutyChecker = dutyChecker;
    }

    private UserEntity loadActor(AuthenticatedUser actor) {
        UserEntity actorEntity = userRepo.findById(actor.userId())
                .orElseThrow(() -> new IllegalStateException("Authenticated user " + actor.userId() + " no longer exists"));
        if (!Objects.equals(actorEntity.getTenant().getId(), actor.tenantId())) {
            throw new AccessDeniedException("Access Denied");
        }
        return actorEntity;
    }

    @Transactional
    @PreAuthorize("@dutyChecker.has('user:create')")
    public UserResponse createUser(UserRequest request , AuthenticatedUser user) {
        UserEntity actorEntity = loadActor(user);
        List<RoleEntity> roles = new ArrayList<>();
        TenantEntity tenant = actorEntity.getTenant();
        if (!Objects.equals(tenant.getId(), user.tenantId())){
            throw new AccessDeniedException("Access Denied");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        boolean emailExists = userRepo.existsByEmail(email);
        if (emailExists) {
            throw new ConflictException("Email already exists");
        }
        if (!request.roleIds().isEmpty()){
            if (!dutyChecker.has("role:assign")){
                throw new AccessDeniedException("Access Denied");
            }
            for (Long roleId : request.roleIds()) {
                 RoleEntity role = roleRepo.findByIdAndTenant(roleId, tenant)
                         .orElseThrow(() -> new ResourceNotFoundException("Role Not Found"));
                 if (!role.isActive()) {
                     throw new BadRequestException("Role Not Active");
                 }
                 roles.add(role);
            }
        }
        UserEntity userEntity = new UserEntity();
        userEntity.setEmail(email);
        userEntity.setTenant(tenant);
        userEntity.setEnabled(true);
        userEntity.setTemporaryPassword(true);
        userEntity.setPasswordHash(passwordEncoder.encode(request.temporaryPassword()));
        userEntity.setTempPassExpiryAt(Instant.now().plus(tokenProperties.temporaryPasswordTtl()));
        UserEntity savedUser;
        try {
            savedUser = userRepo.saveAndFlush(userEntity);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Email already exists");
        }
        String userId = String.valueOf(savedUser.getId());
        auditService.audit(tenant, actorEntity, "USER_CREATED", "USER", userId,
                Map.of("email", email, "roleIds", request.roleIds()));

        Set<String> roleNames = new TreeSet<>();
        for (RoleEntity role : roles) {
            userRoleRepo.save(new UserRoleEntity(savedUser, role, actorEntity));
            auditService.audit(tenant, actorEntity, "ROLE_ASSIGNED", "USER", userId,
                    Map.of("roleId", role.getId(), "roleName", role.getName()));
            roleNames.add(role.getName());
        }

        return new UserResponse(savedUser.getId(), savedUser.getEmail(), tenant.getId(), savedUser.isEnabled(),
                savedUser.isTemporaryPassword(), savedUser.getTempPassExpiryAt(), roleNames, savedUser.getCreatedAt());
    }



    @PreAuthorize("@dutyChecker.has('user:read')")
    @Transactional(readOnly = true)
    public UserPermissionResponse getUserPermissions(Long id , AuthenticatedUser user) {
        TenantEntity tenant = loadActor(user).getTenant();
        UserEntity target = userRepo.findByIdAndTenant(id, tenant)
                .orElseThrow(() -> new ResourceNotFoundException("User Not Found"));

        Set<String> roleNames = new TreeSet<>();
        for (UserRoleEntity userRole : userRoleRepo.findAllByUser(target)) {
            RoleEntity role = userRole.getRole();
            if (role.isActive()) {
                roleNames.add(role.getName());
            }
        }

        Set<String> duties = new TreeSet<>(effectivePermissionService.userDutyCodes(target.getId()));
        Set<String> platformDuties = tenant.getType() == TenantType.PLATFORM
                ? new TreeSet<>(effectivePermissionService.platformDutyCodes(target.getId()))
                : Set.of();

        return new UserPermissionResponse(target.getId(), target.getEmail(), roleNames, duties, platformDuties);
    }

    @Transactional(readOnly = true)
    public MeResponse getProfile(Long userId) {
        UserEntity user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user " + userId + " no longer exists"));
        TenantEntity tenant = user.getTenant();

        Set<String> duties = effectivePermissionService.userDutyCodes(userId);
        Set<String> platformDuties = tenant.getType() == TenantType.PLATFORM
                ? effectivePermissionService.platformDutyCodes(userId)
                : Set.of();

        return new MeResponse(user.getId(), user.getEmail(), tenant.getId(), tenant.getType(), tenant.getSlug(),
                duties, platformDuties);
    }
}
