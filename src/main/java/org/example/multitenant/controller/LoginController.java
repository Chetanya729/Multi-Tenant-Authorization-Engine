package org.example.multitenant.controller;

import jakarta.validation.Valid;
import org.example.multitenant.dto.Request.LoginRequest;
import org.example.multitenant.dto.Request.LogoutRequest;
import org.example.multitenant.dto.Request.NewLoginRequest;
import org.example.multitenant.dto.Response.TokenResponse;
import org.example.multitenant.security.AuthenticatedOnly;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.service.LoginService;
import org.example.multitenant.service.PasswordService;
import org.example.multitenant.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private final LoginService loginService;
    private final PasswordService passwordService;
    private final TokenService tokenService;

    public LoginController(LoginService loginService, PasswordService passwordService, TokenService tokenService) {
        this.loginService = loginService;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
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

    @AuthenticatedOnly
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
                                       @RequestBody(required = false) LogoutRequest logoutRequest,
                                       Authentication authentication) {
        String refreshToken = logoutRequest == null ? null : logoutRequest.refreshToken();
        tokenService.logout(authenticatedUser, (String) authentication.getDetails(), refreshToken);
        return ResponseEntity.noContent().build();
    }
}
