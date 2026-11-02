package org.example.multitenant.service;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
public class RoleService {

    @PreAuthorize("@dutyChecker.has('role:create')")
    public void createRole(){

    }

    @PreAuthorize("@dutyChecker.has('role:assign')")
    public void assignRole(){

    }

}
