# 身份认证（eID + Government SSO）

平台支持：

- **eID 登录** — 使用电子身份证（二维码 / App2App / 按登记号推送）。
- **Google 绑定** — 在完成 eID 验证后绑定 Google 账户。
- **Government SSO（OIDC）** — 平台自身即为 OpenID Connect 提供方；各应用通过它登录。

## eID 登录

可直接向 eID 应用推送（App2App），也可扫描二维码。会话采用 JWT access + refresh
（带轮换）；登出会同时吊销二者（refresh + access 拒绝名单）。平台不提供密码或
邮箱/OTP 登录方式。

`sub`（subject）是平台为每位公民分配的**稳定且不透明的标识符**（用户 UUID），
在流程中传递给内置的 OIDC 提供方。

## Government SSO（OIDC 提供方）

平台是一个基于**自研 Go 代码**构建的 OpenID Connect 提供方。依赖方（RP）应用
将登录委托给平台，并以标准 claims 的形式获取已验证的用户信息。

```mermaid
sequenceDiagram
  participant App as 应用 (RP)
  participant SSO as sso.dgov.mn (Government SSO)
  participant eID as eID Mongolia
  App->>SSO: /oauth2/auth?client_id&redirect_uri&scope
  SSO->>eID: 通过 eID 验证
  eID-->>SSO: 公民身份已验证
  SSO-->>App: redirect_uri?code&state
  App->>SSO: /oauth2/token (code → access + id token)
  SSO-->>App: access_token, id_token
```

!!! tip "SSO 属于内置（基础）服务"
    SSO 登录会通过基础 OIDC scope（`openid profile email`）自动提供给**每一个已注册应用**。
    登录权限不按应用逐个授予或阻止。而**附加**服务（例如 eID 代理）则确实需要按应用授权 —
    参见 [eID 服务代理](eid-services.md)。

要将您的应用接入为 RP，请参阅[应用接入](sso-integration.md)。
