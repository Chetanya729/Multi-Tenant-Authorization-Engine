package org.example.multitenant.controller;

import org.example.multitenant.dto.Response.AuditLogsResponse;
import org.example.multitenant.dto.Response.PageResponse;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.RequiresPermission;
import org.example.multitenant.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/list")
    @RequiresPermission("audit:read")
    public ResponseEntity<PageResponse<AuditLogsResponse>> printAuditLogs(@RequestParam(defaultValue = "0") int page,
                                                                          @RequestParam(defaultValue = "20") int size,
                                                                          @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok().body(auditService.getAuditLogs(page, size, user));
    }
}
