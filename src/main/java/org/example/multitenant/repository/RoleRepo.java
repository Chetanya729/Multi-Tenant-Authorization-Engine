package org.example.multitenant.repository;

import org.example.multitenant.entity.RoleEntity;
import org.example.multitenant.entity.TenantEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoleRepo extends JpaRepository<RoleEntity, Long> {

    Optional<RoleEntity> findByTenantAndName(TenantEntity tenant, String name);

    Optional<RoleEntity> findByIdAndTenant(Long id, TenantEntity tenant);

    List<RoleEntity> findAllByTenant(TenantEntity tenant);

    boolean existsByTenantAndName(TenantEntity tenant, String name);
}
