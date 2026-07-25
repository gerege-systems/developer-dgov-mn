# Подключение приложения (Gerege SSO / OIDC RP)

Подключите своё приложение как доверяющую сторону **Gerege SSO (sso.gerege.mn)**.
Когда пользователь нажимает «Войти», его перенаправляет на sso.gerege.mn, там он
проходит аутентификацию через eID и возвращается в ваше приложение.

## 1. Зарегистрируйте приложение как RP-клиент

Два способа:

=== "Интерфейс администратора"

    В разделе **Админ → Приложения → Новое приложение** укажите название,
    redirect URI и тег, затем сохраните. Нужные сервисы eID (например, eid-proxy)
    выдайте галочками. Вы получите `client_id` / `client_secret`.

=== "CLI-скрипт"

    На сервере `register-rp.sh` корректно задаёт и redirect для входа, **и**
    redirect после выхода (чтобы выход не падал):

    ```bash
    cd /srv/sso-dgov-mn
    ./scripts/register-rp.sh "My app" https://myapp.dgov.mn
    # → выводит client_id + client_secret
    #   redirect_uri            = https://myapp.dgov.mn/sso/callback
    #   post_logout_redirect_uri= https://myapp.dgov.mn/
    ```

## 2. Настройка приложения

Если ваше приложение построено на этом шаблоне, задайте в `backend.env`:

```env
SSO_ISSUER=https://sso.gerege.mn
SSO_CLIENT_ID=<client_id>
SSO_CLIENT_SECRET=<client_secret>
SSO_REDIRECT_URI=https://myapp.dgov.mn/sso/callback
SSO_SCOPE=openid profile email
```

## 3. Поток входа

1. Пользователь нажимает **«Sign in with Gerege SSO»** → `/api/auth/sso/start`.
2. Бэкенд `/sso/start` создаёт state (Redis) и формирует authorize-URL на
   `sso.gerege.mn/oauth2/auth`; браузер перенаправляется туда.
3. Пользователь проходит аутентификацию через eID на sso.gerege.mn.
4. sso.gerege.mn возвращает на `https://myapp.dgov.mn/sso/callback?code&state`.
5. Бэкенд `/sso/callback` обменивает код на токены, делает upsert гражданина по
   `sso_sub` и выдаёт собственную сессию приложения (JWT).

## 4. Выход

Выход, инициированный RP, перенаправляет на
`sso.gerege.mn/oauth2/sessions/logout` с `id_token_hint` и
`post_logout_redirect_uri`. Этот URI обязан быть **зарегистрирован у клиента**
(`register-rp.sh` задаёт его автоматически).

!!! warning "Зарегистрируйте redirect после выхода"
    Если приложение зарегистрировано только с redirect для входа, выход упадёт с
    ошибкой *«post_logout_redirect_uri is not whitelisted»*. `register-rp.sh` и
    интерфейс администратора задают оба URI сразу, поэтому такой ошибки не будет.

## Выдача дополнительных сервисов

Помимо входа, если вашему приложению нужны **дополнительные** сервисы SSO
(например, прокси eID), администратор выдаёт этот сервис приложению.
См. [Прокси сервисов eID](eid-services.md) и [API-шлюз](api-gateway.md).
