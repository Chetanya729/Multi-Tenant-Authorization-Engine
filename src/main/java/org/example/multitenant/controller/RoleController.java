package org.example.multitenant.controller;


import jakarta.validation.Valid;
import org.example.multitenant.dto.Request.CreatePermissionRequest;
import org.example.multitenant.dto.Response.DutyResponse;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.RequiresPermission;
import org.example.multitenant.service.RoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @PostMapping
    public ResponseEntity<DutyResponse> createRole(@Valid @ResponseBody CreatePermissionRequest request, @AuthenticationPrincipal AuthenticatedUser authenticatedUser){

    }
}
