package org.example.multitenant.dto.Response;


import java.time.Duration;

public class TokenResponse {

    private  String accessToken;
    private String tokenType;
    private Duration expiresIn;
    private String refreshToken;
}
