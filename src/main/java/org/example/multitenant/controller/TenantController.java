package org.example.multitenant.controller;

import jakarta.validation.Valid;
import org.example.multitenant.dto.Request.CreateTenantRequest;
import org.example.multitenant.dto.Response.TenantResponse;
import org.example.multitenant.dto.Response.TenantStatusResponse;
import org.example.multitenant.enums.PermissionScope;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.RequiresPermission;
import org.example.multitenant.service.TenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tenants")
public class TenantController {
    private final TenantService tenantService;


    public TenantController( TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @PostMapping("/create")
    @RequiresPermission(value = "tenant:create", scope = PermissionScope.PLATFORM)
    public ResponseEntity<TenantResponse> createTenants(@Valid @RequestBody CreateTenantRequest request,
                                                        @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok().body(tenantService.createTenant(request,actor));
    }

    @PostMapping("/{tenantId}/suspend")
    @RequiresPermission(value = "tenant:suspend", scope = PermissionScope.PLATFORM)
    public ResponseEntity<TenantStatusResponse> suspendTenant(@PathVariable Long tenantId,
                                                              @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(tenantService.suspendTenant(tenantId, actor));
    }

    @PostMapping("/{tenantId}/reactivate")
    @RequiresPermission(value = "tenant:suspend", scope = PermissionScope.PLATFORM)
    public ResponseEntity<TenantStatusResponse> reactivateTenant(@PathVariable Long tenantId,
                                                                 @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(tenantService.reactivateTenant(tenantId, actor));
    }
}
