package org.example.multitenant.dto.Response;

import java.time.Instant;
import java.util.Map;

public record AuditLogsResponse(Long id, String action, String targetType, String targetId, Long actorId,
                                String actorEmail, Map<String, Object> details, Instant createdAt) {
}
