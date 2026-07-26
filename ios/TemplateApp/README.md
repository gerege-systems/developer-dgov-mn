# Gerege Template Platform V3.0 — iOS App (TemplateApp)

> 🌐 **Монгол** · [中文](README_ZH.md) · [Русский](README_RU.md)

> **Цахим үйлчилгээг бүтээх суурь** — _Нэг суурь — төр, хувийн хэвшлийн бүх үйлчилгээ._

**Gerege Template Platform V3.0**-ийн жишиг **iOS клиент**. Gerege SSO-гоор
нэвтэрч, хэрэглэгчийн профайл + eID PKI мэдээллийг харуулна — суурь платформ дээр
бүтээгдсэн native мобайл үйлчилгээг хэрхэн босгохын үлгэр жишээ. Native SwiftUI,
гуравдагч хамааралгүй (SPM пакеж ашигладаггүй).

> Тайлбар: энэ бол **Relying-Party консюмер** апп — иргэний eID **апп** (өөр төсөл)
> биш. Жишиг deployment нь [template.gerege.mn](https://template.gerege.mn);
> Gerege SSO ([sso.gerege.mn](https://sso.gerege.mn)) нь тусдаа таних систем.
>
> Нэвтрэлт БҮХЭЛДЭЭ платформын BFF-ээр явна — апп нь SSO ч, eID платформ ч дээр
> өөрийн client/буцах хаяг бүртгүүлдэггүй (native OIDC, App2App deeplink байхгүй).

## Архитектур

- Апп → `https://template.gerege.mn/api/*` (BFF) — backend-тэй шууд харьцахгүй.
- Session нь httpOnly cookie (`dgov_access`/`refresh`)-д. `URLSession` +
  `HTTPCookieStorage.shared` нь cookie-г автоматаар хадгалж/илгээнэ.
- BFF-ийн mutating route `x-dgov-csrf: 1` header шаарддаг (Origin header
  байхгүй тул энэ л хангалттай). Токен клиент рүү хэзээ ч гарахгүй.

### Нэвтрэлт
- **Gerege SSO** — `WKWebView`-д `/api/auth/sso/start` ачаалж, sso.gerege.mn дээр
  баталгаажуулна. `/me*` руу буцахад WKWebView-ийн cookie-г `HTTPCookieStorage`
  руу хуулж, `URLSession`-д ашиглана.
- **Профайл** — `GET /api/me` + `GET /api/me/eid/summary`.

## Бүтэц

```
ios/TemplateApp/
  project.yml              # xcodegen (bundle id: mn.gerege.temp)
  Sources/
    TemplateAppApp.swift   # @main + AppState + RootView
    APIClient.swift        # BFF client (cookie session, CSRF header)
    Models.swift           # Codable — MeUser, EidBlock, EidSummary…
    LoginView.swift        # SSO-гоор нэвтрэх эхлэл
    SSOWebView.swift       # WKWebView SSO + cookie sync
    HomeView.swift         # профайл + eID PKI + гарах
```

## Build

Шаардлага: **Xcode 15+**, [xcodegen](https://github.com/yonaskolb/XcodeGen)
(`brew install xcodegen`).

```bash
cd ios/TemplateApp
xcodegen generate          # project.yml → TemplateApp.xcodeproj
open TemplateApp.xcodeproj
```

Xcode дотор:
1. Target **TemplateApp** → Signing & Capabilities → өөрийн **Team**-ээ сонго.
   Bundle id аль хэдийн `mn.gerege.temp`.
2. Run (⌘R) — Simulator эсвэл төхөөрөмж дээр.

`.xcodeproj` нь generated тул git-д ороодоггүй (`.gitignore`-ыг хар) — эх сурвалж
нь зөвхөн `project.yml` + `Sources/`.

## Тохиргоо

- Backend хаяг: `APIClient.baseURL` (default `https://template.gerege.mn`).
  Локал BFF-д туршихад `http://localhost:3000` болгож, ATS exception нэмнэ.
