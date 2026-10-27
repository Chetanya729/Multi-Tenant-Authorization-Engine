package org.example.multitenant.service;

import org.example.multitenant.repository.PermissionRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@Transactional(readOnly = true)
public class EffectivePermissionService {

    private final PermissionRepo permissionRepo;

    public EffectivePermissionService(PermissionRepo permissionRepo) {
        this.permissionRepo = permissionRepo;
    }

    public Set<String> userDutyCodes(Long userId) {
        return permissionRepo.findActivePermissionCodesByUserId(userId);
    }

    public Set<String> platformDutyCodes(Long userId) {
        return permissionRepo.findActivePlatformPermissionCodesByUserId(userId);
    }
}
