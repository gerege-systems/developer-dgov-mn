# Gerege Template Platform V3.0

> **构建数字服务的基础** — 一套可直接投入生产、经过安全加固的全栈平台，
> 政府部门与私营企业的任何数字服务都可在其上构建。

**Gerege Template Platform V3.0** 是*面向公共部门与私营部门数字服务的基础平台*。
您只需专注创造价值，而不必搭建底层管道 — 身份认证、安全、AI 和服务骨架从第一天起就已备好。

!!! tip "开源项目"
    本平台是**开源**项目 — 您可以完整阅读源码、fork 它，并为自己的机构部署运行。
    :material-github: [在 GitHub 上查看](https://github.com/gerege-systems/public-gerege-template)

<div class="grid cards" markdown>

- :material-shield-key: **eID + Gerege SSO**  
  基于电子身份证（eID）的登录 + OpenID Connect（内置 Go provider）单点登录服务。
  应用一键即可接入。

- :material-layers: **整洁架构（Clean Architecture）**  
  Go（chi · net/http · pgx，无 ORM）后端 + Next.js 15 BFF 前端。分层清晰，易于扩展。

- :material-account-network: **eID 服务代理**  
  已注册的应用通过授权（代理）调用 SSO 的 eID 服务 — 自身无需持有 eID 凭据。

- :material-tune: **管理员可控的 API 网关**  
  服务目录、按应用授权、遥测数据 — 全部在管理系统中完成。

</div>

## 生态构成

平台由若干相互独立的服务组成：

| 域名 | 角色 |
|---|---|
| **sso.gerege.mn** | Gerege SSO — OIDC 提供方 + eID 依赖方（持有 eID 凭据） |
| **template.gerege.mn** | 示例应用 — Gerege SSO 的依赖方（通过 SSO 登录） |

诸如 `template.gerege.mn` 之类的应用通过 **sso.gerege.mn** 登录，并经由代理调用已授权的
eID 服务。只有 SSO 持有与 eID Mongolia 通信的 RP 凭据，因此各应用无需承担这份安全负担。

## 核心能力

- **身份认证** — eID（二维码 / App2App / 按登记号推送）+ Google 绑定 + Gerege SSO（OIDC）。
- **OIDC 提供方** — 基于自研 Go 代码；应用可使用 `Sign in with Gerege SSO`。
- **eID PKI 档案** — 组织、证书、设备、活动记录。
- **文件签署（PAdES）** — 第三方应用通过 eID 签署中继完成签名。
- **eID 服务代理** — 个人（`eid-proxy`）与组织（`eid-org-proxy`）分别授权。
- **API 网关** — 服务目录、按应用授权、请求遥测。
- **AI 助手（Gemini）** — 聊天、语音、翻译。
- **RBAC 与超级管理员**、**审计日志**、**安全加固**（RLS、CSP、HSTS、CSRF）。

!!! tip "从哪里开始？"
    要将您的应用接入 Gerege SSO，请参阅[应用接入](sso-integration.md)。
    要通过代理获取 eID 数据，请参阅 [eID 服务代理](eid-services.md)。
