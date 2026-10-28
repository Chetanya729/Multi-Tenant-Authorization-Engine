package org.example.multitenant.service;

import org.example.multitenant.config.TokenProperties;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;

@Component
public class AccessTokenStore {

    private static final String ACCESS_TOKEN_PREFIX = "access_token:";
    private static final String USER_TOKENS_PREFIX = "user_tokens:";
    private static final String SEPARATOR = ":";

    private final StringRedisTemplate stringRedisTemplate;
    private final TokenProperties tokenProperties;

    public record StoredAccessToken(Long userId, Long tenantId) {
    }

    public AccessTokenStore(StringRedisTemplate stringRedisTemplate, TokenProperties tokenProperties) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.tokenProperties = tokenProperties;
    }

    public void save(String tokenHash, Long userId, Long tenantId) {
        stringRedisTemplate.opsForValue().set(accessKey(tokenHash), userId + SEPARATOR + tenantId,
                tokenProperties.accessTokenTtl());

        String userKey = userTokensKey(userId);
        stringRedisTemplate.opsForSet().add(userKey, tokenHash);
        stringRedisTemplate.expire(userKey, tokenProperties.accessTokenTtl());
    }

    public Optional<StoredAccessToken> find(String tokenHash) {
        String value = stringRedisTemplate.opsForValue().get(accessKey(tokenHash));
        if (value == null) {
            return Optional.empty();
        }
        String[] values = value.split(SEPARATOR);
        if (values.length != 2) {
            return Optional.empty();
        }
        try {
            return Optional.of(new StoredAccessToken(Long.valueOf(values[0]), Long.valueOf(values[1])));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    public void revoke(String tokenHash) {
        find(tokenHash).ifPresent(token ->
                stringRedisTemplate.opsForSet().remove(userTokensKey(token.userId()), tokenHash));
        stringRedisTemplate.delete(accessKey(tokenHash));
    }

    public void revokeAllForUser(Long userId) {
        String userKey = userTokensKey(userId);
        Set<String> tokenHashes = stringRedisTemplate.opsForSet().members(userKey);
        if (tokenHashes != null && !tokenHashes.isEmpty()) {
            stringRedisTemplate.delete(tokenHashes.stream().map(AccessTokenStore::accessKey).toList());
        }
        stringRedisTemplate.delete(userKey);
    }

    private static String accessKey(String tokenHash) {
        return ACCESS_TOKEN_PREFIX + tokenHash;
    }

    private static String userTokensKey(Long userId) {
        return USER_TOKENS_PREFIX + userId;
    }
}
