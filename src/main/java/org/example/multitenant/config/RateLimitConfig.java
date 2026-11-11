package org.example.multitenant.config;

import org.springframework.boot.context.properties.ConfigurationProperties;


@ConfigurationProperties(prefix = "app.security.rate-limit")
public class RateLimitConfig {
}


