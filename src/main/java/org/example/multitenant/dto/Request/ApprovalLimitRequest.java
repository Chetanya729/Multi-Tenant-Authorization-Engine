package org.example.multitenant.dto.Request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;

public record ApprovalLimitRequest(@DecimalMin("0.01") @Digits(integer = 13, fraction = 2) BigDecimal approvalLimit) {
}
