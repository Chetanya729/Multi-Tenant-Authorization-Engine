package org.example.multitenant.dto.Response;

// Returned by POST /api/auth/login. expiresIn is the access token's lifetime in seconds (e.g. 300).
public record TokenResponse(String accessToken, String tokenType, long expiresIn, String refreshToken) {
}
