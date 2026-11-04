package org.example.multitenant.dto.Response;

public record DutyResponse(
        Long permissionId,
        String code,
        String description,
        String scope,
        boolean active,
        boolean system,
        Long tenantId
) {
}
