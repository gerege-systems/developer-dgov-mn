# Руководство по развёртыванию

> 🌐 [English](DEPLOYMENT.md) · [Монгол](DEPLOYMENT_MN.md) · [中文](DEPLOYMENT_ZH.md) · **Русский**

Как развернуть **Gerege Template Platform V3.0** (Төр, хувийн хэвшлийн
үйлчилгээний суурь платформ) — готовую к продакшену основу для создания цифровых
услуг — на одном VPS с Docker Compose за nginx. Шаги ниже используют флагманское
эталонное развёртывание платформы, **DAN-Gerege SSO** (sso.gerege.mn), как рабочий
пример. Стек — Postgres + Redis + Go API + Next.js BFF web + **Ory Hydra**
(OIDC issuer, который делает dan провайдером SSO). Это тот самый регламент,
который используется для эталонного развёртывания.

## Топология

Публикуются три порта на loopback хоста; nginx терминирует TLS и проксирует
каждый в нужный контейнер. `db` и `redis` никогда не покидают внутреннюю сеть
compose, а **административный** API Hydra доступен только на loopback (никогда не проксируется).

```
Internet ──► nginx (80/443, TLS через Let's Encrypt)
   │
   ├─ /oauth2/*, /.well-known/openid-configuration, /userinfo, /health/ready
   │      ─────────────────────────► hydra  127.0.0.1:${HYDRA_PUBLIC_PORT}   (Ory Hydra — OIDC issuer, ПУБЛИЧНЫЙ API)
   │
   ├─ /rp/sign/*  (ретранслятор подписи eID для сторонних доверяющих сторон)
   │      ─────────────────────────► api    127.0.0.1:${API_RELAY_PORT}      (бэкенд :8080, loopback-ретранслятор)
   │
   └─ всё остальное — приложение, BFF /api/*, и интерфейс входа/согласия OIDC
      (/oauth/login, /oauth/consent, /oauth/logout, /oauth/error)
          ─────────────────────────► web    127.0.0.1:${WEB_PORT}            (Next.js BFF)
                                       │ BACKEND_URL=http://api:8080
                                       ▼
   внутренняя сеть compose (без публичных портов хоста):
        api ──► db (Postgres 16 — базы gerege_template и hydra) + redis (7)
        hydra ──► db (база hydra)   admin :4445 = ТОЛЬКО LOOPBACK, никогда не проксируется
        hydra-migrate (разовый), migrate (разовый) — применяют схему и завершаются
```

Итак, `web` — **не** единственный публикуемый контейнер: nginx должен также
обслуживать публичный API Hydra (`:4444`) и ретранслятор подписи api (`:8091`).
Браузер обращается к `web` за приложением и его BFF; протокольные endpoint OIDC
отдаёт Hydra; а страницы *входа/согласия* OAuth (которые dan рисует сам, после
проверки гражданина через eID) находятся на `web` по пути `/oauth/*`. Разовый
контейнер `migrate` применяет SQL-миграции при каждом `up`; `hydra-migrate`
применяет собственную схему Hydra в отдельную базу `hydra` и завершается.

!!! note
    **Сервис `db` теперь собирается, а не загружается готовым.** Это
    `postgres:16-alpine` плюс скомпилированное расширение `pgvector`
    (`backend/deploy/db/Dockerfile`) — база знаний AI хранит 768-мерные векторы
    в столбце типа `vector`. Первый `docker compose up -d --build` после этого
    изменения соберёт расширение (~1–2 мин) и пересоздаст контейнер `db`;
    том с данными не затрагивается, а базовый образ остаётся alpine, поэтому
    collation текстовых индексов не меняется.

## Предварительные требования

- VPS с Docker и плагином compose (`docker compose version`)
- nginx + certbot на хосте (или любой обратный прокси с терминацией TLS)
- DNS-запись для `sso.gerege.mn`, указывающая на сервер

## 1. Получите код

```bash
git clone https://github.com/gerege-systems/dan-dgov-mn.git /srv/dan
cd /srv/dan
```

## 2. Создайте два файла окружения (оба в gitignore)

### `./.env` — подстановка для compose

Здесь всё, что подставляет compose. Секреты Hydra, помеченные **ОБЯЗАТЕЛЬНО**,
используют `${VAR:?}` в `docker-compose.yml`, поэтому **compose откажется
стартовать**, если они не заданы или пусты.

```env
# --- Postgres / Redis ---
POSTGRES_USER=postgres            # суперпользователь — только для migrate и hydra-migrate
POSTGRES_PASSWORD=<random>
POSTGRES_DB=gerege_template
APP_DB_USER=app_user              # роль с минимальными правами, под которой подключается api
APP_DB_PASSWORD=<random>
APP_DB_DSN=host=db port=5432 user=app_user password=<same> dbname=gerege_template sslmode=disable
REDIS_PASS=<random>

# --- Приложение / origin ---
APP_ORIGIN=https://sso.gerege.mn    # точный публичный origin (проверка origin для CSRF)
WEB_PORT=3007                     # loopback-порт, на который nginx проксирует приложение
API_RELAY_PORT=8091               # loopback-порт, на который nginx проксирует /rp/sign (api :8080)

# --- Ory Hydra (OIDC issuer) ---
HYDRA_PUBLIC_PORT=4444            # loopback-порт публичного API OIDC
HYDRA_ADMIN_PORT=4445             # админский API Hydra — только loopback, НИКОГДА не проксируется
HYDRA_PUBLIC_URL=https://sso.gerege.mn          # ОБЯЗАТЕЛЬНО — OIDC issuer / собственный URL
HYDRA_POST_LOGOUT_REDIRECT=https://sso.gerege.mn/   # необязательно; по умолчанию HYDRA_PUBLIC_URL/
HYDRA_SYSTEM_SECRET=<≥32 случайных символов>  # ОБЯЗАТЕЛЬНО — системный секрет Hydra
HYDRA_COOKIE_SECRET=<≥32 случайных символов>  # ОБЯЗАТЕЛЬНО — секрет для кук Hydra
HYDRA_PAIRWISE_SALT=<random>                  # ОБЯЗАТЕЛЬНО — соль для pairwise subject

# --- client id/secret OAuth, используемые web BFF (пусто = соответствующая кнопка/карточка неактивна) ---
GOOGLE_CLIENT_ID=<…>              # привязка аккаунта Google (задаётся и в backend.env)
GOOGLE_DRIVE_CLIENT_ID=<…>        # сторонние интеграции; обмен токенов делает BFF,
GOOGLE_DRIVE_CLIENT_SECRET=<…>    # поэтому секреты тоже здесь.
DROPBOX_CLIENT_ID=<…>             # redirect_uri = ${APP_ORIGIN}/api/integrations/<provider>/callback
DROPBOX_CLIENT_SECRET=<…>
GOOGLE_MEET_CLIENT_ID=<…>
GOOGLE_MEET_CLIENT_SECRET=<…>
```

### `./backend.env` — монтируется в `api` и `migrate` как `/app/.env`

Это файл конфигурации бэкенда (его читает viper). В нём учётные данные
доверяющей стороны eID, настройки провайдера SSO/OIDC и все секреты интеграций.
Полная схема — `backend/internal/config/config.go`; ключевые параметры для
развёртывания eID SSO:

```env
# --- Основное ---
PORT=8080
ENVIRONMENT=development           # стек compose работает в режиме разработки: у внутренней
                                  # базы нет TLS (продакшен-проверка требует
                                  # sslmode=verify-full); TLS терминируется на nginx
DEBUG=false
DB_POSTGRE_DRIVER=postgres
DB_POSTGRE_DSN=postgres://postgres:<POSTGRES_PASSWORD>@db:5432/gerege_template?sslmode=disable
                                  # ^ DSN суперпользователя — используется MIGRATE (DDL).
                                  # api переопределяет его через APP_DB_DSN (см. §3).
JWT_SECRET=<≥32 случайных символов>
JWT_EXPIRED=24                    # часы (1–24)
JWT_ISSUER=sso.gerege.mn
JWT_REFRESH_EXPIRED=7             # дни
BCRYPT_COST=12
OTP_MAX_ATTEMPTS=5
REDIS_HOST=redis:6379
REDIS_PASS=<как в .env>
REDIS_EXPIRED=5                   # минуты
ALLOWED_ORIGINS=https://sso.gerege.mn
TRUSTED_PROXIES=172.16.0.0/12,127.0.0.1   # доверять XFF только из сети docker и от nginx.
                                  # ОБЯЗАТЕЛЬНО за прокси: у api нет публичного порта
                                  # приложения, поэтому запросы приходят от web/nginx.
                                  # Без списка доверенных прокси api игнорирует
                                  # X-Forwarded-For, и все лимиты по IP схлопываются
                                  # в одно ведро.

# --- Доверяющая сторона eID (ЕДИНСТВЕННЫЙ интерактивный вход) ---
EID_BASE_URL=https://eidmongolia.mn/v3   # базовый адрес IdP eID (по умолчанию)
EID_RP_UUID=<UUID RP, выданный eID Mongolia>
EID_RP_NAME=dan-dgov-mn
EID_RP_SECRET=<секрет RP>
EID_CERT_LEVEL=ADVANCED           # ADVANCED для входа (QUALIFIED/QSCD для подписи)
EID_CALLBACK_URL=https://sso.gerege.mn/login/verify   # должен быть в белом списке у IdP
EID_DISPLAY_TEXT=sso.gerege.mn

# --- Google OAuth (привязка аккаунта к eID; обмен кода на сервере) ---
GOOGLE_CLIENT_ID=<…>
GOOGLE_CLIENT_SECRET=<…>

# --- Потребитель dgov SSO (OIDC sso.gerege.mn — второй вход рядом с eID) ---
SSO_ISSUER=https://sso.gerege.mn
SSO_CLIENT_ID=<…>
SSO_CLIENT_SECRET=<…>
SSO_REDIRECT_URI=https://sso.gerege.mn/sso/callback
SSO_SCOPE=openid profile email
SSO_NATIVE_CLIENT_ID=dan-dgov-mn-ios   # client_id в Hydra для мобильного потока PKCE

# --- Сторона провайдера OIDC (dan работает поверх Ory Hydra как SSO issuer) ---
HYDRA_ADMIN_URL=http://hydra:4445      # админский API (CRUD клиентов + вход/согласие/выход)
HYDRA_PUBLIC_URL=https://sso.gerege.mn   # issuer, из которого строятся редиректы
SSO_STATE_KEY=<≥32 случайных символов>  # HMAC-ключ для cookie состояния входа/согласия
SSO_FIRSTPARTY_CLIENTS=<client_id через запятую>   # для них пропускается экран согласия
SSO_ADMIN_API_KEYS=<стартовые ключи через запятую> # стартовые ключи для поверхности /admin
SSO_ADMIN_SUBS=<eid_sub через запятую>             # eid_sub, которым выдан суперадмин

# --- Сервисы платформы Gerege ---
XYP_API_BASE=https://xyp.dgov.mn       # поиск организаций (HTTP Basic; необязательно)
XYP_CLIENT_ID=<…>
XYP_CLIENT_SECRET=<…>
CORE_API_BASE=https://core.gerege.mn     # поиск пользователей/организаций
CORE_API_TOKEN=<сервисный bearer>
GSPACE_HOST=<sftp-хост>                # SFTP-хранилище Gerege Space по пользователям (необязательно)
GSPACE_PORT=22
GSPACE_USER=<…>
GSPACE_PASSWORD=<…>
GSPACE_BASE_PATH=gerege-space
GSPACE_QUOTA_BYTES=2097152             # 2 МБ на пользователя

# --- Шифрование / подпись / наблюдаемость ---
INTEGRATION_ENC_KEY=<≥32 случайных символов> # ключ AES-256-GCM для хранимых OAuth-токенов
SIGN_RELAY_TOKEN=<общий токен>         # включает ретранслятор /rp/sign для сторонних RP (пусто = выкл.)
SIGN_SIGNER_CERT_FILE=/app/certs/signer.crt   # сертификат document-signer PAdES (в проде ОБЯЗАТЕЛЬНО,
SIGN_SIGNER_KEY_FILE=/app/certs/signer.key    #  fail-closed; в разработке используется самоподписанный)
OBSERVABILITY_TOKEN=<random>           # bearer для /metrics + /swagger/doc.json в проде
GEMINI_API_KEY=<AIza…>                 # функции AI; пусто = endpoints AI возвращают 500
```

Секреты генерируйте через `openssl rand -hex 24` (или `-hex 32` для ключей «≥32»).
`SIGN_SIGNER_CERT_FILE` / `SIGN_SIGNER_KEY_FILE` — это пути **внутри** контейнера;
если вы их задаёте, смонтируйте PEM-файлы (например, добавьте том только для
чтения сервису `api`). В dev-стеке compose они могут остаться пустыми — тогда
подписант использует самоподписанный ключ для разработки.

## 3. Почему две роли БД (прочитайте до первого запуска)

Row-Level Security **молча обходится** суперпользователями. Поэтому стек
использует две роли:

- `migrate` (и `hydra-migrate`) подключаются как `POSTGRES_USER` (суперпользователь —
  нужен для `CREATE EXTENSION`, DDL RLS и создания базы `hydra`).
- `api` подключается как `APP_DB_USER` (`NOSUPERUSER NOBYPASSRLS`), которую
  автоматически создаёт `backend/deploy/initdb/10-create-app-user.sh` **при первой
  инициализации пустого тома данных**. Второй initdb-скрипт,
  `20-create-hydra-db.sh`, создаёт отдельную базу `hydra` для Ory Hydra.

api **проверяет это при старте**: если его роль — суперпользователь/BYPASSRLS, в
режиме продакшена он не запускается, а в режиме разработки пишет предупреждение.
Если вы разворачиваете поверх *существующей* базы, создайте роль приложения и
привилегии вручную (см. initdb-скрипт), создайте базу `hydra`
(`docker compose exec db psql -U "$POSTGRES_USER" -c 'CREATE DATABASE hydra;'`)
и направьте `APP_DB_DSN` на роль приложения.

## 4. Первое развёртывание

```bash
docker compose up -d --build      # собирает api+web, выполняет обе задачи migrate, запускает всё
docker compose ps                 # ожидается: db/redis/api/web/hydra healthy или running,
                                  #            migrate и hydra-migrate Exited (0)
```

### vhost nginx (на хосте)

Пути OIDC issuer должны попадать в Hydra, `/rp/sign` — в ретранслятор api,
всё остальное — в `web`. Админский порт Hydra (`:4445`) здесь **никогда** не указывается.

```nginx
upstream dan_web   { server 127.0.0.1:3007; }   # = WEB_PORT
upstream dan_hydra { server 127.0.0.1:4444; }   # = HYDRA_PUBLIC_PORT
upstream dan_relay { server 127.0.0.1:8091; }   # = API_RELAY_PORT (api :8080)

server {
    server_name sso.gerege.mn;

    # Протокольные endpoint OIDC → публичный API Ory Hydra
    location /oauth2/                         { proxy_pass http://dan_hydra; include /etc/nginx/proxy_params; }
    location = /userinfo                      { proxy_pass http://dan_hydra; include /etc/nginx/proxy_params; }
    location /.well-known/openid-configuration { proxy_pass http://dan_hydra; include /etc/nginx/proxy_params; }
    location = /.well-known/jwks.json         { proxy_pass http://dan_hydra; include /etc/nginx/proxy_params; }

    # Ретранслятор подписи eID для сторонних RP → loopback-ретранслятор api
    location /rp/sign/                        { proxy_pass http://dan_relay; include /etc/nginx/proxy_params; }

    # Приложение, BFF /api/* и интерфейс /oauth/login|consent|logout → web BFF
    location / {
        proxy_pass http://dan_web;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

(Общие строки `proxy_set_header` вынесите в `/etc/nginx/proxy_params` и
подключайте через `include` либо повторяйте в каждом блоке.) Затем
`certbot --nginx -d sso.gerege.mn` для TLS. Файл compose ставит
`COOKIE_SECURE=true`, а Hydra работает с
`SERVE_COOKIES_SAME_SITE_MODE=None` (что требует `Secure`), поэтому сайт
**обязан** обслуживаться по HTTPS, иначе браузеры отбросят куки аутентификации и OIDC.

## 5. Обновление работающего развёртывания

```bash
cd /srv/dan
git pull --ff-only origin main
docker compose build              # api + web + migrate
docker compose up -d              # пересоздаёт изменённые контейнеры; migrate и hydra-migrate
                                  # запускаются снова (применённые миграции пропускаются)
```

`db` и `redis` продолжают работать — данные не затрагиваются. Изменили только
конфигурацию? Отредактируйте `backend.env` / `.env` и выполните
`docker compose up -d api web` (перезапустите и `hydra`, если меняли значение `HYDRA_*`).

### Автоматические развёртывания (CI/CD)

Развёртывание **не** является задачей внутри CI. Два workflow связаны в цепочку:

1. [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — предполётные проверки
   (`backend`, `frontend`, `secrets-scan`) выполняются на каждый push в `main` и каждый PR.
2. [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — **отдельный**
   workflow, запускаемый по `workflow_run` **после завершения CI**, поэтому CI и
   Deploy больше не идут параллельно, а «красная» сборка никогда не уезжает в прод.
   Он развёртывает, только если связанный запуск CI завершился `success` на `main`
   (либо при ручном `workflow_dispatch`). Он заходит по SSH на VPS под выделенным
   не-root пользователем `deploy`, делает `git reset --hard` на тот самый коммит,
   прошедший CI, и запускает [`deploy/deploy.sh`](../deploy/deploy.sh)
   (пересборка → `up -d` → ожидание healthy → prune). `db`/`redis` остаются
   работать; миграции запускаются заново и пропускают применённые файлы.

Разовая настройка — добавьте эти секреты репозитория в
**Settings → Secrets and variables → Actions**:

| Секрет | Значение |
|--------|-------|
| `DEPLOY_HOST` | IP / имя хоста VPS |
| `DEPLOY_USER` | выделенный **не-root** SSH-пользователь (`deploy`), владеющий каталогом репозитория и имеющий доступ к docker |
| `DEPLOY_PATH` | путь к репозиторию на сервере; `deploy.yml` по умолчанию использует `/srv/dan` |
| `DEPLOY_SSH_KEY` | **приватный** ключ выделенной пары для развёртывания; публичный лежит в `~/.ssh/authorized_keys` на сервере |
| `DEPLOY_PORT` | *(необязательно)* SSH-порт, по умолчанию `22` |

Сгенерируйте пару ключей `ssh-keygen -t ed25519 -f deploy_key -N ''`, добавьте
`deploy_key.pub` в `authorized_keys` пользователя `deploy`, а приватный
`deploy_key` вставьте в `DEPLOY_SSH_KEY`. Запустить развёртывание без изменений
кода можно со вкладки Actions (**Run workflow** — `workflow_dispatch` разворачивает
HEAD ветки `origin/main`) или вручную выполнить `bash deploy/deploy.sh` на сервере.

## 6. Проверка

```bash
docker compose ps                                       # все healthy / задачи migrate Exited(0)
docker logs dan-dgov-mn-migrate-1 | tail -3             # "migration [up] success"
docker logs dan-dgov-mn-hydra-migrate-1 | tail -3       # схема Hydra применена
docker logs dan-dgov-mn-api-1 2>&1 | grep -i error      # должно быть пусто
curl -s -o /dev/null -w '%{http_code}\n' https://sso.gerege.mn/   # 200
curl -s https://sso.gerege.mn/.well-known/openid-configuration | head -c 80   # JSON OIDC issuer
```

## 7. Откат

```bash
git log --oneline                 # найдите последний рабочий коммит
git checkout <commit> -- .        # или: git reset --hard <commit>
docker compose build && docker compose up -d
```

SQL-миграции в этом процессе применяются только вперёд; если миграцию нужно
откатить, примените вручную соответствующий `N_*.down.sql` до отката кода за неё.

## Гигиена секретов

- `.env` и `backend.env` в gitignore — никогда их не коммитьте.
- Смена `JWT_SECRET` принудительно разлогинивает всех (все токены аннулируются).
- Смена `HYDRA_SYSTEM_SECRET` / `HYDRA_COOKIE_SECRET` аннулирует существующие
  сессии и согласия OIDC — согласуйте её с нижестоящими доверяющими сторонами.
- Меняйте `GEMINI_API_KEY` и учётные данные OAuth / `EID_RP_SECRET` /
  `CORE_API_TOKEN` в их консолях, обновите `backend.env` / `.env`, затем
  выполните `docker compose up -d api web`.

---

**Gerege Template Platform V3.0** — совместная разработка **команды Gerege Systems** и **Claude AI**, 2026.
