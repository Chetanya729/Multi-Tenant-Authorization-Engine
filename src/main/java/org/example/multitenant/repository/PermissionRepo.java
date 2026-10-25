package org.example.multitenant.repository;

import org.example.multitenant.entity.PermissionEntity;
import org.example.multitenant.entity.TenantEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PermissionRepo extends JpaRepository<PermissionEntity, Long> {

    Optional<PermissionEntity> findByTenantAndCode(TenantEntity tenant, String code);

    Optional<PermissionEntity> findByIdAndTenant(Long id, TenantEntity tenant);

    List<PermissionEntity> findAllByTenant(TenantEntity tenant);

    boolean existsByTenantAndCode(TenantEntity tenant, String code);
}
