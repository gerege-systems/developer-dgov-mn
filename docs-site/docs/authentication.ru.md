# Аутентификация (eID + Government SSO)

Платформа поддерживает:

- **Вход через eID** — по электронному удостоверению (QR / App2App / push по регистрационному номеру).
- **Привязку Google** — привязать аккаунт Google после подтверждения через eID.
- **Government SSO (OIDC)** — платформа сама выступает провайдером OpenID Connect;
  приложения входят через неё.

## Вход через eID

Push прямо в приложение eID (App2App) или сканирование QR-кода. Сессии — JWT
access + refresh (с ротацией); выход отзывает оба (refresh + список запрещённых
access-токенов). Входа по паролю или email/OTP нет.

`sub` (subject) — это **стабильный непрозрачный идентификатор гражданина**
платформы (UUID пользователя), который передаётся встроенному провайдеру OIDC в потоке.

## Government SSO (провайдер OIDC)

Платформа — провайдер OpenID Connect, построенный на **собственном Go-коде**.
Приложения — доверяющие стороны (RP) — делегируют ей вход и получают
подтверждённые данные пользователя в виде стандартных claims.

```mermaid
sequenceDiagram
  participant App as Приложение (RP)
  participant SSO as sso.dgov.mn (Government SSO)
  participant eID as eID Mongolia
  App->>SSO: /oauth2/auth?client_id&redirect_uri&scope
  SSO->>eID: проверка через eID
  eID-->>SSO: гражданин подтверждён
  SSO-->>App: redirect_uri?code&state
  App->>SSO: /oauth2/token (code → access + id token)
  SSO-->>App: access_token, id_token
```

!!! tip "SSO — базовый (встроенный) сервис"
    Вход через SSO автоматически доступен **каждому зарегистрированному приложению**
    через базовые OIDC-scope (`openid profile email`). Вход не выдаётся и не
    блокируется отдельно по приложениям. А вот **дополнительные** сервисы
    (например, прокси eID) требуют выдачи доступа каждому приложению —
    см. [Прокси сервисов eID](eid-services.md).

Чтобы подключить своё приложение как RP, см. [Подключение приложения](sso-integration.md).
