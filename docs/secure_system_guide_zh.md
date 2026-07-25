# 构建安全的 Web + Mobile + API 系统指南

> 🌐 [Монгол](secure_system_guide_mn.md) · **中文** · [Русский](secure_system_guide_ru.md)

**技术栈：** Go（后端）· PostgreSQL（数据库）· Next.js（Web）· iOS/Android（移动端）
**立场：** 面向可直接投入生产的多租户 SaaS。如果你做的是单租户或内部工具，
本指南的部分建议可能显得过度 — 相关处已特别标注。

本指南力求解释的不只是「做什么」，更是「**为什么、依据哪个标准、达到哪个 Level 的保证**」。
每一章都给出了适用标准的参考（OWASP ASVS / MASVS / API Top 10、NIST CSF 2.0 /
800-63B / 800-218 SSDF、MITRE ATT&CK、ISO 27001:2022、CIS Controls v8）。

---

## 目录

0. [威胁建模（STRIDE + DREAD + LINDDUN + PASTA）](#0-威胁建模)
1. [身份认证（NIST 800-63B AAL）](#1-身份认证)
2. [授权（RBAC / ABAC / ReBAC + 租户隔离）](#2-授权)
3. [PostgreSQL 安全](#3-postgresql-安全)
4. [Web 前端（XSS / CSP / CSRF / SSRF / 浏览器隔离）](#4-web-前端安全)
5. [API 安全（OWASP API Top 10）](#5-api-安全)
6. [移动端安全（OWASP MASVS）](#6-移动端安全)
7. [基础设施与云（零信任、mTLS）](#7-基础设施与云)
8. [软件供应链（SBOM / SLSA / 签名）](#8-软件供应链)
9. [日志、监控、事件响应（NIST 800-61）](#9-日志监控与事件响应)
10. [隐私与合规（GDPR / PCI DSS / SOC 2 / ISO 27001）](#10-隐私与合规)
11. [如果涉及 AI/LLM（OWASP LLM Top 10）](#11-aillm-安全)
12. [安全测试（SAST/DAST/SCA/fuzz/渗透测试）](#12-安全测试)
13. [密码学（绝对不要自作聪明的地方）](#13-密码学)
14. [落地顺序 — 以 ASVS Level 衡量的路线图](#14-路线图)
15. [资源](#15-资源)

---

## 0. 威胁建模

**目标：** 由架构师们共同商定并写下「要防什么？」「谁？想拿走什么？」。
没有这份分析，任何安全工作都是在盲干。

### 0.1 可组合使用的模型

| 模型 | 用途 | 怎么做 |
|---|---|---|
| **STRIDE** | 微软出品。组件级威胁 | Spoofing、Tampering、Repudiation、Information disclosure、DoS、Elevation of privilege |
| **DREAD** | 打分排序 | Damage、Reproducibility、Exploitability、Affected users、Discoverability（各 1-10）— 按总分排序 |
| **PASTA** | 业务风险驱动的 7 个阶段 | 为每个威胁对齐业务情境与损失 |
| **LINDDUN** | 隐私威胁 | Linkability、Identifiability、Non-repudiation、Detectability、Disclosure of information、Unawareness、Non-compliance |
| **MITRE ATT&CK** | 从真实攻击者行为映射 | 用 TTP（战术/技术/流程）编写检测规则 |

### 0.2 流程

1. 画**数据流图（DFD）**— 标注信任边界（DMZ、内部、数据库）。
2. 在每条边界上逐项套用 STRIDE。
3. 在 PII 数据流上逐项套用 LINDDUN。
4. 用 DREAD 给风险打分，先缓解前 10 项。
5. **威胁模型即代码** — 把 `THREAT_MODEL.md` 放进仓库。每次 PR review 都问一句
   「这引入了新的信任边界吗？」

**工具：** Microsoft Threat Modeling Tool（免费）、OWASP Threat Dragon（开源）、
IriusRisk（企业级）。

---

## 1. 身份认证

**NIST SP 800-63B Digital Identity Guidelines** 是全球标准。
其 AAL（Authenticator Assurance Level）分三级：

| 级别 | 含义 | 典型场景 |
|---|---|---|
| **AAL1** | 单因素（密码） | 公开的新闻订阅、低风险消费级应用 |
| **AAL2** | 必须多因素、抗重放 | 几乎所有 SaaS 与商业应用 |
| **AAL3** | 基于硬件（FIDO2 / 智能卡）、抗验证方冒充 | 政府、银行、医疗管理端 |

> **我们模板的默认目标：AAL2。** 主要用户都应启用 MFA；管理员角色要随时可以升到 AAL3。

### 1.1 密码 — 现代规则（NIST 800-63B §5.1.1）

**正确做法：**

- **拼长度** — 最少 8 位，建议 12 位以上。**字母+数字+符号这类复杂度规则**
  自 2017 年起已被 NIST 正式认定为有害（用户会用套路应付）。
- 使用 **Have I Been Pwned API** 阻止已泄露的密码。采用 k-匿名前缀形式 —
  `https://api.pwnedpasswords.com/range/<sha1[0:5]>`（完整哈希不会发往服务器）。
- **绝不强制定期更换**（过去常说「每 60 天」）— 只在泄露或出现攻击迹象时才更换。
- 哈希：**`argon2id`**（memory=64MB、t=3、p=2），现成配方见
  `golang.org/x/crypto/argon2`。或用 `bcrypt`，cost ≥ 12。**两者都是 OWASP 标准做法。**

```go
import "golang.org/x/crypto/argon2"

// OWASP 建议的下限（2024）
hash := argon2.IDKey([]byte(password), salt, 3, 64*1024, 2, 32)
```

**绝不要：**

- 直接用 MD5、SHA-256 处理密码（几乎挡不住任何攻击 — 快速哈希 = 暴力破解很划算）
- 明文存储，或用可逆加密存储
- 自己发明「加盐 + 哈希」的方案
- 用「母亲的姓氏」之类的安全问题 — 属于公开信息，OSINT 就能查到

### 1.2 认证器 — 优先级排序

**越靠前越好：**

1. **Passkeys / WebAuthn (FIDO2)** ⭐ — 抗钓鱼，可达到 NIST AAL3，无需密码。
   iOS 16+、Android 9+、所有主流浏览器均支持。**每个新项目都应从一开始就支持 passkey。**
2. **硬件安全密钥（YubiKey）** — 给管理员用。
3. **TOTP**（Google Authenticator、Authy）— 可靠，可离线工作。`github.com/pquerna/otp/totp`。
4. **推送通知**（在自有移动应用内）— 体验好，且能给出较强的认证位置证明。
5. **邮箱魔法链接** — 可作为附加因素。在正式应用中不应作为主因素
   （邮箱一旦被攻破就全线失守）。
6. **短信 OTP** — **已弃用**（NIST 800-63B 自 2017 年起列为 "RESTRICTED"）。
   存在 SIM 卡劫持、SS7 攻击。仅作为遗留用户的兜底。

### 1.3 会话策略

| 模型 | Web | 移动端 | 可吊销性 | 抗钓鱼 |
|---|---|---|---|---|
| **服务端会话**（cookie + Postgres/Redis） | ⭐ 理想 | 可用 | 容易 | Cookie + CSRF token |
| **JWT（无状态）** | 可用 | 可用 | 困难（需黑名单） | 较弱（令牌可被滥用） |
| **PASETO / Biscuit** | 可用 | 可用 | 困难 | 优于 JWT |
| **OAuth2 + OIDC** | ⭐ 企业级 | ⭐ 企业级 | 令牌内省 | 最高 |

**建议：** **Web 用服务端会话**（`SameSite=Lax + Secure + HttpOnly`），
**移动端用 OAuth2 + refresh 令牌轮换**，**企业场景用 OIDC**
（Keycloak、Auth0、Ory Hydra）。不要因为「便宜」就刻意选 JWT —
吊销困难会带来合规问题。

### 1.4 Refresh 令牌轮换（细节）

标准模式：

1. 用户登录 → `access_token`（15 分钟）+ `refresh_token_v1`
   （30 天，随机生成，以哈希形式存库）。
2. 移动端/Web 用 `refresh_token_v1` 换新令牌 → 服务端吊销 `refresh_token_v1`
   并签发 `refresh_token_v2`。
3. **如果 `refresh_token_v1` 再次出现 — 吊销整个令牌家族**（重用检测）。
   用户需要重新登录。见 RFC 6819 §5.2.2.3。

```go
// 草图 — 给同一家族的令牌一个共同的 "session_id"。
// 检测到重用时，吊销该 session_id 下的所有 refresh 令牌。
```

### 1.5 账户锁定、限流与账户枚举

- **限流：** 登录端点 5 次/分钟/IP。bcrypt 校验只需几毫秒，
  因此还要有按用户的计数器（Redis）。
- **锁定：** 10 次失败 → 15 分钟软锁。要检测分布式暴力破解，
  按用户计数比按 IP 计数更关键。
- **避免账户枚举：**
  - 不要区分「邮箱不存在」和「密码错误」→ 统一返回「邮箱或密码错误」。
  - 忘记密码端点：无论账户是否存在都回复「如果该邮箱已注册，我们已发送链接」—
    这可防止账户存在与否被探测。
  - 注册：不要直接暴露「该邮箱已被使用」；通过验证邮件来处理。

### 1.6 账户恢复流程

> **一条重要结论：** 超过 40% 的账户接管发生在恢复流程上。
> 一旦恢复邮件被钓走一次，全盘失守。

- 恢复码（10 个）— 以哈希存储。仅在用户确认已抄录后才保存。
- 密码找回走一次性 OTP 验证码（GeregeCloud Verify）：验证码 TTL 很短（约 30 分钟）、
  只可使用一次，且服务端日志中绝不记录验证码。重置请求形如
  `{email, code, new_password}` — 而不是重置链接/令牌。
- 邮箱/手机恢复本身只有 AAL1 — 为 AAL2 用户重置密码时必须加额外挑战。

### 1.7 OAuth2 / OIDC

- 必须带 `state` 参数（CSRF 防护）。
- **必须使用 PKCE**，即使是机密客户端（自 2024 年起由 RFC 9700 BCP 强制要求）。
- `redirect_uri` — 严格的精确匹配白名单。
- 不要把令牌存进 localStorage；使用 HttpOnly cookie。
- 只有在验证签名之后才信任 ID token 中的 claims。警惕 `alg: none` 与密钥混淆攻击。

### 1.8 标准映射

| 标准 | 相关条款 |
|---|---|
| OWASP ASVS v4 | V2 Authentication、V3 Session |
| NIST SP 800-63B | 全部 AAL 要求 |
| OWASP Cheat Sheet | Authentication、Password Storage、Session Management |
| RFC 6749 / 6750 / 8252 / 9700 | OAuth2（移动原生应用 BCP） |
| WebAuthn L3 | 无密码认证 |

---

## 2. 授权

> 认证 = 「你是谁？」 授权 = 「你能做什么？」

### 2.1 模型

| 模型 | 粒度 | 性能 | 示例 |
|---|---|---|---|
| **RBAC**（基于角色） | 粗 | 快，JOIN 很少 | "admin"、"support" — 本模板采用 |
| **ABAC**（基于属性） | 中 | 中 | 「只能查看自己租户的文件」 |
| **ReBAC**（基于关系） | 细 | 需要图数据结构 | Google Drive 的「已共享给你」→ SpiceDB、OpenFGA |
| **策略即代码** | 都能表达 | 需要缓存 | Open Policy Agent（Rego）、AWS Cedar |

**模板建议：** RBAC + ABAC（租户隔离），企业场景再加 ReBAC + OPA。

### 2.2 IDOR（OWASP A01:2021 Broken Access Control）

最常反复出现的漏洞。服务端必须对每个资源**校验归属**：

```go
// 错误 — IDOR
func GetInvoice(invoiceID string) (*Invoice, error) {
    return db.Get(invoiceID)
}

// 正确 — 租户 + 归属双重校验
func GetInvoice(ctx context.Context, invoiceID string) (*Invoice, error) {
    inv, err := db.Get(ctx, invoiceID)
    if err != nil { return nil, err }
    if inv.TenantID != tenant.ID(ctx) { return nil, ErrNotFound } // 返回 NotFound，而非 Forbidden
    if !canAccess(ctx, inv) { return nil, ErrForbidden }
    return inv, nil
}
```

另外**使用 UUID，不要用自增整数 ID**。顺序 ID 很容易被枚举（1、2、3……）。

### 2.3 BOLA / BFLA（OWASP API Top 10）

- **BOLA**（Broken Object Level Authorization）— A1:2023。
  例如：`GET /api/v1/users/1234/notes` — 如果 1234 是别人的 ID 呢？
- **BFLA**（Broken Function Level Authorization）— A5:2023。
  例如：`POST /admin/users` — 入口没有在 HTTP 层保护，普通用户也能访问。

在所有端点上把权限校验写在 ABAC 层是最可靠的做法。

### 2.4 租户隔离（本模板的模式）

我们在 `internal/tenant` 包中：

```go
// 仓储层的所有查询都自动带上 tenant.Scope(ctx) 的 WHERE tenant_id=?
db.WithContext(ctx).Scopes(tenant.Scope(ctx)).Find(&items)
```

**以纵深防御的方式：**

1. **应用层** — 中间件把 tenant_id 放入 ctx + 仓储层的 Scope。
2. **数据库层** — Postgres RLS（见下文 3.3 节）。仅靠应用层不够；一旦有 bug，
   数据库自己会把它挡住。
3. **测试层** — 自动化测试验证「用户 A 访问租户 B 的数据时返回 404」。
   靠人工测试是靠不住的。

### 2.5 Cedar / OPA 示例（进阶）

如果权限矩阵变得过于复杂（例如文件共享）— 就迁移到策略即代码：

```rego
# OPA Rego — 「可以查看共享给自己的文件」
package files.access
default allow = false
allow {
  input.user.tenant_id == input.file.tenant_id
  input.user.id == input.file.owner_id
}
allow {
  some share
  share := data.shares[_]
  share.file_id == input.file.id
  share.shared_with == input.user.id
  share.expires_at > time.now_ns() / 1000000000
}
```

### 2.6 标准映射

| OWASP ASVS V4 | NIST CSF | CIS Controls v8 |
|---|---|---|
| V4 Access Control | PR.AC-4（最小权限） | 6.7（集中式访问控制） |

---

## 3. PostgreSQL 安全

### 3.1 SQL 注入（OWASP A03:2021）

**参数化查询 — 必须。没有例外。**

```go
// ✅ pgx、database/sql — 使用占位符
db.QueryRow(ctx, "SELECT id FROM users WHERE email = $1", email)

// ❌ 绝不
db.Query(ctx, fmt.Sprintf("SELECT * FROM users WHERE email='%s'", email))
```

**工具：**

- `sqlc` — 编译期校验 SQL，类型安全。
- `gosec` — Go SAST，可发现 SQL 注入模式。
- pg_query_go — 可通过解析做预校验。

**用户输入进入 ORDER BY/LIMIT 时：** 用白名单校验列名
（只与允许的字符串比较），其余一律拒绝。

### 3.2 search_path 攻击（CVE-2018-1058）

如果攻击者能影响 PostgreSQL 的 `search_path` 配置，
就能在 `public` schema 里种下木马函数，从而劫持某些函数调用。

```sql
-- 应用运行时必须：
ALTER ROLE app_user SET search_path = "$user", app_schema, public;
-- 或在连接串中 options="-c search_path=app_schema"
```

### 3.3 行级安全（RLS）— 按 tenant_id

本模板的 tenant_id 列在应用层已受保护。
**以纵深防御的方式，在数据库层再加一道：**

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY; -- 对表属主也生效

CREATE POLICY tenant_isolation ON notifications
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id')::int);

-- 每个应用连接上：
-- SET app.tenant_id = '42'; — 由中间件设置
```

万一应用层因 bug 漏掉了 tenant_id，数据库自己会把跨租户访问挡住。

**管理/跨租户查询**应使用另一个具备 `BYPASSRLS` 权限的数据库角色。
普通的 `app_user` 不得绕过 RLS。

### 3.4 数据库用户分离

```sql
-- 执行迁移的用户（CREATE/DROP/ALTER）
CREATE USER app_migrator WITH PASSWORD '<vault>';

-- 应用用户（仅 DML）
CREATE USER app_user WITH PASSWORD '<vault>';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app_schema TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_schema GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
-- 绝不要用 superuser/postgres 连接应用
```

### 3.5 连接安全

- **`sslmode=verify-full`** — 用 CA + 主机名校验服务器证书。
  `require`（不校验 CA）易受中间人攻击。
- **scram-sha-256** 认证（`pg_hba.conf`）— md5 已过时。
- `pg_hba.conf` 要写成精确白名单：仅允许应用所在子网。

### 3.6 加密

- **静态加密：** 托管型 Postgres 的 TDE 自动生效。自建则用 LUKS 或磁盘级加密，
  并同时加密 WAL。
- **传输加密：** 必须 TLS（见 3.5）。
- **字段级**（PII / 银行卡 / 健康数据）：
  - `pgcrypto` 扩展 — `pgp_sym_encrypt(data, key)` — 但密钥必须远离 Postgres。
  - **信封加密**：在应用层用 AES-256-GCM，密钥来自 KMS（AWS KMS、GCP KMS、Vault Transit）。
  - 要有成文的密钥轮换生命周期（NIST SP 800-57）。

### 3.7 pgaudit — 合规必备

`pgaudit` 扩展会记录 DDL、角色变更、敏感表访问。
它是 SOC2 / PCI DSS / HIPAA 审计的关键证据。

### 3.8 备份卫生

- 加密备份 + 异地存放（不同可用区、不同云账号）。
- **每月做一次恢复演练** — 没演练过的备份不算备份。
- 时间点恢复（WAL 归档）— RPO < 5 分钟。
- 备份加密密钥必须与生产库的密钥**分开**。

### 3.9 连接池

`pgx` + **PgBouncer** 的 transaction pooling 模式。没有连接上限时，
慢查询 + DDoS 会让数据库彻底失去响应。

### 3.10 标准映射

| 标准 | 章节 |
|---|---|
| OWASP ASVS V5（Validation、Sanitization） | V5.3 |
| CIS PostgreSQL Benchmark | 全部 |
| PCI DSS 4.0 | Req 3（加密）、Req 8（访问） |

---

## 4. Web 前端安全

### 4.1 XSS 的分层防御

**三种类型：**

- **反射型** — 从 URL 直接进入服务端响应
- **存储型** — 从数据库渲染出来（最危险）
- **DOM 型** — 客户端 JS 自己造成

**React/Next 会自动转义**，但仍需注意：

1. 使用 `dangerouslySetInnerHTML` 时必须配 **`DOMPurify`**（最好在服务端处理）。
2. `href={...}` — 若允许用户输入 URL，要过滤 `javascript:` 协议。
3. **Trusted Types API**（CSP `require-trusted-types-for 'script'`）—
   在现代浏览器中几乎能彻底封死 DOM XSS。

### 4.2 CSP（内容安全策略）

现代建议 — **带 nonce + strict-dynamic 的严格 CSP**：

```ts
// Next.js middleware.ts
const nonce = crypto.randomUUID();
const csp = [
  `default-src 'self'`,
  `script-src 'nonce-${nonce}' 'strict-dynamic'`,
  `style-src 'self' 'unsafe-inline'`,           // 若 Tailwind 等必须内联，则保留 unsafe-inline
  `img-src 'self' data: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' https://api.example.com`,
  `frame-ancestors 'none'`,                     // 点击劫持
  `base-uri 'self'`,                            // base 标签 XSS
  `form-action 'self'`,
  `require-trusted-types-for 'script'`,         // DOM XSS
  `upgrade-insecure-requests`,
  `report-uri https://example.report-uri.com/r/d/csp/enforce`,
].join('; ');
```

**脚本绝不要用 `'unsafe-inline'`。** 样式方面则要看 tailwind、CSS-in-JS 的情况。
若不使用内联样式表，`'unsafe-inline'` 同样应当去掉。

### 4.3 CSRF

| 认证模型 | CSRF 防护 |
|---|---|
| Bearer 令牌（Authorization 头） | 不需要 — 不经由 cookie 传递 |
| Cookie 会话 | **双提交 cookie** + `SameSite=Lax`（可能的话，改变状态的请求用 `SameSite=Strict`） |
| 混合（cookie + JWT） | cookie 那一侧必须有 CSRF token |

```go
// gorilla/csrf — 把 token 写入 cookie 并通过 X-CSRF-Token 头回传
```

本模板混用了 cookie 会话 + bearer，因此以 `X-CSRF-Token` 头进行防护。

### 4.4 SSRF（OWASP A10:2021）

服务端请求伪造 — 服务器向用户提供的 URL 发起请求。攻击者可借此访问：

- AWS 元数据服务（`http://169.254.169.254`）— 窃取凭据
- 内部管理面板（`http://10.0.0.1:8080`）
- localhost 上的内部服务

**防护：**

- URL 允许列表（主机白名单）— 最理想
- 屏蔽私有 IP 段（RFC 1918、169.254/16、::1/128、fc00::/7）
- 通过 HTTP 客户端的 `Transport.DialContext` 校验实际解析到的 IP
- 警惕通过重定向绕到内网的攻击

### 4.5 开放重定向

```go
// ❌ 危险
http.Redirect(w, r, r.URL.Query().Get("return_to"), 302)

// ✅ 白名单
allowed := map[string]bool{"/dashboard": true, "/admin": true}
if !allowed[returnTo] { returnTo = "/" }
```

### 4.6 浏览器隔离响应头（现代）

| 响应头 | 含义 |
|---|---|
| **Cross-Origin-Opener-Policy: same-origin** | 隔离窗口的 opener（防 Spectre 侧信道） |
| **Cross-Origin-Embedder-Policy: require-corp** | SharedArrayBuffer 所需，并与其他源的 iframe 隔离 |
| **Cross-Origin-Resource-Policy: same-site** | 限制资源被外部嵌入 |

### 4.7 安全响应头（所有响应上）

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY                      # 会被 CSP frame-ancestors 覆盖，但旧浏览器仍需要
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-site
```

一直调到在 `securityheaders.com` 上拿到 A+ 为止。

### 4.8 CORS

本模板的 CORS 不是用 Fiber，而是在标准 `net/http` 上以 chi 风格中间件实现
（`internal/http/middlewares` 中的 `CORSMiddleware()`，形如
`func(http.Handler) http.Handler`）。它会精确匹配 Origin 白名单，
并明确列出允许的方法/请求头：

```go
// internal/http/middlewares — chi 风格 CORS（简要骨架）
func CORSMiddleware() func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            origin := r.Header.Get("Origin")
            if allowedOrigins[origin] { // 精确匹配的允许列表
                w.Header().Set("Access-Control-Allow-Origin", origin)
                w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH")
                w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type,X-CSRF-Token,X-Tenant-ID")
                w.Header().Set("Access-Control-Allow-Credentials", "true")
                w.Header().Set("Access-Control-Max-Age", "300")
            }
            // 按 CORS 规范，Allow-Origin="*" 与 Allow-Credentials=true 绝不可同时使用
            if r.Method == http.MethodOptions {
                w.WriteHeader(http.StatusNoContent)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

### 4.9 文件上传

- 通过内容（magic bytes）识别 MIME 类型，而不是靠扩展名
- 大小限制 — 在中间件层完成
- **从独立域名提供访问** — 与 cookie 隔离，也与 XSS 隔离
- 用 ClamAV 或云端杀毒扫描
- **完全重新生成文件名**（`uuid + 扩展名`）— 防范路径穿越与编码类攻击

### 4.10 子资源完整性（SRI）

如果从 CDN 加载 JS/CSS：

```html
<script src="https://cdn.../jquery.js"
  integrity="sha384-..."
  crossorigin="anonymous"></script>
```

### 4.11 标准映射

- OWASP ASVS V5（Validation）、V13（API）
- OWASP Cheat Sheet：XSS Prevention、CSP、CSRF、SSRF
- securityheaders.com / Mozilla Observatory 评级

---

## 5. API 安全

**OWASP API Security Top 10 (2023)** — 专门针对 REST API 的十大风险：

| API# | 条目 | 在本模板中如何应对 |
|---|---|---|
| API1 BOLA | 对象级授权 | tenant.Scope + handler 校验 |
| API2 Broken Authentication | 弱认证 | 见第 1 章 |
| API3 Broken Object Property Level Auth | 批量赋值 | DTO 白名单（在结构体绑定中显式列出字段） |
| API4 Unrestricted Resource Consumption | DoS | middleware.RateLimiter + middleware.PaginationLimit |
| API5 BFLA | 功能级授权 | auth.RequirePermission 中间件 |
| API6 Unrestricted Access to Sensitive Business Flows | 枚举、机器人滥用 | CAPTCHA / 工作量证明 / 行为分析 |
| API7 SSRF | 见 4.4 节 |  |
| API8 Security Misconfiguration | 默认开放 | 基础设施加固 |
| API9 Improper Inventory Management | 影子 API | 强制 OpenAPI 规范；类型生成流水线 |
| API10 Unsafe Consumption of APIs | 第三方 | 超时、schema 校验 |

### 5.1 批量赋值 / over-posting

```go
// ❌ 错误
var u User
c.BodyParser(&u)        // 攻击者可以塞进 is_admin=true
db.Save(&u)

// ✅ 正确
var req struct {
    Email string `json:"email" validate:"required,email"`
    Name  string `json:"name"  validate:"required,max=100"`
}
c.BodyParser(&req)
u.Email = req.Email
u.Name = req.Name
db.Save(&u)
```

### 5.2 幂等性

POST / PATCH 应支持 `Idempotency-Key` 头（Stripe / Square 的模式）。
本模板中已有 `middleware.IdempotencyKey(redis, 24h)`。

### 5.3 分页与资源限制

- `?limit=` 最大 100。`middleware.PaginationLimit(100)` 已接线。
- 优先使用基于游标的分页（比 offset 性能更好，也更少竞态）。
- 请求体大小限制 — net/http 的 body-size-limit 中间件（本模板的
  `BodySizeLimitMiddleware` 用 `http.MaxBytesReader` 把请求体限制为 4 MiB）。
- 请求超时（`middleware.Timeout(5*time.Second)`）。

### 5.4 GraphQL 专项（如使用）

- 查询深度限制（最大 10）
- 查询复杂度评分
- 生产环境关闭 introspection
- 使用 persisted queries

### 5.5 Webhook 安全

若要接收来自外部服务的 webhook：

- **HMAC 签名** — `X-Signature: hmac_sha256(secret, body)`，常数时间比较
- **时间戳** — `X-Timestamp` 头，超过 5 分钟即拒绝（防重放）
- 限制来源 IP 的**白名单**，或使用 mTLS

### 5.6 标准映射

- OWASP API Security Top 10 2023
- OWASP ASVS V13（API and Web Services）

---

## 6. 移动端安全

**OWASP MASVS v2** 分为三级：

| MASVS 级别 | 目标 |
|---|---|
| L1 | 标准安全（几乎所有消费级应用） |
| L2 | 纵深防御（银行、医疗） |
| L3 | + 抗逆向工程（DRM、银行核心） |

**模板默认：L1+。银行等场景则为 L2。**

### 6.1 存储（MASVS-STORAGE）

- **iOS：** Keychain Services API，`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`
  + `kSecAttrAccessControlFlags = .biometryCurrentSet`。
- **Android：** EncryptedSharedPreferences（Jetpack Security）或用 Keystore 加密。
  尽量申请**硬件支撑的 StrongBox**
  （`KeyGenParameterSpec.Builder.setIsStrongBoxBacked(true)`，API 28+）。
- **React Native：** `react-native-keychain`（底层用 Keychain/Keystore）。
- **Flutter：** `flutter_secure_storage`。
- 敏感数据不得流入缓存、日志、截图、无障碍树
  （例如 iOS 要设 `UITextField.isSecureTextEntry = true`）。

### 6.2 网络（MASVS-NETWORK）

- 只允许 TLS 1.2+。在 ATS（iOS）、Network Security Config（Android）中配置。
- **证书固定** — 优先固定公钥（这样证书轮换时无需同步更新固定值）：
  - iOS：`URLSessionDelegate.urlSession(_:didReceive:completionHandler:)`
  - Android：`CertificatePinner`（OkHttp），或 `network-security-config.xml`
  - **要放备用 pin** — 预先发布下一年证书的公钥很有必要
- mTLS — 用于银行/管理端。

### 6.3 认证（MASVS-AUTH）

- 生物识别 — 使用系统 API（LocalAuthentication、BiometricPrompt）。不要自己造。
- 令牌存储 — 见 6.1 节。
- 应用锁 — 闲置 n 分钟后重新认证。

### 6.4 平台（MASVS-PLATFORM）

- **深度链接** — 使用 Universal Links（iOS）/ App Links（Android），
  避免自定义 scheme（别的应用也能注册同样的 `myapp://`）。
- 使用 WebView 时 — `setAllowFileAccess(false)`，
  并且不要在启用 `setJavaScriptEnabled` 的 WebView 中承载敏感内容。
- IPC — 导出的组件降到最少。

### 6.5 代码 / 抗逆向（MASVS-CODE / RESILIENCE）

- **绝不**把 API key 硬编码进应用。它会被反编译出来。
- 敏感逻辑放在后端。
- **应用证明：**
  - iOS：`DeviceCheck` + **App Attest**（iOS 14+）— 从 Apple 获取 attestation token
  - Android：**Play Integrity API**（旧的 SafetyNet 已过时）
- 反调试、防篡改（L2+）：root/越狱检测、调试器检测。但不要幻想「永不被绕过」—
  它只是纵深防御的一层。
- ProGuard/R8（Android）— 类/方法混淆。

### 6.6 标准映射

- OWASP MASVS v2
- OWASP MASTG（移动应用安全测试指南）
- NIST 800-163（应用审查）

---

## 7. 基础设施与云

### 7.1 TLS

- 只允许 TLS 1.2+。**优先 TLS 1.3**（前向保密、0-RTT 有保障）。
- 在 `ssllabs.com/ssltest` 上调到 **A+**。
- 加入 HSTS preload 列表（[hstspreload.org](https://hstspreload.org)）。
- 证书透明度 — Caddy / Let's Encrypt 会自动处理。

### 7.2 DNS / 域名安全

- **CAA 记录** — `example.com. CAA 0 issue "letsencrypt.org"`。
  防止其他 CA 为你的域名签发证书。
- **DNSSEC** — 防 DNS 欺骗。
- **防子域名接管：** 删除不再使用的 CNAME（例如把 CNAME 指向了 S3 bucket，
  却把 bucket 删了 — 攻击者重建同名 bucket 就能接管该子域名）。
- 邮件认证：**SPF + DKIM + DMARC**（p=reject）— 防伪造发件。

### 7.3 密钥管理

- **绝不放进 git。** 在 pre-commit 与 CI 中运行 `gitleaks`、`trufflehog`。
- 使用云 KMS / Vault / AWS Secrets Manager / GCP Secret Manager。
- 本地开发：`.env` + `.gitignore` + `direnv` + 1Password CLI / `op`。
- 密钥轮换策略（NIST 800-57）：
  - 数据库密码：每年
  - API key：90 天
  - 加密密钥：一开始就做密钥版本化，轮换周期 90–365 天

### 7.4 容器安全

- **Distroless / Wolfi / Chainguard** 镜像 — 攻击面更小。
- 非 root 用户（`USER 65532`）。
- 只读根文件系统（`docker run --read-only` / K8s
  `securityContext.readOnlyRootFilesystem: true`）。
- 在 CI 中用 **`trivy` + `grype`** 扫描镜像。
- **多阶段构建** — 构建工具不会留在生产镜像里。

### 7.5 镜像签名（SLSA / Sigstore）

```bash
cosign sign --key cosign.key myorg/myapp:v1.0
# 拉取时：
cosign verify --key cosign.pub myorg/myapp:v1.0
```

K8s 准入控制器（Sigstore policy-controller）— 只允许已签名的镜像。

### 7.6 Kubernetes 加固

- **命名空间** — 按租户或服务隔离。
- **NetworkPolicy** — pod 之间的流量默认拒绝 + 显式放行。
- **Pod Security Standards**（Restricted 配置档）。
- **Secrets：** 不要用环境变量注入，改用 projected volume + 挂载文件。
- **etcd 静态加密** — 通过 KMS。
- **RBAC** — 最小权限，绝不用 ClusterAdmin 运行服务。
- **镜像拉取策略** — 固定 digest（`@sha256:...`），而不是 tag。

### 7.7 服务网格 / mTLS

微服务较多时使用 **Istio / Linkerd**：

- 自动 mTLS
- L7 策略（HTTP 方法、路径级别）
- 可观测性

### 7.8 网络

- **数据库绝不应暴露在公网上。** 只在 VPC 内部。
- **WAF**（Cloudflare、AWS WAF）— 使用 OWASP CRS 规则集。
- **DDoS：** Cloudflare 代理、AWS Shield。
- **SSH：** 禁用密码、仅用密钥、启用 fail2ban。最好的做法是
  Identity-Aware Proxy / AWS SSM Session Manager — 根本不开放 SSH。
- **零信任**（BeyondCorp 模型）— 不以边界为核心，
  对每位员工每次访问都做设备 + 身份校验。

### 7.9 标准映射

- CIS Docker / Kubernetes Benchmarks
- NIST SP 800-190（容器安全）
- NIST SP 800-207（零信任架构）
- CIS Controls v8：12（网络）、4（安全配置）、7（漏洞管理）

---

## 8. 软件供应链

美国第 14028 号行政命令（2021）、NIST SP 800-218 SSDF 与 **SLSA 框架**
让这一章成为合规要求的一部分。

### 8.1 SBOM（软件物料清单）

```bash
# Go
syft packages dir:. -o cyclonedx-json > sbom.json

# Node.js
npx @cyclonedx/bom -o sbom.json

# 容器镜像
syft myorg/myapp:v1.0 -o cyclonedx-json
```

**为每个制品生成 SBOM**，并随 release 一起发布。它是按 CVE 扫描时的必需品。

### 8.2 SLSA 级别

| 级别 | 目标 |
|---|---|
| **SLSA 1** | 构建流程有文档，可提供 provenance |
| **SLSA 2** | 托管式构建服务，provenance 已签名 |
| **SLSA 3** | 源码/构建平台彼此隔离，provenance 不可伪造 |
| **SLSA 4** | 双人评审、封闭且可复现的构建 |

**新项目的目标：SLSA 2-3。** GitHub Actions + sigstore provenance + 可复用工作流。

### 8.3 依赖安全

| 层面 | 工具 |
|---|---|
| Go | `govulncheck`（官方，源自 NVD） |
| npm | `npm audit`、**Dependabot**、Snyk |
| 容器镜像 | `trivy`、`grype` |
| 源代码 | Snyk Code、**GitHub CodeQL**、Semgrep |

**锁文件**（`go.sum`、`package-lock.json`）**必须提交**。

### 8.4 依赖混淆 / 抢注

npm 私有包要统一使用自己的 `org` 命名空间（`@yourorg/foo`）。
从公共 registry 拉取名为 "foo" 的包前，先确认它是否可信。

在引入新依赖之前先看：

- 维护者（谁写的？）
- 最后一次提交（若接近两年没更新就要警惕）
- 下载量
- 是否有明确的 LICENSE
- 使用 `socket.dev` 之类的专门评分服务

### 8.5 可复现构建

Go 中使用 CGO_ENABLED=0、`-trimpath`、`-buildid=`、`-mod=readonly`。
这样无论在哪台机器上构建，产物哈希都一致。

### 8.6 标准映射

- NIST SP 800-218 SSDF（安全软件开发框架）
- SLSA v1.0
- CISA Secure by Design Pledge
- OWASP SCVS（软件组件验证标准）

---

## 9. 日志、监控与事件响应

### 9.1 该记录什么

**必须记录（NIST 800-92 / NIST CSF DE.AE）：**

- 认证事件（成功、失败、锁定、MFA 绕过）
- 授权拒绝（403）
- 管理操作（配置变更、角色分配、用户创建/删除）
- 敏感数据访问（PII 查看、导出）
- 支付 / 财务交易
- 异常流量（5xx 激增、错误率激增、请求速率过高）
- 应用启动/停止、部署事件

**格式：** 结构化（JSON），遵循 OpenTelemetry 语义约定：

- `service.name`、`service.version`
- `user.id`、`tenant.id`、`request.id`
- `event.name`（例如 `auth.login.success`）
- `severity_number`、`severity_text`

```go
import "go.uber.org/zap"
log.Info("auth.login.success",
    zap.String("user.id", userID),
    zap.Int("tenant.id", tenantID),
    zap.String("request.id", reqID),
    zap.String("ip", ip),
)
```

### 9.2 不该记录什么

**绝不要写进日志：**

- 明文密码
- 完整卡号（PAN）
- API key、JWT、会话令牌、refresh 令牌
- 非必要的 PII（邮箱、电话、SSN）— 应做哈希 / 掩码
- 健康数据（HIPAA）

**工具：** 为 zap 的 `Encoder` 写一个包装器来脱敏 PII 字段。
在日志后端（Loki / Datadog）侧再过滤一次。

### 9.3 日志完整性

- 防篡改：WORM 存储（AWS S3 Object Lock），或基于区块链的审计
  （大多数情况下属于过度设计）。
- 日志要转发到应用之外的机器 — 这样即使主机被攻陷，本地磁盘上的日志也无法被抹除。

### 9.4 监控 / SIEM

| 技术栈 | 示例 |
|---|---|
| 开源 | Loki + Grafana + Tempo + Mimir |
| SaaS | Datadog、New Relic、Honeycomb |
| 企业 SIEM | Splunk、Elastic SIEM、Sentinel、Chronicle |

**告警（NIST CSF DE.AE-5）：**

- 1 分钟内 100+ 次登录失败 → critical
- 新地理位置 / 新设备的管理员登录 → high
- 数据库查询耗时激增 → medium
- 5xx 比例 >5% → critical

### 9.5 事件响应（NIST SP 800-61r2）

**六个阶段：**

1. **准备** — IR 预案、runbook、联系人
2. **检测与分析** — 告警路由、分级
3. **遏制** — 隔离，阻止扩散
4. **根除** — 消除根因
5. **恢复** — 恢复服务
6. **事后** — 复盘、总结经验

**IR 预案模板（三页足矣）：**

- 值班轮换（PagerDuty / Opsgenie）
- 决策树（谁有权决定遏制措施）
- 沟通渠道（状态页、客户通知 SLA — **GDPR：72 小时**，PCI 24 小时内通知银行）
- 复盘模板（时间线、根因、行动项）
- 桌面推演 — 每季度一次，用于检验「如何发现长期潜伏的攻击」之类的问题。

### 9.6 标准映射

- NIST SP 800-92（日志管理）
- NIST SP 800-61r2（事件处置）
- NIST CSF 2.0 Detect / Respond / Recover
- ISO 27001:2022 A.5.24–A.5.30

---

## 10. 隐私与合规

### 10.1 隐私设计（GDPR 第 25 条）

- **数据最小化** — 只收集必要的数据。
- **目的限制** — 不得超出收集目的使用。
- **存储限制** — 到期后删除（DSR — 数据主体请求）。
- **被遗忘权** — 用户提出请求时要有可执行的处理流水线。
- **数据保护影响评估（DPIA）** — 当新功能会处理 PII 时进行。

### 10.2 合规版图

| 法规 | 适用对象 | 在本模板中 |
|---|---|---|
| **GDPR**（欧盟） | 任何有欧盟用户的应用 | DSAR（主体访问请求）、DPO 联系人、72 小时泄露通知 |
| **CCPA / CPRA**（加州） | 营收 $25M+、10 万条记录以上 | "Do not sell my data" 选择退出 |
| **PCI DSS 4.0** | 银行卡支付 | 卡数据网络隔离；优先做令牌化 |
| **HIPAA** | 美国健康数据 | BAA 合同、静态加密、访问日志 |
| **SOC 2** | B2B SaaS、企业销售 | CC1–CC9 控制（安全、可用性、保密性、处理完整性、隐私） |
| **ISO/IEC 27001:2022** | 国际 | 附录 A 的 93 项控制 |
| **NIS2**（欧盟） | 关键基础设施 | 欧盟能源 / 医疗 / 数字基础设施 |
| **LGPD**（巴西） | 巴西用户 | 与 GDPR 类似 |
| **PIPEDA / Law 25**（加拿大/魁北克） |  |  |
| **蒙古国《个人信息保护法》**（2021） | 有蒙古用户 | 同意、传输、72 小时通知 |

### 10.3 数据分级

| 级别 | 示例 | 存储要求 |
|---|---|---|
| 公开 | 市场文案 | 任意位置 |
| 内部 | 员工电话表 | 需认证 |
| 机密 | 客户数据 | 加密、访问日志 |
| 受限 | 支付数据、健康数据 | KMS、令牌化、审计日志 |

在 schema 中给各列做分级 — 编写 `pgaudit` 规则时会用到。

### 10.4 跨境传输

欧盟 → 美国：**EU-US Data Privacy Framework**（2023 年起，Schrems II 之后）。
标准合同条款（SCCs）要提前签好。

### 10.5 标准映射

- ISO/IEC 27701（隐私信息管理）
- NIST Privacy Framework
- OWASP Privacy Risks Top 10
- ENISA 隐私与数据保护设计指南

---

## 11. AI/LLM 安全

如果集成了 LLM。**OWASP Top 10 for LLM Applications (2023)**：

| LLM# | 条目 | 在本模板中 |
|---|---|---|
| LLM01 提示词注入 | 用户输入使系统提示词失效 | 输入净化、消息通道分离 |
| LLM02 不安全的输出处理 | 未经校验就执行 LLM 输出的 HTML/SQL/代码 | 输出校验、沙箱 |
| LLM03 训练数据投毒 | 微调数据被对抗性污染 | 沙箱化训练、数据溯源 |
| LLM04 模型 DoS | Token 炸弹 | 限流、token 预算 |
| LLM05 供应链 | 模型文件完整性 | 对模型制品使用 Sigstore |
| LLM06 敏感信息泄露 | 模型在正常输出中泄露 PII | 差分隐私、PII 检测护栏 |
| LLM07 不安全的插件设计 | 插件 → 任意代码执行 | 插件白名单、沙箱 |
| LLM08 过度自主权 | 给 LLM 过多执行权限 | 人在回路、限定范围的工具 |
| LLM09 过度依赖 | 不加校验就相信 LLM 输出 | UX 免责说明、校验 |
| LLM10 模型窃取 | 权重被盗 | 访问控制、水印 |

**本模板不含 LLM。** 若日后加入：

- 以**结构化 JSON** 形式发送提示词 — 而不是字符串拼接。
- 用**分隔符隔离**用户输入（`<user_input>...</user_input>`）。
- LLM 的工具调用要以**独立的 API 角色**执行 — 认证与租户约束继续生效。

---

## 12. 安全测试

| 类型 | 工具 | 在 CI 中 |
|---|---|---|
| **SAST** | `gosec`、`semgrep`、**CodeQL**（公开仓库免费）、Snyk Code | 合并前 |
| **DAST** | OWASP ZAP、Burp Suite、**StackHawk** | 每晚 / staging |
| **SCA**（依赖） | `govulncheck`、Dependabot、Snyk、Socket | 每个 PR |
| **容器** | `trivy`、`grype`、Snyk Container | 每次构建 |
| **密钥** | `gitleaks`、`trufflehog`、GitHub secret scanning | pre-commit + push 保护 |
| **IaC** | `checkov`、`tfsec`、`kics` | 每个 PR |
| **许可证** | `fossa`、`oss-review-toolkit` | 每季度 |
| **Fuzz** | Go 1.18+ 的 `go test -fuzz=` | 用于各类库 |
| **变异测试** | `gremlins.dev` | 防止覆盖率造成的错觉 |
| **浏览器** | Mozilla Observatory、securityheaders.com | 每季度 |

**渗透测试：**

- 生产上线前做一次第三方渗透测试。
- 每年复测一次。
- **漏洞赏金**（HackerOne / Bugcrowd / Intigriti）— 公开范围要写清楚。

**红队 / 紫队：**

- 每年 1–2 次。
- 用 MITRE ATT&CK 的 TTP 编写剧本。
- 评估蓝队的检测能力。

### 12.1 标准映射

- OWASP Testing Guide（OTGv5）
- NIST SP 800-115（信息安全测试技术指南）
- PTES（渗透测试执行标准）

---

## 13. 密码学

**黄金法则：「Don't roll your own crypto.」** 只使用标准库。

### 13.1 算法建议（NIST SP 800-131A r2 + OWASP 2024）

| 用途 | ✅ 正确 | ❌ 过时 |
|---|---|---|
| 密码哈希 | Argon2id、bcrypt（cost 10+）、scrypt | 直接用 MD5、SHA-256、SHA-1 |
| 对称加密 | **AES-256-GCM**、**ChaCha20-Poly1305** | AES-CBC（padding oracle）、DES、3DES、RC4 |
| 哈希 | SHA-256、SHA-3、BLAKE2 | MD5、SHA-1 |
| HMAC | HMAC-SHA-256 |  |
| 非对称 | **Ed25519**（签名）、**X25519**（密钥交换）、**ECDSA P-256+** | RSA <2048、DSA |
| KDF | HKDF-SHA-256、scrypt | PBKDF1 |
| TLS | TLS 1.3（默认）、1.2 兜底 | TLS 1.0/1.1、所有 SSL |

### 13.2 随机数

```go
import "crypto/rand"  // ✅
import "math/rand"    // ❌ 绝不用于机密！
```

令牌 / nonce / salt — 必须用 `crypto/rand`。

### 13.3 后量子准备

**2024 年 8 月 NIST PQC** 标准已定稿：

- **ML-KEM**（FIPS 203）— 密钥封装
- **ML-DSA**（FIPS 204）— 数字签名
- **SLH-DSA**（FIPS 205）— 基于哈希的签名

**混合 TLS**（Cloudflare 的 X25519+Kyber768）已经在生产中落地。
请为长期使用的签名密钥制定到 2030 年前迁移到 PQC 的计划
（警惕「现在收割、日后解密」的攻击）。

### 13.4 密钥管理生命周期（NIST SP 800-57）

- **生成：** 在 HSM 或云 KMS 内部完成。
- **分发：** 只走 TLS。
- **存储：** 绝不放明文文件；tmpfs 同样不推荐（内存转储风险）。
- **轮换：** 定期 + 事件驱动。
- **销毁：** 加密粉碎（删除密钥 = 数据不可恢复）。

### 13.5 标准映射

- NIST FIPS 140-3（密码模块验证）
- NIST SP 800-57、800-131A
- OWASP Cryptographic Storage Cheat Sheet

---

## 14. 路线图 — 以 OWASP ASVS Level 衡量

每个阶段的「完成」都对应明确的 ASVS 条款：

### 阶段 1 — ASVS L1 基线（所有应用）

- [ ] 全站 HTTPS + HSTS preload
- [ ] Argon2id / bcrypt 密码哈希
- [ ] 参数化查询（配置 sqlc）
- [ ] 安全 cookie（HttpOnly + Secure + SameSite=Lax），移动端则用 Keychain
- [ ] 安全响应头（CSP nonce、HSTS、COOP/COEP/CORP 等）
- [ ] CORS 严格来源白名单
- [ ] 后端输入校验（go-playground/validator）
- [ ] `.gitignore` + `gitleaks` pre-commit
- [ ] 密钥管理器（至少用云 KMS）
- [ ] 结构化日志（不含 PII）
- [ ] CI 中的容器扫描（`trivy`）
- [ ] CI 中的 `govulncheck` + `npm audit`
- [ ] **DPIA 阈值**检查 — 是否在处理 PII

### 阶段 2 — ASVS L2（生产级 SaaS）

- [ ] 限流（登录 + API，按 IP+账户）
- [ ] 支持 **MFA（TOTP）**
- [ ] Refresh 令牌轮换 + 重用检测
- [ ] CSP strict-dynamic + Trusted Types
- [ ] WAF（Cloudflare/AWS WAF）+ OWASP CRS
- [ ] 加密备份 + 每月恢复演练
- [ ] 集中式日志 + 告警（SIEM 或等价方案）
- [ ] CI 中的 SAST + DAST（CodeQL + ZAP baseline）
- [ ] **租户隔离测试**（跨租户返回 404）
- [ ] Postgres RLS 上的 tenant_id
- [ ] 每次发布生成 SBOM
- [ ] 镜像签名（cosign）
- [ ] **事件响应预案**（三页文档）
- [ ] 隐私政策 + Cookie 同意（符合 GDPR）

### 阶段 3 — ASVS L3 / 企业级（银行、医疗、政府）

- [ ] 支持 **WebAuthn / Passkey**
- [ ] 管理员使用硬件安全密钥（YubiKey）
- [ ] PII 的**字段级加密**（信封加密、KMS）
- [ ] 移动端**证书固定** + App Attest / Play Integrity
- [ ] 每年一次外部渗透测试
- [ ] 漏洞赏金计划
- [ ] 内部服务 mTLS
- [ ] 零信任网络（BeyondCorp / IAP）
- [ ] **SLSA L3** 构建 provenance
- [ ] **SOC 2 Type II** 审计
- [ ] **ISO 27001:2022** 认证
- [ ] 桌面推演 / 红队演练（每季度）
- [ ] 数据驻留控制（按地区存储）
- [ ] 后量子混合 TLS

---

## 15. 资源

### 标准与框架

- **OWASP**：[Top 10](https://owasp.org/Top10)、[ASVS v4](https://owasp.org/www-project-application-security-verification-standard/)、[API Top 10 2023](https://owasp.org/API-Security/)、[MASVS](https://mas.owasp.org)、[LLM Top 10](https://genai.owasp.org/)、[Cheat Sheet Series](https://cheatsheetseries.owasp.org)
- **NIST**：[CSF 2.0](https://www.nist.gov/cyberframework)、[SP 800-63B Digital Identity](https://pages.nist.gov/800-63-3/sp800-63b.html)、[SP 800-218 SSDF](https://csrc.nist.gov/Projects/ssdf)、[SP 800-207 Zero Trust](https://csrc.nist.gov/publications/detail/sp/800-207/final)
- **CIS Controls v8** — [cisecurity.org](https://www.cisecurity.org/controls)
- **ISO/IEC 27001:2022** — A.5–A.8 控制族
- **MITRE ATT&CK** — [attack.mitre.org](https://attack.mitre.org)
- **SLSA** — [slsa.dev](https://slsa.dev)
- **CISA Secure by Design** — [cisa.gov/secure-by-design](https://www.cisa.gov/secure-by-design)

### 工具（优先免费 / 开源）

- SAST：gosec、semgrep、CodeQL
- DAST：OWASP ZAP
- SCA：govulncheck、Dependabot、OSV-Scanner
- 容器：trivy、grype、syft、cosign
- 密钥：gitleaks、trufflehog
- IaC：checkov、tfsec、kics
- 渗透测试框架：Metasploit、Burp Community

### 延伸阅读

- 《Crafting Interpreters》— Robert Nystrom（输入解析）
- 《Web Application Hacker's Handbook》— Stuttard, Pinto
- 《Designing Data-Intensive Applications》— Martin Kleppmann
- 《The Tangled Web》— Michał Zalewski（浏览器安全）
- 《Real-World Cryptography》— David Wong

---

## 黄金原则

1. **纵深防御** — 单一防线永远不够。WAF + 应用校验 + 数据库 RLS + 租户隔离 +
   审计日志 — 必须协同工作。
2. **最小权限** — 用户、服务、数据库角色都不应拥有超出工作所需的权限。
3. **安全地失败** — 出错时系统应当「关闭」而非「敞开」。`default deny`。
4. **不要自己造密码学** — 只用 NIST/IETF 推荐的库。
5. **记录一切重要的，不记录任何敏感的。** 在采集入口就做 PII 脱敏。
6. **左移，安全交付** — 把安全前置到 CI，未经检查的代码不得发布。
7. **假设已被攻破** — 从「如果你已经被盯上」的角度做设计。
   横向移动能被限制到什么程度？
8. **安全是过程，不是功能** — 不是一次性配置，需要持续评审与更新。

---

> **箴言：** 最安全的系统是根本不存在的系统。但只要按上述顺序推进 —
> 生产环境中那些早已可以避免的漏洞类别所带来的风险，可以被封住 **95% 以上**。
> 至于剩下的 5%，请持续更新威胁模型、做渗透测试与监控，一直走下去。
