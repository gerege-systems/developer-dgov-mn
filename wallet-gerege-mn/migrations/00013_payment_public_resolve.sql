-- +goose Up
-- +goose StatementBegin
-- payment_request_public — QR-аар төлөгч (payee биш) нэхэмжлэхийг харахын тулд
-- хязгаарлагдмал ИЛ мэдээллийг буцаана (PII-гүй). SECURITY DEFINER тул RLS тойрно.
CREATE FUNCTION payment_request_public(p_id uuid)
RETURNS TABLE(kind text, payee_account_no text, amount_minor bigint, currency text, reference text, status text, expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'gerege_platform','public' AS $$
  SELECT kind, payee_account_no, amount_minor, currency, reference,
         CASE WHEN status = 'pending' AND expires_at IS NOT NULL AND expires_at < now()
              THEN 'expired' ELSE status END,
         expires_at
  FROM payment_request WHERE id = p_id;
$$;
REVOKE EXECUTE ON FUNCTION payment_request_public(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION payment_request_public(uuid) TO app_user;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP FUNCTION IF EXISTS payment_request_public(uuid);
-- +goose StatementEnd
