# Quick start

> From clone to an eID sign-in on the full stack in about five minutes.

## Requirements

| Tool | Version | Note |
|---|---|---|
| Go | 1.26+ | only if you run the backend directly |
| Node.js | 20+ | only if you run the frontend directly |
| Docker + Compose | recent | **recommended** — the whole stack in one command |
| PostgreSQL / Redis | 15+ / 7+ | not needed when using Docker |

## 1. Fastest path — Docker Compose

```bash
git clone https://github.com/gerege-systems/template-dgov-mn.git
cd template-dgov-mn
docker compose up -d --build
```

This brings up `db` · `redis` · `migrate` (one-off) · `api` · `web`.
Then open **<http://localhost:3000>**.

!!! note "Migrations run automatically"
    The `migrate` service runs on every `up` and skips already-applied
    migrations, so re-running it is safe (idempotent).

## 2. Running it by hand (development)

=== "Backend"

    ```bash
    cd backend
    cp internal/config/.env.example internal/config/.env
    # set JWT_SECRET (≥32 chars), DB, Redis and your EID_* RP credentials
    go run ./cmd/api          # → http://localhost:8080
    ```

=== "Frontend"

    ```bash
    cd frontend
    cp .env.example .env.local     # BACKEND_URL=http://localhost:8080
    npm install
    npm run dev                    # → http://localhost:3000
    ```

## 3. Signing in

Choose **Sign in with eID** on the landing page, then use any of three paths:

- **QR code** — scan the desktop QR with the eID mobile app.
- **App2App** — jump straight into the eID app on the same phone.
- **National ID number** — enter it and a push notification reaches the app.

Google linking only appears once its credentials are configured.

!!! tip "Trying it without eID credentials"
    Sign-in will not work while `EID_*` is unset. If you only want to inspect
    the UI and architecture, the backend unit tests (`go test ./...`) drive the
    flows through a FakeEID stub.

## 4. Verifying

```bash
cd backend && go test ./...     # unit tests (mocks, fast)
cd frontend && npm run build    # build + lint + typecheck (same as CI)
```

Mirror every CI gate locally:

```bash
cd backend && make pre-push     # lint + test + swag drift + build
```

## Where to next

<div class="grid cards" markdown>

- :material-layers: **[Architecture](architecture.md)** — layers and dependency flow
- :material-shield-key: **[Authentication](authentication.md)** — eID + SSO flows
- :material-connection: **[App integration](sso-integration.md)** — make your app an RP
- :material-cog: **[Configuration](configuration.md)** — environment variable reference

</div>
