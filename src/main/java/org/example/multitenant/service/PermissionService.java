package org.example.multitenant.service;

import org.example.multitenant.dto.Request.CreatePermissionRequest;
import org.example.multitenant.dto.Response.DutyResponse;
import org.example.multitenant.entity.PermissionEntity;
import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.enums.PermissionScope;
import org.example.multitenant.exception.BadRequestException;
import org.example.multitenant.exception.ConflictException;
import org.example.multitenant.exception.ResourceNotFoundException;
import org.example.multitenant.repository.PermissionRepo;
import org.example.multitenant.security.AuthenticatedUser;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class PermissionService {

    private static final List<String> RESERVED_PREFIXES = List.of("tenant:", "platform:");

    private final PermissionRepo permissionRepo;
    private final ActorService actorService;
    private final AuditService auditService;

    public PermissionService(PermissionRepo permissionRepo, ActorService actorService, AuditService auditService) {
        this.permissionRepo = permissionRepo;
        this.actorService = actorService;
        this.auditService = auditService;
    }

    @PreAuthorize("@dutyChecker.has('permission:create')")
    @Transactional
    public DutyResponse createPermission(CreatePermissionRequest request, AuthenticatedUser actor) {
        UserEntity actorEntity = actorService.load(actor);
        TenantEntity tenant = actorEntity.getTenant();
        String code = request.code().trim().toLowerCase(Locale.ROOT);

        if (RESERVED_PREFIXES.stream().anyMatch(code::startsWith)) {
            throw new BadRequestException("The 'tenant:' and 'platform:' prefixes are reserved");
        }
        if (permissionRepo.existsByTenantAndCode(tenant, code)) {
            throw new ConflictException("Duty already exists");
        }

        PermissionEntity duty = new PermissionEntity();
        duty.setTenant(tenant);
        duty.setCode(code);
        duty.setDescription(request.description());
        duty.setScope(PermissionScope.TENANT);
        duty.setActive(true);
        duty.setSystem(false);

        PermissionEntity saved;
        try {
            saved = permissionRepo.saveAndFlush(duty);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Duty already exists");
        }

        auditService.audit(tenant, actorEntity, "PERMISSION_CREATED", "PERMISSION", String.valueOf(saved.getId()),
                Map.of("code", code));
        return toResponse(saved);
    }

    @PreAuthorize("@dutyChecker.has('permission:read')")
    @Transactional(readOnly = true)
    public List<DutyResponse> listPermissions(AuthenticatedUser actor) {
        TenantEntity tenant = actorService.load(actor).getTenant();
        return permissionRepo.findAllByTenant(tenant).stream()
                .sorted(Comparator.comparing(PermissionEntity::getCode))
                .map(this::toResponse)
                .toList();
    }

    @PreAuthorize("@dutyChecker.has('permission:deactivate')")
    @Transactional
    public DutyResponse deactivatePermission(Long permissionId, AuthenticatedUser actor) {
        return changeActive(permissionId, actor, false);
    }

    @PreAuthorize("@dutyChecker.has('permission:deactivate')")
    @Transactional
    public DutyResponse activatePermission(Long permissionId, AuthenticatedUser actor) {
        return changeActive(permissionId, actor, true);
    }

    private DutyResponse changeActive(Long permissionId, AuthenticatedUser actor, boolean active) {
        UserEntity actorEntity = actorService.load(actor);
        TenantEntity tenant = actorEntity.getTenant();
        PermissionEntity duty = permissionRepo.findByIdAndTenant(permissionId, tenant)
                .orElseThrow(() -> new ResourceNotFoundException("Permission Not Found"));
        if (duty.isSystem()) {
            throw new BadRequestException("System duties cannot be deactivated or reactivated");
        }
        if (duty.isActive() == active) {
            return toResponse(duty);
        }
        duty.setActive(active);
        permissionRepo.save(duty);
        auditService.audit(tenant, actorEntity, active ? "PERMISSION_ACTIVATED" : "PERMISSION_DEACTIVATED",
                "PERMISSION", String.valueOf(duty.getId()), Map.of("code", duty.getCode()));
        return toResponse(duty);
    }

    private DutyResponse toResponse(PermissionEntity duty) {
        return new DutyResponse(duty.getId(), duty.getCode(), duty.getDescription(), duty.getScope().name(),
                duty.isActive(), duty.isSystem(), duty.getTenant().getId());
    }
}
