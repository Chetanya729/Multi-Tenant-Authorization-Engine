package org.example.multitenant.dto.Request;

import jakarta.validation.constraints.Size;
import org.example.multitenant.enums.DisableReason;

public record DisableUserRequest(DisableReason reason, @Size(max = 255) String note) {
}
