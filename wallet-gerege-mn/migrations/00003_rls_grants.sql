-- +goose Up
-- +goose StatementBegin
-- RLS (owner_id = app.subject = client_id) + least-priv grants + ledger balance
-- trigger. API нь app_user-аар холбогдож зөвхөн ӨӨРИЙН (client_id) хэтэвчид
-- хандана. Дотоод GL leg (account_id IS NULL) хэрэглэгчид нуугдана.
SET search_path TO gerege_platform, public;

-- ---- RLS ----
ALTER TABLE wallet_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_account FORCE  ROW LEVEL SECURITY;
CREATE POLICY rls_wallet_account ON wallet_account
    USING (owner_id = current_setting('app.subject', true))
    WITH CHECK (owner_id = current_setting('app.subject', true));

ALTER TABLE wallet_txn ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_txn FORCE  ROW LEVEL SECURITY;
CREATE POLICY rls_wallet_txn ON wallet_txn
    USING (account_id IN (SELECT id FROM wallet_account WHERE owner_id = current_setting('app.subject', true)))
    WITH CHECK (account_id IN (SELECT id FROM wallet_account WHERE owner_id = current_setting('app.subject', true)));

ALTER TABLE account_hold ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_hold FORCE  ROW LEVEL SECURITY;
CREATE POLICY rls_account_hold ON account_hold
    USING (account_id IN (SELECT id FROM wallet_account WHERE owner_id = current_setting('app.subject', true)))
    WITH CHECK (account_id IN (SELECT id FROM wallet_account WHERE owner_id = current_setting('app.subject', true)));

ALTER TABLE ledger_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entry FORCE  ROW LEVEL SECURITY;
-- Зөвхөн өөрийн дансны харагдах leg (account_id NULL = дотоод GL, нуугдана).
CREATE POLICY rls_ledger_entry ON ledger_entry
    USING (account_id IN (SELECT id FROM wallet_account WHERE owner_id = current_setting('app.subject', true)))
    WITH CHECK (true);

ALTER TABLE wallet_daily_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_daily_snapshot FORCE  ROW LEVEL SECURITY;

-- ---- Grants (least-priv app_user) ----
GRANT SELECT, INSERT, UPDATE ON wallet_account TO app_user;
GRANT SELECT, INSERT ON wallet_txn TO app_user;
GRANT UPDATE (is_reversed, reversed_by_txn_id) ON wallet_txn TO app_user;
GRANT SELECT, INSERT ON ledger_entry TO app_user;
GRANT SELECT, INSERT, UPDATE ON account_hold TO app_user;
GRANT SELECT ON gl_account TO app_user;
GRANT SELECT ON fee_rule   TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON idempotency_keys TO app_user;
GRANT INSERT ON api_audit_logs TO app_user;
GRANT USAGE, SELECT ON SEQUENCE wallet_account_no_seq TO app_user;

-- ---- Ledger balance trigger (audit L3) ----
CREATE FUNCTION wallet_assert_txn_balanced()
RETURNS trigger LANGUAGE plpgsql SET search_path TO gerege_platform, public AS $$
DECLARE v_debit bigint; v_credit bigint;
BEGIN
    SELECT COALESCE(sum(amount_minor) FILTER (WHERE direction='DEBIT'),0),
           COALESCE(sum(amount_minor) FILTER (WHERE direction='CREDIT'),0)
      INTO v_debit, v_credit FROM ledger_entry WHERE txn_id = NEW.txn_id;
    IF v_debit <> v_credit THEN
        RAISE EXCEPTION 'ledger txn % unbalanced: debit=% credit=%', NEW.txn_id, v_debit, v_credit USING ERRCODE='check_violation';
    END IF;
    RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER trg_ledger_txn_balanced
    AFTER INSERT ON ledger_entry DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION wallet_assert_txn_balanced();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS trg_ledger_txn_balanced ON ledger_entry;
DROP FUNCTION IF EXISTS wallet_assert_txn_balanced();
DROP POLICY IF EXISTS rls_ledger_entry  ON ledger_entry;
DROP POLICY IF EXISTS rls_account_hold  ON account_hold;
DROP POLICY IF EXISTS rls_wallet_txn    ON wallet_txn;
DROP POLICY IF EXISTS rls_wallet_account ON wallet_account;
-- +goose StatementEnd
