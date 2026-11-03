package org.example.multitenant.dto.Response;

import java.util.Set;

public record UserPermissionResponse(Long userId, String email, Set<String> roles, Set<String> duties,Set<String> platformDuties) {
}
