# Gerege Template Platform V3.0 — 前端

> 🌐 [Монгол](README.md) · **中文**

> **构建数字服务的基础** — _一套基础 — 承载政府与私营部门的所有服务。_

**Gerege Template Platform V3.0** 的 Next.js 15 前端 — 一套可在其上构建任何数字政务服务的
生产就绪基础。后端是 Go（chi · pgx · PostgreSQL · Redis）— 本前端以
**BFF（Backend-for-Frontend）** 模式可靠地代理到它，令牌绝不进入浏览器，
并把整洁架构的 Go 后端 + Next.js BFF + Gemini AI 技术栈整合为一致的使用体验。

- 技术：Next.js App Router（React 19、server components）、TypeScript。
- 令牌绝不暴露给浏览器 — httpOnly cookie + 服务端代理。
- 登录方式：**eID Mongolia**（二维码 / 移动端 deep-link / 按登记号推送 + long-poll）、
  **Google OAuth**（先用 eID 验证后绑定）、**dgov SSO**（OIDC 消费方）。
  同时本应用还提供 **OIDC provider（面向 RP）** 的页面（前置 Ory Hydra）。
- 规模：约 48 个页面路由，约 100 个 route handler（`/api/*` + `/sso/callback`）。

> **参考部署：** **DAN-Gerege SSO**（[sso.gerege.mn](https://sso.gerege.mn)）
> — 基于 eID 的国家统一登录（单点登录）— 是构建在本基础之上的真实服务示例之一。

> **不存在**密码 / 邮箱 / OTP 登录、注册和找回密码流程。
> 唯一的自然人验证方式是 eID。（后端虽有 `auth_register.go`、`auth_send_otp.go`
> 等文件，但未接入任何路由。）

---

## 架构 — BFF（Backend-for-Frontend）

```
浏览器 ──(同源)──► Next.js route handler (/api/*) ──(服务器→服务器)──► Go API /api/v1
   ▲                                │
   └── httpOnly cookie（令牌） ◄─────┘
```

- **令牌绝不暴露给浏览器。** access/refresh JWT 保存在 `httpOnly` cookie
  （`dgov_access`、`dgov_refresh`）中 → 可抵御 XSS。经 SSO 登录的会话，
  其 RP 发起的登出 URL 存放在 `dgov_sso_logout` cookie 中（登出时用于在 SSO 上结束会话）。
  cookie 定义见 `src/lib/cookies.ts`。
- **浏览器↔Go 之间不需要 CORS。** 浏览器只访问 Next.js（同源）；
  只有 Next.js 服务端代理到 Go API（`connect-src 'self'`，
  在 `src/next.config.mjs` 的 CSP 中被严格限制）。
- **响应式刷新。** 受保护调用收到 `401` 时，会用 refresh 令牌自动刷新一次并重试
  （`authedFetch` — `src/lib/api.ts`）。由于 refresh 会执行令牌**轮换**，
  在无法写入 cookie 的上下文（RSC 渲染）中根本不会执行 `tryRefresh` —
  `canPersistSession()` 会先检查能否写入 cookie，以免白白烧掉一个有效会话。
- **双重 CSRF 防护。** 所有改变状态的 BFF 路由都要求两重校验
  （`checkOrigin` — `src/lib/bff.ts`）：(1) `x-dgov-csrf: 1` 自定义请求头
  （跨站表单 POST 无法设置自定义头），(2) 把 `Origin` 头与 `APP_ORIGIN` 比对。
  该请求头由浏览器侧 `src/lib/client.ts` 的 `sendJSON`/`postJSON` 统一设置。
- **不泄露令牌的代理响应。** 把后端响应回传给浏览器时，只传递
  `ok/status/message/fieldErrors`（`toClientResponse`），或再加上**非机密**的
  `data`（`proxyResult`）— 令牌之类的字段绝不外泄。
- **TanStack Query。** GET 数据（admin/RBAC 列表、gov/gateway 页面等）带缓存 +
  去重 + 变更后的失效。使用 `getJSON` + `useQuery`；provider 在
  `src/components/Providers.tsx`。

---

## 目录结构

```
src/
  app/
    page.tsx                     # 首页（匿名）/ 已登录则跳转到 dashboard
    layout.tsx, globals.css      # root layout + gerege 主题令牌
    login/                       # eID 登录（LoginForm）+ /login/verify
    auth/eid/callback/           # App2App（同设备）返回点
    app/eid/callback/            # native/app 回调桥接
    sso/callback/route.ts        # dgov SSO 重定向 URI（route handler）
    oauth/                       # OIDC provider（面向 RP）：login/consent/logout/error
    me/                          # 已登录用户的全部页面（layout=AreaShell）
    admin/                       # 管理/RBAC/gateway（layout=AreaShell + RBAC）
    manager/                     # 经理页面
    profile/, settings/          # 遗留 → 重定向到 /me/*
    api/                         # BFF route handler（详见下文）
  components/
    AppShell, AreaShell, Providers   # layout + TanStack Query provider
    SigninShell, UserMenu, NavSearch, AppearanceControls, …
    landing/  me/  admin/  gateway/  gov/  ui/   # 各领域的视图组件
  lib/
    api.ts          # 服务端→Go fetch + 响应式刷新（authedFetch/authedRaw）
    bff.ts          # checkOrigin（CSRF）、proxyResult/toClientResponse、ID 校验
    client.ts       # 浏览器→BFF fetch（CSRF 头 + getJSON/postJSON/sendJSON）
    session.ts      # httpOnly 令牌 cookie 的 set/get/clear + canPersistSession
    cookies.ts      # cookie 名称/选项（dgov_access/refresh/sso_logout）
    i18n.ts, lang.tsx   # mn/en/zh 词典 + useT() hook
    aiBff.ts, audio.ts  # AI 路由音频白名单 + MediaRecorder 录制/播放
    pki.ts, integrations.ts, driveClient.ts, dropboxClient.ts
    govTypes.ts, gatewayTypes.ts, preferences.ts, format.ts, navigation.ts, types.ts
  middleware.ts     # 路由保护（见下）
```

`src/middleware.ts`：`/me`、`/profile`、`/settings`、`/admin`、`/manager` 等路径在
没有 refresh cookie 时会跳转到 `/login?next=…`；已登录用户从 `/login` 被送回。
`/admin`、`/manager` 还会在服务端额外经 RBAC 校验（解析权限，不足则在内部降级）。

---

## 页面（route map）

🔒 = 需要登录（middleware）。后端端点带 `/api/v1` 前缀。

### 登录与登录服务

| 路径 | 说明 |
|-----|---------|
| `/` | 首页（匿名）/ 已登录则跳转到 dashboard |
| `/login` | eID 登录 — 按登记号推送或二维码（device-link）；可选 Google 绑定 |
| `/login/verify` | eID 验证的等待/返回页面 |
| `/auth/eid/callback` | App2App（同设备）返回 — 用 `?sessionId=` 轮询完成 |
| `/app/eid/callback` | native/app 回调桥接（iOS） |
| `/sso/callback` | dgov SSO OIDC 重定向 URI（route handler） |
| `/oauth/login` 🅟 | OIDC provider：从 RP 发起登录（eID/Google）→ 接受 challenge |
| `/oauth/consent` 🅟 | OIDC provider：scope 授权 |
| `/oauth/logout` 🅟 | OIDC provider：RP 发起的登出确认 |
| `/oauth/error` 🅟 | OIDC provider：错误页面 |
| `/profile`、`/settings` | 遗留 — 重定向到 `/me/profile`、`/me/settings` |

🅟 = OIDC provider（面向 RP）。Ory Hydra 会带着 `login_challenge` /
`consent_challenge` 把浏览器导向这里，DAN 以自有设计用 eID 验证公民后，
把 subject 交给 Hydra（BFF：`api/provider/*`）。

### 我的系统（`/me/*`）🔒

| 路径 | 说明 |
|-----|---------|
| `/me/dashboard` | 个人仪表板 |
| `/me/profile` | 个人资料（来自 eID 的公民信息、拉丁姓名、头像） |
| `/me/settings` | 设置（外观、退出） |
| `/me/ai` | AI 助手 — 文本/语音聊天（🎤 STT，🔊 TTS） |
| `/me/translate` | 实时翻译 — 对麦克风片段做实时翻译 |
| `/me/eid/id` | eID 证件（公民身份信息） |
| `/me/eid/certificates` | PKI 证书 |
| `/me/eid/devices` | 已绑定设备 |
| `/me/eid/logs` | eID 活动历史 |
| `/me/eid/security` | eID 安全 |
| `/me/eid/sign` | 用电子签名为文件背书 |
| `/me/organizations` | 用户的组织（列表） |
| `/me/organizations/[id]` | 组织详情 + 成员 |
| `/me/organizations/eid/[regNo]` | 来自 eID、按登记号的组织（印章/签署人） |
| `/me/applications` | 政务服务申请 |
| `/me/appointments` | 预约 |
| `/me/payments` | 缴费 |
| `/me/notifications` | 通知 |
| `/me/references` | 证明文件 |
| `/me/services` | 政务服务目录 |
| `/me/integrations` | 第三方集成（Google Drive/Dropbox/Meet/GSpace） |

### 管理系统（`/admin/*`）🔒（RBAC）

| 路径 | 说明 |
|-----|---------|
| `/admin/dashboard` | 管理概览 |
| `/admin/users` | 用户管理（状态、角色） |
| `/admin/roles` | RBAC — 角色 + 权限 |
| `/admin/superadmin` | 超级管理员 — 任免管理员 |
| `/admin/audit` | 审计日志（可发现篡改、可校验） |
| `/admin/security` | 安全事件 |
| `/admin/settings` | 系统设置 + AI 提示词分层 + 站点外观 |
| `/admin/core` | Gerege Core 查询（按登记号查用户/组织） |
| `/admin/gateway/overview` | API 网关 — 24 小时流量/错误/延迟 |
| `/admin/gateway/services` | 上游后端服务 |
| `/admin/gateway/routes` | 路由（路径/方法 → 服务） |
| `/admin/gateway/consumers` | API 使用方 + 密钥 |
| `/admin/gateway/policies` | 限流 / 认证 / CORS 策略 |
| `/admin/gateway/logs` | 网关请求日志 |

### 经理系统（`/manager/*`）🔒（RBAC）

| 路径 | 说明 |
|-----|---------|
| `/manager/dashboard` | 经理面板 |
| `/manager/users` | 用户列表（受限权限） |

---

## BFF `/api/*` route map

所有改变状态的路由都先经 `checkOrigin`（CSRF 头 + Origin）校验。
受保护的调用通过 `authedFetch`（Bearer + 响应式刷新）发出。

| 分组 | 路由 | 用途 |
|-------|-----------|---------|
| **auth** | `auth/eid/{start,start-id,poll}` · `auth/google/{start,callback}` · `auth/sso/{start,native}` · `auth/logout` · `auth/expired` · `auth/change-password` | eID/Google/dgov SSO 登录、登出 |
| **provider** | `provider/login{,/accept,/reject}` · `provider/consent{,/accept,/reject}` · `provider/logout/accept` | OIDC provider（Hydra）challenge 处理 |
| **me** | `me` · `me/latin-name` · `me/signature` · `me/eid/{summary,certificates,devices,activity}` · `me/eid/organizations/*` | 个人资料、eID/PKI、拉丁姓名、签名 |
| **org** | `org` · `org/[id]` · `org/[id]/members[/userID]` · `org/lookup/[regNo]` | 组织与成员 |
| **gov** | `gov/{overview,services,applications,appointments,payments,notifications,references}`（+ `/[id]/cancel`、`/[id]/pay`、`/[id]/read`、`/read-all`） | 政务服务 |
| **sign** | `sign/init` · `sign/[id]` · `sign/[id]/download` | 文件电子签名 |
| **integrations** | `integrations/[provider]/{connect,callback,disconnect}` · `integrations/google-drive/*` · `integrations/dropbox/*` · `integrations/google-meet/create-space` · `integrations/google-login/disconnect` | Google Drive/Dropbox/Meet OAuth + 文件 |
| **gspace** | `gspace` · `gspace/upload` · `gspace/download` | GSpace 文件空间 |
| **ai** | `ai/{chat,stt,tts,translate}` | Gemini 流水线（音频白名单 `aiBff.ts`） |
| **rbac** | `rbac/me` · `rbac/permissions` · `rbac/roles[/id][/permissions]` | 角色/权限管理 |
| **admin** | `admin/users[/id][/role][/active]` · `admin/ai/prompts[/key]` · `admin/site/appearance` | 用户、AI 提示词、站点外观（admin 范围） |
| **superadmin** | `superadmin/admins[/id][/grant]` | 管理员任免 |
| **audit / security** | `audit` · `audit/verify` · `security/events` | 审计日志 + 校验 |
| **gateway** | `gateway/{overview,services,routes,consumers,policies,logs}`（+ `/[id]`、`consumers/[id]/keys`、`keys/[keyId][/revoke]`） | API 网关管理 |
| **core** | `core/users` · `core/organizations` | Gerege Core 查询 |
| **site** | `site/appearance` | 公开（无需认证）外观默认值 |
| **aasa** | `aasa` | Apple App Site Association（iOS Universal Links） |

`/.well-known/apple-app-site-association` 通过 `next.config.mjs` 的 rewrite
指向 `api/aasa`。

---

## 登录流程

### eID（主要方式）

1. 在 `/login` 输入登记号，或选择二维码方式。
2. 浏览器 → `api/auth/eid/start`（二维码）或 `api/auth/eid/start-id`（按登记号推送）。
   后端创建会话并返回 `session_id`、`device_link_url`、`verification_code`、
   `expires_at`（此处不产生令牌，因此直接用 `proxyResult` 透传）。
3. **跨设备**（桌面）：浏览器每约 2.5 秒调用 `api/auth/eid/poll`，直到 `COMPLETE`。
   **同设备**（移动浏览器）：传入 `callbackUrl`，通过 deep-link
   （`geregesmartid://` / Universal Link）打开 eID 应用，用户在手机上批准后，
   浏览器返回 `/auth/eid/callback?sessionId=…` 并在那里轮询完成。
4. `COMPLETE` → 后端返回令牌对；BFF 用 `session.ts` 写入 httpOnly cookie，
   并把浏览器硬跳转到 `next`。

### Google OAuth

先用 eID 完成验证后再绑定 Google 账户。`api/auth/google/start` → Google 授权 →
`api/auth/google/callback`。首次（glink）需要 eID 验证。
若 `GOOGLE_CLIENT_ID` 为空，按钮会指向“未配置”。

### dgov SSO（OIDC 消费方）

`api/auth/sso/start` → 后端 `POST /sso/start`（Redis state）→ 重定向到
`sso.gerege.mn` 的 authorize URL → `/sso/callback`（route handler）→ 令牌对 →
cookie。iOS 原生应用通过 `api/auth/sso/native`
（ASWebAuthenticationSession + PKCE，公开客户端）交换授权码。

### OIDC provider（面向 RP）

DAN 在 Ory Hydra 之前处理 login/consent/logout challenge：
在 `/oauth/login` 用 eID 让公民登录后调用 `provider/login/accept`，
在 `/oauth/consent` 完成 scope 授权后调用 `provider/consent/accept`，
把 subject 交给 Hydra。

---

## 环境变量

用于 `src/lib/cookies.ts`、`src/lib/api.ts`、`docker-compose.yml (web)`。
`.env.example` 中只有前两项 — 其余需要在 compose 上（或生产环境）配置。

| 变量 | 默认值 | 说明 |
|----------|---------|---------|
| `BACKEND_URL` | `http://localhost:8080` | Go API 的基址（不含 `api/v1` 前缀）。仅服务端读取。 |
| `COOKIE_SECURE` | 生产为 `true` | HTTPS 上设为 `true`。未指定时，生产环境 fail-closed 为 Secure。 |
| `APP_ORIGIN` | 请求的 origin | CSRF `Origin` 校验 + 集成 redirect_uri 的基址。生产必填。 |
| `GOOGLE_CLIENT_ID` | — | Google 登录的授权 URL（非机密）。留空则 Google 功能失效。 |
| `GOOGLE_DRIVE_CLIENT_ID` / `_SECRET` | — | Google Drive 集成的 OAuth（令牌交换在 BFF 侧）。 |
| `DROPBOX_CLIENT_ID` / `_SECRET` | — | Dropbox 集成的 OAuth。 |
| `GOOGLE_MEET_CLIENT_ID` / `_SECRET` | — | 创建 Google Meet 空间的 OAuth。 |

集成的 `redirect_uri` = `${APP_ORIGIN}/api/integrations/<provider>/callback`。
未配置 OAuth 的集成会处于“即将推出”的惰性状态 — 绝不会访问对应主机。

---

## 运行

```bash
# 1) 启动后端（在仓库的 backend/ 下，另开一个终端）
cd ../backend && make run        # http://localhost:8080
# 或者启动整套技术栈：  docker compose up -d --build

# 2) 环境变量
cp .env.example .env.local       # 需要时修改 BACKEND_URL

# 3) 前端
npm install
npm run dev                      # http://localhost:3000

npm run build                    # CI：构建 + lint + 类型检查
npm run lint
npm run test                     # vitest（bff/i18n/navigation 单元测试）
```

在 Docker 中，`web` 服务通过 `output: 'standalone'` 构建成精简镜像，
并经内部网络代理到 `api:8080`（`docker-compose.yml`）。

---

## gerege 主题

设计系统位于 `src/app/globals.css` — OKLCH 令牌（DAN blue `#1767E7`）、
明/暗主题、Inter + JetBrains Mono 字体。用户的外观选择
（accent/font/density/theme）保存在 `localStorage` 中，并由防 FOUC 的
`public/theme-bootstrap.js` 在渲染前应用。管理员通过
`api/admin/site/appearance` 设置站点级默认值；公开（无需认证）的取值由
`api/site/appearance` 返回。

UI 字符串通过 `useT()` + `src/lib/i18n.ts`（mn + en + zh）的键输出。

AI 功能的内部机制请见
[../backend/docs/AI_PIPELINE_ZH.md](../backend/docs/AI_PIPELINE_ZH.md)。
