# 路线图 — Gerege Template Platform V3.0（构建数字服务的基础）

> 🌐 [Монгол](../ROADMAP.md) · **中文** · [Русский](ROADMAP_RU.md)

> **Gerege Template Platform V3.0**（*Цахим үйлчилгээг бүтээх суурь*，
> 即「构建数字服务的基础」）— 一套生产就绪的基础平台：
> 政府机构与私营部门的任何数字服务都能放心地在其上构建。
> 一套基础 — 承载政府与私营部门的所有服务。其核心能力是基于 eID 的
> 单点登录（Single Sign-On），现成的标杆部署是
> **Gerege Template Platform**（[template.gerege.mn](https://template.gerege.mn)）。
> 本文件展示已完成的工作与后续计划。
> 详细文档：[README.md](../README.md#documentation)。

**当前状态：** 平台的所有组成部分都已在生产中得到验证 — eID 登录、Google 绑定、
dgov SSO 消费方、自有 OIDC 提供方（Hydra）、组织/成员、政务服务、API 网关、
PAdES 签名、第三方集成、审计、RBAC/超级管理员、站点外观 — 全部在标杆部署
（[template.gerege.mn](https://template.gerege.mn)）上稳定运行（CI 绿色）。

---

## ✅ 已完成

### 基础平台（Gerege Template Platform V3.0）

- 整洁架构的 Go 后端：chi (net/http) + pgx（无 ORM）+ PostgreSQL + Redis
- RBAC：动态角色/权限 + 目录；Postgres RLS（ENABLE+FORCE，非超级用户应用角色）
- 可观测性：OTel 追踪 + Prometheus + Zap；安全响应头、CORS、限流、服务器超时
- Next.js 15 BFF 前端：httpOnly cookie 会话、mn/en/zh/ru 多语言、TanStack Query
- CI：gofmt + vet + race 测试 + swag 漂移检查 + 前端 lint/build + gitleaks；CI 之后再 Deploy

### AI 流水线（Gemini）

- `pkg/gemini` — 免 SDK 的 REST 客户端（重试 + 退避）；function-calling 聊天（蒙古语兜底）
- 语音：音频理解（语音消息）、STT、TTS（PCM→WAV）、实时翻译
- 三层系统提示词：硬编码防护规则 + 数据库 scope/instructions；
  `search_knowledge` 工具（`ai_knowledge`）
- 管理界面 + API（`/admin/ai/prompts`，`settings.manage`）

### 身份认证 — eID + Google + dgov SSO

- **eID Mongolia RP 登录**成为唯一的登录方式（已移除密码/OTP/注册）：
  二维码（`/eid/start`）、按公民登记号推送（`/eid/start-id`）、long-poll 会话（`/eid/poll`）
- **Google OAuth 绑定** — 把 Google 账户绑定到 eID 用户，之后可用它登录；也可解绑
- **dgov SSO（OIDC）消费方**（`sso.gerege.mn`）— start / callback / native（移动端 PKCE）/ logout
- 首页 = eID 登录界面；硬跳转修复
- 会话：JWT access + refresh（轮换、`kind` 守卫）；登出 = 吊销 refresh + access 拒绝名单

### eID PKI 档案

- 已登录公民的 eID 身份：关联组织与授权签署人、证书、已登记设备、活动记录
  （`/me/*`、`/users/me/eid/*`）

### 组织与政务服务

- **组织 + 成员** — 创建/查询（Gerege Verify/XYP 国家登记查询）、成员/权限管理；
  按用户以 RLS 保护
- **政务服务门户** — 目录、申请、证明、通知、缴费、预约（`/gov/*`）
- **Gerege Core find** — 用户/组织查询封装（`/core/*`）

### DAN 作为 OIDC 提供方（SSO issuer）

- 前置 **Ory Hydra** 的登录/授权/登出内核（`/provider/*`）— 仅在配置 Hydra 时激活
- RP OAuth2 客户端注册/管理的 `/admin` 能力面 + 管理 API key
- 第一方客户端跳过 consent；记住授权（只在首次询问）
- 向 RP 释放 Google 绑定 claim（`google_sub/email/name/picture`）；在登录界面显示 RP 名称
- DAN 自有设计的 `/oauth` 界面（SigninShell + LoginForm）

### API 网关

- services / routes / consumers / API keys / policies 的 CRUD + 概览 + 日志遥测（`/gateway/*`）

### 文件签署（PAdES）

- 通过 eID Mongolia `/v3` 的服务端 PDF 签署；常驻 Document-Signer 证书（生产环境 fail-closed）
- **签署中继**（`/rp/sign/*`）— 第三方 RP 借 DAN 的 eID RP 凭据完成签署

### 集成与存储

- 用户的 OAuth 集成（Google Drive/Meet、Dropbox）— 令牌以 AES-256-GCM 加密（`/integrations/*`）
- **Gerege Space** — 应用自有的 SFTP 存储，按用户配额（`/gspace/*`）
- 签名/印章资产（`/assets/*`）

### 安全、审计与管理

- **审计日志** — 哈希链式、仅追加；管理员读取 + 完整性校验（`/audit`、`/audit/verify`）
- **安全事件**接收（`/security/events`）
- **RBAC + 超级管理员** — 四角色模型（超级管理员 → 管理员 → 经理 → 用户，迁移 `23`）；
  超级管理员是唯一能管理管理员用户的角色（`/superadmin/*`）
- 安全加固：HTTP 服务器超时 + MaxHeaderBytes、RLS 启动守卫、BFF 双重 CSRF + 路由校验、
  生产环境中 `/metrics` + `/swagger` 由 bearer 令牌把守

### 站点外观

- 面向公开页面、由管理员配置的站点级外观（accent / font / density / theme）（`/site/appearance`）
- 区分了管理员（公开页面）与按用户（应用内）两个作用域

### 部署

- 在 [template.gerege.mn](https://template.gerege.mn) 上完成生产部署
  （docker compose：db + redis + migrate + api + web）
- 所有文档已按 EN/MN 成对更新；DEPLOYMENT(_MN).md、AI_PIPELINE(_MN).md、CLAUDE.md

---

## 🔜 接下来（按重要性排序）

### SSO / 提供方的成熟度

- [ ] RP 自助门户（把 `/admin` 做成完整界面：客户端 CRUD、redirect/scope 管理）
- [ ] 为移动端原生流程（PKCE 公开客户端）编写文档并发布示例应用
- [ ] 会话管理：查看/撤销活动连接（back-channel logout）

### API 网关的强制执行

- [ ] 把配置的 route/policy 落实为真正的反向代理（目前只有管理 + 遥测）
- [ ] 在 consumer/API key 层面强制执行限流 / 配额；用量报表

### AI 改进

- [ ] 知识库检索改用 tsvector（全文）；大规模语料改用 pgvector（语义）
- [ ] 聊天的流式响应（SSE）；可选地在服务端保存聊天历史
- [ ] 更多工具：用户资料（带 RLS）、系统统计（管理员）；提示词版本审计

### 安全（ASVS L2 剩余项）

- [ ] 把 CSP 改为基于 nonce（目前是 'unsafe-inline'）
- [ ] 在 CI 中接入 `govulncheck` + 容器扫描；把 golangci-lint 恢复到 CI
- [ ] 密钥管理器/KMS 集成（生产中替代 .env）；INTEGRATION_ENC_KEY 的轮换方案

### 运维

- [ ] 数据库自动备份 + 恢复演练（cron + 异地）
- [ ] Staging 环境 + 更深入的部署自动化
- [ ] 连接池/错误告警（Prometheus alertmanager）；交互式 Swagger UI

### 待办储备（按需）

- [ ] 多租户 RLS（`tenant_id`）、字段级 PII 加密
- [ ] 更多集成（OneDrive 等）；Gerege Space 的配额/共享策略
- [ ] 前端：error boundary、bundle analyzer、配合 nonce CSP 的 hydration 审计

---

**Gerege Template Platform V3.0** — 由 **Gerege Systems 开发团队**与
**Claude AI** 共同打造，2026。
