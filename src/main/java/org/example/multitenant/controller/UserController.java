package org.example.multitenant.controller;

import jakarta.validation.Valid;

import org.example.multitenant.dto.Request.UserRequest;
import org.example.multitenant.dto.Response.UserResponse;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.RequiresPermission;
import org.example.multitenant.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

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
}
