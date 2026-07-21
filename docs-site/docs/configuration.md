# Тохиргоо (env)

> Бүх тохиргоо орчны хувьсагчаар дамжина. Эх жишээ:
> [`backend/.env.example`](https://github.com/gerege-systems/template-gerege-mn/blob/main/backend/.env.example).

!!! danger "Secret-ийг хэзээ ч commit хийж болохгүй"
    `backend/internal/config/.env*`, root `.env` болон `backend.env` нь
    **gitignore**-д багтсан. Шинэ env хувьсагч нэмбэл README-д баримтжуул,
    утгыг нь биш.

## Суурь

| Хувьсагч | Жишээ | Тайлбар |
|---|---|---|
| `PORT` | `8080` | API сонсох порт |
| `ENVIRONMENT` | `production` | `production` үед хатуу горим асна |
| `DEBUG` | `false` | Дэлгэрэнгүй лог |
| `ALLOWED_ORIGINS` | `https://template.gerege.mn` | CORS allow-list (таслалаар; `*` хориотой) |
| `TRUSTED_PROXIES` | — | Reverse proxy-ийн IP-ууд |

## Өгөгдлийн сан ба Redis

| Хувьсагч | Тайлбар |
|---|---|
| `DB_POSTGRE_DSN` / `DB_POSTGRE_URL` | Холболтын мөр |
| `DB_MAX_OPEN_CONNS`, `DB_MAX_IDLE_CONNS`, `DB_CONN_MAX_LIFE_MINS` | Pool тохиргоо |
| `REDIS_HOST`, `REDIS_PASS`, `REDIS_EXPIRED` | Redis холболт ба TTL |

!!! warning "Production дээр DSN нь `sslmode=verify-full` байх ёстой"
    Production guard үүнийг шаарддаг. Docker compose стек нь зориудаар
    `ENVIRONMENT=development`-оор ажилладаг — дотоод DB нь TLS-гүй.

!!! danger "API нь superuser-ээр холбогдож БОЛОХГҮЙ"
    RLS үйлчлэхийн тулд app нь хамгийн бага эрхтэй role-оор холбогдоно.
    Superuser / `BYPASSRLS` бол production дээр асахаас татгалзана.

## JWT ба session

| Хувьсагч | Тайлбар |
|---|---|
| `JWT_SECRET` | **≥32 тэмдэгт.** Солих нь бүх session-ийг хүчингүй болгоно |
| `JWT_EXPIRED`, `JWT_REFRESH_EXPIRED` | Access / refresh хугацаа |
| `JWT_ISSUER` | Ихэвчлэн апп-ын домэйн. Солиход одоо байгаа бүх токен хүчингүй болно |

## eID (Relying Party)

| Хувьсагч | Тайлбар |
|---|---|
| `EID_BASE_URL` | eID Mongolia `/v3` суурь (эсвэл SSO-ийн sign relay) |
| `EID_RP_UUID`, `EID_RP_SECRET` | RP-ийн креденшл |
| `SIGN_RELAY_TOKEN` | Гарын үсгийн зуучлалын хуваалцсан токен (хоосон = унтраалттай) |

## Gerege SSO (RP тал — энэ апп нь client)

| Хувьсагч | Жишээ | Тайлбар |
|---|---|---|
| `SSO_ISSUER` | `https://sso.gerege.mn` | Хоосон бол энэ утга руу default-лана |
| `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` | — | Хоосон бол SSO урсгал идэвхгүй |
| `SSO_REDIRECT_URI` | `https://template.gerege.mn/sso/callback` | SSO client дээр **яг ийм** байдлаар бүртгэгдсэн байх ёстой |
| `SSO_SCOPE` | `openid profile email nationalid` | `nationalid` нь иргэний дугаар нэмнэ |
| `SSO_NATIVE_CLIENT_ID` | — | Мобайл (PKCE, public) урсгалын client |
| `SSO_EID_PROXY_BASE_URL` | — | Тохируулбал eID PKI самбар SSO proxy-гоор явна |

!!! note "Client бүртгэгдээгүй бол `invalid_client`"
    `SSO_CLIENT_ID` нь SSO провайдерын client санд байхгүй бол authorize алхам
    `{"error":"invalid_client"}` буцаана. Redirect URI ч мөн яг тааруулна.

## OIDC provider тал (энэ апп өөрөө provider болох)

| Хувьсагч | Тайлбар |
|---|---|
| `OAUTH_ISSUER` | Жишээ `https://template.gerege.mn`. **Тохируулсан үед л** provider асна |
| `SSO_STATE_KEY` | login/consent урсгалын transient state HMAC түлхүүр (**≥32 байт**) |
| `SSO_FIRSTPARTY_CLIENTS` | Зөвшөөрөл алгасах first-party client-ууд |
| `SSO_ADMIN_API_KEYS`, `SSO_ADMIN_SUBS` | Admin API хандалт |

## Гуравдагч тал ба хадгалалт

| Хувьсагч | Тайлбар |
|---|---|
| `GEMINI_API_KEY` | AI pipeline. Байхгүй бол `/ai/*` жинхэнэ 500 өгнө |
| `GOOGLE_CLIENT_ID` / `SECRET` | Google холболт (хоосон бол товч харагдахгүй) |
| `VERIFY_API_BASE`, `VERIFY_API_KEY`, `VERIFY_CHANNEL` | Иргэн/байгууллага лавлах |
| `XYP_API_BASE`, `XYP_CLIENT_ID`, `XYP_CLIENT_SECRET` | Улсын бүртгэлийн лавлагаа |
| `GSPACE_*` | Апп-ын өөрийн SFTP хадгалалт (хэрэглэгч тус бүр квоттой) |
| `INTEGRATION_ENC_KEY` | **≥16 байт.** OAuth токен + super admin MFA-г шифрлэнэ |

!!! danger "INTEGRATION_ENC_KEY заавал шаардлагатай"
    Deploy хийхэд энэ түлхүүр **заавал** байх ёстой, ба нэгэнт тавьсны дараа
    **хэзээ ч солигдож болохгүй** — өмнө шифрлэсэн бүх өгөгдөл эвдэрнэ.

## Ажиглалт (observability)

| Хувьсагч | Тайлбар |
|---|---|
| `OTEL_EXPORTER`, `OTEL_SAMPLE_RATIO` | OpenTelemetry trace |
| `OBSERVABILITY_TOKEN` | Production дээр `/metrics` ба `/swagger`-ийг хаах bearer token |

## Frontend

| Хувьсагч | Тайлбар |
|---|---|
| `BACKEND_URL` | BFF-ээс backend руу залгах **дотоод** хаяг (жишээ `http://api:8080`) |

!!! warning "Хуваалцсан сүлжээнд `api` нэр давхцаж болзошгүй"
    Олон стек нэг Docker сүлжээнд байвал `http://api:8080` өөр контейнер руу
    зохирч, бүх `/api/v1/*` 404 болж мэднэ. Тухайн үед `BACKEND_URL`-ээ
    өөрийн api контейнерийн бүтэн нэрээр pin хий.
