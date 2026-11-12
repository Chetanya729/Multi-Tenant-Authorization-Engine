package org.example.multitenant.dto.Request;

import jakarta.validation.constraints.Size;

public record DecisionRequest(@Size(max = 255) String note) {
}
