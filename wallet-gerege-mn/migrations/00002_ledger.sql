-- +goose Up
-- +goose StatementBegin
-- wallet ledger схем (минимал double-entry, Fineract зарчмаар). Бие даасан
-- хувилбар: gl_account бүрэн ангилалтай, account_no sequence + snapshot хүснэгт
-- нэгтгэсэн. Мөнгө bigint minor (MNT decimal=0 → minor=₮). search_path тогтоосон.
SET search_path TO gerege_platform, public;

-- 1) gl_account — Chart of Accounts (бүрэн ангилал).
CREATE TABLE gl_account (
    code       VARCHAR(64)  NOT NULL PRIMARY KEY,
    name       VARCHAR(128) NOT NULL,
    type       VARCHAR(16)  NOT NULL CHECK (type IN ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE')),
    created_at timestamptz  NOT NULL DEFAULT now()
);
INSERT INTO gl_account (code, name, type) VALUES
    ('customer_wallet_liability',  'Хэрэглэгчийн хэтэвчний үлдэгдэл', 'LIABILITY'),
    ('bank_settlement',            'Банкны corporate gateway',       'ASSET'),
    ('internal_transfer_clearing', 'Дотоод шилжүүлгийн clearing',     'LIABILITY'),
    ('fee_income',                 'Шимтгэлийн орлого',               'INCOME'),
    ('bank_charge_expense',        'Банк/gateway-д төлсөн шимтгэл',    'EXPENSE'),
    ('suspense_liability',         'Тодорхойгүй / тулгалтын түр данс', 'LIABILITY');

-- 2) account_no sequence ([type:1][seq:10][Luhn:1] → Go domain.GenerateAccountNo).
CREATE SEQUENCE wallet_account_no_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;

-- 3) wallet_account — хэтэвч. owner_type: client (=client_id) гол хувилбар.
CREATE TABLE wallet_account (
    id             uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    account_no     VARCHAR(20)  NOT NULL UNIQUE,
    owner_type     VARCHAR(16)  NOT NULL CHECK (owner_type IN ('person','organization')),
    owner_id       VARCHAR(64)  NOT NULL,
    currency       VARCHAR(3)   NOT NULL DEFAULT 'MNT',
    status         VARCHAR(16)  NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','frozen','closed')),
    balance_minor  bigint       NOT NULL DEFAULT 0,
    hold_minor     bigint       NOT NULL DEFAULT 0,
    version        bigint       NOT NULL DEFAULT 0,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT wallet_balance_nonneg  CHECK (balance_minor >= 0),
    CONSTRAINT wallet_hold_le_balance CHECK (hold_minor >= 0 AND hold_minor <= balance_minor)
);
CREATE INDEX idx_wallet_account_owner ON wallet_account (owner_type, owner_id);
-- Эзэн бүрд нэг active хэтэвч (audit H5).
CREATE UNIQUE INDEX uq_wallet_active_owner ON wallet_account (owner_type, owner_id) WHERE status = 'active';

-- 4) wallet_txn — гүйлгээ (append-only).
CREATE TABLE wallet_txn (
    id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id            uuid        NOT NULL REFERENCES wallet_account(id),
    type                  VARCHAR(16) NOT NULL CHECK (type IN ('deposit','withdrawal','transfer_in','transfer_out','hold','release','fee','reversal')),
    amount_minor          bigint      NOT NULL CHECK (amount_minor > 0),
    running_balance_minor bigint      NOT NULL,
    external_ref          VARCHAR(128),
    counterparty_txn_id   uuid        REFERENCES wallet_txn(id),
    is_reversed           boolean     NOT NULL DEFAULT false,
    reversed_by_txn_id    uuid        REFERENCES wallet_txn(id),
    channel               VARCHAR(32),
    created_by            VARCHAR(64),
    created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_txn_account_created ON wallet_txn (account_id, created_at DESC);

-- 5) ledger_entry — double-entry мөрүүд (immutable).
CREATE TABLE ledger_entry (
    id           bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    txn_id       uuid         NOT NULL REFERENCES wallet_txn(id),
    gl_account   VARCHAR(64)  NOT NULL REFERENCES gl_account(code),
    account_id   uuid         REFERENCES wallet_account(id),
    direction    VARCHAR(6)   NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
    amount_minor bigint       NOT NULL CHECK (amount_minor > 0),
    created_at   timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_entry_txn ON ledger_entry (txn_id);
CREATE INDEX idx_ledger_entry_gl  ON ledger_entry (gl_account, created_at);

-- 6) account_hold — барьцаа.
CREATE TABLE account_hold (
    id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id   uuid        NOT NULL REFERENCES wallet_account(id),
    amount_minor bigint      NOT NULL CHECK (amount_minor > 0),
    status       VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','settled','released','expired')),
    hold_txn_id  uuid        REFERENCES wallet_txn(id),
    external_ref VARCHAR(128),
    expires_at   timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_account_hold_account ON account_hold (account_id, status);
CREATE INDEX idx_account_hold_expiry  ON account_hold (expires_at) WHERE status = 'active' AND expires_at IS NOT NULL;

-- 7) fee_rule — тохируулдаг шимтгэл (template-ууд idle).
CREATE TABLE fee_rule (
    id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code           VARCHAR(64) NOT NULL UNIQUE,
    txn_type       VARCHAR(16) NOT NULL,
    owner_type     VARCHAR(16),
    channel        VARCHAR(32),
    method         VARCHAR(16) NOT NULL CHECK (method IN ('FLAT','PERCENT')),
    flat_minor     bigint      NOT NULL DEFAULT 0,
    percent_bps    integer     NOT NULL DEFAULT 0,
    min_minor      bigint,
    max_minor      bigint,
    gl_account     VARCHAR(64) NOT NULL DEFAULT 'fee_income' REFERENCES gl_account(code),
    priority       integer     NOT NULL DEFAULT 0,
    active         boolean     NOT NULL DEFAULT true,
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_to   timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fee_rule_lookup ON fee_rule (txn_type, active);
INSERT INTO fee_rule (code, txn_type, owner_type, channel, method, percent_bps, min_minor, gl_account, priority, active) VALUES
    ('transfer_fee_default',   'transfer_out', NULL, NULL,           'PERCENT', 50, 100, 'fee_income', 0, false),
    ('withdrawal_fee_default', 'withdrawal',   NULL, NULL,           'PERCENT', 30, 100, 'fee_income', 0, false),
    ('gateway_topup_fee_default','deposit',    NULL, 'bank_gateway', 'FLAT',     0, NULL, 'fee_income', 0, false);

-- 8) wallet_daily_snapshot — өдрийн EOD snapshot (incremental).
CREATE TABLE wallet_daily_snapshot (
    snapshot_date date        NOT NULL,
    account_id    uuid        NOT NULL REFERENCES wallet_account(id),
    account_no    VARCHAR(20) NOT NULL,
    owner_type    VARCHAR(16) NOT NULL,
    owner_id      VARCHAR(64) NOT NULL,
    opening_minor bigint      NOT NULL DEFAULT 0,
    credit_minor  bigint      NOT NULL DEFAULT 0,
    debit_minor   bigint      NOT NULL DEFAULT 0,
    closing_minor bigint      NOT NULL DEFAULT 0,
    hold_minor    bigint      NOT NULL DEFAULT 0,
    txn_count     integer     NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (snapshot_date, account_id)
);
CREATE INDEX idx_wallet_snapshot_account ON wallet_daily_snapshot (account_id, snapshot_date DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS wallet_daily_snapshot CASCADE;
DROP TABLE IF EXISTS fee_rule       CASCADE;
DROP TABLE IF EXISTS account_hold   CASCADE;
DROP TABLE IF EXISTS ledger_entry   CASCADE;
DROP TABLE IF EXISTS wallet_txn     CASCADE;
DROP TABLE IF EXISTS wallet_account CASCADE;
DROP SEQUENCE IF EXISTS wallet_account_no_seq;
DROP TABLE IF EXISTS gl_account     CASCADE;
-- +goose StatementEnd
