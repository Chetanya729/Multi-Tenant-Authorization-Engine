package org.example.multitenant.repository;

import org.example.multitenant.entity.RoleEntity;
import org.example.multitenant.entity.TenantEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface RoleRepo extends JpaRepository<RoleEntity, Long> {

    Optional<RoleEntity> findByTenantAndName(TenantEntity tenant, String name);

    Optional<RoleEntity> findByIdAndTenant(Long id, TenantEntity tenant);

    List<RoleEntity> findAllByTenant(TenantEntity tenant);

    boolean existsByTenantAndName(TenantEntity tenant, String name);

    @Query("""
            select max(r.approvalLimit)
            from UserRoleEntity ur
                join ur.role r
                join RolePermissionEntity rp on rp.role = r
                join rp.permission p
            where ur.user.id = :userId
              and r.active = true
              and p.active = true
              and p.code = :dutyCode
              and r.tenant = ur.user.tenant
              and p.tenant = ur.user.tenant
            """)
    BigDecimal findApprovalLimit(@Param("userId") Long userId, @Param("dutyCode") String dutyCode);
}
