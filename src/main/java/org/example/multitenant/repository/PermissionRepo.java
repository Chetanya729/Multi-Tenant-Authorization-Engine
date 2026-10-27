package org.example.multitenant.repository;

import org.example.multitenant.entity.PermissionEntity;
import org.example.multitenant.entity.TenantEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface PermissionRepo extends JpaRepository<PermissionEntity, Long> {

    Optional<PermissionEntity> findByTenantAndCode(TenantEntity tenant, String code);

    Optional<PermissionEntity> findByIdAndTenant(Long id, TenantEntity tenant);

    List<PermissionEntity> findAllByTenant(TenantEntity tenant);

    boolean existsByTenantAndCode(TenantEntity tenant, String code);

    @Query("""
        select distinct p.code
        from UserRoleEntity ur
            join ur.user u
            join ur.role r
            join RolePermissionEntity rp on rp.role = r
            join rp.permission p
        where u.id = :userId
          and u.enabled = true
          and u.tenant.status = org.example.multitenant.enums.TenantStatus.ACTIVE
          and r.active = true
          and p.active = true
          and r.tenant = u.tenant
          and p.tenant = u.tenant
        """)
    Set<String> findActivePermissionCodesByUserId(@Param("userId") Long userId);

    @Query("""
            select distinct p.code
            from UserRoleEntity ur
                join ur.user u
                join ur.role r
                join RolePermissionEntity rp on rp.role = r
                join rp.permission p
            where u.id = :userId
              and u.enabled = true
              and u.tenant.status = org.example.multitenant.enums.TenantStatus.ACTIVE
              and u.tenant.type = org.example.multitenant.enums.TenantType.PLATFORM
              and r.active = true
              and p.active = true
              and p.scope = org.example.multitenant.enums.PermissionScope.PLATFORM
              and r.tenant = u.tenant
              and p.tenant = u.tenant
            """)
    Set<String> findActivePlatformPermissionCodesByUserId(@Param("userId") Long userId);

}
