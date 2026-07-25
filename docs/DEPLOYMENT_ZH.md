# 部署指南

> 🌐 [English](DEPLOYMENT.md) · [Монгол](DEPLOYMENT_MN.md) · **中文** · [Русский](DEPLOYMENT_RU.md)

本文说明如何把 **Gerege Template Platform V3.0**（Төр, хувийн хэвшлийн
үйлчилгээний суурь платформ）— 一套用于构建数字服务的生产就绪基础平台 —
用 Docker Compose 部署到单台 VPS 并置于 nginx 之后。下文的步骤以平台的旗舰参考部署
**DAN-Gerege SSO**（sso.gerege.mn）作为示例。技术栈为
Postgres + Redis + Go API + Next.js BFF web + **Ory Hydra**
（把 dan 变成 SSO 提供方的 OIDC issuer）。这就是该参考部署所使用的操作手册。

## 拓扑

对外发布三个主机回环端口；nginx 终结 TLS 并把各自反向代理到正确的容器。
`db` 与 `redis` 从不离开内部 compose 网络，而 Hydra 的 **admin** API 仅绑定回环
（绝不代理）。

```
Internet ──► nginx (80/443, 经 Let's Encrypt 的 TLS)
   │
   ├─ /oauth2/*, /.well-known/openid-configuration, /userinfo, /health/ready
   │      ─────────────────────────► hydra  127.0.0.1:${HYDRA_PUBLIC_PORT}   (Ory Hydra — OIDC issuer, PUBLIC API)
   │
   ├─ /rp/sign/*  （面向第三方依赖方的 eID 签署中继）
   │      ─────────────────────────► api    127.0.0.1:${API_RELAY_PORT}      (后端 :8080, 回环中继)
   │
   └─ 其余全部 — 应用、BFF /api/*，以及 OIDC 登录/授权界面
      (/oauth/login, /oauth/consent, /oauth/logout, /oauth/error)
          ─────────────────────────► web    127.0.0.1:${WEB_PORT}            (Next.js BFF)
                                       │ BACKEND_URL=http://api:8080
                                       ▼
   内部 compose 网络（无对外主机端口）:
        api ──► db (Postgres 16 — gerege_template + hydra 两个数据库) + redis (7)
        hydra ──► db (hydra 数据库)   admin :4445 = 仅回环，绝不代理
        hydra-migrate（一次性）、migrate（一次性）— 应用数据库结构后退出
```

因此 `web` **并非**唯一对外暴露的容器：nginx 还必须承接 Hydra 的公共 API（`:4444`）
和 api 的签署中继（`:8091`）。浏览器访问 `web` 获取应用及其 BFF；
OIDC 协议端点由 Hydra 提供；而 OAuth 的*登录/授权*页面
（由 dan 在用 eID 完成公民认证后自行渲染）位于 `web` 的 `/oauth/*` 下。
一次性的 `migrate` 容器会在每次 `up` 时应用 SQL 迁移；`hydra-migrate`
则把 Hydra 自身的结构应用到独立的 `hydra` 数据库后退出。

## 前置条件

- 一台装有 Docker + compose 插件的 VPS（`docker compose version`）
- 主机上的 nginx + certbot（或任何能终结 TLS 的反向代理）
- 一条指向该服务器的 `sso.gerege.mn` DNS 记录

## 1. 获取代码

```bash
git clone https://github.com/gerege-systems/dan-dgov-mn.git /srv/dan
cd /srv/dan
```

## 2. 创建两个环境文件（均已加入 gitignore）

### `./.env` — compose 变量插值

所有由 compose 插值的内容都放在这里。标记为 **REQUIRED** 的 Hydra 密钥在
`docker-compose.yml` 中使用 `${VAR:?}`，因此若它们未设置或为空，
**compose 会拒绝启动**。

```env
# --- Postgres / Redis ---
POSTGRES_USER=postgres            # 超级用户 — 仅供 migrate + hydra-migrate 使用
POSTGRES_PASSWORD=<random>
POSTGRES_DB=gerege_template
APP_DB_USER=app_user              # api 连接所用的最小权限角色
APP_DB_PASSWORD=<random>
APP_DB_DSN=host=db port=5432 user=app_user password=<same> dbname=gerege_template sslmode=disable
REDIS_PASS=<random>

# --- 应用 / 来源 ---
APP_ORIGIN=https://sso.gerege.mn    # 精确的公开 origin（CSRF 来源校验）
WEB_PORT=3007                     # nginx 把应用代理到的回环端口
API_RELAY_PORT=8091               # nginx 把 /rp/sign 代理到的回环端口（api :8080）

# --- Ory Hydra（OIDC issuer） ---
HYDRA_PUBLIC_PORT=4444            # nginx 把 OIDC 公共 API 代理到的回环端口
HYDRA_ADMIN_PORT=4445             # Hydra admin API — 绑定回环，绝不代理
HYDRA_PUBLIC_URL=https://sso.gerege.mn          # REQUIRED — OIDC issuer / 自身 URL
HYDRA_POST_LOGOUT_REDIRECT=https://sso.gerege.mn/   # 可选；默认为 HYDRA_PUBLIC_URL/
HYDRA_SYSTEM_SECRET=<≥32 个随机字符>          # REQUIRED — Hydra system secret
HYDRA_COOKIE_SECRET=<≥32 个随机字符>          # REQUIRED — Hydra cookie secret
HYDRA_PAIRWISE_SALT=<random>                  # REQUIRED — pairwise subject 盐值

# --- web BFF 使用的 OAuth client id/secret（留空 = 对应按钮/卡片失效） ---
GOOGLE_CLIENT_ID=<…>              # Google 账户绑定（backend.env 中也要设置）
GOOGLE_DRIVE_CLIENT_ID=<…>        # 第三方集成；令牌交换由 BFF 完成，
GOOGLE_DRIVE_CLIENT_SECRET=<…>    # 因此这些 secret 也放在这里。
DROPBOX_CLIENT_ID=<…>             # redirect_uri = ${APP_ORIGIN}/api/integrations/<provider>/callback
DROPBOX_CLIENT_SECRET=<…>
GOOGLE_MEET_CLIENT_ID=<…>
GOOGLE_MEET_CLIENT_SECRET=<…>
```

### `./backend.env` — 挂载到 `api` + `migrate` 的 `/app/.env`

这是后端配置文件（由 viper 读取）。它携带 eID 依赖方凭据、SSO/OIDC 提供方设置
以及各项集成密钥。完整的结构见 `backend/internal/config/config.go`；
对 eID SSO 部署起关键作用的键：

```env
# --- 核心运行时 ---
PORT=8080
ENVIRONMENT=development           # compose 技术栈以开发模式运行：内部数据库没有 TLS
                                  #（生产守卫要求 sslmode=verify-full）；
                                  # TLS 在 nginx 处终结
DEBUG=false
DB_POSTGRE_DRIVER=postgres
DB_POSTGRE_DSN=postgres://postgres:<POSTGRES_PASSWORD>@db:5432/gerege_template?sslmode=disable
                                  # ^ 超级用户 DSN — 供 MIGRATE（DDL）使用。
                                  # api 会用 APP_DB_DSN 覆盖它（见 §3）。
JWT_SECRET=<≥32 个随机字符>
JWT_EXPIRED=24                    # 小时（1–24）
JWT_ISSUER=sso.gerege.mn
JWT_REFRESH_EXPIRED=7             # 天
BCRYPT_COST=12
OTP_MAX_ATTEMPTS=5
REDIS_HOST=redis:6379
REDIS_PASS=<与 .env 相同>
REDIS_EXPIRED=5                   # 分钟
ALLOWED_ORIGINS=https://sso.gerege.mn
TRUSTED_PROXIES=172.16.0.0/12,127.0.0.1   # 只信任来自 docker 网络 + nginx 的 XFF。
                                  # 位于代理之后时为必填：api 没有对外的应用端口，
                                  # 请求都来自 web/nginx 这一对端。若没有可信代理列表，
                                  # api 会忽略 X-Forwarded-For，所有按 IP 的限流
                                  # 都会塌缩成同一个桶。

# --- eID 依赖方（唯一的交互式登录方式） ---
EID_BASE_URL=https://eidmongolia.mn/v3   # eID IdP 基址（默认）
EID_RP_UUID=<eID Mongolia 签发的 RP UUID>
EID_RP_NAME=dan-dgov-mn
EID_RP_SECRET=<RP secret>
EID_CERT_LEVEL=ADVANCED           # 登录用 ADVANCED（签署用 QUALIFIED/QSCD）
EID_CALLBACK_URL=https://sso.gerege.mn/login/verify   # 必须在 IdP 处加入白名单
EID_DISPLAY_TEXT=sso.gerege.mn

# --- Google OAuth（eID 账户绑定；服务端 code 交换） ---
GOOGLE_CLIENT_ID=<…>
GOOGLE_CLIENT_SECRET=<…>

# --- dgov SSO 消费方（sso.gerege.mn OIDC — 与 eID 并列的第二种登录） ---
SSO_ISSUER=https://sso.gerege.mn
SSO_CLIENT_ID=<…>
SSO_CLIENT_SECRET=<…>
SSO_REDIRECT_URI=https://sso.gerege.mn/sso/callback
SSO_SCOPE=openid profile email
SSO_NATIVE_CLIENT_ID=dan-dgov-mn-ios   # 移动端 PKCE 流程的 Hydra client_id

# --- OIDC 提供方侧（dan 以 Ory Hydra 为后端充当 SSO issuer） ---
HYDRA_ADMIN_URL=http://hydra:4445      # admin API（客户端 CRUD + 登录/授权/登出）
HYDRA_PUBLIC_URL=https://sso.gerege.mn   # 构建重定向所用的 issuer
SSO_STATE_KEY=<≥32 个随机字符>          # 登录/授权 state cookie 的 HMAC 密钥
SSO_FIRSTPARTY_CLIENTS=<逗号分隔的 client_id>   # 这些客户端跳过授权确认页
SSO_ADMIN_API_KEYS=<逗号分隔的引导密钥>          # /admin 能力面的引导密钥
SSO_ADMIN_SUBS=<逗号分隔的 eid_sub>              # 被授予超级管理员的 eid_sub

# --- Gerege 平台服务 ---
XYP_API_BASE=https://xyp.dgov.mn       # 组织查询（HTTP Basic；可选）
XYP_CLIENT_ID=<…>
XYP_CLIENT_SECRET=<…>
CORE_API_BASE=https://core.gerege.mn     # 用户/组织查找
CORE_API_TOKEN=<服务 bearer>
GSPACE_HOST=<sftp 主机>                # Gerege Space 按用户的 SFTP 存储（可选）
GSPACE_PORT=22
GSPACE_USER=<…>
GSPACE_PASSWORD=<…>
GSPACE_BASE_PATH=gerege-space
GSPACE_QUOTA_BYTES=2097152             # 每用户 2 MB

# --- 加密 / 签署 / 可观测性 ---
INTEGRATION_ENC_KEY=<≥32 个随机字符>   # 存储 OAuth 令牌所用的 AES-256-GCM 密钥
SIGN_RELAY_TOKEN=<共享令牌>            # 为第三方 RP 启用 /rp/sign 中继（留空 = 关闭）
SIGN_SIGNER_CERT_FILE=/app/certs/signer.crt   # PAdES document-signer 证书（生产：必填，
SIGN_SIGNER_KEY_FILE=/app/certs/signer.key    #  fail-closed；开发环境回退到自签名）
OBSERVABILITY_TOKEN=<random>           # 生产环境中 /metrics + /swagger/doc.json 的 bearer
GEMINI_API_KEY=<AIza…>                 # AI 功能；留空 = AI 端点返回 500
```

可用 `openssl rand -hex 24` 生成密钥（`≥32` 的键用 `-hex 32`）。
`SIGN_SIGNER_CERT_FILE` / `SIGN_SIGNER_KEY_FILE` 是容器**内部**的路径 —
若设置了它们，请把 PEM 文件挂载进去（例如给 `api` 服务加一个只读卷）；
在 compose 开发栈中它们可以留空，签署器会使用开发用的自签名密钥。

## 3. 为何需要两个数据库角色（首次启动前必读）

行级安全会被超级用户**静默绕过**。因此本技术栈使用两个角色：

- `migrate`（以及 `hydra-migrate`）以 `POSTGRES_USER` 连接（超级用户 —
  `CREATE EXTENSION`、RLS DDL 以及创建 `hydra` 数据库都需要它）。
- `api` 以 `APP_DB_USER`（`NOSUPERUSER NOBYPASSRLS`）连接，
  该角色在**空数据卷首次初始化时**由
  `backend/deploy/initdb/10-create-app-user.sh` 自动创建。
  第二个 initdb 脚本 `20-create-hydra-db.sh` 会为 Ory Hydra 创建独立的
  `hydra` 数据库。

api 会**在启动时校验这一点**：如果它的角色是超级用户/BYPASSRLS，
生产模式下会启动失败，开发模式下记录告警。若你要部署到*已有*数据库上，
请手工创建应用角色与授权（参见 initdb 脚本），创建 `hydra` 数据库
（`docker compose exec db psql -U "$POSTGRES_USER" -c 'CREATE DATABASE hydra;'`），
并把 `APP_DB_DSN` 指向该应用角色。

## 4. 首次部署

```bash
docker compose up -d --build      # 构建 api+web，运行两个 migrate 任务，启动全部服务
docker compose ps                 # 预期：db/redis/api/web/hydra 处于 healthy 或 running，
                                  #       migrate + hydra-migrate 为 Exited (0)
```

### nginx vhost（主机）

OIDC issuer 相关路径必须到达 Hydra，`/rp/sign` 必须到达 api 中继，
其余全部走 `web`。Hydra 的 admin 端口（`:4445`）**绝不**列在这里。

```nginx
upstream dan_web   { server 127.0.0.1:3007; }   # = WEB_PORT
upstream dan_hydra { server 127.0.0.1:4444; }   # = HYDRA_PUBLIC_PORT
upstream dan_relay { server 127.0.0.1:8091; }   # = API_RELAY_PORT（api :8080）

server {
    server_name sso.gerege.mn;

    # OIDC 协议端点 → Ory Hydra 公共 API
    location /oauth2/                         { proxy_pass http://dan_hydra; include /etc/nginx/proxy_params; }
    location = /userinfo                      { proxy_pass http://dan_hydra; include /etc/nginx/proxy_params; }
    location /.well-known/openid-configuration { proxy_pass http://dan_hydra; include /etc/nginx/proxy_params; }
    location = /.well-known/jwks.json         { proxy_pass http://dan_hydra; include /etc/nginx/proxy_params; }

    # 面向第三方依赖方的 eID 签署中继 → api 回环中继
    location /rp/sign/                        { proxy_pass http://dan_relay; include /etc/nginx/proxy_params; }

    # 应用、BFF /api/*，以及 /oauth/login|consent|logout 界面 → web BFF
    location / {
        proxy_pass http://dan_web;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

（把共用的 `proxy_set_header` 行放进 `/etc/nginx/proxy_params` 并 `include`，
或在每个 block 中重复。）随后执行 `certbot --nginx -d sso.gerege.mn` 配置 TLS。
compose 文件设置了 `COOKIE_SECURE=true`，且 Hydra 以
`SERVE_COOKIES_SAME_SITE_MODE=None` 运行（需要 `Secure`），
因此站点**必须**通过 HTTPS 提供服务，否则浏览器会丢弃认证与 OIDC cookie。

## 5. 更新运行中的部署

```bash
cd /srv/dan
git pull --ff-only origin main
docker compose build              # api + web + migrate
docker compose up -d              # 重建有变化的容器；migrate + hydra-migrate 会重跑
                                  #（已应用的迁移会被跳过）
```

`db` 与 `redis` 保持运行 — 数据不受影响。只改了配置？
编辑 `backend.env` / `.env` 后执行 `docker compose up -d api web`
（若改了 `HYDRA_*` 的值，也要重启 `hydra`）。

### 自动化部署（CI/CD）

部署**不是** CI 内部的一个 job。两个工作流串联：

1. [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — 预检关卡
   （`backend`、`frontend`、`secrets-scan`）在每次推送到 `main` 和每个 PR 上运行。
2. [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — 一个**独立**
   工作流，由 `workflow_run` 在 **CI 完成之后**触发，因此 CI 与 Deploy 不再并行，
   构建失败也绝不会发版。它只在串联的 CI 运行在 `main` 上得出 `success` 时部署
   （或通过手动 `workflow_dispatch`）。它以专用的非 root `deploy` 用户 SSH 登入 VPS，
   `git reset --hard` 到 CI 通过的那个精确提交，并运行
   [`deploy/deploy.sh`](../deploy/deploy.sh)（重建 → `up -d` → 等待 healthy → prune）。
   `db`/`redis` 保持运行；迁移会重跑并跳过已应用的文件。

一次性配置 — 在 **Settings → Secrets and variables → Actions** 下添加以下仓库 secret：

| Secret | 值 |
|--------|-------|
| `DEPLOY_HOST` | VPS 的 IP / 主机名 |
| `DEPLOY_USER` | 专用的**非 root** SSH 用户（`deploy`），拥有仓库检出目录并能运行 docker |
| `DEPLOY_PATH` | 服务器上的仓库路径；未设置时 `deploy.yml` 默认为 `/srv/dan` |
| `DEPLOY_SSH_KEY` | 专用部署密钥对的**私钥**；其公钥位于服务器的 `~/.ssh/authorized_keys` |
| `DEPLOY_PORT` | *（可选）* SSH 端口，默认 `22` |

用 `ssh-keygen -t ed25519 -f deploy_key -N ''` 生成密钥对，把 `deploy_key.pub`
追加到 `deploy` 用户的 `authorized_keys`，并把私钥 `deploy_key` 粘贴到
`DEPLOY_SSH_KEY`。你也可以在 Actions 标签页无代码变更地触发部署
（**Run workflow** — `workflow_dispatch` 会部署 `origin/main` 的 HEAD），
或在服务器上手动执行 `bash deploy/deploy.sh`。

## 6. 验证

```bash
docker compose ps                                       # 全部 healthy / migrate 任务 Exited(0)
docker logs dan-dgov-mn-migrate-1 | tail -3             # "migration [up] success"
docker logs dan-dgov-mn-hydra-migrate-1 | tail -3       # Hydra 结构已应用
docker logs dan-dgov-mn-api-1 2>&1 | grep -i error      # 应为空
curl -s -o /dev/null -w '%{http_code}\n' https://sso.gerege.mn/   # 200
curl -s https://sso.gerege.mn/.well-known/openid-configuration | head -c 80   # OIDC issuer JSON
```

## 7. 回滚

```bash
git log --oneline                 # 找到最后一个良好提交
git checkout <commit> -- .        # 或：git reset --hard <commit>
docker compose build && docker compose up -d
```

在本流程中 SQL 迁移是只向前的；若必须回滚某个迁移，
请在把代码退回到它之前先手工应用对应的 `N_*.down.sql`。

## 密钥卫生

- `.env` 与 `backend.env` 已加入 gitignore — 绝不要提交它们。
- 轮换 `JWT_SECRET` 可强制所有人登出（所有令牌失效）。
- 轮换 `HYDRA_SYSTEM_SECRET` / `HYDRA_COOKIE_SECRET` 会使现有的 OIDC 会话与授权失效 —
  请与下游依赖方协调。
- 请在各自的控制台轮换 `GEMINI_API_KEY` 以及 OAuth / `EID_RP_SECRET` /
  `CORE_API_TOKEN` 等凭据，更新 `backend.env` / `.env` 后执行
  `docker compose up -d api web`。

---

**Gerege Template Platform V3.0** — 由 **Gerege Systems 开发团队**与 **Claude AI** 共同打造，2026。
