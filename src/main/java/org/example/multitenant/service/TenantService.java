package org.example.multitenant.service;


import org.example.multitenant.config.TokenProperties;
import org.example.multitenant.dto.Request.CreateTenantRequest;
import org.example.multitenant.dto.Response.TenantResponse;
import org.example.multitenant.entity.PermissionEntity;
import org.example.multitenant.entity.RoleEntity;
import org.example.multitenant.entity.RolePermissionEntity;
import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.entity.UserRoleEntity;
import org.example.multitenant.enums.PermissionScope;
import org.example.multitenant.enums.TenantStatus;
import org.example.multitenant.enums.TenantType;
import org.example.multitenant.exception.ConflictException;
import org.example.multitenant.repository.*;
import org.example.multitenant.security.AuthenticatedUser;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.time.Instant;
import java.util.*;

import static org.example.multitenant.service.StandardDuties.ADMIN_DUTIES;


@Service
public class TenantService {

    private final TenantRepo tenantRepo;
    private final PermissionRepo permissionRepo;
    private final RoleRepo roleRepo;
    private final RolePermissionRepo rolePermissionRepo;
    private final UserRepo userRepo;
    private final UserRoleRepo userRoleRepo;
    private final PasswordEncoder passwordEncoder;
    private final TokenProperties tokenProperties;
    private final AuditService auditService;
    private final ActorService actorService;

    public TenantService(TenantRepo tenantRepo, PermissionRepo permissionRepo, RoleRepo roleRepo, RolePermissionRepo rolePermissionRepo, UserRepo userRepo, UserRoleRepo userRoleRepo, PasswordEncoder passwordEncoder, TokenProperties tokenProperties, AuditService auditService, ActorService actorService) {
        this.tenantRepo = tenantRepo;
        this.permissionRepo = permissionRepo;
        this.roleRepo = roleRepo;
        this.rolePermissionRepo = rolePermissionRepo;
        this.userRepo = userRepo;
        this.userRoleRepo = userRoleRepo;
        this.passwordEncoder = passwordEncoder;
        this.tokenProperties = tokenProperties;
        this.auditService = auditService;
        this.actorService = actorService;
    }

    @PreAuthorize("@dutyChecker.hasPlatform('tenant:create')")
    @Transactional
    public TenantResponse createTenant(CreateTenantRequest request, AuthenticatedUser authenticatedUser)  {
        UserEntity actorEntity = actorService.load(authenticatedUser);
        String slug = request.slug().trim().toLowerCase(Locale.ROOT);
        String email =request.adminEmail().trim().toLowerCase(Locale.ROOT);
        boolean tenant = tenantRepo.existsBySlug(slug);
        if (tenant){
            throw new ConflictException("Tenant already exists");
        }
        boolean emailExists = userRepo.existsByEmail(email);
        if (emailExists){
            throw
                    new ConflictException("Email already exists");
        }
        TenantEntity tenant1 = new TenantEntity();
        tenant1.setName(request.name());
        tenant1.setSlug(slug);
        tenant1.setType(TenantType.ORGANISATION);
        tenant1.setStatus(TenantStatus.ACTIVE);
        TenantEntity savedTenant;

        try {
            savedTenant = tenantRepo.saveAndFlush(tenant1);
        }catch (DataIntegrityViolationException e){
            throw new ConflictException("Tenant already exists");
        }
        List<PermissionEntity> duties = new ArrayList<>();
        for (StandardDuties.DutySeed seed : ADMIN_DUTIES){
            PermissionEntity permissionEntity = new PermissionEntity();
            permissionEntity.setTenant(savedTenant);
            permissionEntity.setSystem(true);
            permissionEntity.setCode(seed.code());
            permissionEntity.setDescription(seed.description());
            permissionEntity.setActive(true);
            permissionEntity.setScope(PermissionScope.TENANT);
            duties.add(permissionEntity);
        }
        List<PermissionEntity> savedDuties = permissionRepo.saveAll(duties);

        RoleEntity roleEntity = new RoleEntity();
        roleEntity.setTenant(savedTenant);
        roleEntity.setName("ADMIN");
        roleEntity.setDescription("Tenant administrator");
        roleEntity.setSystem(true);
        roleEntity.setActive(true);
        RoleEntity savedRole = roleRepo.save(roleEntity);
        List<RolePermissionEntity> links = new ArrayList<>();
        for (PermissionEntity duty : savedDuties) {
            links.add(new RolePermissionEntity(savedRole, duty, actorEntity));
        }
        rolePermissionRepo.saveAll(links);

        UserEntity admin = new UserEntity();
        admin.setTenant(savedTenant);
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(request.temporaryPassword()));
        admin.setEnabled(true);
        admin.setTemporaryPassword(true);
        admin.setTempPassExpiryAt(Instant.now().plus(tokenProperties.temporaryPasswordTtl()));
        UserEntity savedAdmin;
        try {
            savedAdmin = userRepo.saveAndFlush(admin);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Email already exists");
        }


        userRoleRepo.save(new UserRoleEntity(savedAdmin, savedRole, actorEntity));

        String tenantId = String.valueOf(savedTenant.getId());
        String adminId = String.valueOf(savedAdmin.getId());
        auditService.audit(actorEntity.getTenant(), actorEntity, "TENANT_CREATED", "TENANT", tenantId,
                Map.of("slug", slug, "adminEmail", email));
        auditService.audit(savedTenant, actorEntity, "USER_CREATED", "USER", adminId,
                Map.of("email", email, "roleIds", List.of(savedRole.getId())));
        auditService.audit(savedTenant, actorEntity, "ROLE_ASSIGNED", "USER", adminId,
                Map.of("roleId", savedRole.getId(), "roleName", savedRole.getName()));

        return new TenantResponse(savedTenant.getId(), savedTenant.getName(), savedTenant.getSlug(),
                savedTenant.getType(), savedTenant.getStatus(), savedAdmin.getId(), savedAdmin.getEmail(),
                savedTenant.getCreatedAt());
    }


    @PreAuthorize("@dutyChecker.hasPlatform('tenant:suspend')")
    public void suspendTenant(){
    }
}
