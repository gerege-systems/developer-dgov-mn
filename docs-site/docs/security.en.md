# Security

> Security is baked in, not bolted on. This page summarises the controls that
> are **implemented in code**.

## Authentication and sessions

| Control | Detail |
|---|---|
| **eID is the only login** | The sole interactive sign-in is eID (QR / App2App / national-ID push). There is **no password surface at all** |
| JWT access + refresh | Refresh tokens **rotate**; guarded by a `kind` claim |
| Logout deny-list | Logout puts the access token's `jti` in Redis for its remaining TTL; middleware checks it on every request |
| Citizen certificate (PKI) | Completing login returns the citizen certificate (DER), parsed with `crypto/x509`; serial, validity window and issuer are persisted |
| Google linking | Linking **only** — keyed on a stable subject column |

!!! note "The absence of passwords is deliberate"
    Because no password flow exists, controls like HIBP / bcrypt / leaked-password
    checks are **not applicable**. Legacy password/OTP usecases remain in the
    tree but are unreachable from any route. If a password path is ever exposed
    again, wire the HIBP check in **before** shipping it.

## Data layer

- **Parameterized queries only** (pgx) — no string concatenation, no ORM.
- **Row-Level Security** — `ENABLE` **and `FORCE`** on every per-user table:
  `users`, `organizations`, `organization_memberships`, the `gov_*` citizen
  tables and `user_integrations`. Policies are driven by `app.user_id` /
  `app.user_role` GUCs set per transaction with `SET LOCAL`.
- **No identity ⇒ zero rows** (fail-closed), which guards against accidental
  disclosure.

!!! warning "RLS boot guard"
    On startup the app inspects its own database role. In production a
    **superuser** or `BYPASSRLS` role **fails the boot** — otherwise RLS would
    silently not enforce. In development it only warns.

    Every new per-user table needs its own policies.

## Secrets and encryption

| What | How |
|---|---|
| Third-party OAuth tokens | Sealed with **AES-256-GCM** before storage (`INTEGRATION_ENC_KEY`) |
| Token / session identifiers | `crypto/rand` with rejection sampling to avoid modulo bias |
| Super admin MFA (TOTP) | Also encrypted with `INTEGRATION_ENC_KEY` |

!!! danger "Never rotate INTEGRATION_ENC_KEY in place"
    Changing an established key **breaks every previously encrypted value**. The
    deploy script writes it once, only when absent (idempotent).

## Web and network layer

- **Security headers** — CSP `default-src 'none'`, HSTS (prod), `nosniff`,
  `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP/CORP/COEP.
- **CORS** — strict origin allow-list; never `*` combined with credentials.
- **Body size limits** — global cap plus 4 KiB on `/auth`.
- **Full server timeouts** — `ReadHeader` 10s, `Read` 30s, `Write` 70s,
  `Idle` 120s, `MaxHeaderBytes` 16 KiB (slowloris / oversized-header defence).
- **Per-request timeout** — 30s in general; `/ai/*` gets 50s (Gemini TTS/STT
  routinely takes 10–20s, which did not fit the 30s cap).
- **Rate limiting** — `/auth` ~5/min, `/ai/*` ~20/min, and the anonymous
  landing chat `/public/ai/chat` ~6/min — per IP.
- **Permissions-Policy** — `camera=(), microphone=(self), geolocation=()`.
  The microphone is allowed for this origin only (the AI voice chat calls
  `getUserMedia`); with `microphone=()` the browser rejects it outright,
  without even prompting.

### Frontend (BFF model)

The browser only ever talks to **same-origin** `/api/*` routes. Tokens live in
`httpOnly` cookies and **never** reach client JS. Every mutating call carries an
`x-dgov-csrf` header that the server validates with `checkOrigin` — a double
CSRF defence.

## Audit log

Hash-chained and append-only:

```
chain_hash = SHA-256(prev_hash ‖ canonical-json(entry))
```

Writers are serialised with `pg_advisory_xact_lock`; `VerifyChain` makes tampering
evident. Admin-read only.

## Authorization (RBAC)

A dynamic role and permission catalogue across four levels: **superadmin → admin
→ manager → user**. Routes are protected by `RequirePermission` /
`RequireAdmin` middleware. Super admin is the only role that manages admin users,
and it is never created through the API — only via the database or environment.

## Operational hardening

In production `/metrics` and `/swagger/doc.json` are gated behind a bearer token
(constant-time comparison, **404** on a miss). Logs are structured Zap with a
request id, and secrets are never logged.

## ASVS roadmap

| Level | Status |
|---|---|
| **L1** | ✅ HTTPS + HSTS, passwordless login, parameterized queries, headers, strict CORS, input validation, structured logging, no committed secrets. ⏳ container scan / `govulncheck` |
| **L2** | ✅ rate limiting, refresh rotation, eID device-link (phishing-resistant), request timeouts, encrypted integration tokens, hash-chained audit. ⏳ WAF, central SIEM, backup-restore test, IR plan |
| **L3** | ◻ field-level PII encryption (KMS), mTLS, SLSA L3 provenance, external pentest — *out of template scope* |

## Known gaps

- **Interactive Swagger UI** — only the raw spec is served at
  `/swagger/doc.json` (load it into Swagger Editor or Postman).
- The full control matrix lives in
  [`backend/docs/SECURITY.md`](https://github.com/gerege-systems/template-dgov-mn/blob/main/backend/docs/SECURITY.md).

!!! tip "Reporting a vulnerability"
    Please do not open a public issue. Follow the process in
    [SECURITY.md](https://github.com/gerege-systems/template-dgov-mn/blob/main/SECURITY.md).
