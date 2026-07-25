# Government Template Platform V3.0 — приложение для iOS (TemplateApp)

> 🌐 [Монгол](README.md) · [中文](README_ZH.md) · **Русский**

> **Основа для создания цифровых услуг** — _Одна основа — все государственные и частные услуги._

Образцовый **клиент для iOS** платформы **Government Template Platform V3.0**.
Выполняет вход через eID или dgov SSO и показывает профиль пользователя и данные
eID PKI — пример того, как построить нативную мобильную услугу на базовой
платформе. Нативный SwiftUI, без сторонних зависимостей (пакеты SPM не используются).

> Пояснение: это приложение-**потребитель (доверяющая сторона)** — а не гражданское
> **приложение** eID (это другой проект). Вход через eID выполняется потоками
> QR / push по регистрационному номеру через бэкенд платформы.
> Эталонное развёртывание — **DAN-Government SSO** ([sso.dgov.mn](https://sso.dgov.mn)).

## Архитектура

- Приложение → `https://sso.dgov.mn/api/*` (BFF) — с бэкендом напрямую не общается.
- Сессия хранится в httpOnly-куках (`dgov_access`/`refresh`). `URLSession` +
  `HTTPCookieStorage.shared` автоматически сохраняют и отправляют куки.
- Изменяющие маршруты BFF требуют заголовок `x-dgov-csrf: 1` (заголовка `Origin`
  нет, поэтому этого достаточно). Токены никогда не попадают в клиент.

### Вход

- **eID** — `POST /api/auth/eid/start` (QR) или `/start-id` (рег. номер → push) →
  `/api/auth/eid/poll` примерно каждые 2,5 с → при `COMPLETE` устанавливаются куки.
- **dgov SSO** — в `WKWebView` загружается `/api/auth/sso/start`, подтверждение
  проходит на sso.dgov.mn. При возврате на `/me*` куки из WKWebView копируются в
  `HTTPCookieStorage` и используются в `URLSession`.
- **Профиль** — `GET /api/me` + `GET /api/me/eid/summary`.

## Структура

```
ios/TemplateApp/
  project.yml              # xcodegen (bundle id: mn.gerege.template)
  Sources/
    TemplateAppApp.swift   # @main + AppState + RootView
    APIClient.swift        # Клиент BFF (сессия на куках, заголовок CSRF)
    Models.swift           # Codable — MeUser, EidStart, EidSummary…
    LoginView.swift        # Выбор eID / SSO
    EIDLoginView.swift     # Рег. номер/QR + опрос (+ QR через CoreImage)
    SSOWebLoginView.swift  # SSO в WKWebView + синхронизация кук
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
   Bundle id уже задан: `mn.gerege.template`.
2. Запустите (⌘R) — на симуляторе или устройстве.

`.xcodeproj` генерируется, поэтому не хранится в git (см. `.gitignore`) —
исходники это только `project.yml` и `Sources/`.

## Настройка

- Адрес бэкенда: `APIClient.baseURL` (по умолчанию `https://sso.dgov.mn`).
  Для проверки с локальным BFF смените на `http://localhost:3000` и добавьте исключение ATS.
