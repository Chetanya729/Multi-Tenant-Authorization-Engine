package org.example.multitenant.security;

import jakarta.servlet.http.HttpServletRequest;
import org.example.multitenant.enums.PermissionScope;
import org.example.multitenant.service.EffectivePermissionService;
import org.jspecify.annotations.Nullable;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.AuthorizationResult;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerExecutionChain;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.util.ServletRequestPathUtils;

import java.util.Set;
import java.util.function.Supplier;

@Component
public class PermissionAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    private static final Logger log = LoggerFactory.getLogger(PermissionAuthorizationManager.class);
    private final EffectivePermissionService effectivePermissionService;
    private final RequestMappingHandlerMapping requestMappingHandlerMapping;

    private static final AuthorizationDecision DENY = new AuthorizationDecision(false);
    private static final AuthorizationDecision GRANT = new AuthorizationDecision(true);

    public PermissionAuthorizationManager(EffectivePermissionService effectivePermissionService,
                                          @Qualifier("requestMappingHandlerMapping")
                                          RequestMappingHandlerMapping requestMappingHandlerMapping) {
        this.effectivePermissionService = effectivePermissionService;
        this.requestMappingHandlerMapping = requestMappingHandlerMapping;
    }

    @Override
    public @Nullable AuthorizationResult authorize(Supplier<? extends @Nullable Authentication> authentication,
                                                   RequestAuthorizationContext context) {
        Authentication auth = authentication.get();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser user)) {
            return DENY;
        }

        HttpServletRequest request = context.getRequest();
        HandlerMethod method = resolvesHandlerMethod(request);
        if (method == null) {
            log.debug("No handler for {} {}; denying", request.getMethod(), request.getRequestURI());
            return DENY;
        }

        RequiresPermission requiresPermission = method.getMethodAnnotation(RequiresPermission.class);
        AuthenticatedOnly authenticatedOnly = method.getMethodAnnotation(AuthenticatedOnly.class);

        if (requiresPermission == null && authenticatedOnly == null) {
            Class<?> controller = method.getBeanType();
            requiresPermission = AnnotatedElementUtils.findMergedAnnotation(controller, RequiresPermission.class);
            authenticatedOnly = AnnotatedElementUtils.findMergedAnnotation(controller, AuthenticatedOnly.class);
        }

        if (requiresPermission != null && authenticatedOnly != null) {
            log.warn("{} has both @RequiresPermission and @AuthenticatedOnly; denying",
                    method.getShortLogMessage());
            return DENY;
        }
        if (authenticatedOnly != null) {
            return GRANT;
        }
        if (requiresPermission == null) {
            log.warn("{} has no @RequiresPermission or @AuthenticatedOnly; denying",
                    method.getShortLogMessage());
            return DENY;
        }

        if (hasDuty(user.userId(), requiresPermission)) {
            return GRANT;
        }
        log.debug("User {} denied {} {}: missing duty {}", user.userId(), request.getMethod(),
                request.getRequestURI(), requiresPermission.value());
        return DENY;
    }

    private HandlerMethod resolvesHandlerMethod(HttpServletRequest httpServletRequest) {
        boolean parsedHere = false;
        try {
            if (!ServletRequestPathUtils.hasParsedRequestPath(httpServletRequest)) {
                ServletRequestPathUtils.parseAndCache(httpServletRequest);
                parsedHere = true;
            }
            HandlerExecutionChain chain = requestMappingHandlerMapping.getHandler(httpServletRequest);
            if(chain !=null && chain.getHandler() instanceof HandlerMethod handlerMethod) {
                return handlerMethod;
            }
            return null;
        }catch (Exception e) {
            log.debug("Cannot get the handler for {} {} : {}", httpServletRequest.getMethod(), httpServletRequest.getRequestURI(), e.getMessage());
            return  null;
        }
        finally {
            if (parsedHere) {
                ServletRequestPathUtils.clearParsedRequestPath(httpServletRequest);
            }
        }
    }

    private boolean hasDuty(Long userId, RequiresPermission rule){
        Set<String> duties = rule.scope() == PermissionScope.PLATFORM
                ? effectivePermissionService.platformDutyCodes(userId)
                : effectivePermissionService.userDutyCodes(userId);
        return duties.contains(rule.value());
    }
}
