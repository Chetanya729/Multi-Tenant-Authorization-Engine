package org.example.multitenant.controller;

import jakarta.validation.Valid;
import org.example.multitenant.dto.Request.LoginRequest;
import org.example.multitenant.dto.Response.TokenResponse;
import org.example.multitenant.service.LoginService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private final LoginService loginService;

    public LoginController(LoginService loginService) {
        this.loginService = loginService;
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(loginService.login(loginRequest));
    }
}
