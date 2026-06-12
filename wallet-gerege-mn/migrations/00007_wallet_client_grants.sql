-- +goose Up
-- +goose StatementBegin
-- m6: app_user-д wallet_client дээр UPDATE GRANT нэмнэ.
--
-- TouchClientUsed (POST /oauth/token-ийн дараа `last_used_at = now()` бичнэ)
-- нь fire-and-forget — алдааг үл тоомсорлодог. m1-д зөвхөн `SELECT GRANT`
-- байсан тул UPDATE чимээгүй унаж auditable-client-usage сигнал хоосон үлддэг.
-- last_used_at баганад зөвхөн ингэж бичигдэх тул UPDATE-ийг л зөвшөөрнө
-- (бусад баганад ALTER TABLE / SECURITY DEFINER-ээр л хүрнэ).

GRANT UPDATE (last_used_at) ON wallet_client TO app_user;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
REVOKE UPDATE (last_used_at) ON wallet_client FROM app_user;
-- +goose StatementEnd
