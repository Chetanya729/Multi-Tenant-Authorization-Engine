package org.example.multitenant.service;

import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.enums.TenantStatus;
import org.example.multitenant.repository.UserRepo;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;


@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepo userRepo;

    public CustomUserDetailsService(UserRepo userRepo) {
        this.userRepo = userRepo;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String email = username.trim().toLowerCase(Locale.ROOT);

        UserEntity user = userRepo.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        boolean tenantSuspended = user.getTenant().getStatus() != TenantStatus.ACTIVE;
        boolean mustChange = user.isTemporaryPassword();
        boolean tempExpired = mustChange && user.getTempPassExpiryAt() != null
                && user.getTempPassExpiryAt().isBefore(Instant.now());

        return User.withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .disabled(!user.isEnabled())
                .accountLocked(tenantSuspended)
                .accountExpired(tempExpired)
                .credentialsExpired(mustChange)
                .authorities(List.of())
                .build();
    }
}
