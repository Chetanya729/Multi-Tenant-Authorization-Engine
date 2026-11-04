package org.example.multitenant.dto.Request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreatePermissionRequest(
        @NotBlank @Size(max = 100) @Pattern(regexp = "^[a-z]+(-[a-z]+)*:[a-z]+(-[a-z]+)*$") String code,
        @Size(max = 255) String description
) {
    @Override
    public String toString() {
        return "PermissionsCreated [" + code + ", " + description + "]" ;
    }
}
