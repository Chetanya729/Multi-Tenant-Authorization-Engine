package org.example.multitenant.service;

import org.example.multitenant.entity.AuditLogEntity;
import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.repository.AuditLogsRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class AuditService {

    private final AuditLogsRepo auditLogsRepo;

    public AuditService(AuditLogsRepo auditLogsRepo) {
        this.auditLogsRepo = auditLogsRepo;
    }

    @Transactional
    public void audit(TenantEntity tenantEntity, UserEntity userEntity, String action, String targettype, String targetid, Map<String, Object> details) {
            auditLogsRepo.save(new AuditLogEntity(tenantEntity, userEntity, action, targettype, targetid, details));
    }
}
