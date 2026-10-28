package org.example.multitenant.controller;

import jakarta.validation.Valid;
import org.example.multitenant.dto.Request.LoginRequest;
import org.example.multitenant.dto.Response.TokenResponse;
import org.example.multitenant.service.CustomUserDetailsService;
import org.example.multitenant.service.LoginService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class LoginController {

    private static final Logger log = LoggerFactory.getLogger(LoginController.class);
    private final CustomUserDetailsService customUserDetailsService;
    private final LoginService loginService;

    public LoginController(CustomUserDetailsService customUserDetailsService, LoginService loginService) {
        this.customUserDetailsService = customUserDetailsService;
        this.loginService = loginService;
    }

    @PostMapping("/login")
   public ResponseEntity<TokenResponse> login( @Valid @RequestBody LoginRequest loginRequest) {
       loginService.login("admin");
       return ResponseEntity.ok().build();
   }

}
