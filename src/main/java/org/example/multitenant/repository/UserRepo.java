package org.example.multitenant.repository;

import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepo extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<UserEntity> findByIdAndTenant(Long id, TenantEntity tenant);

    List<UserEntity> findAllByTenant(TenantEntity tenant);
}
