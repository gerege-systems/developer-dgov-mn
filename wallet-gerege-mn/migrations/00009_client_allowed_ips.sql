-- +goose Up
-- +goose StatementBegin
-- wallet_client-д IP whitelist (allowlist) нэмнэ. Таслалаар тусгаарласан IP/CIDR
-- жагсаалт (жишээ: "203.0.113.5, 10.0.0.0/24"). Хоосон → хязгаарлалтгүй.
-- /oauth/token авах үед client-ийн ирсэн IP-г энэ жагсаалттай тулгана.
ALTER TABLE wallet_client ADD COLUMN allowed_ips text NOT NULL DEFAULT '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE wallet_client DROP COLUMN IF EXISTS allowed_ips;
-- +goose StatementEnd
