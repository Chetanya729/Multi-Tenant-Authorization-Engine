package org.example.multitenant.dto.Request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record UserRequest(
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(min = 12, max = 72) String temporaryPassword,
        @NotNull Set<@NotNull @Positive Long> roleIds) {

    @Override
    public String toString() {
        return "UserRequest[email=" + email + ", roleIds=" + roleIds + "]";
    }
}