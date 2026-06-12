-- +goose Up
-- +goose StatementBegin
-- wallet_admin — super-admin нэвтрэлт (тусдаа admin API). username + bcrypt
-- password. Эхний admin-ийг cmd/client (admin <username>)-ээр үүсгэнэ. Admin API
-- superuser DSN-ээр холбогдох тул table-level grant шаардахгүй (RLS тойрно).
SET search_path TO gerege_platform, public;

CREATE TABLE wallet_admin (
    username      VARCHAR(64)  NOT NULL PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(128) NOT NULL DEFAULT '',
    active        boolean      NOT NULL DEFAULT true,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    last_login_at timestamptz
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS wallet_admin;
-- +goose StatementEnd
