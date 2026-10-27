package org.example.multitenant.controller;

import org.example.multitenant.dto.Response.UserResponse;
import org.example.multitenant.service.CustomUserDetailsService;
import org.example.multitenant.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    private final CustomUserDetailsService customUserDetailsService;

    public UserController( CustomUserDetailsService customUserDetailsService) {
        this.customUserDetailsService = customUserDetailsService;
    }

    @PostMapping("/login")
   public ResponseEntity<UserResponse> createUser() {
       customUserDetailsService.loadUserByUsername("admin");
       return ResponseEntity.ok().build();
   }
}
