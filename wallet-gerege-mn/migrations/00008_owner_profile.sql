-- +goose Up
-- +goose StatementBegin
-- wallet_owner_profile — хэтэвчний эзэн (иргэн)-ий ДҮРС (display) snapshot.
-- me.gerege.mn нь иргэн нэвтэрч хэтэвчдээ хандах үед өөрийн токеноор энэ
-- профайлыг push хийнэ (PUT /api/v1/wallet/profile). Identity-ийн эх сурвалж
-- нь auth/me хэвээр; энэ нь зөвхөн admin-д нэр/KYC харуулах денормчлол.
-- owner_id = токены subject (me-ийн user UUID эсвэл client_id).
CREATE TABLE wallet_owner_profile (
    owner_id     VARCHAR(64)  PRIMARY KEY,
    full_name    VARCHAR(160),
    given_name   VARCHAR(80),
    family_name  VARCHAR(80),
    national_id  VARCHAR(32),                       -- регистр (KYC); admin masked харуулна
    phone        VARCHAR(32),
    email        VARCHAR(160),
    kyc_verified boolean      NOT NULL DEFAULT false, -- eID-ээр баталгаажсан эсэх
    source       VARCHAR(48),                        -- 'me.gerege.mn'
    updated_at   timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE wallet_owner_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_owner_profile FORCE ROW LEVEL SECURITY;

-- Эзэн зөвхөн ӨӨРИЙН профайлыг унших/бичнэ (app_user role + app.subject).
CREATE POLICY owner_profile_self ON wallet_owner_profile
    USING (owner_id = current_setting('app.subject', true))
    WITH CHECK (owner_id = current_setting('app.subject', true));

GRANT SELECT, INSERT, UPDATE ON wallet_owner_profile TO app_user;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS wallet_owner_profile;
-- +goose StatementEnd
