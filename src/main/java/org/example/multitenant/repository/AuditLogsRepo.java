package org.example.multitenant.repository;

import org.example.multitenant.entity.AuditLogEntity;
import org.example.multitenant.entity.TenantEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogsRepo extends JpaRepository<AuditLogEntity, Long> {
    Page<AuditLogEntity> findAllByTenantOrderByCreatedAtDesc(TenantEntity tenant, Pageable pageable);
}
