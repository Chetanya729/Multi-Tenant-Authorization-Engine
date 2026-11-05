package org.example.multitenant.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Locale;

public record RoleRequest(
        @NotBlank @Size(max = 100) @Pattern(regexp = "^[A-Z0-9]+(_[A-Z0-9]+)*$") String name,
        @Size(max = 255) String description
) {
    public RoleRequest {
        name = name == null ? null : name.trim().toUpperCase(Locale.ROOT);
    }
}
