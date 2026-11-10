package org.example.multitenant.dto.Response;

public record UserStatusResponse(Long userId, String email, boolean enabled) {
}
