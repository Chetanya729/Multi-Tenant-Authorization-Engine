package org.example.multitenant.service;

import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.repository.UserRepo;
import org.example.multitenant.security.AuthenticatedUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class ActorService {

    private final UserRepo userRepo;

    public ActorService(UserRepo userRepo) {
        this.userRepo = userRepo;
    }

    public UserEntity load(AuthenticatedUser actor) {
        UserEntity actorEntity = userRepo.findById(actor.userId())
                .orElseThrow(() -> new IllegalStateException("Authenticated user " + actor.userId() + " no longer exists"));
        if (!Objects.equals(actorEntity.getTenant().getId(), actor.tenantId())) {
            throw new AccessDeniedException("Access Denied");
        }
        return actorEntity;
    }
}
