# API reference

Issuer: **`https://developer.dgov.mn`** — every endpoint is advertised in the
discovery document.

## Endpoints

| Endpoint | Path | Description |
|---|---|---|
| Discovery | `GET /.well-known/openid-configuration` | Provider metadata |
| JWKS | `GET /.well-known/jwks.json` | Public keys for id_token verification (RS256) |
| Authorize | `GET /oauth2/auth` | Start a sign-in flow |
| Token | `POST /oauth2/token` | code → tokens, refresh, client_credentials |
| Userinfo | `GET /userinfo` | Fetch user claims with an access token |
| Introspection | `POST /oauth2/introspect` | Check token state (RFC 7662) |
| Revocation | `POST /oauth2/revoke` | Revoke a token (RFC 7009) |
| End session | `GET /oauth2/sessions/logout` | RP-initiated logout |

## Scopes

| Scope | Claims granted |
|---|---|
| `openid` | `sub` (required for every OIDC flow) |
| `profile` | `name`, `given_name`, `family_name`, `given_name_en`, `family_name_en` |
| `email` | `email`, `email_verified` |
| `nationalid` | `national_id`, `register_number` |
| `offline_access` | Issues a refresh token |

## Claims

`sub` is the portal's **stable, opaque** user identifier (one user — one `sub`,
identical across apps: `public` subject type). Full list:

```text
sub iss aud exp iat auth_time nonce
name given_name family_name given_name_en family_name_en
email email_verified national_id register_number
google_sub google_email google_name google_picture
```

## Grant types

| Grant | Use |
|---|---|
| `authorization_code` | The main sign-in flow (with PKCE or a client secret) |
| `refresh_token` | Long-lived sessions with the `offline_access` scope |
| `client_credentials` | Machine-to-machine (no user) access |

**Client authentication:** `client_secret_basic` (recommended),
`client_secret_post`, `none` (public + PKCE).

**PKCE:** **S256** only (`plain` is not supported — RFC 9700 §2.1.1).

## Token introspection

To check an access token's state server-side:

```bash
curl -s https://developer.dgov.mn/oauth2/introspect \
  -u "<CLIENT_ID>:<CLIENT_SECRET>" \
  -d token=<ACCESS_TOKEN> | jq
```

```json
{ "active": true, "sub": "8b1c...", "client_id": "myapp", "exp": 1750000000 }
```

Verify `id_token`s locally instead: fetch the JWKS keys and validate the RS256
signature plus `iss`, `aud`, `exp` and `nonce` (most OIDC libraries do this
automatically).

## Token revocation

```bash
curl -s https://developer.dgov.mn/oauth2/revoke \
  -u "<CLIENT_ID>:<CLIENT_SECRET>" \
  -d token=<REFRESH_TOKEN>
```

## Error format

OAuth2 endpoints return RFC 6749-style errors:

```json
{ "error": "invalid_grant", "error_description": "authorization code expired" }
```

| Error | Cause |
|---|---|
| `invalid_request` | Missing/malformed parameter |
| `invalid_client` | Wrong client_id/secret |
| `invalid_grant` | Code expired, redirect_uri mismatch, code reused |
| `invalid_scope` | Scope not granted to the client |
| `access_denied` | The user declined consent |

## Rate limits

All public endpoints are rate-limited per IP. On limit you get `429 Too Many
Requests` — retry with exponential backoff. Normal authorize/token traffic
never hits the limits.

!!! tip "Redirect URIs must match exactly"
    The `redirect_uri` must match the registered value **character for
    character** (scheme, host, port, path). Wildcards are not supported.
    Register your localhost URI separately for development
    (e.g. `http://localhost:3000/auth/callback`).
