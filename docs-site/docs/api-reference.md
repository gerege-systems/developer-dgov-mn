# API лавлагаа

Issuer: **`https://developer.dgov.mn`** — бүх endpoint discovery баримтад зарлагдана.

## Endpoint-ууд

| Endpoint | Зам | Тайлбар |
|---|---|---|
| Discovery | `GET /.well-known/openid-configuration` | Провайдерын метадата |
| JWKS | `GET /.well-known/jwks.json` | id_token шалгах нийтийн түлхүүрүүд (RS256) |
| Authorize | `GET /oauth2/auth` | Нэвтрэлтийн урсгал эхлүүлэх |
| Token | `POST /oauth2/token` | code → токен, refresh, client_credentials |
| Userinfo | `GET /userinfo` | Access token-оор хэрэглэгчийн claim авах |
| Introspection | `POST /oauth2/introspect` | Токены төлөв шалгах (RFC 7662) |
| Revocation | `POST /oauth2/revoke` | Токен хүчингүй болгох (RFC 7009) |
| End session | `GET /oauth2/sessions/logout` | RP-initiated logout |

## Scope-ууд

| Scope | Олгох claim |
|---|---|
| `openid` | `sub` (заавал — OIDC урсгал бүрт) |
| `profile` | `name`, `given_name`, `family_name`, `given_name_en`, `family_name_en` |
| `email` | `email`, `email_verified` |
| `nationalid` | `national_id`, `register_number` |
| `offline_access` | Refresh token олгоно |

## Claim-ууд

`sub` нь порталын **тогтвортой, opaque** хэрэглэгчийн танигч (нэг хэрэглэгч —
нэг `sub`, бүх апп-д ижил `public` subject type). Бүрэн жагсаалт:

```text
sub iss aud exp iat auth_time nonce
name given_name family_name given_name_en family_name_en
email email_verified national_id register_number
google_sub google_email google_name google_picture
```

## Grant төрлүүд

| Grant | Хэрэглээ |
|---|---|
| `authorization_code` | Үндсэн нэвтрэлтийн урсгал (PKCE-тэй эсвэл client secret-тэй) |
| `refresh_token` | `offline_access` scope-той бол урт хугацааны session |
| `client_credentials` | Machine-to-machine (хэрэглэгчгүй) хандалт |

**Client баталгаажуулалт:** `client_secret_basic` (санал болгодог),
`client_secret_post`, `none` (public + PKCE).

**PKCE:** зөвхөн **S256** (`plain` дэмжигдэхгүй — RFC 9700 §2.1.1).

## Токен шалгах (introspection)

Сервер талдаа access token-ий төлөвийг шалгах бол:

```bash
curl -s https://developer.dgov.mn/oauth2/introspect \
  -u "<CLIENT_ID>:<CLIENT_SECRET>" \
  -d token=<ACCESS_TOKEN> | jq
```

```json
{ "active": true, "sub": "8b1c...", "client_id": "myapp", "exp": 1750000000 }
```

`id_token`-ыг бол локалаар шалгана: JWKS-ээс түлхүүр татаж RS256 гарын үсэг,
`iss`, `aud`, `exp`, `nonce`-ийг батал (ихэнх OIDC сан автоматаар хийдэг).

## Токен хүчингүй болгох

```bash
curl -s https://developer.dgov.mn/oauth2/revoke \
  -u "<CLIENT_ID>:<CLIENT_SECRET>" \
  -d token=<REFRESH_TOKEN>
```

## Алдааны формат

OAuth2 endpoint-ууд RFC 6749 формат буцаана:

```json
{ "error": "invalid_grant", "error_description": "authorization code expired" }
```

| Алдаа | Учир |
|---|---|
| `invalid_request` | Параметр дутуу/буруу |
| `invalid_client` | client_id/secret буруу |
| `invalid_grant` | Code хугацаа дууссан, redirect_uri зөрсөн, code давхар хэрэглэгдсэн |
| `invalid_scope` | Client-д олгогдоогүй scope |
| `access_denied` | Хэрэглэгч зөвшөөрөл өгөөгүй |

## Rate limit

Бүх нийтийн endpoint per-IP rate limit-тэй. Хязгаарт хүрвэл `429 Too Many
Requests` буцна — exponential backoff-той retry хий. Authorize/token урсгалын
хэвийн хэрэглээ хязгаарт хүрэхгүй.

!!! tip "Redirect URI яг таарах ёстой"
    `redirect_uri` нь бүртгэсэнтэй **тэмдэгт бүрээрээ** таарна (scheme, host,
    port, path). Wildcard дэмжигдэхгүй. Localhost-оо development-д тусад нь
    бүртгэ (жишээ нь `http://localhost:3000/auth/callback`).
