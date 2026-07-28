# Gerege Template Platform V3.0 — Фронтенд

> 🌐 [Монгол](README.md) · [中文](README_ZH.md) · **Русский**

> **Основа для создания цифровых услуг** — _Одна основа — все государственные и частные услуги._

Фронтенд **Gerege Template Platform V3.0** на Next.js 15 — готовая к продакшену
основа, на которой можно построить любую цифровую государственную услугу. Бэкенд
написан на Go (chi · pgx · PostgreSQL · Redis), а этот фронтенд надёжно проксирует
к нему по модели **BFF (Backend-for-Frontend)**, никогда не выпуская токены в
браузер, и объединяет стек «Go-бэкенд на Clean Architecture + Next.js BFF +
Gemini AI» в единый опыт.

- Технологии: Next.js App Router (React 19, серверные компоненты), TypeScript.
- Токены никогда не попадают в браузер — httpOnly-куки и серверный прокси.
- Вход: **eID Mongolia** (QR / мобильный deep-link / push по регистрационному
  номеру + long-poll), **Google OAuth** (сначала подтверждение через eID),
  **dgov SSO** (потребитель OIDC). Кроме того, приложение обслуживает страницы
  **провайдера OIDC (для RP)** (перед Ory Hydra).
- Масштаб: ~48 маршрутов страниц, ~100 route handler (`/api/*` + `/sso/callback`).

> **Эталонное развёртывание:** **DAN-Gerege SSO**
> ([sso.gerege.mn](https://sso.gerege.mn)) — национальный единый вход на базе eID —
> один из примеров реальной услуги, построенной на этой основе.

> Потоков входа по паролю / почте / OTP, регистрации и восстановления пароля
> **нет**. Единственное подтверждение личности — eID. (В бэкенде есть файлы вроде
> `auth_register.go`, `auth_send_otp.go`, но они не подключены ни к одному маршруту.)

---

## Архитектура — BFF (Backend-for-Frontend)

```
Браузер ──(тот же origin)──► route handler Next.js (/api/*) ──(сервер→сервер)──► Go API /api/v1
   ▲                                │
   └── httpOnly-кука (токен) ◄──────┘
```

- **Токены никогда не попадают в браузер.** Access/refresh JWT хранятся в
  `httpOnly`-куках (`dgov_access`, `dgov_refresh`) → устойчиво к XSS. URL выхода,
  инициированного RP, для сессии SSO лежит в куке `dgov_sso_logout` (используется,
  чтобы завершить сессию на стороне SSO при выходе). Определения кук —
  `src/lib/cookies.ts`.
- **CORS между браузером и Go не нужен.** Браузер обращается только к Next.js
  (тот же origin); к Go API проксирует только сервер Next.js (`connect-src 'self'`,
  жёстко задано в CSP в `src/next.config.mjs`).
- **Реактивное обновление токена.** Если защищённый вызов получает `401`, он один
  раз автоматически обновляется по refresh-токену и повторяется
  (`authedFetch` — `src/lib/api.ts`). Поскольку refresh делает **ротацию** токена,
  в контексте, где нельзя записать куку (рендер RSC), `tryRefresh` не выполняется
  вовсе — `canPersistSession()` сначала проверяет возможность записи куки, чтобы
  не сжечь действующую сессию впустую.
- **Двойная защита от CSRF.** Каждый изменяющий состояние маршрут BFF требует две
  проверки (`checkOrigin` — `src/lib/bff.ts`): (1) собственный заголовок
  `x-dgov-csrf: 1` (межсайтовая отправка формы не может выставить собственный
  заголовок), (2) сверка заголовка `Origin` с `APP_ORIGIN`. Заголовок со стороны
  браузера ставится в одном месте — в `sendJSON`/`postJSON` из `src/lib/client.ts`.
- **Ответы прокси без утечки токенов.** Возвращая ответ бэкенда в браузер, мы
  передаём только `ok/status/message/fieldErrors` (`toClientResponse`) либо
  дополнительно **несекретные** `data` (`proxyResult`) — поля вроде токенов не
  выходят никогда.
- **TanStack Query.** GET-данные (списки admin/RBAC, экраны gov/gateway и т. п.)
  с кэшем, дедупликацией и инвалидацией после мутаций. `getJSON` + `useQuery`;
  провайдер — `src/components/Providers.tsx`.

---

## Структура каталогов

```
src/
  app/
    page.tsx                     # Главная (аноним) / при входе — редирект на dashboard
    layout.tsx, globals.css      # корневой layout + токены темы gerege
    login/                       # вход через eID (LoginForm) + /login/verify
    auth/eid/callback/           # точка возврата App2App (одно устройство)
    app/eid/callback/            # мост колбэка для native/app
    sso/callback/route.ts        # redirect URI dgov SSO (route handler)
    oauth/                       # провайдер OIDC (для RP): login/consent/logout/error
    me/                          # все экраны вошедшего пользователя (layout=AreaShell)
    admin/                       # админ/RBAC/шлюз (layout=AreaShell + RBAC)
    manager/                     # экраны менеджера
    profile/, settings/          # legacy → редирект на /me/*
    api/                         # route handler BFF (подробнее ниже)
  components/
    AppShell, AreaShell, Providers   # layout + провайдер TanStack Query
    SigninShell, UserMenu, NavSearch, AppearanceControls, …
    landing/  me/  admin/  gateway/  gov/  ui/   # компоненты представлений по доменам
  lib/
    api.ts          # сервер→Go fetch + реактивное обновление (authedFetch/authedRaw)
    bff.ts          # checkOrigin (CSRF), proxyResult/toClientResponse, проверка ID
    client.ts       # браузер→BFF fetch (заголовок CSRF + getJSON/postJSON/sendJSON)
    session.ts      # set/get/clear httpOnly-кук с токенами + canPersistSession
    cookies.ts      # имена/опции кук (dgov_access/refresh/sso_logout)
    i18n.ts, lang.tsx   # словарь mn/en/zh/ru + хук useT()
    aiBff.ts, audio.ts  # whitelist аудио для маршрутов AI + запись/воспроизведение MediaRecorder
    pki.ts, integrations.ts, driveClient.ts, dropboxClient.ts
    govTypes.ts, gatewayTypes.ts, preferences.ts, format.ts, navigation.ts, types.ts
  middleware.ts     # защита маршрутов (ниже)
```

`src/middleware.ts`: пути `/me`, `/profile`, `/settings`, `/admin`, `/manager`
при отсутствии refresh-куки перенаправляются на `/login?next=…`; вошедшего
пользователя возвращает со страницы `/login`. `/admin` и `/manager`
дополнительно проверяются на сервере через RBAC (разрешения вычисляются, при
нехватке доступ понижается внутри).

---

## Страницы (карта маршрутов)

🔒 = требуется вход (middleware). Endpoint бэкенда имеют префикс `/api/v1`.

### Вход и сервисы входа

| Путь | Описание |
|-----|---------|
| `/` | Главная (аноним) / при входе — редирект на dashboard |
| `/login` | Вход через eID — push по регистрационному номеру или QR (привязка устройства); опция привязки Google |
| `/login/verify` | Экран ожидания/возврата подтверждения eID |
| `/auth/eid/callback` | Возврат App2App (одно устройство) — завершает опрос по `?sessionId=` |
| `/app/eid/callback` | Мост колбэка native/app (iOS) |
| `/sso/callback` | Redirect URI OIDC для dgov SSO (route handler) |
| `/oauth/login` 🅟 | Провайдер OIDC: вход по запросу RP (eID/Google) → accept challenge |
| `/oauth/consent` 🅟 | Провайдер OIDC: согласие на scope |
| `/oauth/logout` 🅟 | Провайдер OIDC: подтверждение выхода, инициированного RP |
| `/oauth/error` 🅟 | Провайдер OIDC: экран ошибки |
| `/profile`, `/settings` | legacy — редирект на `/me/profile`, `/me/settings` |

🅟 = провайдер OIDC (для RP). Ory Hydra направляет сюда браузер с
`login_challenge` / `consent_challenge`, DAN в собственном дизайне подтверждает
гражданина через eID и передаёт Hydra subject (BFF: `api/provider/*`).

### Моя система (`/me/*`) 🔒

| Путь | Описание |
|-----|---------|
| `/me/dashboard` | Личная панель управления |
| `/me/profile` | Профиль (данные гражданина из eID, имя латиницей, фото) |
| `/me/settings` | Настройки (оформление, выход) |
| `/me/ai` | AI-ассистент — текстовый/голосовой чат (🎤 STT, 🔊 TTS) |
| `/me/translate` | Синхронный перевод — фрагменты с микрофона переводятся в реальном времени |
| `/me/eid/id` | Удостоверение eID (данные гражданина) |
| `/me/eid/certificates` | Сертификаты PKI |
| `/me/eid/devices` | Привязанные устройства |
| `/me/eid/logs` | История активности eID |
| `/me/eid/security` | Безопасность eID |
| `/me/eid/sign` | Подписание документа электронной подписью |
| `/me/organizations` | Организации пользователя (список) |
| `/me/organizations/[id]` | Детали организации + участники |
| `/me/organizations/eid/[regNo]` | Организация из eID по регистрационному номеру (печать/подписанты) |
| `/me/applications` | Заявки на государственные услуги |
| `/me/appointments` | Запись на приём |
| `/me/payments` | Платежи |
| `/me/notifications` | Уведомления |
| `/me/references` | Справки |
| `/me/services` | Каталог государственных услуг |
| `/me/integrations` | Сторонние интеграции (Google Drive/Dropbox/Meet/GSpace) |

### Система администратора (`/admin/*`) 🔒 (RBAC)

| Путь | Описание |
|-----|---------|
| `/admin/dashboard` | Обзор для админа |
| `/admin/users` | Управление пользователями (активность, роль) |
| `/admin/roles` | RBAC — роли и разрешения |
| `/admin/superadmin` | Суперадмин — назначение/снятие администраторов |
| `/admin/audit` | Журнал аудита (выявляет подделку, проверяется) |
| `/admin/security` | События безопасности |
| `/admin/settings` | Системные настройки + слои промпта AI + оформление сайта |
| `/admin/core` | Поиск в Gerege Core (пользователь/организация по рег. номеру) |
| `/admin/gateway/overview` | API-шлюз — нагрузка/ошибки/задержки за 24 часа |
| `/admin/gateway/services` | Upstream-сервисы бэкенда |
| `/admin/gateway/routes` | Маршруты (путь/метод → сервис) |
| `/admin/gateway/consumers` | Потребители API и ключи |
| `/admin/gateway/policies` | Политики rate-limit / auth / CORS |
| `/admin/gateway/logs` | Журнал запросов шлюза |

### Система менеджера (`/manager/*`) 🔒 (RBAC)

| Путь | Описание |
|-----|---------|
| `/manager/dashboard` | Панель менеджера |
| `/manager/users` | Список пользователей (ограниченные права) |

---

## Карта маршрутов BFF `/api/*`

Все изменяющие маршруты сначала проходят `checkOrigin` (заголовок CSRF + Origin).
Защищённые вызовы идут через `authedFetch` (Bearer + реактивное обновление).

| Группа | Маршруты | Назначение |
|-------|-----------|---------|
| **auth** | `auth/eid/{start,start-id,poll}` · `auth/google/{start,callback}` · `auth/sso/{start,native}` · `auth/logout` · `auth/expired` · `auth/change-password` | Вход eID/Google/dgov SSO, выход |
| **provider** | `provider/login{,/accept,/reject}` · `provider/consent{,/accept,/reject}` · `provider/logout/accept` | Обработка challenge провайдера OIDC (Hydra) |
| **me** | `me` · `me/latin-name` · `me/signature` · `me/eid/{summary,certificates,devices,activity}` · `me/eid/organizations/*` | Профиль, eID/PKI, имя латиницей, подпись |
| **org** | `org` · `org/[id]` · `org/[id]/members[/userID]` · `org/lookup/[regNo]` | Организации и участники |
| **gov** | `gov/{overview,services,applications,appointments,payments,notifications,references}` (+ `/[id]/cancel`, `/[id]/pay`, `/[id]/read`, `/read-all`) | Государственные услуги |
| **sign** | `sign/init` · `sign/[id]` · `sign/[id]/download` | Электронная подпись документов |
| **integrations** | `integrations/[provider]/{connect,callback,disconnect}` · `integrations/google-drive/*` · `integrations/dropbox/*` · `integrations/google-meet/create-space` · `integrations/google-login/disconnect` | OAuth Google Drive/Dropbox/Meet + файлы |
| **gspace** | `gspace` · `gspace/upload` · `gspace/download` | Файловое пространство GSpace |
| **ai** | `ai/{chat,stt,tts,translate}` | Конвейер Gemini (whitelist аудио в `aiBff.ts`) |
| **rbac** | `rbac/me` · `rbac/permissions` · `rbac/roles[/id][/permissions]` | Управление ролями/разрешениями |
| **admin** | `admin/users[/id][/role][/active]` · `admin/ai/prompts[/key]` · `admin/site/appearance` | Пользователи, промпты AI, оформление сайта (область админа) |
| **superadmin** | `superadmin/admins[/id][/grant]` | Назначение администраторов |
| **audit / security** | `audit` · `audit/verify` · `security/events` | Журнал аудита и проверка |
| **gateway** | `gateway/{overview,services,routes,consumers,policies,logs}` (+ `/[id]`, `consumers/[id]/keys`, `keys/[keyId][/revoke]`) | Администрирование API-шлюза |
| **core** | `core/users` · `core/organizations` | Поиск в Gerege Core |
| **site** | `site/appearance` | Публичные (без входа) значения оформления |
| **aasa** | `aasa` | Apple App Site Association (iOS Universal Links) |

`/.well-known/apple-app-site-association` связывается с `api/aasa` через rewrite
в `next.config.mjs`.

---

## Потоки входа

### eID (основной)

1. На `/login` введите регистрационный номер или выберите способ с QR.
2. Браузер → `api/auth/eid/start` (QR) или `api/auth/eid/start-id` (push по
   регистрационному номеру). Бэкенд создаёт сессию и возвращает `session_id`,
   `device_link_url`, `verification_code`, `expires_at` (токены здесь не
   создаются, поэтому ответ проходит напрямую через `proxyResult`).
3. **Между устройствами** (десктоп): браузер опрашивает `api/auth/eid/poll`
   примерно каждые 2,5 с до статуса `COMPLETE`. **На одном устройстве** (мобильный
   браузер): передаётся `callbackUrl`, приложение eID открывается по deep-link
   (`geregesmartid://` / Universal Link), после подтверждения на телефоне браузер
   возвращается на `/auth/eid/callback?sessionId=…` и там завершает опрос.
4. `COMPLETE` → бэкенд возвращает пару токенов; BFF через `session.ts` кладёт их в
   httpOnly-куки и делает жёсткий редирект браузера на `next`.

### Google OAuth

Сначала подтверждение через eID, затем привязка аккаунта Google.
`api/auth/google/start` → согласие Google → `api/auth/google/callback`. При первой
привязке (glink) требуется подтверждение через eID. Если `GOOGLE_CLIENT_ID` пуст,
кнопка указывает на «не настроено».

### dgov SSO (потребитель OIDC)

`api/auth/sso/start` → бэкенд `POST /sso/start` (state в Redis) → редирект на
authorize-URL `sso.gerege.mn` → `/sso/callback` (route handler) → пара токенов →
куки. Нативное приложение iOS обменивает код через `api/auth/sso/native`
(ASWebAuthenticationSession + PKCE, публичный клиент).

### Провайдер OIDC (для RP)

DAN обрабатывает challenge входа/согласия/выхода перед Ory Hydra: на
`/oauth/login` гражданин входит через eID, затем вызывается
`provider/login/accept`; на `/oauth/consent` подтверждается scope и вызывается
`provider/consent/accept`, после чего Hydra получает subject.

---

## Переменные окружения

Используются в `src/lib/cookies.ts`, `src/lib/api.ts`,
`docker-compose.yml (web)`. В `.env.example` есть только первые две — остальные
нужны в compose (или в продакшене).

| Переменная | По умолчанию | Описание |
|----------|---------|---------|
| `BACKEND_URL` | `http://localhost:8080` | База Go API (без префикса `api/v1`). Читается только на сервере. |
| `COOKIE_SECURE` | в проде `true` | `true` при HTTPS. Если не указано, в продакшене fail-closed Secure. |
| `APP_ORIGIN` | origin запроса | Проверка `Origin` для CSRF + база redirect_uri интеграций. Обязателен в проде. |
| `GOOGLE_CLIENT_ID` | — | URL согласия для входа через Google (не секрет). Если пусто, Google неактивен. |
| `GOOGLE_DRIVE_CLIENT_ID` / `_SECRET` | — | OAuth интеграции Google Drive (обмен токенов на стороне BFF). |
| `DROPBOX_CLIENT_ID` / `_SECRET` | — | OAuth интеграции Dropbox. |
| `GOOGLE_MEET_CLIENT_ID` / `_SECRET` | — | OAuth для создания пространств Google Meet. |

`redirect_uri` интеграций = `${APP_ORIGIN}/api/integrations/<provider>/callback`.
Интеграции без настроенного OAuth остаются неактивными со статусом «Скоро» — к их
хостам обращений не будет.

---

## Запуск

```bash
# 1) Запустите бэкенд (в каталоге backend/ репозитория, в другом терминале)
cd ../backend && make run        # http://localhost:8080
# или весь стек:  docker compose up -d --build

# 2) Переменные окружения
cp .env.example .env.local       # при необходимости поправьте BACKEND_URL

# 3) Фронтенд
npm install
npm run dev                      # http://localhost:3000

npm run build                    # CI: сборка + lint + проверка типов
npm run lint
npm run test                     # vitest (юнит-тесты bff/i18n/navigation)
```

В Docker сервис `web` собирается в лёгкий образ через `output: 'standalone'` и
проксирует к `api:8080` по внутренней сети (`docker-compose.yml`).

---

## PWA — установка как приложение

Frontend — устанавливаемое **PWA**. Выполняются условия для предложения
установки в браузере (Chrome/Edge/Android): HTTPS + manifest + иконки 192/512 +
service worker. В iOS Safari «На экран «Домой»» открывает приложение в режиме
standalone.

| Файл | Назначение |
|---|---|
| `src/app/manifest.ts` | `/manifest.webmanifest` — Next.js metadata route |
| `src/app/sw.ts` | Исходник service worker (Serwist) |
| `src/app/~offline/` | Страница-заглушка при отсутствии сети (`useT()` i18n) |
| `public/icons/` | 192 · 512 · 512-maskable · apple-touch-icon |
| `tsconfig.sw.json` | Отдельная проверка типов SW (WebWorker lib) |
| `scripts/make-pwa-icons.py` | Перегенерация иконок из фирменного знака |

Manifest: `name` **Ring System**, `short_name` **Ring**, `display` `standalone`,
`start_url` `/`, `theme_color` `#0064E1` (брендовый токен `--dan-blue`),
`background_color` `#ffffff`.

### Политика кеширования — только статика

Ключевой принцип безопасности: **сессия, CSRF и eID никогда не отдаются из кеша.**
Правила в `src/app/sw.ts` проверяются по порядку, побеждает первое совпадение:

| # | Область | Стратегия |
|---|---|---|
| 1 | `/api`, `/auth`, `/oauth`, `/provider`, `/sso`, `/login`, `/logout` и всё, где в пути есть сегмент `eid` | **NetworkOnly** |
| 2 | `/_next/static/*` (сборка с хешем, шрифты next/font) | CacheFirst |
| 3 | Изображения того же origin | CacheFirst |
| 4 | Шрифты того же origin | CacheFirst |
| 5 | Прочие страницы того же origin (document) | **NetworkOnly** (только ради офлайн-заглушки) |

- **HTML не кешируется вообще.** Единственная доступная офлайн страница — `/~offline`.
- **SW не перехватывает кросс-доменные запросы.** Иначе `fetch()` внутри SW
  подчинялся бы CSP приложения (`connect-src 'self'`), и, например, аватары
  Google были бы заблокированы. Без перехвата их грузит сам браузер.
- `/_next/static/*` исключается **до** правила 1: Next.js называет чанки по путям
  маршрутов, поэтому в имени файла может встречаться `api`/`eid`, но это
  публичные неизменяемые JS-файлы.
- В режиме разработки service worker **не создаётся вовсе**
  (`next.config.mjs` → `disable`).

### CSP

**Изменения не потребовались.** Без директивы `worker-src` CSP откатывается к
`child-src` → `default-src`, а `default-src 'self'` разрешает `/sw.js` того же
origin. Все matcher-ы SW перехватывают только запросы того же origin, поэтому
конфликта с `connect-src 'self'` нет.

### Запуск / проверка

```bash
npm run build            # typecheck:sw + next build → создаётся public/sw.js
npm run icons:pwa        # перегенерация иконок (нужен Pillow)

npm start                # прод-режим — SW активен только здесь
curl -s localhost:3000/manifest.webmanifest
```

DevTools браузера → Application: *Manifest* (без ошибок), *Service Workers*
(activated), *Cache Storage* → в `serwist-precache-v2-*` должны быть `/~offline`
и `/_next/static/*`, и **не должно** быть ни одного ответа `/api/*`.

> Примечание: имена `Ring System` / `Ring` в manifest намеренно отличаются от
> заголовка сайта (`Gerege Template Platform V3.0`) — установленное приложение
> брендировано отдельно. Чтобы унифицировать, измените одновременно
> `src/app/manifest.ts` и `applicationName` / `appleWebApp.title` в `layout.tsx`.

---

## Языки интерфейса (динамические)

Список языков **не фиксируется на этапе сборки**. Суперадмин добавляет языки,
включает их и заполняет переводы через Gemini на странице `/admin/languages` —
без повторного развёртывания.

Объединяются два слоя:

| Слой | Источник | Роль |
|---|---|---|
| Встроенный | `dict` в `src/lib/i18n.ts` (mn·en·zh·ru) | **Источник ключей** + надёжная основа при отсутствии сети / отказе БД |
| Overlay | `GET /api/public/languages/{code}/dictionary` | Значения под управлением суперадмина — перекрывают встроенные |

Приоритет `t()`: **overlay → встроенный язык → монгольский → имя ключа.**
Поэтому даже при неполном переводе нового языка интерфейс не будет пустым.

- `LangProvider` (`src/lib/lang.tsx`) загружает включённые языки и overlay;
  `useT()` возвращает `T`, `locale`, `languages`.
- Переключатель языка (`UserMenu`) берёт список из API; невстроенные языки
  показываются кодом (`JA`).
- Тексты лендинга (`components/landing/copy.ts`) остаются встроенными — для
  нового языка происходит откат на английский (`landingCopyFor`).
- `i18n.test.ts` по-прежнему требует паритета ключей для четырёх встроенных языков.

**«Установить через AI»** отправляет встроенный монгольский словарь приложения
на бэкенд, и Gemini заполняет недостающие ключи. Значения, отредактированные
вручную, никогда не перезаписываются; переводы с потерянными плейсхолдерами
(`{name}`) не сохраняются.

> Бэкенд: platform-core **v0.5.0**+ (migration 49).

---

## Тема gerege

Дизайн-система находится в `src/app/globals.css` — токены OKLCH (DAN blue
`#1767E7`), светлая/тёмная темы, шрифты Inter + JetBrains Mono. Пользовательские
настройки оформления (accent/font/density/theme) хранятся в `localStorage` и
применяются до рендера скриптом `public/theme-bootstrap.js`, предотвращающим
FOUC. Админ задаёт общесайтовые значения по умолчанию через
`api/admin/site/appearance`; публичные (без входа) значения возвращает
`api/site/appearance`.

Строки интерфейса выводятся через `useT()` и ключи `src/lib/i18n.ts` (mn + en + zh + ru).

Внутреннее устройство возможностей AI см. в
[../backend/docs/AI_PIPELINE_RU.md](../backend/docs/AI_PIPELINE_RU.md).
