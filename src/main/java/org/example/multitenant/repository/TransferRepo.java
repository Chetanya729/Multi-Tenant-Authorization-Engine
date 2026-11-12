package org.example.multitenant.repository;

import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.TransferEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.enums.TransferStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TransferRepo extends JpaRepository<TransferEntity, Long> {

    Optional<TransferEntity> findByIdAndTenant(Long id, TenantEntity tenant);

    Page<TransferEntity> findAllByTenantOrderByCreatedAtDesc(TenantEntity tenant, Pageable pageable);

    Page<TransferEntity> findAllByTenantAndStatusOrderByCreatedAtDesc(TenantEntity tenant, TransferStatus status,
                                                                    Pageable pageable);

    Page<TransferEntity> findAllByTenantAndRequestedByOrderByCreatedAtDesc(TenantEntity tenant, UserEntity requestedBy,
                                                                          Pageable pageable);
}
