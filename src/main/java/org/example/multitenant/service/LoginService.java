package org.example.multitenant.service;

import org.example.multitenant.dto.Request.LoginRequest;
import org.example.multitenant.dto.Response.TokenResponse;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.repository.UserRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class LoginService {

    private static final Logger log = LoggerFactory.getLogger(LoginService.class);
    private static final String TOKEN_TYPE = "Bearer";

    private final AuthenticationManager authenticationManager;
    private final UserRepo userRepo;
    private final TokenService tokenService;

    public LoginService(AuthenticationManager authenticationManager, UserRepo userRepo, TokenService tokenService) {
        this.authenticationManager = authenticationManager;
        this.userRepo = userRepo;
        this.tokenService = tokenService;
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.getPassword()));
        } catch (AuthenticationException e) {
            log.warn("Login failed for {}", email);
            throw e;
        }

        UserEntity user = userRepo.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        TokenService.IssuedTokens tokens = tokenService.issueTokens(user);
        log.info("Login succeeded for user {}", user.getId());

        return new TokenResponse(tokens.accessToken(), TOKEN_TYPE, tokens.expiresIn(), tokens.refreshToken());
    }
}
