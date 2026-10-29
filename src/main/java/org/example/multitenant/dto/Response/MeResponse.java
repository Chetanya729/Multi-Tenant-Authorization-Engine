package org.example.multitenant.dto.Response;

import org.example.multitenant.enums.TenantType;

import java.util.Set;

public record MeResponse(Long userId, String email, Long tenantId, TenantType tenantType, String tenantSlug,
                         Set<String> duties, Set<String> platformDuties) {
}
