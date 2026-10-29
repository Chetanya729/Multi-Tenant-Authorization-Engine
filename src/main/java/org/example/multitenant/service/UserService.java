package org.example.multitenant.service;

import org.example.multitenant.dto.Response.MeResponse;
import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.enums.TenantType;
import org.example.multitenant.repository.UserRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
public class UserService {

    private final UserRepo userRepo;
    private final EffectivePermissionService effectivePermissionService;

    public UserService(UserRepo userRepo, EffectivePermissionService effectivePermissionService) {
        this.userRepo = userRepo;
        this.effectivePermissionService = effectivePermissionService;
    }

    public void createUser() {

    }

    @Transactional(readOnly = true)
    public MeResponse getProfile(Long userId) {
        UserEntity user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user " + userId + " no longer exists"));
        TenantEntity tenant = user.getTenant();

        Set<String> duties = effectivePermissionService.userDutyCodes(userId);
        Set<String> platformDuties = tenant.getType() == TenantType.PLATFORM
                ? effectivePermissionService.platformDutyCodes(userId)
                : Set.of();

        return new MeResponse(user.getId(), user.getEmail(), tenant.getId(), tenant.getType(), tenant.getSlug(),
                duties, platformDuties);
    }
}
//LskRvWbcbUNUIYIVRAqZ6eg5TGRK_qoaGQs3ynBtPiY