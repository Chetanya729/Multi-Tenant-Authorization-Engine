
INSERT INTO tenants (tenant_name, slug, type)
VALUES ('Platform', 'platform', 'PLATFORM');

INSERT INTO roles (tenant_id, role_name, description, is_system)
SELECT tenant_id,
       'PLATFORM_ADMIN',
       'Runs the platform: creates tenants and manages their status',
       TRUE
FROM tenants
WHERE slug = 'platform';

INSERT INTO permissions (tenant_id, code, scope, description, is_system)
SELECT t.tenant_id, d.code, d.scope, d.description, TRUE
FROM tenants t
         CROSS JOIN (VALUES
                         ('tenant:create',         'PLATFORM', 'Create a tenant with its first admin'),
                         ('tenant:read',           'PLATFORM', 'List and view tenants'),
                         ('tenant:suspend',        'PLATFORM', 'Suspend or reactivate a tenant'),

                         ('user:create',           'TENANT',   'Add a user'),
                         ('user:read',             'TENANT',   'List and view users'),
                         ('user:update',           'TENANT',   'Edit user details'),
                         ('user:disable',          'TENANT',   'Disable or enable a user'),
                         ('role:create',           'TENANT',   'Create a role'),
                         ('role:read',             'TENANT',   'List and view roles'),
                         ('role:update',           'TENANT',   'Rename a role or edit its description'),
                         ('role:deactivate',       'TENANT',   'Deactivate or reactivate a role'),
                         ('role:assign',           'TENANT',   'Give a role to a user'),
                         ('role:revoke',           'TENANT',   'Remove a role from a user'),
                         ('permission:create',     'TENANT',   'Create a duty'),
                         ('permission:read',       'TENANT',   'List and view duties'),
                         ('permission:update',     'TENANT',   'Edit a duty description'),
                         ('permission:deactivate', 'TENANT',   'Deactivate or reactivate a duty'),
                         ('permission:assign',     'TENANT',   'Attach a duty to a role'),
                         ('permission:revoke',     'TENANT',   'Detach a duty from a role'),
                         ('audit:read',            'TENANT',   'Read the audit log'),
                         ('session:revoke',        'TENANT',   'Force-logout a user')
) AS d (code, scope, description)
WHERE t.slug = 'platform';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
         JOIN tenants t     ON t.tenant_id = r.tenant_id
         JOIN permissions p ON p.tenant_id = t.tenant_id
WHERE t.slug = 'platform'
  AND r.role_name = 'PLATFORM_ADMIN';