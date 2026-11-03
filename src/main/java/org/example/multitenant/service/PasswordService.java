package org.example.multitenant.service;

import org.example.multitenant.dto.Request.NewLoginRequest;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.enums.TenantStatus;
import org.example.multitenant.exception.BadRequestException;
import org.example.multitenant.repository.UserRepo;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;

@Service
public class PasswordService {

    private static final String INVALID_CREDENTIALS = "Invalid email or password";

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final String dummyHash;

    public PasswordService(UserRepo userRepo, PasswordEncoder passwordEncoder, AuditService auditService) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.dummyHash = passwordEncoder.encode("not-a-real-password");
    }

    @Transactional
    public void createNewPassword(NewLoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        UserEntity user = userRepo.findByEmail(email).orElse(null);
        boolean temporaryMatches = passwordEncoder.matches(request.temporaryPassword(),
                user != null ? user.getPasswordHash() : dummyHash);
        if (user == null
                || !temporaryMatches
                || !user.isTemporaryPassword()
                || user.getTempPassExpiryAt() == null
                || !user.getTempPassExpiryAt().isAfter(Instant.now())
                || !user.isEnabled()
                || user.getTenant().getStatus() != TenantStatus.ACTIVE) {
            throw new BadCredentialsException(INVALID_CREDENTIALS);
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BadRequestException("New password must be different from the temporary password");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setTemporaryPassword(false);
        user.setTempPassExpiryAt(null);
        userRepo.save(user);
        auditService.audit(user.getTenant(), user, "PASSWORD_CHANGED", "USER", String.valueOf(user.getId()),
                Map.of("reason", "FIRST_LOGIN"));
    }
}
