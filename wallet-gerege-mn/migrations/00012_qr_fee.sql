-- +goose Up
-- +goose StatementBegin
-- QR төлбөрт шимтгэл (fee_rule) холбоно. pay_request-д p_fee параметр нэмж,
-- wallet_transfer-ээр төлөгчөөс шимтгэл авна. Шимтгэлийг usecase нь fee_rule-ээс
-- тооцоолно (идэвхгүй бол 0).
DROP FUNCTION IF EXISTS pay_request(text,uuid,bigint,text);

CREATE FUNCTION pay_request(p_payer text, p_request_id uuid, p_amount bigint, p_fee bigint, p_external_ref text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'gerege_platform','public','pg_temp' AS $$
DECLARE r payment_request; v_from uuid; v_amount bigint; v_txn uuid;
BEGIN
    SELECT * INTO r FROM payment_request WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
    IF r.status NOT IN ('active','pending') THEN RAISE EXCEPTION 'request_not_payable'; END IF;
    IF r.expires_at IS NOT NULL AND r.expires_at < now() THEN
        UPDATE payment_request SET status='expired' WHERE id = r.id;
        RAISE EXCEPTION 'request_expired';
    END IF;
    IF r.payee_owner = p_payer THEN RAISE EXCEPTION 'cannot_pay_self'; END IF;
    IF r.kind = 'dynamic' THEN
        v_amount := r.amount_minor;
    ELSE
        v_amount := p_amount;
    END IF;
    IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'wallet_invalid_amount'; END IF;
    SELECT id INTO v_from FROM wallet_account WHERE owner_id = p_payer AND status = 'active'
        ORDER BY created_at LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'payer_wallet_not_found'; END IF;

    v_txn := wallet_transfer(p_payer, v_from, r.payee_account_no, v_amount, COALESCE(p_fee,0), 'qr', p_external_ref);

    IF r.kind = 'dynamic' THEN
        UPDATE payment_request SET status='paid', paid_txn_id=v_txn, paid_by=p_payer,
               paid_at=now(), paid_amount_minor=v_amount WHERE id = r.id;
    ELSE
        UPDATE payment_request SET paid_txn_id=v_txn, paid_by=p_payer,
               paid_at=now(), paid_amount_minor=v_amount WHERE id = r.id;
    END IF;
    RETURN v_txn;
END $$;
REVOKE EXECUTE ON FUNCTION pay_request(text,uuid,bigint,bigint,text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION pay_request(text,uuid,bigint,bigint,text) TO app_user;

-- QR төлбөрийн шимтгэлийн дүрэм (анхдагч ИДЭВХГҮЙ — гэнэтийн шимтгэлгүй).
INSERT INTO fee_rule (code, txn_type, owner_type, channel, method, percent_bps, min_minor, gl_account, priority, active)
VALUES ('qr_payment_fee', 'transfer_out', NULL, 'qr', 'PERCENT', 0, NULL, 'fee_income', 5, false)
ON CONFLICT (code) DO NOTHING;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM fee_rule WHERE code = 'qr_payment_fee';
DROP FUNCTION IF EXISTS pay_request(text,uuid,bigint,bigint,text);
-- +goose StatementEnd
