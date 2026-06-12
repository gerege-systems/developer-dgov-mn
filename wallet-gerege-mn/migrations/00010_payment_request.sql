-- +goose Up
-- +goose StatementBegin
-- payment_request — QR төлбөр / нэхэмжлэх (invoice) давхарга.
--   kind='static'  : худалдаачны байнгын QR (дүнгүй, хугацаагүй, олон удаа төлөгдөнө)
--   kind='dynamic' : нэхэмжлэх — тогтсон дүн + хугацаатай, нэг удаа төлөгдөнө
-- payee_owner = хүлээн авагчийн owner_id (RLS). Settlement нь wallet_transfer-ээр.
CREATE TABLE payment_request (
    id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    kind              text        NOT NULL CHECK (kind IN ('static','dynamic')),
    payee_owner       text        NOT NULL,
    payee_account_no  text        NOT NULL,
    amount_minor      bigint,                       -- NULL = static (нээлттэй дүн)
    currency          text        NOT NULL DEFAULT 'MNT',
    reference         text        NOT NULL DEFAULT '',
    status            text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('active','pending','paid','expired','canceled')),
    expires_at        timestamptz,
    paid_txn_id       uuid,
    paid_by           text,
    paid_at           timestamptz,
    paid_amount_minor bigint,
    created_by        text        NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_request_payee ON payment_request (payee_owner, created_at DESC);

ALTER TABLE payment_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_request FORCE ROW LEVEL SECURITY;
-- Хүлээн авагч зөвхөн ӨӨРИЙН нэхэмжлэхийг үүсгэх/унших/цуцлах.
CREATE POLICY payment_request_self ON payment_request
    USING (payee_owner = current_setting('app.subject', true))
    WITH CHECK (payee_owner = current_setting('app.subject', true));
GRANT SELECT, INSERT, UPDATE ON payment_request TO app_user;
-- +goose StatementEnd

-- +goose StatementBegin
-- pay_request — төлөгч (p_payer) нэхэмжлэхийг төлнө. SECURITY DEFINER тул RLS
-- тойрч payee-гийн нэхэмжлэхийг уншиж, wallet_transfer-ээр settle хийнэ. Атомик.
CREATE FUNCTION pay_request(p_payer text, p_request_id uuid, p_amount bigint, p_external_ref text)
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
        v_amount := r.amount_minor;            -- сервер дүнг тогтооно (tamper-safe)
    ELSE
        v_amount := p_amount;                  -- static: төлөгч дүнг өгнө
    END IF;
    IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'wallet_invalid_amount'; END IF;
    SELECT id INTO v_from FROM wallet_account WHERE owner_id = p_payer AND status = 'active'
        ORDER BY created_at LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'payer_wallet_not_found'; END IF;

    v_txn := wallet_transfer(p_payer, v_from, r.payee_account_no, v_amount, 0, 'qr', p_external_ref);

    IF r.kind = 'dynamic' THEN
        UPDATE payment_request SET status='paid', paid_txn_id=v_txn, paid_by=p_payer,
               paid_at=now(), paid_amount_minor=v_amount WHERE id = r.id;
    ELSE
        UPDATE payment_request SET paid_txn_id=v_txn, paid_by=p_payer,
               paid_at=now(), paid_amount_minor=v_amount WHERE id = r.id;
    END IF;
    RETURN v_txn;
END $$;
REVOKE EXECUTE ON FUNCTION pay_request(text,uuid,bigint,text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION pay_request(text,uuid,bigint,text) TO app_user;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP FUNCTION IF EXISTS pay_request(text,uuid,bigint,text);
DROP TABLE IF EXISTS payment_request;
-- +goose StatementEnd
