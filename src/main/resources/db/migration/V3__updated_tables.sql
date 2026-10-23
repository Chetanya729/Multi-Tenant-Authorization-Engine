ALTER TABLE permissions
    ADD COLUMN tenant_id BIGINT NOT NULL;

ALTER TABLE permissions
    ADD CONSTRAINT fk_permissions_tenant FOREIGN KEY (tenant_id)
        REFERENCES tenants (tenant_id) ON DELETE RESTRICT;

ALTER TABLE permissions
    ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE permissions
DROP CONSTRAINT uk_permissions_code;

ALTER TABLE permissions
    ADD CONSTRAINT uk_permissions_tenant_code UNIQUE (tenant_id, code);
