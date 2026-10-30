package org.example.multitenant.security;


public record AuthenticatedUser(Long userId, Long tenantId) {
}
