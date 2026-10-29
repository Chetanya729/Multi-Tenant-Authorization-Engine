package org.example.multitenant.dto.Response;

public record TokenResponse(String accessToken, String tokenType, long expiresIn, String refreshToken) {
}
