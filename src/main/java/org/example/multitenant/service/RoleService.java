package org.example.multitenant.service;

import org.example.multitenant.repository.RoleRepo;
import org.example.multitenant.repository.UserRepo;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoleService {

    private final RoleRepo roleRepo;
    private final UserRepo userRepo;


    public RoleService(RoleRepo roleRepo, UserRepo userRepo) {
        this.roleRepo = roleRepo;
        this.userRepo = userRepo;
    }

    @PreAuthorize("@dutyChecker.has('role:create')")
    @Transactional
    public void createRole(){

    }

    @PreAuthorize("@dutyChecker.has('role:assign')")
    public void assignRole(){

    }

}
