# Government Template Platform V3.0

> **构建数字服务的基础** — **基于 eID · 内置 AI** —
> 一套可直接投入生产的基础平台，公共部门或私营部门的任何数字服务都可在其上构建。

**Government Template Platform V3.0** 是*面向公共部门与私营部门数字服务的基础平台*：
整洁架构的 Go 后端 + Next.js BFF 前端 + Gemini AI 流水线，已彼此接线、经过安全加固，
可随时扩展到任何系统。您只需创造价值，而不必搭建底层管道 —
身份认证、安全、AI 与服务骨架从第一天起就已备好。参考部署以
**Government Template Platform** 的名义运行在
[template.dgov.mn](https://template.dgov.mn)，在生产环境中展示平台的 eID 单点登录。

本平台是 **Gerege Systems 有限公司**既定使命的代码化表达 —
*「以简便的方式把政府与私营部门的服务送达公民」*。同一套基础既承载政府机构的服务，
也以同等保障水平承载银行、保险、金融科技、医院或学校的产品。

> 🌐 [Монгол](../README.md) · [English](README_EN.md) · **中文** · [Русский](README_RU.md)

[![Go](https://img.shields.io/badge/Go-1.26-blue.svg)](https://golang.org/)
[![chi](https://img.shields.io/badge/chi-v5-00ADD8.svg)](https://github.com/go-chi/chi)
[![pgx](https://img.shields.io/badge/pgx-v5-336791.svg)](https://github.com/jackc/pgx)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](../LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](../CONTRIBUTING.md)

这是一套构建在整洁架构之上、可直接投入生产且经过安全加固的**全栈基础平台** —
构建数字服务的底座。它把 Go（**chi · net/http + pgx (pgxpool) + PostgreSQL + Redis**）
后端与 Next.js（**BFF**）前端结合起来，已彼此接线并可扩展到任何系统。
后端使用标准库 `net/http`，搭配 [go-chi/chi](https://github.com/go-chi/chi) router
与 [jackc/pgx](https://github.com/jackc/pgx) 驱动的手写 SQL — 不使用 ORM。

## 📌 溯源与开源

**后端**派生自开源项目
[snykk/go-rest-boilerplate](https://github.com/snykk/go-rest-boilerplate)
（MIT，作者 Najib Fikri）；我们把 HTTP 层由 **Gin → chi (net/http)** 移植，
数据层由 **sqlx → pgx（pgxpool，手写 SQL）** 移植，并保留了完整功能集。
上游署名保留在 [AUTHORS](../AUTHORS) 中。本项目采用 **MIT 许可** — 见
[LICENSE](../LICENSE)。

## Monorepo 结构

```
government-template-platform/
├── backend/           # Go · chi (net/http) · pgx (pgxpool) · PostgreSQL · Redis · eID/Google/SSO 认证
│   └── docs/          # ARCHITECTURE · DEVELOPMENT · API_CONTRACT · SECURITY（EN/MN/ZH）
└── frontend/          # Next.js BFF（服务端代理到后端；cookie 会话）
```

- **[backend/README_ZH.md](../backend/README_ZH.md)** — 整洁架构的 Go API。
- **[frontend/README_ZH.md](../frontend/README_ZH.md)** — Next.js Backend-for-Frontend。

## 功能特性

- **整洁架构** — `handler → usecase → repository → domain`，无反向 import；
  业务内核从不 import Web 框架。
- **认证 — eID + Google** — 唯一的登录方式是 **eID 登录**（eID Mongolia 依赖方：
  二维码 / 移动端 deep-link / 按登记号推送，配合 long-poll 会话）。与之并行的是
  **Google OAuth** 账户绑定。会话为 JWT access + refresh（带轮换）；
  登出会同时吊销二者（refresh + access 拒绝名单）。不存在密码或邮箱/OTP 登录。
- **eID PKI 档案** — 从 IdP 读取已登录公民的 eID 身份：关联的组织与授权签署人、
  证书、已登记设备以及活动记录。
- **组织与成员** — 创建/查询组织（经 Gerege Verify/XYP 查询国家登记）并管理成员/角色，
  按用户以 RLS 隔离。
- **政务服务门户** — 面向公民的 `Төрийн үйлчилгээ` 界面：服务目录、申请、证明、
  通知、缴费、预约。
- **API 网关** — 管理员管理的服务 / 路由 / consumer / API key / 策略，
  并带请求遥测（概览 + 日志）。
- **OIDC 提供方（SSO）** — 平台自身可以充当身份提供方：平台自研的 Go OAuth2/OIDC
  provider 驱动登录/授权/登出流程，使依赖方可以通过它登录
  （参考部署中的 `Sign in with Government SSO`）。配置 `OAUTH_ISSUER` 后启用。
- **文件签署（PAdES）** — 通过 eID Mongolia `/v3` 的服务端 PDF 签署，
  使用常驻的 Document-Signer 证书；签署中继让第三方 RP 可借平台的 eID 凭据完成签署。
- **第三方集成** — 按用户的 OAuth 连接（Google Drive/Meet、Dropbox），
  令牌静态加密（AES-256-GCM），另有 **Gerege Space** 应用自有的 SFTP 存储。
- **AI 流水线（Gemini）** — 免 SDK 的 REST 客户端 + function calling：
  文本/语音聊天、语音转文字、文字转语音、实时翻译。分层系统提示词
  （硬编码防护规则 + 管理员可在数据库中配置的 scope/instructions）
  把助手约束在既定领域内；`search_knowledge` 工具让回答落到 `ai_knowledge` 表的数据上。
- **审计日志** — 哈希链式、仅追加的审计轨迹（仅管理员读取 + 完整性校验）。
- **RBAC 与超级管理员** — 动态角色 + 权限目录；四角色模型
  （**超级管理员 → 管理员 → 经理 → 用户**），其中超级管理员是唯一能管理管理员账户的角色。
- **站点外观** — 面向公开页面、由管理员配置的站点级外观
  （强调色 / 字体 / 密度 / 主题），另有按用户的覆盖设置。
- **安全加固** — 严格的安全响应头（CSP、HSTS、COOP/COEP/CORP）、CORS 白名单、限流、
  完整的 HTTP 服务器超时、参数化查询、带启动时可执行性守卫的 Postgres 行级安全。
  参见 [SECURITY.md](../SECURITY.md)。
- **可观测性** — OpenTelemetry 追踪 + Prometheus 指标 + Zap 结构化日志；
  生产环境中 `/metrics` 与 `/swagger` 由 bearer 令牌把守。
- **前端 BFF** — 浏览器只与同源的 Next.js 路由通信，由其在服务端代理到后端
  （令牌绝不进入客户端 JS）；双重 CSRF 防护（自定义请求头 + 来源校验），
  TanStack Query 数据层。
- **有测试** — 单元测试 + testcontainers 集成测试。

## 快速开始

**前置条件：** Go 1.26+、Node 20+、PostgreSQL 15+、Redis 7+
（推荐用 Docker 运行完整技术栈）。

```bash
# 1) 后端  →  http://localhost:8080
cd backend
cp internal/config/.env.example internal/config/.env   # 设置 JWT_SECRET（≥32 字符）、数据库、Redis、EID_* RP 凭据

# 2) 前端 →  http://localhost:3000
cd ../frontend
cp .env.example .env.local                              # BACKEND_URL=http://localhost:8080
npm install
npm run dev
```

或者启动整套技术栈（db + redis + migrate + api + web）：

```bash
docker compose up -d --build
```

打开 **http://localhost:3000** 并选择 **eID 登录**
（扫描二维码 / 打开 eID 手机应用，或输入登记号以接收推送）。
配置了 Google 凭据后，Google 账户绑定入口才会出现。

## 文档

| 文档 | 内容 |
|-----|------|
| [backend/docs/ARCHITECTURE_ZH.md](../backend/docs/ARCHITECTURE_ZH.md) | 分层、依赖流向、组件 |
| [backend/docs/DEVELOPMENT_ZH.md](../backend/docs/DEVELOPMENT_ZH.md) | 新增功能指南、测试、代码风格 |
| [backend/docs/API_CONTRACT_ZH.md](../backend/docs/API_CONTRACT_ZH.md) | REST 端点、请求/响应形态 |
| [backend/docs/AI_PIPELINE_ZH.md](../backend/docs/AI_PIPELINE_ZH.md) | AI 助手内部机制：流程、提示词分层、工具、语音、扩展方式 |
| [backend/docs/SECURITY_ZH.md](../backend/docs/SECURITY_ZH.md) | 已实现的控制 + ASVS 路线图 |
| [docs/DEPLOYMENT_ZH.md](DEPLOYMENT_ZH.md) | VPS 部署手册（compose、env 文件、nginx、更新、回滚） |
| [ROADMAP.md](../ROADMAP.md) | 已交付的与接下来的工作 |
| [SECURITY.md](../SECURITY.md) | 如何报告安全漏洞 |
| [CONTRIBUTING_ZH.md](CONTRIBUTING_ZH.md) | 如何参与贡献 |

## 关于 Gerege Systems 有限公司

**Gerege Systems 有限公司**（Гэрэгэ Системс，乌兰巴托，2017 年成立）
把面向公民的公共与私营服务分发渠道，与受监管的信任服务结合在一起。

- **使命：** *「以简便的方式把政府与私营部门的服务送达公民」* —
  本平台的定位正是由此直接而来。
- **受监管的信任服务：** 蒙古国获准签发电子签名证书的**五家**机构之一
  （许可证代码 `0925`，有效期 2025-06-12 → 2030-06-12；见 MDDIC 的
  [登记册](https://mddic.gov.mn/signature/)）。eID Mongolia（`e-id.mn`）
  就是这条产品线上的产品。
- **涉足领域：** 公共服务渠道（Gerege Kiosk、Gerege App）、支付基础设施
  （Smart POS）、教育（EdTech）、医疗（MedTech）、保险与银行。

> **澄清。** Gerege Systems **并未**构建 **DAN**（国家身份认证）、
> **XYP**（数据交换）或 **e-Mongolia** — 这些是由国家数据中心持有的国家系统，
> Gerege 是它们的依赖方 / 渠道方。本平台同样处在这些基础设施的*使用者*一侧。
> 其电子签名架构遵循 eIDAS 的*模型*，但并非在欧盟名录中列明的**合格**信任服务。

## 参与贡献

欢迎贡献 — 请阅读 [CONTRIBUTING_ZH.md](CONTRIBUTING_ZH.md) 与
[行为准则](CODE_OF_CONDUCT_ZH.md)。

## 许可

[MIT](../LICENSE) — snykk/go-rest-boilerplate（MIT）的衍生作品；
上游署名保留在 [AUTHORS](../AUTHORS) 中。

---

**Government Template Platform V3.0** — 由 **Gerege Systems 开发团队**与
**Claude AI** 共同打造，2026。
