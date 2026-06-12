-- +goose Up
-- +goose StatementBegin
-- SECURITY DEFINER функцүүд. Бие даасан хувилбар: wallet_transfer-аас org/
-- membership хамаарал арилгасан (actor = owner = client_id). reconcile/snapshot/
-- expire/report нь worker (superuser DSN)-ээр дуудагдана; transfer/gateway нь
-- app_user-аар (API). Бүгд search_path тогтоосон + REVOKE FROM PUBLIC.
SET search_path TO gerege_platform, public;

-- deposit external_ref idempotency (gateway).
CREATE UNIQUE INDEX uq_deposit_external_ref ON wallet_txn (external_ref)
    WHERE type = 'deposit' AND external_ref IS NOT NULL;

-- ---- wallet_transfer (org-гүй; actor = эх дансны эзэн client_id) ----
CREATE FUNCTION wallet_transfer(p_actor text, p_from_account uuid, p_to_account_no text,
                                p_amount bigint, p_fee bigint, p_channel text, p_external_ref text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'gerege_platform','public','pg_temp' AS $$
DECLARE v_from wallet_account; v_to wallet_account; v_to_id uuid; v_out uuid; v_in uuid; v_fee uuid;
BEGIN
    IF p_amount <= 0 THEN RAISE EXCEPTION 'wallet_invalid_amount'; END IF;
    SELECT id INTO v_to_id FROM wallet_account WHERE account_no = p_to_account_no;
    IF NOT FOUND THEN RAISE EXCEPTION 'wallet_not_found'; END IF;
    -- id-ийн өсөх дарааллаар тус тусдаа lock (deadlock-safe, audit H4).
    IF p_from_account < v_to_id THEN
        PERFORM 1 FROM wallet_account WHERE id = p_from_account FOR UPDATE;
        PERFORM 1 FROM wallet_account WHERE id = v_to_id       FOR UPDATE;
    ELSE
        PERFORM 1 FROM wallet_account WHERE id = v_to_id       FOR UPDATE;
        PERFORM 1 FROM wallet_account WHERE id = p_from_account FOR UPDATE;
    END IF;
    SELECT * INTO v_from FROM wallet_account WHERE id = p_from_account;
    IF NOT FOUND THEN RAISE EXCEPTION 'wallet_not_found'; END IF;
    SELECT * INTO v_to FROM wallet_account WHERE id = v_to_id;
    IF v_from.owner_id <> p_actor THEN RAISE EXCEPTION 'wallet_forbidden'; END IF;
    IF v_from.id = v_to.id THEN RAISE EXCEPTION 'wallet_same_account'; END IF;
    IF v_from.status <> 'active' OR v_to.status <> 'active' THEN RAISE EXCEPTION 'wallet_inactive'; END IF;
    IF (v_from.balance_minor - v_from.hold_minor) < (p_amount + p_fee) THEN RAISE EXCEPTION 'wallet_insufficient_funds'; END IF;

    INSERT INTO wallet_txn (account_id, type, amount_minor, running_balance_minor, channel, created_by, external_ref)
      VALUES (v_from.id, 'transfer_out', p_amount, v_from.balance_minor - p_amount, NULLIF(p_channel,''), p_actor, NULLIF(p_external_ref,'')) RETURNING id INTO v_out;
    INSERT INTO wallet_txn (account_id, type, amount_minor, running_balance_minor, channel, created_by, counterparty_txn_id)
      VALUES (v_to.id, 'transfer_in', p_amount, v_to.balance_minor + p_amount, NULLIF(p_channel,''), p_actor, v_out) RETURNING id INTO v_in;
    UPDATE wallet_txn SET counterparty_txn_id = v_in WHERE id = v_out;
    INSERT INTO ledger_entry (txn_id, gl_account, account_id, direction, amount_minor) VALUES
      (v_out,'customer_wallet_liability',v_from.id,'DEBIT',p_amount),
      (v_out,'internal_transfer_clearing',NULL,'CREDIT',p_amount),
      (v_in,'internal_transfer_clearing',NULL,'DEBIT',p_amount),
      (v_in,'customer_wallet_liability',v_to.id,'CREDIT',p_amount);
    IF p_fee > 0 THEN
        INSERT INTO wallet_txn (account_id, type, amount_minor, running_balance_minor, channel, created_by)
          VALUES (v_from.id,'fee',p_fee,v_from.balance_minor - p_amount - p_fee, NULLIF(p_channel,''), p_actor) RETURNING id INTO v_fee;
        INSERT INTO ledger_entry (txn_id, gl_account, account_id, direction, amount_minor) VALUES
          (v_fee,'customer_wallet_liability',v_from.id,'DEBIT',p_fee),
          (v_fee,'fee_income',NULL,'CREDIT',p_fee);
    END IF;
    UPDATE wallet_account SET balance_minor = balance_minor - p_amount - p_fee, version=version+1, updated_at=now() WHERE id=v_from.id;
    UPDATE wallet_account SET balance_minor = balance_minor + p_amount, version=version+1, updated_at=now() WHERE id=v_to.id;
    RETURN v_out;
END; $$;
REVOKE EXECUTE ON FUNCTION wallet_transfer(text,uuid,text,bigint,bigint,text,text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION wallet_transfer(text,uuid,text,bigint,bigint,text,text) TO app_user;

-- ---- wallet_gateway_deposit (account_no-оор, external_ref idempotent) ----
CREATE FUNCTION wallet_gateway_deposit(p_account_no text, p_amount bigint, p_external_ref text, p_channel text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'gerege_platform','public','pg_temp' AS $$
DECLARE v_acc wallet_account; v_txn uuid; v_existing uuid;
BEGIN
    IF p_amount <= 0 THEN RAISE EXCEPTION 'wallet_invalid_amount'; END IF;
    IF p_external_ref IS NULL OR p_external_ref = '' THEN RAISE EXCEPTION 'wallet_missing_ref'; END IF;
    SELECT id INTO v_existing FROM wallet_txn WHERE type='deposit' AND external_ref = p_external_ref LIMIT 1;
    IF FOUND THEN RETURN v_existing; END IF;
    SELECT * INTO v_acc FROM wallet_account WHERE account_no = p_account_no FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'wallet_not_found'; END IF;
    IF v_acc.status <> 'active' THEN RAISE EXCEPTION 'wallet_inactive'; END IF;
    INSERT INTO wallet_txn (account_id, type, amount_minor, running_balance_minor, external_ref, channel, created_by)
      VALUES (v_acc.id,'deposit',p_amount,v_acc.balance_minor + p_amount, p_external_ref, NULLIF(p_channel,''), 'gateway') RETURNING id INTO v_txn;
    INSERT INTO ledger_entry (txn_id, gl_account, account_id, direction, amount_minor) VALUES
      (v_txn,'bank_settlement',NULL,'DEBIT',p_amount),
      (v_txn,'customer_wallet_liability',v_acc.id,'CREDIT',p_amount);
    UPDATE wallet_account SET balance_minor = balance_minor + p_amount, version=version+1, updated_at=now() WHERE id=v_acc.id;
    RETURN v_txn;
END; $$;
REVOKE EXECUTE ON FUNCTION wallet_gateway_deposit(text,bigint,text,text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION wallet_gateway_deposit(text,bigint,text,text) TO app_user;

-- ---- wallet_reconcile ----
CREATE FUNCTION wallet_reconcile()
RETURNS TABLE(check_type text, ref text, expected_minor bigint, actual_minor bigint)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'gerege_platform','public' AS $$
    SELECT 'txn_balance', le.txn_id::text,
           COALESCE(sum(le.amount_minor) FILTER (WHERE le.direction='CREDIT'),0),
           COALESCE(sum(le.amount_minor) FILTER (WHERE le.direction='DEBIT'),0)
    FROM ledger_entry le GROUP BY le.txn_id
    HAVING COALESCE(sum(le.amount_minor) FILTER (WHERE le.direction='DEBIT'),0) <> COALESCE(sum(le.amount_minor) FILTER (WHERE le.direction='CREDIT'),0)
    UNION ALL
    SELECT 'derived_balance', a.account_no, COALESCE(le.net,0), a.balance_minor
    FROM wallet_account a LEFT JOIN (
        SELECT account_id, sum(CASE WHEN direction='CREDIT' THEN amount_minor ELSE -amount_minor END) AS net
        FROM ledger_entry WHERE gl_account='customer_wallet_liability' AND account_id IS NOT NULL GROUP BY account_id
    ) le ON le.account_id = a.id WHERE a.balance_minor <> COALESCE(le.net,0)
    UNION ALL
    SELECT 'hold_balance', a.account_no, COALESCE(h.s,0), a.hold_minor
    FROM wallet_account a LEFT JOIN (
        SELECT account_id, sum(amount_minor) AS s FROM account_hold WHERE status='active' GROUP BY account_id
    ) h ON h.account_id = a.id WHERE a.hold_minor <> COALESCE(h.s,0)
    UNION ALL
    SELECT 'gl_balance','GLOBAL',
           COALESCE(sum(amount_minor) FILTER (WHERE direction='CREDIT'),0),
           COALESCE(sum(amount_minor) FILTER (WHERE direction='DEBIT'),0)
    FROM ledger_entry
    HAVING COALESCE(sum(amount_minor) FILTER (WHERE direction='DEBIT'),0) <> COALESCE(sum(amount_minor) FILTER (WHERE direction='CREDIT'),0);
$$;
REVOKE EXECUTE ON FUNCTION wallet_reconcile() FROM PUBLIC;

-- ---- wallet_snapshot (incremental) ----
CREATE FUNCTION wallet_snapshot(p_date date)
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'gerege_platform','public' AS $$
DECLARE v_count integer;
    v_start timestamptz := (p_date::timestamp AT TIME ZONE 'Asia/Ulaanbaatar');
    v_end   timestamptz := ((p_date+1)::timestamp AT TIME ZONE 'Asia/Ulaanbaatar');
BEGIN
    INSERT INTO wallet_daily_snapshot (snapshot_date, account_id, account_no, owner_type, owner_id, opening_minor, credit_minor, debit_minor, closing_minor, hold_minor, txn_count)
    SELECT p_date, a.id, a.account_no, a.owner_type, a.owner_id,
           opening.v, COALESCE(d.credit,0), COALESCE(d.debit,0),
           opening.v + COALESCE(d.credit,0) - COALESCE(d.debit,0), a.hold_minor, COALESCE(d.cnt,0)
    FROM wallet_account a
    CROSS JOIN LATERAL (SELECT COALESCE(
        (SELECT s.closing_minor FROM wallet_daily_snapshot s WHERE s.account_id=a.id AND s.snapshot_date=p_date-1),
        (SELECT COALESCE(sum(CASE WHEN direction='CREDIT' THEN amount_minor ELSE -amount_minor END),0)
         FROM ledger_entry WHERE gl_account='customer_wallet_liability' AND account_id=a.id AND created_at < v_start)) AS v) opening
    LEFT JOIN (
        SELECT account_id,
               COALESCE(sum(amount_minor) FILTER (WHERE direction='CREDIT'),0) AS credit,
               COALESCE(sum(amount_minor) FILTER (WHERE direction='DEBIT'),0) AS debit,
               count(DISTINCT txn_id) AS cnt
        FROM ledger_entry WHERE gl_account='customer_wallet_liability' AND account_id IS NOT NULL
          AND created_at >= v_start AND created_at < v_end GROUP BY account_id
    ) d ON d.account_id = a.id
    WHERE a.created_at < v_end
    ON CONFLICT (snapshot_date, account_id) DO UPDATE SET
        account_no=EXCLUDED.account_no, owner_type=EXCLUDED.owner_type, owner_id=EXCLUDED.owner_id,
        opening_minor=EXCLUDED.opening_minor, credit_minor=EXCLUDED.credit_minor, debit_minor=EXCLUDED.debit_minor,
        closing_minor=EXCLUDED.closing_minor, hold_minor=EXCLUDED.hold_minor, txn_count=EXCLUDED.txn_count, created_at=now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END; $$;
REVOKE EXECUTE ON FUNCTION wallet_snapshot(date) FROM PUBLIC;

-- ---- wallet_expire_holds ----
CREATE FUNCTION wallet_expire_holds()
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'gerege_platform','public' AS $$
DECLARE v_count integer := 0; r record;
BEGIN
    FOR r IN SELECT id, account_id, amount_minor, external_ref FROM account_hold
             WHERE status='active' AND expires_at IS NOT NULL AND expires_at < now() ORDER BY account_id, id FOR UPDATE LOOP
        PERFORM 1 FROM wallet_account WHERE id = r.account_id FOR UPDATE;
        UPDATE account_hold SET status='expired' WHERE id = r.id;
        INSERT INTO wallet_txn (account_id, type, amount_minor, running_balance_minor, external_ref, channel, created_by)
          SELECT r.account_id,'release',r.amount_minor,balance_minor, NULLIF(r.external_ref,''),'cron','system' FROM wallet_account WHERE id=r.account_id;
        UPDATE wallet_account SET hold_minor = hold_minor - r.amount_minor, version=version+1, updated_at=now() WHERE id=r.account_id;
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END; $$;
REVOKE EXECUTE ON FUNCTION wallet_expire_holds() FROM PUBLIC;

-- ---- report функцүүд (worker/admin) ----
CREATE FUNCTION wallet_report_trial_balance(p_date date)
RETURNS TABLE(gl_account text, gl_type text, gl_name text, debit_minor bigint, credit_minor bigint, balance_minor bigint)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'gerege_platform','public' AS $$
    WITH bound AS (SELECT ((p_date+1)::timestamp AT TIME ZONE 'Asia/Ulaanbaatar') AS v_end)
    SELECT g.code, g.type, g.name,
           COALESCE(sum(le.amount_minor) FILTER (WHERE le.direction='DEBIT'),0),
           COALESCE(sum(le.amount_minor) FILTER (WHERE le.direction='CREDIT'),0),
           CASE WHEN g.type IN ('ASSET','EXPENSE')
                THEN COALESCE(sum(le.amount_minor) FILTER (WHERE le.direction='DEBIT'),0) - COALESCE(sum(le.amount_minor) FILTER (WHERE le.direction='CREDIT'),0)
                ELSE COALESCE(sum(le.amount_minor) FILTER (WHERE le.direction='CREDIT'),0) - COALESCE(sum(le.amount_minor) FILTER (WHERE le.direction='DEBIT'),0) END
    FROM gl_account g CROSS JOIN bound b LEFT JOIN ledger_entry le ON le.gl_account=g.code AND le.created_at < b.v_end
    GROUP BY g.code,g.type,g.name ORDER BY g.type,g.code;
$$;
REVOKE EXECUTE ON FUNCTION wallet_report_trial_balance(date) FROM PUBLIC;

CREATE FUNCTION wallet_report_daily_turnover(p_from date, p_to date)
RETURNS TABLE(day date, accounts integer, credit_minor bigint, debit_minor bigint, net_minor bigint, closing_minor bigint, txn_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'gerege_platform','public' AS $$
    SELECT s.snapshot_date, count(*)::integer,
           COALESCE(sum(s.credit_minor),0), COALESCE(sum(s.debit_minor),0),
           COALESCE(sum(s.credit_minor),0) - COALESCE(sum(s.debit_minor),0),
           COALESCE(sum(s.closing_minor),0), COALESCE(sum(s.txn_count),0)
    FROM wallet_daily_snapshot s WHERE s.snapshot_date BETWEEN p_from AND p_to GROUP BY s.snapshot_date ORDER BY s.snapshot_date;
$$;
REVOKE EXECUTE ON FUNCTION wallet_report_daily_turnover(date,date) FROM PUBLIC;

CREATE FUNCTION wallet_report_account_statement(p_account_no text, p_from date, p_to date)
RETURNS TABLE(txn_id text, txn_at timestamptz, type text, amount_minor bigint, running_balance_minor bigint, external_ref text, is_reversed boolean)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'gerege_platform','public' AS $$
    SELECT t.id::text, t.created_at, t.type, t.amount_minor, t.running_balance_minor, COALESCE(t.external_ref,''), t.is_reversed
    FROM wallet_txn t JOIN wallet_account a ON a.id=t.account_id
    WHERE a.account_no = p_account_no
      AND t.created_at >= (p_from::timestamp AT TIME ZONE 'Asia/Ulaanbaatar')
      AND t.created_at <  ((p_to+1)::timestamp AT TIME ZONE 'Asia/Ulaanbaatar')
    ORDER BY t.created_at, t.id;
$$;
REVOKE EXECUTE ON FUNCTION wallet_report_account_statement(text,date,date) FROM PUBLIC;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP FUNCTION IF EXISTS wallet_report_account_statement(text,date,date);
DROP FUNCTION IF EXISTS wallet_report_daily_turnover(date,date);
DROP FUNCTION IF EXISTS wallet_report_trial_balance(date);
DROP FUNCTION IF EXISTS wallet_expire_holds();
DROP FUNCTION IF EXISTS wallet_snapshot(date);
DROP FUNCTION IF EXISTS wallet_reconcile();
DROP FUNCTION IF EXISTS wallet_gateway_deposit(text,bigint,text,text);
DROP FUNCTION IF EXISTS wallet_transfer(text,uuid,text,bigint,bigint,text,text);
DROP INDEX IF EXISTS uq_deposit_external_ref;
-- +goose StatementEnd
