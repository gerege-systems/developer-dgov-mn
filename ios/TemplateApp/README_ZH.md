# Gerege Template Platform V3.0 — iOS 应用（TemplateApp）

> 🌐 [Монгол](README.md) · **中文** · [Русский](README_RU.md)

> **构建数字服务的基础** — _一套基础 — 承载政府与私营部门的所有服务。_

**Gerege Template Platform V3.0** 的示例 **iOS 客户端**。通过 Gerege SSO 登录，
展示用户资料 + eID PKI 信息 — 是在基础平台之上构建原生移动服务的范例。
原生 SwiftUI，无第三方依赖（不使用 SPM 包）。

> 说明：这是一个**依赖方（RP）消费端**应用 — 不是公民的 eID **应用**（那是另一个项目）。
> 参考部署是 [template.gerege.mn](https://template.gerege.mn)；Gerege SSO
> （[sso.gerege.mn](https://sso.gerege.mn)）是独立的身份系统。
>
> 登录**完全**通过平台 BFF 完成 —— 应用不在 SSO 或 eID 平台上注册自己的 client
> 或回调地址（没有 native OIDC，也没有 App2App deeplink）。

## 架构

- 应用 → `https://template.gerege.mn/api/*`（BFF）— 不与后端直接通信。
- 会话保存在 httpOnly cookie（`dgov_access`/`refresh`）中。`URLSession` +
  `HTTPCookieStorage.shared` 会自动保存并发送 cookie。
- BFF 的写操作路由要求 `x-dgov-csrf: 1` 请求头（因为没有 Origin 头，这一项即足够）。
  令牌绝不会到达客户端。

### 登录

- **Gerege SSO** — 在 `WKWebView` 中加载 `/api/auth/sso/start`，在 sso.gerege.mn 上完成验证。
  返回 `/me*` 时把 WKWebView 的 cookie 复制到 `HTTPCookieStorage`，供 `URLSession` 使用。
- **资料** — `GET /api/me` + `GET /api/me/eid/summary`。

## 结构

```
ios/TemplateApp/
  project.yml              # xcodegen（bundle id: mn.gerege.temp）
  Sources/
    TemplateAppApp.swift   # @main + AppState + RootView
    APIClient.swift        # BFF 客户端（cookie 会话、CSRF 请求头）
    Models.swift           # Codable — MeUser、EidBlock、EidSummary…
    LoginView.swift        # SSO 登录入口
    SSOWebView.swift       # WKWebView SSO + cookie 同步
    HomeView.swift         # 资料 + eID PKI + 退出
```

## 构建

要求：**Xcode 15+**、[xcodegen](https://github.com/yonaskolb/XcodeGen)
（`brew install xcodegen`）。

```bash
cd ios/TemplateApp
xcodegen generate          # project.yml → TemplateApp.xcodeproj
open TemplateApp.xcodeproj
```

在 Xcode 中：

1. Target **TemplateApp** → Signing & Capabilities → 选择你自己的 **Team**。
   Bundle id 已经是 `mn.gerege.temp`。
2. 运行（⌘R）— 在模拟器或真机上。

`.xcodeproj` 是生成产物，因此不纳入 git（见 `.gitignore`）—
源头只有 `project.yml` + `Sources/`。

## 配置

- 后端地址：`APIClient.baseURL`（默认 `https://template.gerege.mn`）。
  若要对本地 BFF 调试，请改为 `http://localhost:3000` 并添加 ATS 例外。
