# 部署

使用 **Docker Compose + nginx** 将平台部署到单台 VPS。整套技术栈为
PostgreSQL + Redis + Go API（同时也是 OIDC issuer）+ Next.js BFF。

## 前置条件

- Docker 及 compose 插件
- nginx + certbot（TLS）
- 一条指向该服务器的 DNS 记录

## 拓扑

```
Internet ──► nginx (80/443, Let's Encrypt)
   ├─ /oauth2/*, /.well-known/*, /userinfo ─► api (OIDC issuer)
   ├─ /rp/sign/*      ─► api 中继
   ├─ /rp/eid/*, /rp/eid-org/* ─► api (eID 代理)
   └─ 其余全部         ─► web (Next.js BFF) ──► api
   内部: db (Postgres 16) · redis (7)
```

## 环境文件（已加入 gitignore）

- **`.env`** — compose 变量插值（Postgres/Redis 密钥、端口、域名）。
- **`backend.env`** — API 配置（JWT_SECRET、EID_RP_*、OAUTH_ISSUER、SSO_* 等）。

!!! warning "各部署的密钥必须彼此独立"
    每套部署都必须拥有自己的 `JWT_SECRET`、`SSO_STATE_KEY` 和 RP 凭据 —
    绝不可在多套部署之间共用。

## 部署步骤

```bash
# 1) 获取代码
git clone git@github.com:gerege-systems/sso-dgov-mn.git /srv/sso-dgov-mn
cd /srv/sso-dgov-mn

# 2) 创建环境文件（.env + backend.env）

# 3) 启动整套技术栈 — migrate 会自动应用数据库结构
docker compose up -d --build

# 或者重新部署：
bash deploy/deploy.sh
```

## nginx（示例）

```nginx
server {
    server_name sso.dgov.mn;
    client_max_body_size 30m;

    location /oauth2/                           { proxy_pass http://127.0.0.1:4446; include /etc/nginx/proxy_params; }
    location = /.well-known/openid-configuration { proxy_pass http://127.0.0.1:4446; include /etc/nginx/proxy_params; }
    location = /.well-known/jwks.json            { proxy_pass http://127.0.0.1:4446; include /etc/nginx/proxy_params; }
    location = /userinfo                         { proxy_pass http://127.0.0.1:4446; include /etc/nginx/proxy_params; }

    location /rp/sign/    { proxy_pass http://127.0.0.1:8081/rp/sign/; include /etc/nginx/proxy_params; }
    location /rp/eid/     { proxy_pass http://127.0.0.1:8081/api/v1/eid/;     include /etc/nginx/proxy_params; }
    location /rp/eid-org/ { proxy_pass http://127.0.0.1:8081/api/v1/eid-org/; include /etc/nginx/proxy_params; }

    location / { proxy_pass http://127.0.0.1:3008; include /etc/nginx/proxy_params; }
    listen 443 ssl;  # 由 certbot 管理
}
```

## Compose 项目名

同一台服务器上可以并行运行多套部署。每套都必须在自己的 `.env` 中配置独立的
`COMPOSE_PROJECT_NAME`、端口和数据卷 — 否则镜像标签 / 数据卷会相互冲突。

| 部署 | 域名 | 端口（示例） |
|---|---|---|
| `sso-dgov-mn` | sso.dgov.mn | web 3008 |
| `template-dgov-mn` | template.dgov.mn | web 3009 |
