package org.example.multitenant.dto.Response;

import java.time.Instant;
import java.util.Set;

public record UserResponse(Long userId, String email, Long tenantId, boolean enabled, boolean temporaryPassword,
                           Instant tempPassExpiryAt, Set<String> roles, Instant createdAt) {
}