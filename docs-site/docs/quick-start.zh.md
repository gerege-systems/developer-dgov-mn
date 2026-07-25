# 快速开始

> 从克隆代码到在完整技术栈上完成一次 eID 登录，大约五分钟。

## 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Go | 1.26+ | 仅在直接运行后端时需要 |
| Node.js | 20+ | 仅在直接运行前端时需要 |
| Docker + Compose | 较新版本 | **推荐** — 一条命令启动整套技术栈 |
| PostgreSQL / Redis | 15+ / 7+ | 使用 Docker 时无需单独安装 |

## 1. 最快路径 — Docker Compose

```bash
git clone https://github.com/gerege-systems/template-gerege-mn.git
cd template-gerege-mn
docker compose up -d --build
```

该命令会启动 `db` · `redis` · `migrate`（一次性任务）· `api` · `web`，
随后打开 **<http://localhost:3000>**。

!!! note "数据库迁移自动执行"
    `migrate` 服务在每次 `up` 时运行，并跳过已应用的迁移，因此重复运行是安全的（幂等）。

## 2. 手动运行（开发模式）

=== "后端"

    ```bash
    cd backend
    cp internal/config/.env.example internal/config/.env
    # 设置 JWT_SECRET（≥32 个字符）、数据库、Redis 以及您的 EID_* RP 凭据
    go run ./cmd/api          # → http://localhost:8080
    ```

=== "前端"

    ```bash
    cd frontend
    cp .env.example .env.local     # BACKEND_URL=http://localhost:8080
    npm install
    npm run dev                    # → http://localhost:3000
    ```

## 3. 登录

在首页选择 **使用 eID 登录**，然后可用以下三种方式之一：

- **二维码** — 用 eID 手机应用扫描桌面端显示的二维码。
- **App2App** — 在同一部手机上直接跳转到 eID 应用。
- **登记号** — 输入登记号，推送通知会发送到 eID 应用。

只有在配置了 Google 凭据后，Google 绑定入口才会显示。

!!! tip "没有 eID 凭据时如何试用"
    在未设置 `EID_*` 时无法完成登录。如果您只想查看界面和架构，
    后端单元测试（`go test ./...`）会通过 FakeEID 桩件驱动整套流程。

## 4. 验证

```bash
cd backend && go test ./...     # 单元测试（使用 mock，速度快）
cd frontend && npm run build    # 构建 + lint + 类型检查（与 CI 一致）
```

在本地完整复现 CI 的各道关卡：

```bash
cd backend && make pre-push     # lint + 测试 + swag 漂移检查 + 构建
```

## 接下来

<div class="grid cards" markdown>

- :material-layers: **[架构](architecture.md)** — 分层与依赖流向
- :material-shield-key: **[身份认证](authentication.md)** — eID + SSO 流程
- :material-connection: **[应用接入](sso-integration.md)** — 让您的应用成为 RP
- :material-cog: **[配置](configuration.md)** — 环境变量参考

</div>
