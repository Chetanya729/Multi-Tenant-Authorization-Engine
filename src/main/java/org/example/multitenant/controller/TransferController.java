package org.example.multitenant.controller;

import jakarta.validation.Valid;
import org.example.multitenant.dto.Request.CreateTransferRequest;
import org.example.multitenant.dto.Request.DecisionRequest;
import org.example.multitenant.dto.Response.PageResponse;
import org.example.multitenant.dto.Response.TransferResponse;
import org.example.multitenant.security.AuthenticatedOnly;
import org.example.multitenant.enums.TransferStatus;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.RequiresPermission;
import org.example.multitenant.service.TransferService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transfers")
public class TransferController {

    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @RequiresPermission("transfer:create")
    @PostMapping("/create")
    public ResponseEntity<TransferResponse> submit(@Valid @RequestBody CreateTransferRequest request,
                                                   @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(transferService.submit(request, actor));
    }

    @AuthenticatedOnly
    @GetMapping("/mine")
    public ResponseEntity<PageResponse<TransferResponse>> myTransfers(@RequestParam(defaultValue = "0") int page,
                                                                      @RequestParam(defaultValue = "20") int size,
                                                                      @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(transferService.myTransfers(page, size, actor));
    }

    @RequiresPermission("transfer:read")
    @GetMapping("/list")
    public ResponseEntity<PageResponse<TransferResponse>> listAll(@RequestParam(required = false) TransferStatus status,
                                                                  @RequestParam(defaultValue = "0") int page,
                                                                  @RequestParam(defaultValue = "20") int size,
                                                                  @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(transferService.listAll(status, page, size, actor));
    }

    @AuthenticatedOnly
    @GetMapping("/{transferId}")
    public ResponseEntity<TransferResponse> getOne(@PathVariable Long transferId,
                                                   @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(transferService.getOne(transferId, actor));
    }

    @RequiresPermission("transfer:approve")
    @PostMapping("/{transferId}/approve")
    public ResponseEntity<TransferResponse> approve(@PathVariable Long transferId,
                                                    @Valid @RequestBody(required = false) DecisionRequest request,
                                                    @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(transferService.approve(transferId, request == null ? null : request.note(), actor));
    }

    @RequiresPermission("transfer:approve")
    @PostMapping("/{transferId}/reject")
    public ResponseEntity<TransferResponse> reject(@PathVariable Long transferId,
                                                   @Valid @RequestBody(required = false) DecisionRequest request,
                                                   @AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(transferService.reject(transferId, request == null ? null : request.note(), actor));
    }
}
