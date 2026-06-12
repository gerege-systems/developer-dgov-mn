# wallet.gerege.mn

**Бие даасан** wallet ledger микросервис — өөрийн Postgres + схем + auth-тай.
gerege-platform / auth.gerege.mn-аас **ХАМААРАЛГҮЙ**. Бусад систем
**client_id / client_secret** (OAuth2 client_credentials)-ээр холбогдоно.

## Холболтын загвар (client_credentials)

```
1) Токен авах:
   POST /oauth/token
   Content-Type: application/x-www-form-urlencoded
   grant_type=client_credentials&client_id=<id>&client_secret=<secret>
   (эсвэл HTTP Basic: Authorization: Basic base64(id:secret))
   → { "access_token": "...", "token_type": "Bearer", "expires_in": 3600, "scope": "wallet" }

2) Хэтэвчид хандах:
   GET  /api/v1/wallet                  Authorization: Bearer <access_token>
   GET  /api/v1/wallet/transactions
   POST /api/v1/wallet/withdraw | transfer | holds | holds/:id/settle | transactions/:id/reverse
```

**client = өөрийн хэтэвч:** токены `client_id` нь хэтэвчний эзэн (RLS `app.subject`).
Client зөвхөн ӨӨРИЙН хэтэвчээ удирдана. Токен нь wallet-ийн ӨӨРИЙН `JWT_SECRET`-ээр
гарын үсэгтэй (issuer `wallet.gerege.mn`), богино настай (`JWT_EXPIRED` цаг).

### auth.gerege.mn хэрэглэгчээр нэвтрэх (хоёр дахь эх сурвалж)

`AUTH_JWT_SECRET` тохируулсан бол wallet нь **auth.gerege.mn-ийн хэрэглэгчийн
токеныг ч хүлээн авна** (issuer `auth.gerege.mn`) — иргэн me.gerege.mn-ээр
нэвтэрч өөрийн хэтэвчид хандана. Owner = токены subject (иргэний subject).
Тиймээс wallet-д **2 эх сурвалжаар** нэвтэрнэ:

| Хэн | Токен | Issuer | Owner |
|-----|-------|--------|-------|
| Бусад систем/партнёр | client_credentials (`/oauth/token`) | `wallet.gerege.mn` | `client_id` |
| auth-ийн иргэн (me) | auth-ийн OIDC нэвтрэлт | `auth.gerege.mn` | иргэний subject |

## Binary-ууд

| Binary | Үүрэг |
|--------|-------|
| `/app/api` | Fiber HTTP API: `/oauth/token`, `/api/v1/wallet/*`, `/webhooks/bank/topup` (HMAC), `/health` `/ready` `/metrics` `/openapi.yaml` |
| `/app/admin` | Super-admin API (тусдаа service): `/admin/auth/login`, client/account/fee-rule удирдлага, reconcile, audit, тайлан. Superuser DSN-ээр RLS тойрно. |
| `/app/worker` | In-process scheduler: reconcile (цаг тутам), holdexpiry (15 мин), snapshot (00:30 UB) |
| `/app/migrate` | goose migration runner (`./migrations/*.sql`) |
| `/app/client` | `client create <client_id> "<name>"` — OAuth2 client + санамсаргүй secret (нэг л удаа). `client admin <username> ["<name>"]` — super-admin + санамсаргүй нууц үг. |

## Super-admin (тусдаа frontend + API)

Wallet-ийн админ удирдлага нь **тусдаа service** хосоор ажиллана:

- **`admin-api`** (`/app/admin`, default `:8093`) — username/password-аар нэвтэрч
  `isAdmin` JWT авна. Дараа нь client-ууд (CRUD + secret reissue), бүх данс
  (царцаах/сэргээх), шимтгэлийн дүрэм, reconcile, audit, тайлан (trial-balance/
  turnover/statement). Superuser DSN (`DB_POSTGRE_URL`)-ээр RLS тойрно.
- **`admin-web`** (`admin/`, Next.js 14 BFF, default `:3010`) — браузер зөвхөн
  энэ Next service-тэй ярина; токен httpOnly cookie-д, admin API руу зөвхөн
  server талаас (`ADMIN_API_URL`) дамжина.

```sh
docker compose run --rm --entrypoint /app/client api admin superadmin "Super Admin"
# → username + санамсаргүй нууц үг (нэг л удаа). Дараа нь admin UI-аар нэвтэрнэ.
```

## QR төлбөр / нэхэмжлэх (invoice) + webhook

Хэтэвч хооронд QR-аар төлбөр (send/receive). **Хоёр QR формат:** (1) **Ed25519**-гээр
гарын үсэглэсэн JWT (tamper-evident; апп `GET /api/v1/payments/qr-pubkey`-ийн нийтийн
түлхүүрээр баталгаажуулна), (2) **EMVCo MPM** (олон улсын TLV+CRC, QPay/UPI-нийц,
GUID `mn.gerege.wallet`). Хоёулаа request_id агуулна; resolve/pay аль алийг хүлээнэ.

```
POST   /api/v1/payments/requests       static QR (дүнгүй) эсвэл dynamic invoice → {request, qr_token, qr_emv}
GET    /api/v1/payments/requests[/:id]  receive polling (RLS — зөвхөн эзэн)
DELETE /api/v1/payments/requests/:id    цуцлах
POST   /api/v1/payments/resolve         QR тайлж DB-ээс live мэдээлэл (төлөгчид)
POST   /api/v1/payments/pay             QR-аар төлөх (X-Idempotency-Key; settle = wallet_transfer)
```

- **Static** = байнгын QR (олон удаа); **Dynamic** = нэхэмжлэх (тогтсон дүн + хугацаа, нэг удаа).
- Settlement нь `pay_request` SECURITY DEFINER → double-entry, idempotent. Шимтгэл нь
  идэвхгүй `qr_payment_fee` дүрмээс (admin идэвхжүүлбэл).
- **Webhook:** admin client-д `webhook_url` тохируулбал төлбөр орох үед worker нь
  `payment.paid`-г **HMAC-SHA256 гарын үсэгтэй** (`X-Webhook-Signature: sha256=…`) POST
  хийнэ — exponential-backoff retry, private-IP SSRF guard.

## Ажиллуулах

```sh
cp .env.example .env   # POSTGRES_PASSWORD, JWT_SECRET (≥32), WALLET_IBAN_BANK_CODE … бөглөнө
docker compose --profile migrate run --rm migrator up   # schema
docker compose up -d --build                            # postgres + api + worker
# Client үүсгэх (secret-ийг НЭГ удаа хэвлэнэ):
docker compose run --rm -e DB_POSTGRE_URL=... migrator /app/client create acme-corp "ACME Corp"
```

## Тест

```sh
go test ./...                 # бүх багц
go test ./pkg/emvco/... ./cmd/worker/... ./internal/business/usecases/payments/...
```

DB-гүй (in-memory `fakeStore`) unit тестүүд критик логикийг хамгаална:

| Багц | Хамрах хүрээ |
|------|--------------|
| `pkg/emvco` | CRC-16/CCITT каноник вектор (`123456789→0x29B1`), build/parse round-trip (static/dynamic), tamper/GUID-swap/malformed татгалзал, static-д дүн орохгүй |
| `cmd/worker` | webhook URL SSRF guard (loopback/private/link-local/http татгалзал), HMAC known-vector + determinism |
| `internal/business/usecases/payments` | Ed25519 key derivation (secret/seed), signQR↔verifyQR (alg-confusion/expiry/typ татгалзал), EMVCo↔JWT format detection, Create валидаци (dynamic дүн заавал), Pay (DB дүнг эх сурвалж болгох, fee дүрмээс тооцох, idempotency external_ref) |

## DB / role

- **API** нь `withSubject` дотор `SET LOCAL ROLE app_user` хийдэг тул superuser
  холболтоор ч **RLS FORCE** хүчинтэй (production-д dedicated `app_user`
  холболт ашиглаж болно). `DB_APP_URL`.
- **Worker / migrate / client** нь superuser DSN (`DB_POSTGRE_URL`)-ээр SECURITY
  DEFINER функцүүдийг дуудна.
- Schema: `gerege_platform`. Хүснэгт: `wallet_client`, `gl_account`,
  `wallet_account`, `wallet_txn`, `ledger_entry`, `account_hold`, `fee_rule`,
  `wallet_daily_snapshot`, `idempotency_keys`, `api_audit_logs`.

## Аюулгүй байдал

Double-entry append-only ledger · per-txn balance trigger · RLS (client=owner) ·
integer-only money (MNT minor) · idempotency keys · bcrypt client secrets ·
rate-limited `/oauth/token` + API · HMAC bank-gateway top-up (never QPay) ·
account_no нь IBAN-нийцтэй (Luhn + MOD-97). API spec: `GET /openapi.yaml`.

## Production deploy (live)

Сервер `38.180.145.71` (Ubuntu 26.04) дээр **live** ажиллаж байна. Код
`/opt/wallet.gerege.mn`, non-root `deploy` хэрэглэгчээр (docker group). docker
compose: postgres · api (`127.0.0.1:8092`) · worker · admin-api (`:8093`) ·
admin-web (`:3010`). Портууд зөвхөн localhost дээр bind хийгдэж, **nginx** гадагшаа
reverse-proxy хийнэ (`deploy/nginx-wallet.conf`), TLS нь **certbot** (Let's Encrypt,
авто-renew, HTTP→HTTPS):

| Домэйн | Зорилт |
|--------|--------|
| `https://wallet.gerege.mn`, `https://api.wallet.gerege.mn` | wallet API (`:8092`) |
| `https://admin.wallet.gerege.mn` | super-admin UI (`:3010`) |

```sh
# Шинэчлэлт deploy (репог /opt/wallet.gerege.mn руу sync хийсний дараа):
docker compose build                                  # image-ууд
docker compose --profile migrate run --rm migrator    # шинэ migration
docker compose up -d                                  # rolling restart
```

> **NB:** энэ сервер дээр ENVIRONMENT=development (bundled дотоод PG, host port-гүй,
> зөвхөн docker сүлжээнд). Гадаад/managed PG руу шилжвэл `ENVIRONMENT=production`
> + `sslmode=verify-full|verify-ca` шаардлагатай (config guard).

## Subpath deploy (тусдаа DNS-гүйгээр, нэг хост дээр давхар stack)

Энэ хуулбар нь **template-gerege-mn** репод амьдардаг бөгөөд root CI-д
шалгагдана (Go: gofmt/vet/race test/binaries; admin: lint/build). Wallet-ийг
тусдаа субдомэйнгүйгээр, аль хэдийн TLS-тэй vhost-ийн **зам(path)** дор deploy
хийж болно — жишиг: `https://tempv26.gerege.mn/wallet/` (API) +
`/wallet-admin` (UI), `temp-wallet` stack.

`.env`-ийн нэмэлт параметрууд (бүгд default-тай, заавал биш):

| Хувьсагч | Үүрэг |
|----------|-------|
| `ADMIN_BASE_PATH` | admin UI-ийн Next.js `basePath` (ж: `/wallet-admin`) — **build-time** тул өөрчилбөл `docker compose build admin-web` дахин хийнэ |
| `WALLET_IMAGE`, `WALLET_ADMIN_IMAGE` | image нэрс — нэг хост дээр өөр wallet stack байвал давхцуулахгүй |
| `WALLET_PG_VOLUME`, `WALLET_NETWORK` | volume/network нэрс — давхцвал хоёр stack **нэг Postgres volume** руу бичнэ! |
| `COMPOSE_PROJECT_NAME` | контейнер нэрийн prefix (ж: `temp-wallet`) |

Nginx локэйшнүүд: [`deploy/nginx-subpath.conf`](deploy/nginx-subpath.conf) —
`/wallet/` нь prefix-ээ хусаж API руу, `/wallet-admin` нь хусахгүйгээр admin UI
руу дамжина. Бүрэн runbook: [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)
([MN](../docs/DEPLOYMENT_MN.md)).

Клиент талын код бичихдээ: admin UI доторх гар `fetch`/`window.location`
дуудлагууд `@/lib/basepath`-ийн `BP`-г заавал prefix болгоно (`next/link` ба
`router.push` автоматаар basePath нэмдэг тул хэрэггүй).
