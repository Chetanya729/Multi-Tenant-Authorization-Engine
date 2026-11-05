package org.example.multitenant.service;

import org.example.multitenant.dto.Request.RoleRequest;
import org.example.multitenant.dto.Response.RoleResponse;
import org.example.multitenant.entity.PermissionEntity;
import org.example.multitenant.entity.RoleEntity;
import org.example.multitenant.entity.RolePermissionEntity;
import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.exception.BadRequestException;
import org.example.multitenant.exception.ConflictException;
import org.example.multitenant.exception.ResourceNotFoundException;
import org.example.multitenant.repository.PermissionRepo;
import org.example.multitenant.repository.RolePermissionRepo;
import org.example.multitenant.repository.RoleRepo;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.DutyChecker;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

@Service
public class RoleService {

    private static final String RESERVED_NAME = "PLATFORM_ADMIN";

    private final RoleRepo roleRepo;
    private final ActorService actorService;
    private final RolePermissionRepo rolePermissionRepo;
    private final AuditService auditService;
    private final PermissionRepo permissionRepo;
    private final DutyChecker dutyChecker;

    public RoleService(RoleRepo roleRepo, ActorService actorService, RolePermissionRepo rolePermissionRepo, AuditService auditService, PermissionRepo permissionRepo, DutyChecker dutyChecker) {
        this.roleRepo = roleRepo;
        this.actorService = actorService;
        this.rolePermissionRepo = rolePermissionRepo;
        this.auditService = auditService;
        this.permissionRepo = permissionRepo;
        this.dutyChecker = dutyChecker;
    }

    @PreAuthorize("@dutyChecker.has('role:create')")
    @Transactional
    public RoleResponse createRole(RoleRequest request, AuthenticatedUser actor){
        UserEntity actorEntity = actorService.load(actor);
        TenantEntity tenant = actorEntity.getTenant();

        String name = request.name();
        if (RESERVED_NAME.equals(name)) {
            throw new BadRequestException("Role name is reserved");
        }
        if (roleRepo.existsByTenantAndName(tenant, name)) {
            throw new ConflictException("Role already exists");
        }

        RoleEntity role = new RoleEntity();
        role.setTenant(tenant);
        role.setName(name);
        role.setDescription(request.description());
        role.setSystem(false);
        role.setActive(true);

        RoleEntity savedRole;
        try {
            savedRole = roleRepo.saveAndFlush(role);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Role already exists");
        }
        auditService.audit(tenant, actorEntity, "ROLE_CREATED", "ROLE", String.valueOf(savedRole.getId()),
                Map.of("name", name));

        return toResponse(savedRole, Set.of());
    }

    @PreAuthorize("@dutyChecker.has('role:read')")
    @Transactional(readOnly = true)
    public List<RoleResponse> listRoles(AuthenticatedUser actor) {
        TenantEntity tenant = actorService.load(actor).getTenant();
        return roleRepo.findAllByTenant(tenant).stream()
                .sorted(Comparator.comparing(RoleEntity::getName))
                .map(role -> toResponse(role, activeDutyCodes(role)))
                .toList();
    }

    @PreAuthorize("@dutyChecker.has('permission:assign')")
    public RoleResponse grandDuty(Long roleId, Long permissionId, AuthenticatedUser actor) {
        UserEntity actorEntity = actorService.load(actor);
        TenantEntity tenant = actorEntity.getTenant();
        if (roleRepo.findByIdAndTenant(roleId, tenant).isEmpty()) {
            throw new ResourceNotFoundException("Role not found");
        }
        if (permissionRepo.findByIdAndTenant(permissionId, tenant).isEmpty()) {
            throw new ResourceNotFoundException("Permission not found");
        }
        RoleEntity role = roleRepo.findById(roleId).orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        if (role.isSystem()){
            throw new BadRequestException("System roles cannot be changed");
        }
        PermissionEntity permission = permissionRepo.findById(permissionId).orElseThrow(() -> new ResourceNotFoundException("Permission not found"));
        if (!role.isActive() || !permission.isActive()){
            throw new BadRequestException("Role or permission is inactive");
        }
        if (permission.isSystem() && !dutyChecker.has(permission.getCode())){
            throw new AccessDeniedException("Access Denied");
        }
        if (rolePermissionRepo.existsByRoleAndPermission(role, permission)){
            throw new BadRequestException("Permission already exists to the role");
        }
        RolePermissionEntity rolePermissionEntity = new RolePermissionEntity();
        rolePermissionEntity.setRole(role);
        rolePermissionEntity.setPermission(permission);
        RolePermissionEntity saved;
        try {
            saved = rolePermissionRepo.saveAndFlush(rolePermissionEntity);
        }catch (DataIntegrityViolationException e) {
            throw  new ConflictException("Permission already exists");
        }
        auditService.audit(tenant,actorEntity,"ROLE_PERMISSION_ASSIGNED","ROLE",String.valueOf(roleId),Map.of("roleName",role.getName(),"code", permission.getCode()));

        return toResponse(role,activeDutyCodes(role));
    }

    private Set<String> activeDutyCodes(RoleEntity role) {
        Set<String> codes = new TreeSet<>();
        for (RolePermissionEntity link : rolePermissionRepo.findAllByRole(role)) {
            PermissionEntity duty = link.getPermission();
            if (duty.isActive()) {
                codes.add(duty.getCode());
            }
        }
        return codes;
    }

    private RoleResponse toResponse(RoleEntity role, Set<String> duties) {
        return new RoleResponse(role.getId(), role.getName(), role.getDescription(), role.isSystem(),
                role.isActive(), role.getTenant().getId(), duties, role.getCreatedAt());
    }
}
