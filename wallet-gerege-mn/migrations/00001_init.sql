-- +goose Up
-- +goose StatementBegin
-- wallet.gerege.mn — бие даасан схемийн суурь (extensions, role, туслах хүснэгт,
-- client_credentials бүртгэл). Энэ нь auth.gerege.mn-аас ХАМААРАЛГҮЙ, өөрийн
-- Postgres дээр ажиллах migration set. search_path: gerege_platform.
--
-- migrate runner нь superuser DSN-ээр ажиллана (role + schema үүсгэнэ). API нь
-- app_user (RLS), worker нь superuser/admin-аар холбогдоно.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS gerege_platform;
SET search_path TO gerege_platform, public;

-- Least-priv API role (RLS FORCE-ийн дор хэтэвчид хандана). Нууц үгийг deploy
-- үед ALTER ROLE ... PASSWORD-аар тавина.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user NOLOGIN;
    END IF;
END$$;
GRANT USAGE ON SCHEMA gerege_platform TO app_user;

-- Idempotency keys — давхар бичилтээс хамгаалах (deposit/withdraw/transfer).
CREATE TABLE idempotency_keys (
    key             VARCHAR(128) NOT NULL,
    actor_subject   VARCHAR(64)  NOT NULL,
    request_hash    VARCHAR(64),
    response_status integer,
    response_body   bytea,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (key, actor_subject)
);

-- Append-only audit log (HTTP давхаргаас бичигдэнэ).
CREATE TABLE api_audit_logs (
    id            uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_subject VARCHAR(64),
    action        VARCHAR(64)   NOT NULL,
    target        VARCHAR(255),
    method        VARCHAR(8)    NOT NULL,
    path          VARCHAR(500)  NOT NULL,
    status_code   integer       NOT NULL,
    ip            VARCHAR(64),
    user_agent    VARCHAR(500),
    request_id    VARCHAR(64),
    extra         jsonb,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    latency_ms    bigint
);
CREATE INDEX idx_api_audit_logs_created_at ON api_audit_logs (created_at DESC);
CREATE INDEX idx_api_audit_logs_actor      ON api_audit_logs (actor_subject) WHERE actor_subject IS NOT NULL;

-- wallet_client — OAuth2 client_credentials бүртгэл. Бусад систем client_id +
-- client_secret-ээр /oauth/token-оос wallet JWT авна. secret_hash нь bcrypt.
-- client_id нь хэтэвчний эзэн (owner) болно (RLS subject).
CREATE TABLE wallet_client (
    client_id     VARCHAR(64)  NOT NULL PRIMARY KEY,
    secret_hash   VARCHAR(255) NOT NULL,
    name          VARCHAR(128) NOT NULL,
    scopes        text[]       NOT NULL DEFAULT ARRAY['wallet']::text[],
    active        boolean      NOT NULL DEFAULT true,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    last_used_at  timestamptz
);
GRANT SELECT ON wallet_client TO app_user;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS wallet_client;
DROP TABLE IF EXISTS api_audit_logs;
DROP TABLE IF EXISTS idempotency_keys;
-- role/schema/extension-ийг үлдээнэ (бусад obj хамаарч болзошгүй).
-- +goose StatementEnd
