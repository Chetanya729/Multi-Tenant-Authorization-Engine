package org.example.multitenant.dto.Request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;


public record NewLoginRequest(
        @Email @NotBlank
        String email,

        @NotBlank@Size(min=12, max = 72)
        String temporaryPassword,

        @NotBlank@Size(min=12, max = 72)
        String newPassword) {

    @Override
    public String toString() {
        return "NewLoginRequest["+ email + "]";
    }
}
