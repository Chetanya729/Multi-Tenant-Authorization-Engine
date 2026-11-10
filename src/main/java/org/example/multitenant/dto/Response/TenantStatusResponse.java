package org.example.multitenant.dto.Response;

import org.example.multitenant.enums.TenantStatus;

public record TenantStatusResponse(Long id, String slug, TenantStatus tenantStatus) {
}
