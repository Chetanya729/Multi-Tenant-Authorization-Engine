package org.example.multitenant.repository;

import org.example.multitenant.entity.RefreshTokenEntity;
import org.example.multitenant.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepo extends JpaRepository<RefreshTokenEntity, Long> {

    Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);

    List<RefreshTokenEntity> findAllByFamilyIdAndRevokedAtIsNull(UUID familyId);

    List<RefreshTokenEntity> findAllByUserAndRevokedAtIsNull(UserEntity user);
}
