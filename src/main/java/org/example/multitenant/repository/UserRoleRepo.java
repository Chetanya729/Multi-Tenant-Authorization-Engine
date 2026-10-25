package org.example.multitenant.repository;

import org.example.multitenant.entity.RoleEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.entity.UserRoleEntity;
import org.example.multitenant.entity.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRoleRepo extends JpaRepository<UserRoleEntity, UserRoleId> {

    boolean existsByRole(RoleEntity role);

    List<UserRoleEntity> findAllByUser(UserEntity user);

    List<UserRoleEntity> findAllByRole(RoleEntity role);
}
