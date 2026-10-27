package org.example.multitenant.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.bootstrap.admin")
public record BootstrapProperties(String email, String password) {
    public boolean isConfigured(){
        return email != null && !email.isBlank()
                && password != null && !password.isBlank();
    }
}
