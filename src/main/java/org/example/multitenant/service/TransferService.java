package org.example.multitenant.service;

import org.example.multitenant.dto.Request.CreateTransferRequest;
import org.example.multitenant.dto.Response.PageResponse;
import org.example.multitenant.dto.Response.TransferResponse;
import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.TransferEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.enums.TransferStatus;
import org.example.multitenant.exception.BadRequestException;
import org.example.multitenant.exception.ConflictException;
import org.example.multitenant.exception.ResourceNotFoundException;
import org.example.multitenant.repository.RoleRepo;
import org.example.multitenant.repository.TransferRepo;
import org.example.multitenant.security.AuthenticatedUser;
import org.example.multitenant.security.DutyChecker;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class TransferService {

    private static final String APPROVE_DUTY = "transfer:approve";
    private static final int MAX_PAGE_SIZE = 100;

    private final TransferRepo transferRepo;
    private final RoleRepo roleRepo;
    private final ActorService actorService;
    private final DutyChecker dutyChecker;
    private final AuditService auditService;

    public TransferService(TransferRepo transferRepo, RoleRepo roleRepo, ActorService actorService,
                           DutyChecker dutyChecker, AuditService auditService) {
        this.transferRepo = transferRepo;
        this.roleRepo = roleRepo;
        this.actorService = actorService;
        this.dutyChecker = dutyChecker;
        this.auditService = auditService;
    }

    @PreAuthorize("@dutyChecker.has('transfer:create')")
    @Transactional
    public TransferResponse submit(CreateTransferRequest request, AuthenticatedUser actor) {
        UserEntity actorEntity = actorService.load(actor);
        TenantEntity tenant = actorEntity.getTenant();

        TransferEntity transfer = new TransferEntity();
        transfer.setTenant(tenant);
        transfer.setRequestedBy(actorEntity);
        transfer.setAmount(request.amount());
        transfer.setCurrency(request.currency());
        transfer.setDescription(request.description());
        transfer.setStatus(TransferStatus.PENDING);
        TransferEntity saved = transferRepo.saveAndFlush(transfer);

        auditService.audit(tenant, actorEntity, "TRANSFER_SUBMITTED", "TRANSFER", String.valueOf(saved.getId()),
                Map.of("amount", saved.getAmount(), "currency", saved.getCurrency()));
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<TransferResponse> myTransfers(int page, int size, AuthenticatedUser actor) {
        UserEntity actorEntity = actorService.load(actor);
        return PageResponse.from(transferRepo.findAllByTenantAndRequestedByOrderByCreatedAtDesc(
                actorEntity.getTenant(), actorEntity, pageRequest(page, size)), this::toResponse);
    }

    @PreAuthorize("@dutyChecker.has('transfer:read')")
    @Transactional(readOnly = true)
    public PageResponse<TransferResponse> listAll(TransferStatus status, int page, int size, AuthenticatedUser actor) {
        TenantEntity tenant = actorService.load(actor).getTenant();
        PageRequest pageRequest = pageRequest(page, size);
        Page<TransferEntity> transfers = status == null
                ? transferRepo.findAllByTenantOrderByCreatedAtDesc(tenant, pageRequest)
                : transferRepo.findAllByTenantAndStatusOrderByCreatedAtDesc(tenant, status, pageRequest);
        return PageResponse.from(transfers, this::toResponse);
    }

    @Transactional(readOnly = true)
    public TransferResponse getOne(Long transferId, AuthenticatedUser actor) {
        UserEntity actorEntity = actorService.load(actor);
        TransferEntity transfer = findInTenant(transferId, actorEntity.getTenant());
        boolean isRequester = transfer.getRequestedBy().getId().equals(actorEntity.getId());
        if (!isRequester && !dutyChecker.has("transfer:read")) {
            throw new ResourceNotFoundException("Transfer Not Found");
        }
        return toResponse(transfer);
    }

    @PreAuthorize("@dutyChecker.has('transfer:approve')")
    @Transactional
    public TransferResponse approve(Long transferId, String note, AuthenticatedUser actor) {
        UserEntity actorEntity = actorService.load(actor);
        TenantEntity tenant = actorEntity.getTenant();
        TransferEntity transfer = findInTenant(transferId, tenant);
        requireDecidable(transfer, actorEntity);

        BigDecimal limit = roleRepo.findApprovalLimit(actorEntity.getId(), APPROVE_DUTY);
        if (limit == null || transfer.getAmount().compareTo(limit) > 0) {
            throw new AccessDeniedException("Amount exceeds your approval limit");
        }

        TransferEntity saved = decide(transfer, actorEntity, TransferStatus.APPROVED, note);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("amount", saved.getAmount());
        details.put("currency", saved.getCurrency());
        details.put("approvalLimit", limit);
        auditService.audit(tenant, actorEntity, "TRANSFER_APPROVED", "TRANSFER", String.valueOf(saved.getId()), details);
        return toResponse(saved);
    }

    @PreAuthorize("@dutyChecker.has('transfer:approve')")
    @Transactional
    public TransferResponse reject(Long transferId, String note, AuthenticatedUser actor) {
        if (note == null || note.isBlank()) {
            throw new BadRequestException("A reason is required to reject a transfer");
        }
        UserEntity actorEntity = actorService.load(actor);
        TenantEntity tenant = actorEntity.getTenant();
        TransferEntity transfer = findInTenant(transferId, tenant);
        requireDecidable(transfer, actorEntity);

        TransferEntity saved = decide(transfer, actorEntity, TransferStatus.REJECTED, note);
        auditService.audit(tenant, actorEntity, "TRANSFER_REJECTED", "TRANSFER", String.valueOf(saved.getId()),
                Map.of("amount", saved.getAmount(), "currency", saved.getCurrency(), "note", saved.getDecisionNote()));
        return toResponse(saved);
    }

    private TransferEntity findInTenant(Long transferId, TenantEntity tenant) {
        return transferRepo.findByIdAndTenant(transferId, tenant)
                .orElseThrow(() -> new ResourceNotFoundException("Transfer Not Found"));
    }

    private void requireDecidable(TransferEntity transfer, UserEntity actorEntity) {
        if (transfer.getStatus() != TransferStatus.PENDING) {
            throw new ConflictException("Transfer is already " + transfer.getStatus().name().toLowerCase());
        }
        if (transfer.getRequestedBy().getId().equals(actorEntity.getId())) {
            throw new AccessDeniedException("You cannot decide your own request");
        }
    }

    private TransferEntity decide(TransferEntity transfer, UserEntity actorEntity, TransferStatus status, String note) {
        transfer.setStatus(status);
        transfer.setDecidedBy(actorEntity);
        transfer.setDecidedAt(Instant.now());
        transfer.setDecisionNote(note == null || note.isBlank() ? null : note.trim());
        try {
            return transferRepo.saveAndFlush(transfer);
        } catch (ObjectOptimisticLockingFailureException e) {
            throw new ConflictException("Transfer was decided by someone else");
        }
    }

    private PageRequest pageRequest(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("Page must be 0 or greater");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("Page size must be between 1 and " + MAX_PAGE_SIZE);
        }
        return PageRequest.of(page, size);
    }

    private TransferResponse toResponse(TransferEntity transfer) {
        UserEntity requester = transfer.getRequestedBy();
        UserEntity decider = transfer.getDecidedBy();
        return new TransferResponse(transfer.getId(), transfer.getAmount(), transfer.getCurrency(),
                transfer.getDescription(), transfer.getStatus(), requester.getId(), requester.getEmail(),
                decider == null ? null : decider.getId(), decider == null ? null : decider.getEmail(),
                transfer.getDecidedAt(), transfer.getDecisionNote(), transfer.getCreatedAt());
    }
}
