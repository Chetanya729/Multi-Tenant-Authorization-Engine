package org.example.multitenant.service;

import org.example.multitenant.config.BootstrapProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

@Component
@EnableConfigurationProperties(BootstrapProperties.class)
public class PlatformAdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PlatformAdminBootstrapRunner.class);

    private final PlatformBootstrapService platformBootstrapService;

    public PlatformAdminBootstrapRunner(PlatformBootstrapService platformBootstrapService) {
        this.platformBootstrapService = platformBootstrapService;
    }
    @Override
    public void run(ApplicationArguments args) {
        try {
            platformBootstrapService.bootstrapIfNeeded();
        }catch (DataIntegrityViolationException e){
            log.warn("Platform admin was bootstrapped by another instance; skipping.");
        }

    }
}
