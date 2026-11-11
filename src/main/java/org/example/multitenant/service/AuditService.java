package org.example.multitenant.service;

import org.example.multitenant.dto.Response.AuditLogsResponse;
import org.example.multitenant.dto.Response.PageResponse;
import org.example.multitenant.entity.AuditLogEntity;
import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.exception.BadRequestException;
import org.example.multitenant.repository.AuditLogsRepo;
import org.example.multitenant.security.AuthenticatedUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class AuditService {

    private static final int MAX_PAGE_SIZE = 100;

    private final AuditLogsRepo auditLogsRepo;
    private final ActorService actorService;

    public AuditService(AuditLogsRepo auditLogsRepo, ActorService actorService) {
        this.auditLogsRepo = auditLogsRepo;
        this.actorService = actorService;
    }

    @Transactional
    public void audit(TenantEntity tenantEntity, UserEntity userEntity, String action, String targettype, String targetid, Map<String, Object> details) {
            auditLogsRepo.save(new AuditLogEntity(tenantEntity, userEntity, action, targettype, targetid, details));
    }

    @PreAuthorize("@dutyChecker.has('audit:read')")
    @Transactional(readOnly = true)
    public PageResponse<AuditLogsResponse> getAuditLogs(int page, int size, AuthenticatedUser user) {
        TenantEntity tenantEntity = actorService.load(user).getTenant();
        if (page < 0) {
            throw new BadRequestException("Page must be 0 or greater");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("Page size must be between 1 and " + MAX_PAGE_SIZE);
        }
        Page<AuditLogEntity> result = auditLogsRepo.findAllByTenantOrderByCreatedAtDesc(tenantEntity,
                PageRequest.of(page, size));
        return PageResponse.from(result, this::toResponse);
    }

    private AuditLogsResponse toResponse(AuditLogEntity log) {
        UserEntity actor = log.getActor();
        return new AuditLogsResponse(log.getId(), log.getAction(), log.getTargetType(), log.getTargetId(),
                actor == null ? null : actor.getId(), actor == null ? null : actor.getEmail(),
                log.getDetails(), log.getCreatedAt());
    }
}
