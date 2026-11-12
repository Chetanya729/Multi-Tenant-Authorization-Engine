package org.example.multitenant.dto.Response;

import org.example.multitenant.enums.TenantStatus;
import org.example.multitenant.enums.TenantType;

import java.time.Instant;

public record TenantSummaryResponse(Long tenantId, String name, String slug, TenantType type, TenantStatus status,
                                    long userCount, Instant createdAt) {
}
