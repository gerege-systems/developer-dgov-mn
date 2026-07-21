# Аюулгүй байдал

> Хамгаалалт нь «дараа наалдуулсан» биш, анхнаасаа шигтгэгдсэн. Энэ хуудас нь
> **кодод хэрэгжсэн** хяналтуудыг тоймлоно.

## Нэвтрэлт ба session

| Хяналт | Дэлгэрэнгүй |
|---|---|
| **eID-ээр л нэвтэрнэ** | Цорын ганц интерактив нэвтрэлт нь eID (QR / App2App / РД push). Нууц үгийн гадаргуу **огт байхгүй** |
| JWT access + refresh | Refresh нь **эргэлддэг** (rotation); `kind`-claim хамгаалалттай |
| Гарах үеийн deny-list | Гарахад access token-ий `jti` үлдсэн TTL-ээр Redis-д ордог; middleware хүсэлт бүрд шалгана |
| Иргэний гэрчилгээ (PKI) | Нэвтрэлт дуусахад иргэний гэрчилгээ (DER) ирж, `crypto/x509`-оор задарч сериал / хүчинтэй хугацаа / issuer хадгалагдана |
| Google холболт | Зөвхөн **холболт** — тогтвортой subject баганаар түлхүүрлэнэ |

!!! note "Нууц үг байхгүй гэдэг нь санамсаргүй биш"
    Нууц үгийн урсгал байхгүй тул HIBP / bcrypt / алдагдсан нууц үгийн шалгалт
    зэрэг хяналтууд **хамааралгүй**. Хуучин password/OTP usecase-ууд кодод
    үлдсэн ч route-д холбогдоогүй. Хэрэв хэзээ нэгэн цагт нууц үгийн зам
    нээвэл, HIBP шалгалтыг **түүнээс өмнө** холбох ёстой.

## Өгөгдлийн давхарга

- **Зөвхөн параметртэй query** (pgx) — string concat байхгүй, ORM ашиглахгүй.
- **Row-Level Security** — хэрэглэгч тус бүрийн хүснэгт бүрд `ENABLE` **ба
  `FORCE`**: `users`, `organizations`, `organization_memberships`, `gov_*`
  иргэний хүснэгтүүд, `user_integrations`. Бодлого нь гүйлгээ тус бүрд
  `SET LOCAL`-оор тавигдах `app.user_id` / `app.user_role` GUC-аар жолоодогдоно.
- **Identity байхгүй ⇒ 0 мөр** (fail-closed) — санамсаргүй задралаас хамгаална.

!!! warning "RLS boot guard"
    Апп асахдаа өөрийн DB role-оо шалгадаг. Production дээр **superuser** эсвэл
    `BYPASSRLS` эрхтэй бол **асахаас татгалзана** — эс бөгөөс RLS чимээгүйхэн
    үйлчлэхгүй байх байсан. Хөгжүүлэлтэд зөвхөн анхааруулна.

    Шинэ per-user хүснэгт нэмэх бүрд өөрийн бодлогыг нь заавал бич.

## Нууцлал (шифрлэлт)

| Юу | Хэрхэн |
|---|---|
| Гуравдагч талын OAuth токен | Хадгалахын өмнө **AES-256-GCM**-ээр битүүмжилнэ (`INTEGRATION_ENC_KEY`) |
| Токен / session ID | `crypto/rand`; modulo bias-аас сэргийлэх rejection sampling |
| Super admin MFA (TOTP) | Мөн `INTEGRATION_ENC_KEY`-ээр шифрлэгдэнэ |

!!! danger "INTEGRATION_ENC_KEY-г хэзээ ч бүү сольж бич"
    Нэгэнт тавьсан түлхүүрийг өөрчилвөл өмнө шифрлэсэн **бүх өгөгдөл эвдэрнэ**.
    Deploy скрипт үүнийг зөвхөн байхгүй үед л нэг удаа бичдэг (idempotent).

## Вэб / сүлжээний давхарга

- **Security headers** — CSP `default-src 'none'`, HSTS (prod), `nosniff`,
  `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP/CORP/COEP.
- **CORS** — хатуу origin жагсаалт; `*` + credentials хослолыг хэзээ ч зөвшөөрөхгүй.
- **Хүсэлтийн биеийн хязгаар** — глобал хязгаар + `/auth` дээр 4 KiB.
- **Серверийн бүрэн timeout** — `ReadHeader` 10с, `Read` 30с, `Write` 60с,
  `Idle` 120с, `MaxHeaderBytes` 16 KiB (slowloris / хэт том толгойн хамгаалалт).
- **Rate limiting** — `/auth` ~5/мин, `/ai/*` ~20/мин (IP тус бүрд).

### Frontend (BFF загвар)

Хөтөч зөвхөн **ижил-origin** `/api/*` route руу л ханддаг. Токенууд `httpOnly`
cookie-д амьдарч, клиентийн JS рүү **хэзээ ч** хүрдэггүй. Мутац хийх дуудалт бүр
`x-dgov-csrf` толгойтой явж, сервер тал `checkOrigin`-оор шалгана (давхар CSRF
хамгаалалт).

## Аудит

Hash-гинжтэй, зөвхөн-нэмэх бүртгэл:

```
chain_hash = SHA-256(prev_hash ‖ canonical-json(entry))
```

Бичигчид `pg_advisory_xact_lock`-оор дараалдаг; `VerifyChain` нь өөрчлөлтийг
илрүүлнэ. Зөвхөн админ уншина.

## Эрхийн хяналт (RBAC)

Динамик role + permission каталог, 4 түвшин: **superadmin → admin → manager →
user**. Route-ууд `RequirePermission` / `RequireAdmin` middleware-ээр хамгаална.
Super admin нь админ хэрэглэгчдийг удирдах цорын ганц үүрэг бөгөөд API-аар
үүсдэггүй — зөвхөн DB / env-ээр томилогдоно.

## Ажиллагааны хамгаалалт

Production дээр `/metrics` ба `/swagger/doc.json` нь bearer token-оор хаагдана
(тогтмол хугацааны харьцуулалт; таарахгүй бол **404**). Лог нь Zap structured,
request-id-тай — нууц утга хэзээ ч логдохгүй.

## ASVS замын зураг

| Түвшин | Байдал |
|---|---|
| **L1** | ✅ HTTPS + HSTS, нууц үггүй нэвтрэлт, параметртэй query, headers, CORS, оролтын шалгалт, structured log, commit-д secret байхгүй. ⏳ container scan / `govulncheck` |
| **L2** | ✅ rate limiting, refresh rotation, eID device-link (phishing-т тэсвэртэй), timeout, шифрлэсэн токен, hash-гинжтэй аудит. ⏳ WAF, төвлөрсөн SIEM, нөөцлөлт сэргээх тест, IR төлөвлөгөө |
| **L3** | ◻ талбар түвшний PII шифрлэлт (KMS), mTLS, SLSA L3, гадаад pentest — *энэ template-ийн хүрээнээс гадуур* |

## Мэдэгдэж буй дутагдал

- **Интерактив Swagger UI** — одоогоор зөвхөн түүхий spec-ийг `/swagger/doc.json`
  дээр өгнө (Swagger Editor / Postman-д ачаална).
- Дэлгэрэнгүй жагсаалт: [`backend/docs/SECURITY.md`](https://github.com/gerege-systems/template-gerege-mn/blob/main/backend/docs/SECURITY.md).

!!! tip "Эмзэг байдал мэдээлэх"
    Аюулгүй байдлын алдаа олбол нийтийн issue үүсгэхийн оронд
    [SECURITY.md](https://github.com/gerege-systems/template-gerege-mn/blob/main/SECURITY.md)-д
    заасан журмаар мэдэгдэнэ үү.
