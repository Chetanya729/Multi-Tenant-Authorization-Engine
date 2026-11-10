package org.example.multitenant.controller;

import jakarta.validation.Valid;

import org.example.multitenant.dto.Request.DisableUserRequest;
import org.example.multitenant.dto.Request.UserRequest;
import org.example.multitenant.dto.Response.UserPermissionResponse;
import org.example.multitenant.dto.Response.UserResponse;
import org.example.multitenant.dto.Response.UserStatusResponse;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.RequiresPermission;
import org.example.multitenant.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @RequiresPermission("user:create")
    @PostMapping("/create")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest request,
                                                   @AuthenticationPrincipal AuthenticatedUser actor) {
        UserResponse response = userService.createUser(request, actor);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @RequiresPermission("user:read")
    @GetMapping("/{id}/permissions")
    public ResponseEntity<UserPermissionResponse> getPermissions(@PathVariable Long id , @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok().body(userService.getUserPermissions(id, actor));
    }

    @RequiresPermission("role:assign")
    @PutMapping("/{userId}/roles/{roleId}")
    public ResponseEntity<UserPermissionResponse> assignRole(@PathVariable Long userId, @PathVariable Long roleId,
                                                             @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(userService.assignRole(userId, roleId, actor));
    }

    @RequiresPermission("role:revoke")
    @DeleteMapping("/{userId}/roles/{roleId}")
    public ResponseEntity<UserPermissionResponse> revokeRole(@PathVariable Long userId, @PathVariable Long roleId,
                                                             @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(userService.revokeRole(userId, roleId, actor));
    }

    @RequiresPermission("user:disable")
    @PostMapping("/{id}/disable")
    public ResponseEntity<UserStatusResponse> disableUser(@PathVariable Long id,
                                                          @Valid @RequestBody(required = false) DisableUserRequest request,
                                                          @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(userService.disableUser(id, request, actor));
    }

    @RequiresPermission("user:disable")
    @PostMapping("/{id}/enable")
    public ResponseEntity<UserStatusResponse> enableUser(@PathVariable Long id,
                                                         @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(userService.enableUser(id, actor));
    }
}
