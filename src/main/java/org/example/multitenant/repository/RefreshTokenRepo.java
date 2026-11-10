package org.example.multitenant.repository;

import org.example.multitenant.entity.RefreshTokenEntity;
import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepo extends JpaRepository<RefreshTokenEntity, Long> {

    Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);

    List<RefreshTokenEntity> findAllByFamilyIdAndRevokedAtIsNull(UUID familyId);

    List<RefreshTokenEntity> findAllByUserAndRevokedAtIsNull(UserEntity user);

    @Modifying
    @Query("update RefreshTokenEntity r set r.revokedAt = :now where r.user.tenant = :tenant and r.revokedAt is null")
    int revokeAllForTenant(@Param("tenant") TenantEntity tenant, @Param("now") Instant now);
}
