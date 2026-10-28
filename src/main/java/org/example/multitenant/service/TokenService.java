package org.example.multitenant.service;


import org.example.multitenant.config.TokenProperties;
import org.example.multitenant.entity.RefreshTokenEntity;
import org.example.multitenant.entity.UserEntity;
import org.example.multitenant.repository.RefreshTokenRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;


@Service
public class TokenService {

    private final AccessTokenStore accessTokenStore;
    private final TokenGenerator tokenGenerator;
    private final RefreshTokenRepo refreshTokenRepo;
    private final TokenProperties tokenProperties;

    public TokenService(AccessTokenStore accessTokenStore, TokenGenerator tokenGenerator, RefreshTokenRepo refreshTokenRepo, TokenProperties tokenProperties) {
        this.accessTokenStore = accessTokenStore;
        this.tokenGenerator = tokenGenerator;
        this.refreshTokenRepo = refreshTokenRepo;
        this.tokenProperties = tokenProperties;
    }

    public record IssuedTokens(String accessToken, String refreshToken , Long expiresIn) {
    }

    @Transactional
    public IssuedTokens issueTokens(UserEntity user) {
        return issuePair(user, UUID.randomUUID());
    }


    private IssuedTokens issuePair(UserEntity user, UUID familyId) {
        String rawRefresh = tokenGenerator.generate();
        RefreshTokenEntity refreshToken = new RefreshTokenEntity();
        refreshToken.setUser(user);
        refreshToken.setFamilyId(familyId);
        refreshToken.setTokenHash(tokenGenerator.hash(rawRefresh));
        refreshToken.setExpiresAt(Instant.now().plus(tokenProperties.refreshTokenTtl()));
        refreshTokenRepo.save(refreshToken);

        String rawAccessToken = tokenGenerator.generate();
        accessTokenStore.save(tokenGenerator.hash(rawAccessToken), user.getId(), user.getTenant().getId());

        return new IssuedTokens(rawAccessToken, rawRefresh, tokenProperties.accessTokenTtl().toSeconds());

    }
}

