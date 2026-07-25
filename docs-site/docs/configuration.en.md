# Configuration (env)

> Everything is configured through environment variables. The canonical example
> is [`backend/.env.example`](https://github.com/gerege-systems/template-dgov-mn/blob/main/backend/.env.example).

!!! danger "Never commit secrets"
    `backend/internal/config/.env*`, the root `.env` and `backend.env` are all
    **gitignored**. When you add a variable, document it in the READMEs — never
    its value.

## Core

| Variable | Example | Purpose |
|---|---|---|
| `PORT` | `8080` | API listen port |
| `ENVIRONMENT` | `production` | Turns on strict production guards |
| `DEBUG` | `false` | Verbose logging |
| `ALLOWED_ORIGINS` | `https://template.dgov.mn` | CORS allow-list (comma-separated; `*` forbidden) |
| `TRUSTED_PROXIES` | — | Reverse-proxy addresses |

## Database and Redis

| Variable | Purpose |
|---|---|
| `DB_POSTGRE_DSN` / `DB_POSTGRE_URL` | Connection string |
| `DB_MAX_OPEN_CONNS`, `DB_MAX_IDLE_CONNS`, `DB_CONN_MAX_LIFE_MINS` | Pool tuning |
| `REDIS_HOST`, `REDIS_PASS`, `REDIS_EXPIRED` | Redis connection and TTL |

!!! warning "Production DSNs must use `sslmode=verify-full`"
    The production guard requires it. The Docker Compose stack deliberately runs
    with `ENVIRONMENT=development` because its internal database has no TLS.

!!! danger "The API must not connect as a superuser"
    RLS only enforces when the app connects as a least-privilege role. A
    superuser or `BYPASSRLS` role fails the boot in production.

## JWT and sessions

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | **≥32 characters.** Changing it invalidates every session |
| `JWT_EXPIRED`, `JWT_REFRESH_EXPIRED` | Access / refresh lifetimes |
| `JWT_ISSUER` | Usually the app domain. Changing it invalidates all existing tokens |

## eID (Relying Party)

| Variable | Purpose |
|---|---|
| `EID_BASE_URL` | eID Mongolia `/v3` base (or the SSO sign relay) |
| `EID_RP_UUID`, `EID_RP_SECRET` | RP credentials |
| `SIGN_RELAY_TOKEN` | Shared token for signature relay (empty disables it) |

## Government SSO (RP side — this app as a client)

| Variable | Example | Purpose |
|---|---|---|
| `SSO_ISSUER` | `https://sso.dgov.mn` | Defaults to this when unset |
| `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` | — | Empty leaves the SSO flow inert |
| `SSO_REDIRECT_URI` | `https://template.dgov.mn/sso/callback` | Must be registered **exactly** on the SSO client |
| `SSO_SCOPE` | `openid profile email nationalid` | `nationalid` adds the citizen ID number |
| `SSO_NATIVE_CLIENT_ID` | — | Client for the mobile (PKCE, public) flow |
| `SSO_EID_PROXY_BASE_URL` | — | When set, the eID PKI surface goes through the SSO proxy |

!!! note "An unregistered client returns `invalid_client`"
    If `SSO_CLIENT_ID` is absent from the provider's client store, the authorize
    step returns `{"error":"invalid_client"}`. The redirect URI must match exactly too.

## OIDC provider side (this app acting as a provider)

| Variable | Purpose |
|---|---|
| `OAUTH_ISSUER` | e.g. `https://template.dgov.mn`. The provider is enabled **only** when this is set |
| `SSO_STATE_KEY` | HMAC key for transient login/consent state (**≥32 bytes**) |
| `SSO_FIRSTPARTY_CLIENTS` | First-party clients that skip the consent screen |
| `SSO_ADMIN_API_KEYS`, `SSO_ADMIN_SUBS` | Admin API access |

## Third parties and storage

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | AI pipeline. Without it `/ai/*` returns a genuine 500 |
| `GOOGLE_CLIENT_ID` / `SECRET` | Google linking (the button hides when empty) |
| `VERIFY_API_BASE`, `VERIFY_API_KEY`, `VERIFY_CHANNEL` | Citizen / organisation verification |
| `XYP_API_BASE`, `XYP_CLIENT_ID`, `XYP_CLIENT_SECRET` | State-registry lookups |
| `GSPACE_*` | The app's own SFTP storage (per-user quota) |
| `INTEGRATION_ENC_KEY` | **≥16 bytes.** Encrypts OAuth tokens and super admin MFA |

!!! danger "INTEGRATION_ENC_KEY is mandatory"
    Deployments **require** this key, and once set it must **never change** —
    rotating it breaks every previously encrypted value.

## Observability

| Variable | Purpose |
|---|---|
| `OTEL_EXPORTER`, `OTEL_SAMPLE_RATIO` | OpenTelemetry tracing |
| `OBSERVABILITY_TOKEN` | Bearer token gating `/metrics` and `/swagger` in production |

## Frontend

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | The **internal** address the BFF calls (e.g. `http://api:8080`) |

!!! warning "The name `api` can collide on a shared network"
    When several stacks share one Docker network, `http://api:8080` may resolve
    to a different container and every `/api/v1/*` call turns into a 404. Pin
    `BACKEND_URL` to your own api container's full name in that case.
