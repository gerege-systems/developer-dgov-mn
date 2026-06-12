-- +goose Up
-- +goose StatementBegin
-- Партнёр webhook: client-д төлбөр орсон үед HMAC гарын үсэгтэй мэдэгдэл илгээнэ.
ALTER TABLE wallet_client ADD COLUMN webhook_url    text NOT NULL DEFAULT '';
ALTER TABLE wallet_client ADD COLUMN webhook_secret text NOT NULL DEFAULT '';

CREATE TABLE webhook_delivery (
    id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id       text        NOT NULL,
    event           text        NOT NULL,
    url             text        NOT NULL,
    payload         text        NOT NULL,
    status          text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','delivered','failed')),
    attempts        int         NOT NULL DEFAULT 0,
    last_error      text        NOT NULL DEFAULT '',
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    delivered_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_due ON webhook_delivery (next_attempt_at) WHERE status = 'pending';
-- +goose StatementEnd

-- +goose StatementBegin
-- pay_request — settle хийсний дараа payee client-д webhook дараалалд оруулна.
CREATE OR REPLACE FUNCTION pay_request(p_payer text, p_request_id uuid, p_amount bigint, p_fee bigint, p_external_ref text)
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
    IF r.kind = 'dynamic' THEN v_amount := r.amount_minor; ELSE v_amount := p_amount; END IF;
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

    -- Webhook: payee нь webhook_url-тэй идэвхтэй client бол дараалалд оруулна.
    INSERT INTO webhook_delivery (client_id, event, url, payload)
    SELECT c.client_id, 'payment.paid', c.webhook_url,
           json_build_object('event','payment.paid','request_id',r.id,'txn_id',v_txn,
               'amount_minor',v_amount,'currency',r.currency,'reference',r.reference,
               'kind',r.kind,'paid_by',p_payer,'paid_at',now())::text
    FROM wallet_client c
    WHERE c.client_id = r.payee_owner AND c.webhook_url <> '' AND c.active;

    RETURN v_txn;
END $$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS webhook_delivery;
ALTER TABLE wallet_client DROP COLUMN IF EXISTS webhook_url;
ALTER TABLE wallet_client DROP COLUMN IF EXISTS webhook_secret;
-- +goose StatementEnd
