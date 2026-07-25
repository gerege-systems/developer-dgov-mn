# 架构

平台遵循**整洁架构（Clean Architecture）**：`handler → usecase → repository →
domain`。业务核心从不 import Web 框架。

## 组成部分

```
Internet ──► nginx (TLS)
   │
   ├─ /oauth2/*, /.well-known/*, /userinfo ─► Go API — 内置 OIDC issuer
   ├─ /rp/sign/*   ─► eID 签署中继（后端）
   ├─ /rp/eid/*     ─► eID 服务代理 — 个人（后端）
   ├─ /rp/eid-org/* ─► eID 服务代理 — 组织（后端）
   └─ 其余全部     ─► Next.js BFF (web) ──► 后端 API (:8080)
                                                   │
   内部网络:  db (PostgreSQL) · redis
```

## 分层

| 层 | 技术 | 说明 |
|---|---|---|
| **后端** | Go · chi (net/http) · pgx（无 ORM） | 整洁架构、RLS、手写 SQL |
| **前端** | Next.js 15 (BFF) | 浏览器只与同源路由通信；令牌绝不进入客户端 JS |
| **OIDC 提供方** | 内置（Go，usecases/oidc） | 平台自行驱动登录/授权/登出流程 |
| **身份** | eID Mongolia RP | 电子身份证验证 |
| **缓存/队列** | Redis | 会话拒绝名单、临时状态 |
| **AI** | Gemini（免 SDK 的 REST） | 聊天、语音、翻译 |

## 安全

- **行级安全（RLS）** — 每个用户只能看到属于自己的数据行；启动时会有可执行性守卫
  （生产环境要求使用非超级用户角色）。
- **BFF 模式** — 令牌保存在 httpOnly Cookie 中，绝不出现在浏览器 JS 里。
- **双重 CSRF** — 自定义请求头 + 来源（origin）校验。
- **安全响应头** — CSP、HSTS、COOP/COEP/CORP；按 IP 限流。
- **审计** — 哈希链式、仅追加的审计轨迹。

## 后端目录结构（概览）

```
backend/
├── cmd/api/server/        # 手动依赖注入接线 (server.go)
├── internal/
│   ├── business/
│   │   ├── domain/         # 纯领域层（不 import 任何内部包）
│   │   └── usecases/       # 业务逻辑（仅依赖接口）
│   ├── datasources/
│   │   ├── repositories/   # pgx 适配器 + 接口
│   │   └── caches/         # redis
│   └── http/
│       ├── handlers/       # func(w,r) error、v1.Wrap
│       ├── middlewares/    # 认证、oauth-bearer、限流 …
│       └── routes/         # 路由分组
├── pkg/                    # eid、oidc、secrethash、gemini …
└── migrations/             # 编号 SQL (N_name.up/down.sql)
```
