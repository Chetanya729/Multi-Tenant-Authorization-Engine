package org.example.multitenant.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.multitenant.service.AccessTokenStore;
import org.example.multitenant.service.TokenGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class TokenAuthorizationFilter extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(TokenAuthorizationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final AccessTokenStore accessTokenStore;
    private final TokenGenerator tokenGenerator;

    public TokenAuthorizationFilter(AccessTokenStore accessTokenStore, TokenGenerator tokenGenerator) {
        this.accessTokenStore = accessTokenStore;
        this.tokenGenerator = tokenGenerator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
            String rawToken = header.substring(BEARER_PREFIX.length()).trim();
            if (!rawToken.isEmpty()) {
                authenticate(rawToken);
            }
        }

        filterChain.doFilter(request, response);
    }

    private void authenticate(String rawToken) {
        try {
            accessTokenStore.find(tokenGenerator.hash(rawToken)).ifPresent(storedToken -> {
                AuthenticatedUser authenticatedUser =
                        new AuthenticatedUser(storedToken.userId(), storedToken.tenantId());

                UsernamePasswordAuthenticationToken authentication =
                        UsernamePasswordAuthenticationToken.authenticated(authenticatedUser, null, List.of());

                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(authentication);
                SecurityContextHolder.setContext(context);
            });
        } catch (DataAccessException e) {
            LOG.warn("Access token store unavailable; request treated as unauthenticated: {}", e.getMessage());
        }
    }
}
