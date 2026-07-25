# Развёртывание

Разверните платформу на одном VPS с **Docker Compose + nginx**. Стек —
PostgreSQL + Redis + Go API (он же OIDC issuer) + Next.js BFF.

## Предварительные требования

- Docker и плагин compose
- nginx + certbot (TLS)
- DNS-запись, указывающая на сервер

## Топология

```
Internet ──► nginx (80/443, Let's Encrypt)
   ├─ /oauth2/*, /.well-known/*, /userinfo ─► api (OIDC issuer)
   ├─ /rp/sign/*      ─► ретранслятор api
   ├─ /rp/eid/*, /rp/eid-org/* ─► api (прокси eID)
   └─ всё остальное    ─► web (Next.js BFF) ──► api
   внутри: db (Postgres 16) · redis (7)
```

## Файлы окружения (в gitignore)

- **`.env`** — подстановка для compose (секреты Postgres/Redis, порты, домен).
- **`backend.env`** — конфигурация API (JWT_SECRET, EID_RP_*, OAUTH_ISSUER, SSO_*, …).

!!! warning "Отдельные секреты"
    У каждого развёртывания должны быть собственные `JWT_SECRET`,
    `SSO_STATE_KEY` и учётные данные RP — никогда не переиспользуйте их между развёртываниями.

## Шаги развёртывания

```bash
# 1) получить код
git clone git@github.com:gerege-systems/sso-dgov-mn.git /srv/sso-dgov-mn
cd /srv/sso-dgov-mn

# 2) создать файлы окружения (.env + backend.env)

# 3) поднять стек — migrate применит схему автоматически
docker compose up -d --build

# или переразвернуть:
bash deploy/deploy.sh
```

## nginx (пример)

```nginx
server {
    server_name sso.gerege.mn;
    client_max_body_size 30m;

    location /oauth2/                           { proxy_pass http://127.0.0.1:4446; include /etc/nginx/proxy_params; }
    location = /.well-known/openid-configuration { proxy_pass http://127.0.0.1:4446; include /etc/nginx/proxy_params; }
    location = /.well-known/jwks.json            { proxy_pass http://127.0.0.1:4446; include /etc/nginx/proxy_params; }
    location = /userinfo                         { proxy_pass http://127.0.0.1:4446; include /etc/nginx/proxy_params; }

    location /rp/sign/    { proxy_pass http://127.0.0.1:8081/rp/sign/; include /etc/nginx/proxy_params; }
    location /rp/eid/     { proxy_pass http://127.0.0.1:8081/api/v1/eid/;     include /etc/nginx/proxy_params; }
    location /rp/eid-org/ { proxy_pass http://127.0.0.1:8081/api/v1/eid-org/; include /etc/nginx/proxy_params; }

    location / { proxy_pass http://127.0.0.1:3008; include /etc/nginx/proxy_params; }
    listen 443 ssl;  # управляется certbot
}
```

## Имя проекта в compose

На одном сервере можно держать несколько развёртываний рядом. У каждого в `.env`
должны быть свои `COMPOSE_PROJECT_NAME`, порты и тома — иначе теги образов и
тома будут конфликтовать.

| Развёртывание | Домен | Порты (пример) |
|---|---|---|
| `sso-dgov-mn` | sso.gerege.mn | web 3008 |
| `template-dgov-mn` | template.gerege.mn | web 3009 |
