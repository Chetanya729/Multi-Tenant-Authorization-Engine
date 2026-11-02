package org.example.multitenant.service;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
public class PermissionService {

    @PreAuthorize("@dutyChecker.has('permissions:create')")
    public void createPermission(){

    }

    @PreAuthorize("@dutyChecker.has(permissions:delete)")
    public void deletePermissions(){

    }

}
