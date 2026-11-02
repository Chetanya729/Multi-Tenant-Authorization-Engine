ALTER TABLE users
    ADD COLUMN temporary_password BOOLEAN NOT NULL DEFAULT FALSE ,
    ADD COLUMN temp_pass_expiry_at TIMESTAMPTZ;

ALTER TABLE users
    ADD CONSTRAINT ck_temporary_password_check CHECK (
        (users.temporary_password AND users.temp_pass_expiry_at IS NOT NULL )
        OR ( NOT users.temporary_password AND users.temp_pass_expiry_at IS NULL )
        );

