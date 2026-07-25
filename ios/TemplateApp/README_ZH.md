# Gerege Template Platform V3.0 — iOS 应用（TemplateApp）

> 🌐 [Монгол](README.md) · **中文** · [Русский](README_RU.md)

> **构建数字服务的基础** — _一套基础 — 承载政府与私营部门的所有服务。_

**Gerege Template Platform V3.0** 的示例 **iOS 客户端**。通过 eID 或 dgov SSO 登录，
展示用户资料 + eID PKI 信息 — 是在基础平台之上构建原生移动服务的范例。
原生 SwiftUI，无第三方依赖（不使用 SPM 包）。

> 说明：这是一个**依赖方（RP）消费端**应用 — 不是公民的 eID **应用**（那是另一个项目）。
> eID 登录通过平台后端以二维码/按登记号推送的流程完成。
> 参考部署是 **DAN-Gerege SSO**（[sso.gerege.mn](https://sso.gerege.mn)）。

## 架构

- 应用 → `https://sso.gerege.mn/api/*`（BFF）— 不与后端直接通信。
- 会话保存在 httpOnly cookie（`dgov_access`/`refresh`）中。`URLSession` +
  `HTTPCookieStorage.shared` 会自动保存并发送 cookie。
- BFF 的写操作路由要求 `x-dgov-csrf: 1` 请求头（因为没有 Origin 头，这一项即足够）。
  令牌绝不会到达客户端。

### 登录

- **eID** — `POST /api/auth/eid/start`（二维码）或 `/start-id`（登记号→推送）→
  每约 2.5 秒调用 `/api/auth/eid/poll` → 状态变为 `COMPLETE` 时写入 cookie。
- **dgov SSO** — 在 `WKWebView` 中加载 `/api/auth/sso/start`，在 sso.gerege.mn 上完成验证。
  返回 `/me*` 时把 WKWebView 的 cookie 复制到 `HTTPCookieStorage`，供 `URLSession` 使用。
- **资料** — `GET /api/me` + `GET /api/me/eid/summary`。

## 结构

```
ios/TemplateApp/
  project.yml              # xcodegen（bundle id: mn.gerege.template）
  Sources/
    TemplateAppApp.swift   # @main + AppState + RootView
    APIClient.swift        # BFF 客户端（cookie 会话、CSRF 请求头）
    Models.swift           # Codable — MeUser、EidStart、EidSummary…
    LoginView.swift        # eID / SSO 选择
    EIDLoginView.swift     # 登记号/二维码 + 轮询（+ CoreImage 二维码）
    SSOWebLoginView.swift  # WKWebView SSO + cookie 同步
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
   Bundle id 已经是 `mn.gerege.template`。
2. 运行（⌘R）— 在模拟器或真机上。

`.xcodeproj` 是生成产物，因此不纳入 git（见 `.gitignore`）—
源头只有 `project.yml` + `Sources/`。

## 配置

- 后端地址：`APIClient.baseURL`（默认 `https://sso.gerege.mn`）。
  若要对本地 BFF 调试，请改为 `http://localhost:3000` 并添加 ATS 例外。
