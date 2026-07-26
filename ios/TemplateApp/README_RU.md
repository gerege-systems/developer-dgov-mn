# Gerege Template Platform V3.0 — приложение для iOS (TemplateApp)

> 🌐 [Монгол](README.md) · [中文](README_ZH.md) · **Русский**

> **Основа для создания цифровых услуг** — _Одна основа — все государственные и частные услуги._

Образцовый **клиент для iOS** платформы **Gerege Template Platform V3.0**.
Выполняет вход через Gerege SSO и показывает профиль пользователя и данные
eID PKI — пример того, как построить нативную мобильную услугу на базовой
платформе. Нативный SwiftUI, без сторонних зависимостей (пакеты SPM не используются).

> Пояснение: это приложение-**потребитель (доверяющая сторона)** — а не гражданское
> **приложение** eID (это другой проект).
> Эталонное развёртывание — [template.gerege.mn](https://template.gerege.mn); Gerege SSO
> ([sso.gerege.mn](https://sso.gerege.mn)) — отдельная система идентификации.
>
> Вход ПОЛНОСТЬЮ идёт через BFF платформы — приложение не регистрирует собственный
> client или адрес возврата ни в SSO, ни на платформе eID (нет native OIDC и App2App deeplink).

## Архитектура

- Приложение → `https://template.gerege.mn/api/*` (BFF) — с бэкендом напрямую не общается.
- Сессия хранится в httpOnly-куках (`dgov_access`/`refresh`). `URLSession` +
  `HTTPCookieStorage.shared` автоматически сохраняют и отправляют куки.
- Изменяющие маршруты BFF требуют заголовок `x-dgov-csrf: 1` (заголовка `Origin`
  нет, поэтому этого достаточно). Токены никогда не попадают в клиент.

### Вход

- **Gerege SSO** — в `WKWebView` загружается `/api/auth/sso/start`, подтверждение
  проходит на sso.gerege.mn. При возврате на `/me*` куки из WKWebView копируются в
  `HTTPCookieStorage` и используются в `URLSession`.
- **Профиль** — `GET /api/me` + `GET /api/me/eid/summary`.

## Структура

```
ios/TemplateApp/
  project.yml              # xcodegen (bundle id: mn.gerege.temp)
  Sources/
    TemplateAppApp.swift   # @main + AppState + RootView
    APIClient.swift        # Клиент BFF (сессия на куках, заголовок CSRF)
    Models.swift           # Codable — MeUser, EidBlock, EidSummary…
    LoginView.swift        # Начало входа через SSO
    SSOWebView.swift       # SSO в WKWebView + синхронизация кук
    HomeView.swift         # Профиль + eID PKI + выход
```

## Сборка

Требования: **Xcode 15+**, [xcodegen](https://github.com/yonaskolb/XcodeGen)
(`brew install xcodegen`).

```bash
cd ios/TemplateApp
xcodegen generate          # project.yml → TemplateApp.xcodeproj
open TemplateApp.xcodeproj
```

В Xcode:

1. Target **TemplateApp** → Signing & Capabilities → выберите свою **Team**.
   Bundle id уже задан: `mn.gerege.temp`.
2. Запустите (⌘R) — на симуляторе или устройстве.

`.xcodeproj` генерируется, поэтому не хранится в git (см. `.gitignore`) —
исходники это только `project.yml` и `Sources/`.

## Настройка

- Адрес бэкенда: `APIClient.baseURL` (по умолчанию `https://template.gerege.mn`).
  Для проверки с локальным BFF смените на `http://localhost:3000` и добавьте исключение ATS.
