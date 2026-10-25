package org.example.multitenant.repository;

import org.example.multitenant.entity.PermissionEntity;
import org.example.multitenant.entity.RoleEntity;
import org.example.multitenant.entity.RolePermissionEntity;
import org.example.multitenant.entity.RolePermissionId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RolePermissionRepo extends JpaRepository<RolePermissionEntity, RolePermissionId> {

    List<RolePermissionEntity> findAllByRole(RoleEntity role);

    List<RolePermissionEntity> findAllByPermission(PermissionEntity permission);
}
