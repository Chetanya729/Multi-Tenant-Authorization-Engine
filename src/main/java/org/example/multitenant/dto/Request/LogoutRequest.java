package org.example.multitenant.dto.Request;

public record LogoutRequest(String refreshToken) {

    @Override
    public String toString() {
        return "LogoutRequest[refreshToken=" + (refreshToken == null ? "absent" : "present") + "]";
    }
}
