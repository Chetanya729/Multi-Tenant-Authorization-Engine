package org.example.multitenant.service;

import org.example.multitenant.config.BootstrapProperties;
import org.example.multitenant.entity.RoleEntity;
import org.example.multitenant.entity.TenantEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.entity.UserRoleEntity;
import org.example.multitenant.enums.TenantType;
import org.example.multitenant.repository.RoleRepo;
import org.example.multitenant.repository.TenantRepo;
import org.example.multitenant.repository.UserRepo;
import org.example.multitenant.repository.UserRoleRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class PlatformBootstrapService {

    private static final Logger log = LoggerFactory.getLogger(PlatformBootstrapService.class);

    private final BootstrapProperties bootstrapProperties;
    private final AuditService auditService;
    private final UserRepo userRepo;
    private final TenantRepo tenantRepo;
    private final RoleRepo roleRepo;
    private final UserRoleRepo userRoleRepo;
    static final String PLATFORM_ADMIN_ROLE = "PLATFORM_ADMIN";
    static final String AUDIT_ACTION = "PLATFORM_ADMIN_BOOTSTRAPPED";
    static final int MIN_PASSWORD_LENGTH = 8;
    private final PasswordEncoder passwordEncoder;

    private static final Pattern EMAIL_FORMAT = Pattern.compile("^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$");

    public PlatformBootstrapService(BootstrapProperties bootstrapProperties, AuditService auditService, UserRepo userRepo, TenantRepo tenantRepo, RoleRepo roleRepo, UserRoleRepo userRoleRepo, PasswordEncoder passwordEncoder) {
        this.bootstrapProperties = bootstrapProperties;
        this.auditService = auditService;
        this.userRepo = userRepo;
        this.tenantRepo = tenantRepo;
        this.roleRepo = roleRepo;
        this.userRoleRepo = userRoleRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void bootstrapIfNeeded(){
        TenantEntity platformTenant = tenantRepo.findByType(TenantType.PLATFORM)
                .orElseThrow(() -> new IllegalStateException("Platform tenant is not there. Check V4 migration "));

        RoleEntity platformAdminRole = roleRepo.findByTenantAndName(platformTenant, PLATFORM_ADMIN_ROLE)
                .orElseThrow(() -> new IllegalStateException(" Role is not there. Check V4 migration"));

        if(userRoleRepo.existsByRole(platformAdminRole)){
            log.info("Platform admin already exists, Bootstrap skipped");
            return;
        }
        if(!bootstrapProperties.isConfigured())
        {
            log.warn("No platform admin exists. Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD "
                    + "and restart to create one.");
            return;
        }

        String email = bootstrapProperties.email().trim().toLowerCase(Locale.ROOT);
        validate(email,bootstrapProperties.password() );

        if(userRepo.existsByEmail(email)){
            throw new IllegalStateException("Admin with the email "+ email+" already exists");
        }

        UserEntity admin = new UserEntity();
        admin.setEmail(email);
        admin.setEnabled(true);
        admin.setTenant(platformTenant);
        admin.setPasswordHash(passwordEncoder.encode(bootstrapProperties.password()));
        admin =  userRepo.save(admin);

        userRoleRepo.save(new UserRoleEntity(admin, platformAdminRole, null));
        auditService.audit(platformTenant, null, AUDIT_ACTION, "user", String.valueOf(admin.getId()) , Map.of("email", email));
        log.info("Platform admin has been created");


    }

    private void validate(String email, String password){
        if(!EMAIL_FORMAT.matcher(email).matches()){
            throw new IllegalStateException("Invalid email format");
        }
        if(password.length() < MIN_PASSWORD_LENGTH){
            throw new IllegalStateException("Invalid password length as Password should be at least "+MIN_PASSWORD_LENGTH+" characters");
        }
        if (password.equalsIgnoreCase(email)){
            throw new IllegalStateException("PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD cannot be same");
        }
    }
}
