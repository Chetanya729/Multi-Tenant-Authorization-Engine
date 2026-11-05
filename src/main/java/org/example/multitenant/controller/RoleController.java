package org.example.multitenant.controller;


import jakarta.validation.Valid;
import org.example.multitenant.dto.Request.RoleRequest;
import org.example.multitenant.dto.Response.RoleResponse;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.RequiresPermission;
import org.example.multitenant.service.RoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @RequiresPermission("role:create")
    @PostMapping("/create")
    public ResponseEntity<RoleResponse> createRole(@Valid @RequestBody RoleRequest request, @AuthenticationPrincipal AuthenticatedUser authenticatedUser){
        return ResponseEntity.ok().body(roleService.createRole(request,authenticatedUser));
    }

    @RequiresPermission("role:read")
    @GetMapping("/list")
    public ResponseEntity<List<RoleResponse>> listRoles(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return ResponseEntity.ok(roleService.listRoles(authenticatedUser));
    }
    @RequiresPermission("permission:assign")
    @PutMapping("/{roleId}/permissions/{permissionId}")
    public ResponseEntity<RoleResponse> assignDuties(@PathVariable Long roleId, @PathVariable Long permissionId,
                                                     @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return ResponseEntity.ok(roleService.grantDuty(roleId, permissionId, authenticatedUser));
    }

    @RequiresPermission("permission:revoke")
    @DeleteMapping("/{roleId}/permissions/{permissionId}")
    public ResponseEntity<RoleResponse> revokeDuties(@PathVariable Long roleId, @PathVariable Long permissionId,
                                                     @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return ResponseEntity.ok(roleService.revokeDuty(roleId, permissionId, authenticatedUser));
    }
}
