package org.example.multitenant.config;

public record AuthenticatedUser(Long userId, Long tenantId) {
}
