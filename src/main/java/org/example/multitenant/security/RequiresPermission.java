package org.example.multitenant.security;

import org.example.multitenant.enums.PermissionScope;
import java.lang.annotation.*;


@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequiresPermission {

    String value();
    PermissionScope scope() default PermissionScope.PLATFORM;
}
