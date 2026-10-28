package org.example.multitenant.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;


@ConfigurationProperties( prefix = "app.security.tokens")
public record TokenProperties(Duration accessTokenTtl, Duration refreshTokenTtl) {
}
