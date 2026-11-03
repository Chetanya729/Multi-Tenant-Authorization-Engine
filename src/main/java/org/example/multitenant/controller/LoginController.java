package org.example.multitenant.controller;

import jakarta.validation.Valid;
import org.example.multitenant.dto.Request.LoginRequest;
import org.example.multitenant.dto.Request.NewLoginRequest;
import org.example.multitenant.dto.Response.TokenResponse;
import org.example.multitenant.service.LoginService;
import org.example.multitenant.service.PasswordService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private final LoginService loginService;
    private final PasswordService passwordService;

    public LoginController(LoginService loginService, PasswordService passwordService) {
        this.loginService = loginService;
        this.passwordService = passwordService;
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(loginService.login(loginRequest));
    }
    @PostMapping("/first-password")
    public ResponseEntity<Void> setNewPassword(@Valid @RequestBody NewLoginRequest newLoginRequest) {
        passwordService.createNewPassword(newLoginRequest);
        return  ResponseEntity.ok().build();
    }
}
