package org.example.multitenant.controller;

import org.example.multitenant.config.AuthenticatedUser;
import org.example.multitenant.dto.Response.MeResponse;
import org.example.multitenant.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MeController {

    private final UserService userService;

    public MeController(UserService userService) {
        this.userService = userService;
    }
    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(@AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(userService.getProfile(user.userId()));
    }
}
