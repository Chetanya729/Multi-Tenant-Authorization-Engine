package org.example.multitenant.repository;

import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.enums.TenantType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TenantRepo extends JpaRepository<TenantEntity, Long> {

    Optional<TenantEntity> findBySlug(String slug);

    Optional<TenantEntity> findByType(TenantType type);

    boolean existsBySlug(String slug);
}
