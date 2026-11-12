package org.example.multitenant.dto.Response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

public record RoleResponse(
        Long roleId, String name, String description, boolean system , boolean active, Long tenantId, Set<String> duties, Instant createdAt,
        BigDecimal approvalLimit
) {
}
