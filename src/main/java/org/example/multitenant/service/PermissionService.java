package org.example.multitenant.service;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
public class PermissionService {

    @PreAuthorize("@dutyChecker.has('permission:create')")
    public void createPermission(){

    }

    @PreAuthorize("@dutyChecker.has('permission:deactivate')")
    public void deactivatePermission(){

    }

}
