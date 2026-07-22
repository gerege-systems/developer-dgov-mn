# Government Developer Portal

> **Add national eID sign-in to your app** — register your app, grab your
> `client_id`, and receive verified user identity as standard OpenID Connect claims.

**Government Developer Portal** ([developer.dgov.mn](https://developer.dgov.mn))
is the developer portal for adding national electronic-ID (eID) sign-in to your
application over **OAuth2 / OpenID Connect**. Store no passwords, collect no PII
— receive only verified identity.

!!! tip "Open Source"
    This platform is an **open-source** project — read the full source, fork it,
    and use it in your own organization.
    :material-github: [View on GitHub](https://github.com/gerege-systems/developer-dgov-mn)

<div class="grid cards" markdown>

- :material-rocket-launch: **[Quickstart](quickstart.md)**  
  From app registration to your first verified claim — in 5 minutes, with `curl`
  examples.

- :material-shield-key: **[App integration (OAuth2 / OIDC)](sso-integration.md)**  
  Authorization code + PKCE flow, refresh tokens, logout — the complete
  integration guide.

- :material-api: **[API reference](api-reference.md)**  
  Endpoints, scopes, claims, token introspection, rate limits and the error format.

- :material-draw-pen: **[eID Service Proxy & signing](eid-services.md)**  
  Fetch users' eID data through the proxy and have documents e-signed (PAdES)
  via the signature API.

</div>

## What you get

| Capability | Description |
|---|---|
| **eID sign-in** | Users approve with a push to the eID app or a QR scan |
| **Standard OIDC** | Discovery, JWKS, RS256 id_tokens — works with any OIDC library |
| **PKCE (S256)** | PKCE enforced for public (mobile/SPA) clients per RFC 9700 |
| **Verified claims** | `name`, `email`, `national_id`, `register_number` and more |
| **Signature API** | PAdES PDF signing via eID credentials — without your own certificates |
| **Consent screen** | The consent prompt and remember-me logic are built in |

## Ecosystem

| Domain | Role |
|---|---|
| **developer.dgov.mn** | This portal — developer console + OIDC provider (issuer) |
| **sso.dgov.mn** | Government SSO — the eID Relying Party core (holds eID credentials) |
| **eidmongolia.mn** | The national eID service (citizen's eID app) |

Your app authenticates through **developer.dgov.mn**'s OIDC flow; the portal
handles all communication with eID Mongolia, so you never hold eID credentials.

!!! tip "Where to start"
    [Quickstart](quickstart.md) — sign in to the console, register an app and
    get your first token in 5 minutes.
