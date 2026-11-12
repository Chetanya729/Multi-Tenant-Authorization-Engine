package org.example.multitenant.dto.Response;

import org.example.multitenant.enums.TransferStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record TransferResponse(Long id, BigDecimal amount, String currency, String description, TransferStatus status,
                               Long requestedById, String requestedByEmail, Long decidedById, String decidedByEmail,
                               Instant decidedAt, String decisionNote, Instant createdAt) {
}
