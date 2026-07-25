# 安全

> 安全是内建的，而非事后附加。本页汇总了**已在代码中实现**的各项控制措施。

## 身份认证与会话

| 控制项 | 细节 |
|---|---|
| **eID 是唯一登录方式** | 唯一的交互式登录方式是 eID（二维码 / App2App / 按登记号推送）。系统**完全不存在密码面** |
| JWT access + refresh | refresh 令牌会**轮换**；由 `kind` claim 守护 |
| 登出拒绝名单 | 登出会把 access 令牌的 `jti` 按剩余 TTL 写入 Redis；中间件在每次请求时校验 |
| 公民证书（PKI） | 登录完成后返回公民证书（DER），用 `crypto/x509` 解析；序列号、有效期与颁发者会被持久化 |
| Google 绑定 | **仅用于绑定** — 以稳定的 subject 列为键 |

!!! note "没有密码是有意为之"
    由于不存在任何密码流程，HIBP / bcrypt / 泄露密码检查等控制**不适用**。
    历史遗留的密码/OTP usecase 仍留在代码树中，但任何路由都无法触达。
    如果将来重新暴露密码路径，务必在上线**之前**接入 HIBP 检查。

## 数据层

- **只使用参数化查询**（pgx）— 无字符串拼接，无 ORM。
- **行级安全（RLS）** — 每张按用户划分的表都同时 `ENABLE` **且 `FORCE`**：
  `users`、`organizations`、`organization_memberships`、各 `gov_*` 公民表以及
  `user_integrations`。策略由每个事务中通过 `SET LOCAL` 设置的
  `app.user_id` / `app.user_role` GUC 驱动。
- **无身份 ⇒ 零行**（fail-closed），可防止意外泄露。

!!! warning "RLS 启动守卫"
    应用启动时会检查自身的数据库角色。在生产环境中，**超级用户**或带
    `BYPASSRLS` 的角色会**导致启动失败** — 否则 RLS 会在无声中失效。
    在开发环境中仅发出警告。

    每张新增的按用户划分的表都需要配置自己的策略。

## 密钥与加密

| 对象 | 方式 |
|---|---|
| 第三方 OAuth 令牌 | 入库前用 **AES-256-GCM** 封装（`INTEGRATION_ENC_KEY`） |
| 令牌 / 会话标识符 | `crypto/rand` 配合拒绝采样，避免取模偏差 |
| 超级管理员 MFA（TOTP） | 同样用 `INTEGRATION_ENC_KEY` 加密 |

!!! danger "切勿原地轮换 INTEGRATION_ENC_KEY"
    更换已经启用的密钥会**破坏此前加密的所有数据**。部署脚本只在密钥不存在时
    写入一次（幂等）。

## Web 与网络层

- **安全响应头** — CSP `default-src 'none'`、HSTS（生产）、`nosniff`、
  `X-Frame-Options: DENY`、Referrer-Policy、Permissions-Policy、COOP/CORP/COEP。
- **CORS** — 严格的来源白名单；绝不将 `*` 与凭据组合使用。
- **请求体大小限制** — 全局上限，另加 `/auth` 上的 4 KiB 限制。
- **每请求超时** — 一般为 30 秒；`/ai/*` 为 50 秒（Gemini 的 TTS/STT 通常需要
  10–20 秒，放不进 30 秒的上限）。
- **完整的服务器超时** — `ReadHeader` 10 秒、`Read` 30 秒、`Write` 70 秒、
  `Idle` 120 秒、`MaxHeaderBytes` 16 KiB（防 slowloris / 超大请求头）。
- **限流** — `/auth` 约 5 次/分钟，`/ai/*` 约 20 次/分钟，首页的匿名聊天
  `/public/ai/chat` 约 6 次/分钟，均按 IP 计。

### 前端（BFF 模式）

浏览器只与**同源**的 `/api/*` 路由通信。令牌存放在 `httpOnly` Cookie 中，
**绝不**进入客户端 JS。每个改变状态的调用都会携带 `x-dgov-csrf` 请求头，
由服务端的 `checkOrigin` 校验 — 构成双重 CSRF 防护。

## 审计日志

哈希链式、仅追加：

```
chain_hash = SHA-256(prev_hash ‖ canonical-json(entry))
```

写入通过 `pg_advisory_xact_lock` 串行化；`VerifyChain` 可让篡改无所遁形。
仅管理员可读。

## 授权（RBAC）

跨四个级别的动态角色与权限目录：**超级管理员 → 管理员 → 经理 → 用户**。
路由由 `RequirePermission` / `RequireAdmin` 中间件保护。超级管理员是唯一
能够管理管理员用户的角色，并且绝不通过 API 创建 — 只能通过数据库或环境变量创建。

## 运维加固

在生产环境中，`/metrics` 与 `/swagger/doc.json` 由 bearer 令牌把关
（常数时间比较，未命中返回 **404**）。日志为带 request id 的 Zap 结构化日志，
且绝不记录任何密钥。

## ASVS 路线图

| 级别 | 状态 |
|---|---|
| **L1** | ✅ HTTPS + HSTS、无密码登录、参数化查询、安全响应头、严格 CORS、输入校验、结构化日志、无提交的密钥。⏳ 容器扫描 / `govulncheck` |
| **L2** | ✅ 限流、refresh 轮换、eID 设备绑定（抗钓鱼）、请求超时、加密的集成令牌、哈希链审计。⏳ WAF、集中式 SIEM、备份恢复演练、应急响应预案 |
| **L3** | ◻ 字段级 PII 加密（KMS）、mTLS、SLSA L3 溯源、外部渗透测试 — *超出本模板范围* |

## 已知不足

- **交互式 Swagger UI** — 仅在 `/swagger/doc.json` 提供原始规范
  （可载入 Swagger Editor 或 Postman 查看）。
- 完整的控制矩阵见
  [`backend/docs/SECURITY.md`](https://github.com/gerege-systems/template-gerege-mn/blob/main/backend/docs/SECURITY.md)。

!!! tip "报告安全漏洞"
    请不要公开提交 issue。请遵循
    [SECURITY.md](https://github.com/gerege-systems/template-gerege-mn/blob/main/SECURITY.md)
    中的流程。
