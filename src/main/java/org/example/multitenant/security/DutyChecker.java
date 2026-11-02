package org.example.multitenant.security;

import org.example.multitenant.service.EffectivePermissionService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component("dutyChecker")
public class DutyChecker {

    private final EffectivePermissionService effectivePermissionService;


    public DutyChecker(EffectivePermissionService effectivePermissionService) {
        this.effectivePermissionService = effectivePermissionService;
    }

    public boolean has(String code){
        if (code == null || code.isBlank()){
            return  false;
        }
       return currentUser().map(user-> effectivePermissionService.userDutyCodes(user.userId()).contains(code)).orElse(false);
    }

    public boolean hasPlatform(String code){
        if (code == null || code.isBlank()){
            return false;
        }
        return
                currentUser().map(user -> effectivePermissionService.platformDutyCodes(user.userId()).contains(code)).orElse(false);
    }

    private Optional<AuthenticatedUser> currentUser(){
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user) {
            return Optional.of(user);
        }
        return  Optional.empty();
    }
}
