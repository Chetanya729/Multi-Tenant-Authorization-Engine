package org.example.multitenant.service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class StandardDuties {
    public record DutySeed(String code, String description) {
    }

    public static final List<DutySeed> ADMIN_DUTIES = List.of(
            new DutySeed("user:create", "Add a user"),
            new DutySeed("user:read", "List and view users"),
            new DutySeed("user:update", "Edit user details"),
            new DutySeed("user:disable", "Disable or enable a user"),
            new DutySeed("role:create", "Create a role"),
            new DutySeed("role:read", "List and view roles"),
            new DutySeed("role:update", "Rename a role or edit its description"),
            new DutySeed("role:deactivate", "Deactivate or reactivate a role"),
            new DutySeed("role:assign", "Give a role to a user"),
            new DutySeed("role:revoke", "Remove a role from a user"),
            new DutySeed("permission:create", "Create a duty"),
            new DutySeed("permission:read", "List and view duties"),
            new DutySeed("permission:update", "Edit a duty description"),
            new DutySeed("permission:deactivate", "Deactivate or reactivate a duty"),
            new DutySeed("permission:assign", "Attach a duty to a role"),
            new DutySeed("permission:revoke", "Detach a duty from a role"),
            new DutySeed("audit:read", "Read the audit log"),
            new DutySeed("session:revoke", "Force-logout a user")
    );
    public static final Set<String> ADMIN_DUTY_CODES = ADMIN_DUTIES.stream()
            .map(DutySeed::code)
            .collect(Collectors.toUnmodifiableSet());
}