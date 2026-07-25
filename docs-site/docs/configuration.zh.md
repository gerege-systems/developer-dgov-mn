# 配置（环境变量）

> 所有配置都通过环境变量完成。权威示例见
> [`backend/.env.example`](https://github.com/gerege-systems/template-dgov-mn/blob/main/backend/.env.example)。

!!! danger "切勿提交密钥"
    `backend/internal/config/.env*`、根目录的 `.env` 和 `backend.env` 全部已
    **加入 gitignore**。新增变量时，请在各 README 中记录该变量 — 但绝不要记录它的值。

## 核心

| 变量 | 示例 | 用途 |
|---|---|---|
| `PORT` | `8080` | API 监听端口 |
| `ENVIRONMENT` | `production` | 开启严格的生产守卫 |
| `DEBUG` | `false` | 详细日志 |
| `ALLOWED_ORIGINS` | `https://template.dgov.mn` | CORS 白名单（逗号分隔；禁止 `*`） |
| `TRUSTED_PROXIES` | — | 反向代理地址 |

## 数据库与 Redis

| 变量 | 用途 |
|---|---|
| `DB_POSTGRE_DSN` / `DB_POSTGRE_URL` | 连接字符串 |
| `DB_MAX_OPEN_CONNS`、`DB_MAX_IDLE_CONNS`、`DB_CONN_MAX_LIFE_MINS` | 连接池调优 |
| `REDIS_HOST`、`REDIS_PASS`、`REDIS_EXPIRED` | Redis 连接与 TTL |

!!! warning "生产环境的 DSN 必须使用 `sslmode=verify-full`"
    生产守卫强制要求这一点。Docker Compose 技术栈之所以刻意以
    `ENVIRONMENT=development` 运行，是因为其内部数据库没有启用 TLS。

!!! danger "API 不得以超级用户身份连接数据库"
    只有当应用以最小权限角色连接时，RLS 才会真正生效。在生产环境中，
    超级用户或带 `BYPASSRLS` 的角色会导致启动失败。

## JWT 与会话

| 变量 | 用途 |
|---|---|
| `JWT_SECRET` | **≥32 个字符。** 修改它会使所有会话失效 |
| `JWT_EXPIRED`、`JWT_REFRESH_EXPIRED` | access / refresh 的有效期 |
| `JWT_ISSUER` | 通常为应用域名。修改它会使所有已签发令牌失效 |

## eID（依赖方 RP）

| 变量 | 用途 |
|---|---|
| `EID_BASE_URL` | eID Mongolia `/v3` 基址（或 SSO 签署中继） |
| `EID_RP_UUID`、`EID_RP_SECRET` | RP 凭据 |
| `SIGN_RELAY_TOKEN` | 签名中继的共享令牌（留空则停用） |

## Government SSO（RP 侧 — 本应用作为客户端）

| 变量 | 示例 | 用途 |
|---|---|---|
| `SSO_ISSUER` | `https://sso.dgov.mn` | 未设置时默认为此值 |
| `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` | — | 留空则 SSO 流程不会启用 |
| `SSO_REDIRECT_URI` | `https://template.dgov.mn/sso/callback` | 必须在 SSO 客户端上**完全一致**地注册 |
| `SSO_SCOPE` | `openid profile email nationalid` | `nationalid` 会附带公民登记号 |
| `SSO_NATIVE_CLIENT_ID` | — | 移动端（PKCE，公开客户端）流程使用的客户端 |
| `SSO_EID_PROXY_BASE_URL` | — | 设置后，eID PKI 相关接口将经由 SSO 代理 |

!!! note "未注册的客户端会返回 `invalid_client`"
    如果提供方的客户端库中不存在 `SSO_CLIENT_ID`，authorize 步骤会返回
    `{"error":"invalid_client"}`。重定向 URI 也必须完全一致。

## OIDC 提供方侧（本应用作为提供方）

| 变量 | 用途 |
|---|---|
| `OAUTH_ISSUER` | 例如 `https://template.dgov.mn`。**只有**设置该变量时提供方才会启用 |
| `SSO_STATE_KEY` | 登录/授权临时 state 的 HMAC 密钥（**≥32 字节**） |
| `SSO_FIRSTPARTY_CLIENTS` | 跳过授权确认页的第一方客户端 |
| `SSO_ADMIN_API_KEYS`、`SSO_ADMIN_SUBS` | 管理 API 访问权限 |

## 第三方与存储

| 变量 | 用途 |
|---|---|
| `GEMINI_API_KEY` | AI 流水线。缺少它时 `/ai/*` 会返回真实的 500 |
| `GOOGLE_CLIENT_ID` / `SECRET` | Google 绑定（留空时按钮隐藏） |
| `VERIFY_API_BASE`、`VERIFY_API_KEY`、`VERIFY_CHANNEL` | 公民 / 组织信息核验 |
| `XYP_API_BASE`、`XYP_CLIENT_ID`、`XYP_CLIENT_SECRET` | 国家登记系统查询 |
| `GSPACE_*` | 应用自有的 SFTP 存储（按用户配额） |
| `INTEGRATION_ENC_KEY` | **≥16 字节。** 用于加密 OAuth 令牌和超级管理员 MFA |

!!! danger "INTEGRATION_ENC_KEY 是必填项"
    各部署**必须**配置该密钥，且一经设置就**绝不能更改** —
    轮换它会破坏此前加密的所有数据。

## 可观测性

| 变量 | 用途 |
|---|---|
| `OTEL_EXPORTER`、`OTEL_SAMPLE_RATIO` | OpenTelemetry 链路追踪 |
| `OBSERVABILITY_TOKEN` | 生产环境中把关 `/metrics` 与 `/swagger` 的 bearer 令牌 |

## 前端

| 变量 | 用途 |
|---|---|
| `BACKEND_URL` | BFF 调用的**内部**地址（例如 `http://api:8080`） |

!!! warning "在共享网络中名称 `api` 可能冲突"
    当多套技术栈共用同一个 Docker 网络时，`http://api:8080` 可能解析到另一个容器，
    从而使每个 `/api/v1/*` 调用都变成 404。此时请把 `BACKEND_URL` 固定为
    您自己 api 容器的完整名称。
