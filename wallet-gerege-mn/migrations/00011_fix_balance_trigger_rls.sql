-- +goose Up
-- +goose StatementBegin
-- ЗАСВАР: ledger balance trigger нь app_user-ийн RLS-д хамрагдаж байсан.
-- ledger_entry-д FORCE RLS (зөвхөн өөрийн дансны leg харагдана; account_id NULL
-- буюу GL leg + нөгөө талын leg нуугдана) тул API write (transfer/withdraw/QR pay)
-- нь app_user-ээр commit хийхэд trigger зөвхөн нэг талыг хараад "unbalanced" гэж
-- БУРУУ алдаа өгдөг байв. SECURITY DEFINER болгож RLS-ийг тойруулна (зөвхөн нийлбэр
-- шалгана, өгөгдөл задруулахгүй).
ALTER FUNCTION wallet_assert_txn_balanced() SECURITY DEFINER;

-- Audit: action багана (method + path) урт QR path-уудад (uuid-тай) 64 тэмдэгтээс
-- хэтэрч "value too long" warn өгч байсан — өргөтгөнө.
ALTER TABLE api_audit_logs ALTER COLUMN action TYPE varchar(200);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER FUNCTION wallet_assert_txn_balanced() SECURITY INVOKER;
-- +goose StatementEnd
