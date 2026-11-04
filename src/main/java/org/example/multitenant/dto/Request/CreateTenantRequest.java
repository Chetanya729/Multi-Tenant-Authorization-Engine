package org.example.multitenant.dto.Request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateTenantRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$")String slug,
        @NotBlank @Email @Size(max = 150)  String adminEmail,
        @NotBlank @Size(min = 12,max = 72) String temporaryPassword
) {

    @Override
    public String toString() {
        return "Tenant Email [" + adminEmail + "]\n" + "Tenant name [" + name + "]\n" + "Tenant slug [" + slug + "]\n";
    }
}


