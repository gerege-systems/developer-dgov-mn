-- +goose Up
-- +goose StatementBegin
-- m5: external_ref idempotency-г deposit-аас гадна transfer-д өргөтгөнө.
--
-- Зөвхөн `type='deposit'`-д `uq_deposit_external_ref` байсан тул:
--   а) ижил external_ref-тэй transfer-ийг хоёр удаа дуудах боломжтой
--      (Go layer-н idempotency_keys-аар л дедуп хийгддэг — клиент шинэ
--      Idempotency-Key бичээд буцааж явуулбал хоёр шилжүүлэг бичигдэнэ);
--   б) reverse, system release, hold capture зэрэг гадаад ref-тэй (e.g.
--      reconcile/bank batch) бичилт зөвшөөрвөл мөн адил.
--
-- Шийдэл: (account_id, external_ref) бүхэлдээ уникальт болгоно.
-- account_id оруулсан нь өөр өөр хэрэглэгчид/гэрээт ижил ref хэрэглэхийг
-- зөвшөөрөх боловч (банкны batch-уудад түгээмэл) нэг данс дотор давталт
-- хаах болно. external_ref хоосон бичлэгийг хамруулахгүй (NULL индекс
-- зөвшөөрөгдөнө — partial index).
--
-- uq_deposit_external_ref-г илүүдсэн тул унгана (шинэ хязгаарлалт нь
-- илүү өргөн).

DROP INDEX IF EXISTS uq_deposit_external_ref;

CREATE UNIQUE INDEX uq_wallet_txn_account_external_ref
    ON wallet_txn (account_id, external_ref)
    WHERE external_ref IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS uq_wallet_txn_account_external_ref;
CREATE UNIQUE INDEX uq_deposit_external_ref ON wallet_txn (external_ref)
    WHERE type = 'deposit' AND external_ref IS NOT NULL;
-- +goose StatementEnd
