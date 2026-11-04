package org.example.multitenant.controller;

import jakarta.validation.Valid;
import org.example.multitenant.dto.Request.CreatePermissionRequest;
import org.example.multitenant.dto.Response.DutyResponse;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.RequiresPermission;
import org.example.multitenant.service.PermissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/permissions")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @RequiresPermission("permission:create")
    @PostMapping
    public ResponseEntity<DutyResponse> createPermission(@Valid @RequestBody CreatePermissionRequest request,
                                                         @AuthenticationPrincipal AuthenticatedUser actor) {
        DutyResponse response = permissionService.createPermission(request, actor);
        return ResponseEntity.created(URI.create("/api/permissions/" + response.permissionId())).body(response);
    }

    @RequiresPermission("permission:read")
    @GetMapping
    public ResponseEntity<List<DutyResponse>> listPermissions(@AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(permissionService.listPermissions(actor));
    }
}
