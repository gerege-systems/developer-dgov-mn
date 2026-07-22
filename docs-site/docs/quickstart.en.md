# Quickstart

From app registration to your first verified claim — **5 minutes**.

## 1. Sign in to the console

Sign in at [developer.dgov.mn](https://developer.dgov.mn) with your **eID**
(push to the eID app or a QR scan). No registration, no password.

## 2. Register an app

Under **Console → Applications → New app**:

- **Name** — shown to users on the consent screen
- **Redirect URI** — e.g. `https://myapp.mn/auth/callback`
- **Type** — server-side web app (confidential) or mobile/SPA (public, PKCE)

On save you receive a `client_id` and, for confidential apps, a `client_secret`.

!!! warning "The client_secret is shown only once"
    Store the secret somewhere safe (a secret manager). If you lose it,
    **rotate** it — the old one is invalidated immediately.

## 3. Check discovery

Every endpoint is advertised in the standard discovery document:

```bash
curl https://developer.dgov.mn/.well-known/openid-configuration | jq
```

```json
{
  "issuer": "https://developer.dgov.mn",
  "authorization_endpoint": "https://developer.dgov.mn/oauth2/auth",
  "token_endpoint": "https://developer.dgov.mn/oauth2/token",
  "userinfo_endpoint": "https://developer.dgov.mn/userinfo",
  "jwks_uri": "https://developer.dgov.mn/.well-known/jwks.json",
  "scopes_supported": ["openid", "offline_access", "profile", "email", "nationalid"],
  "code_challenge_methods_supported": ["S256"]
}
```

Most OIDC libraries configure themselves from just the issuer URL plus your
client credentials.

## 4. Start a sign-in

Redirect your user to the authorize URL:

```text
https://developer.dgov.mn/oauth2/auth
  ?response_type=code
  &client_id=<CLIENT_ID>
  &redirect_uri=https://myapp.mn/auth/callback
  &scope=openid profile email
  &state=<random-32-chars>
  &nonce=<random-32-chars>
```

The user verifies with their eID and returns to your `redirect_uri` with
`?code=...&state=...`.

## 5. Exchange the code for tokens

```bash
curl -s https://developer.dgov.mn/oauth2/token \
  -u "<CLIENT_ID>:<CLIENT_SECRET>" \
  -d grant_type=authorization_code \
  -d code=<CODE> \
  -d redirect_uri=https://myapp.mn/auth/callback | jq
```

```json
{
  "access_token": "...",
  "id_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

## 6. Fetch verified claims

```bash
curl -s https://developer.dgov.mn/userinfo \
  -H "Authorization: Bearer <ACCESS_TOKEN>" | jq
```

```json
{
  "sub": "8b1c...",
  "name": "Bat-Erdene",
  "family_name": "Dorj",
  "email": "bat@example.mn",
  "email_verified": true
}
```

🎉 **Done!** Your user is eID-verified and you never stored a password.

## Next steps

- [App integration](sso-integration.md) — the full PKCE, refresh-token and logout flow
- [API reference](api-reference.md) — every endpoint, scope and claim
- [eID Service Proxy & signing](eid-services.md) — eID data + PAdES signing
