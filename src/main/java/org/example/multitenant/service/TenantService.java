package org.example.multitenant.service;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
public class TenantService {

    @PreAuthorize("@dutyChecker.hasPlatform('tenant:create')")
    public void createTenant(){

    }

    @PreAuthorize("@dutyChecker.hasPlatform('tenant:suspend')")
    public void suspendTenant(){

    }

}
