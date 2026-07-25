# eID Mongolia — запрос на добавление endpoint для RP

> 🌐 [Монгол](EID_ENDPOINT_REQUESTS.md) · [中文](EID_ENDPOINT_REQUESTS_ZH.md) · **Русский**

> ✅ **ВЫПОЛНЕНО · ИСТОРИЧЕСКИЙ ДОКУМЕНТ (2026-07-17).** Запрошенные в этом
> документе endpoint для RP реализованы в вышестоящей платформе eID и уже
> используются на стороне RP. Живые клиентские вызовы находятся в
> `backend/pkg/eid/eid_pki.go` (`PersonSummary`, `PersonCertificates`,
> `PersonDevices`, `PersonActivity`), а также добавление/удаление организаций
> (`AddRepresentation`/`RemoveRepresentation`, `backend/pkg/eid/eid.go`);
> в API RP они опубликованы как
> `/api/v1/users/me/eid/{summary,certificates,devices,activity,organizations}`.
> Документ сохранён как **историческая запись** — в каждом разделе ниже отмечен
> статус выполнения.

> Запрашивающая сторона: **sso.dgov.mn** (RP UUID `c4f371c3-20bd-462e-8d97-5bc4a20fde08`)
> Получатель: **платформа eID Mongolia** (`gerege-systems/eid-platform-mn`)
> Дата: 2026-07-04 · База API: `https://eidmongolia.mn/v3`

## Цель

Мы хотим построить на стороне RP (доверяющей стороны) насыщенную **панель
управления** для гражданина: количество сертификатов (действительные/отозванные),
история и число входов и подписей, привязанные устройства, представляемые
организации, e-Seal. Часть данных уже доступна через существующие endpoint для
RP; часть **требует новых endpoint для RP**. Этот документ фиксирует имеющиеся
возможности и формулирует недостающие endpoint в виде конкретных запросов.

Предполагается, что все предлагаемые endpoint используют ту же аутентификацию,
что и v3: `Authorization: Bearer <rp_sk_…>` + `relyingPartyUUID/Name`.

---

## A. Существующие возможности (работают по RP Bearer — проверено)

| Возможность | Endpoint | Ответ |
|--------|----------|-------|
| Сертификат и личность при входе | `person` + `cert.value` (DER) в сессии `COMPLETE` | civil_id, имя, уровень сертификата, X.509 |
| Представляемые организации | `GET /v3/organization/representations/etsi/{personEtsi}` | `RepresentationsResponse{ representations[] }` |
| Сертификат e-Seal организации | `GET /v3/seal/certificate/{orgEtsi}` | `SealCertificateResponse` (serial, subjectDn, notBefore/After, level) |
| Выпуск e-Seal / проставление печати | `POST /v3/seal/certificate/{orgEtsi}`, `POST /v3/seal/{orgEtsi}` | требуется разрешение `SEAL` |
| Активно ли конкретное устройство | `GET /v3/device-status` (`X-Device-Token`) | только СОБСТВЕННОЕ устройство вызывающего |

→ **Это RP может использовать уже сейчас** (например, построить раздел
«Представляемые организации» на основе representations).

---

## B. Новые запрашиваемые endpoint для RP

### 1. Список / число сертификатов — `GET /v3/certificates/etsi/{personEtsi}`

**Статус: ✅ ВЫПОЛНЕНО** — `PersonCertificates` (`backend/pkg/eid/eid_pki.go`) →
`GET /api/v1/users/me/eid/certificates`.

**Зачем:** показать в профиле «действительных N, недействительных M, всего K
сертификатов» и сам список. Сейчас RP видит только ОДИН сертификат, полученный при входе.

**Предлагаемый ответ:**

```json
{
  "personEtsi": "PNOMN-...",
  "certificates": [
    {
      "documentNumber": "…",
      "type": "AUTH | SIGN | SEAL",
      "serialNumber": "…",
      "certificateLevel": "ADVANCED | QUALIFIED | QSCD",
      "status": "VALID | REVOKED | EXPIRED | SUSPENDED",
      "notBefore": "RFC3339",
      "notAfter": "RFC3339",
      "issuerDn": "…"
    }
  ]
}
```

**Приватность:** это PII гражданина, поэтому — (a) доступ только по
идентификатору недавней успешной auth-сессии либо (b) при выдаче RP отдельного
разрешения `CERTIFICATES_READ`. Вариант с областью RP (сертификаты, связанные с
этим RP) предпочтительнее.

### 2. История / число операций (в области RP) — `GET /v3/rp/activity/etsi/{personEtsi}`

**Статус: ✅ ВЫПОЛНЕНО** — `PersonActivity` (`backend/pkg/eid/eid_pki.go`) →
`GET /api/v1/users/me/eid/activity`.

**Зачем:** показать на панели/странице безопасности счётчики «входов: N,
подписей: M» и последние сессии.

**Параметры запроса:** `?flow=AUTHENTICATION|SIGNATURE&limit=20&offset=0`

**Предлагаемый ответ:**

```json
{
  "personEtsi": "PNOMN-...",
  "counts": { "authentication": 42, "signature": 7 },
  "sessions": [
    { "sessionId": "…", "flow": "AUTHENTICATION", "outcome": "OK", "timestamp": "RFC3339" }
  ]
}
```

**Примечание:** `GET /v3/mobile/activity/{documentNumber}` уже существует, но
открыт **только мобильному приложению** (App Attest + `X-Device-Token`) и является
ГЛОБАЛЬНЫМ (по всем RP). Чтобы открыть его для RP, нужна версия с областью RP и
RP-Bearer, возвращающая **только сессии этого RP** (без утечки данных других RP).

### 3. Привязанные устройства — `GET /v3/devices/etsi/{personEtsi}`

**Статус: ✅ ВЫПОЛНЕНО** — `PersonDevices` (`backend/pkg/eid/eid_pki.go`) →
`GET /api/v1/users/me/eid/devices`.

**Зачем:** в разделе безопасности перечислить зарегистрированные активные
устройства гражданина («Linked devices»).

**Предлагаемый ответ:**

```json
{
  "personEtsi": "PNOMN-...",
  "devices": [
    { "documentNumber": "…", "platform": "iOS | Android", "model": "…",
      "enrolledAt": "RFC3339", "lastSeenAt": "RFC3339", "active": true }
  ]
}
```

**Примечание:** `/v3/device-status` проверяет по `X-Device-Token` только ОДНО
собственное устройство вызывающего — способа перечислить все устройства
гражданина для RP нет.

### 4. (Опционально) Поток регистрации / привязки организации для RP

**Статус: ✅ ВЫПОЛНЕНО** — `AddRepresentation`/`RemoveRepresentation`
(`backend/pkg/eid/eid.go`) → `GET/POST/DELETE /api/v1/users/me/eid/organizations`.

**Зачем:** чтобы гражданин мог зарегистрировать/привязать представляемую им
организацию внутри RP. Сейчас это доступно только **администратору**
(`POST /v3/admin/organizations` + `/representatives`).
**Запрос:** открыть поток для RP на основе разрешений либо задокументировать
рекомендованный процесс регистрации организации со стороны RP.

---

## C. Сквозные требования (для всех новых endpoint)

- **Модель приватности/разрешений:** для каждого endpoint явно указать, ограничен
  ли он областью RP, закрыт ли свежей auth-сессией или требует отдельного
  разрешения RP (как `SEAL`). Мы предпочитаем область RP + явную выдачу разрешения.
- **Аутентификация:** как в v3 — `Authorization: Bearer <rp_sk_…>` + `relyingPartyUUID`.
- **Постраничность:** для activity/certificates — `limit`/`offset` либо cursor.
- **Well-known:** добавить новые endpoint в map `endpoints` в `.well-known/eid`.
- **Идентификаторы ETSI:** для персон `PNOMN-<civilId>`, для организаций
  `NTRMN-<register>` (в соответствии с текущим соглашением).

---

## D. Зависимости (на стороне RP уже готово)

sso.dgov.mn готов отображать эти данные сразу после их получения:
в профиле — личность eID и сертификаты (реализовано), далее — число сертификатов,
счётчики входов/подписей, привязанные устройства, разделы организаций. По мере
открытия endpoint мы будем добавлять их в собственный клиент `pkg/eid` и обогащать страницы.
