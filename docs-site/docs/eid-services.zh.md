# eID 服务代理

已注册的应用可通过**代理**代表其用户调用 **Gerege SSO** 的 eID 服务。
SSO 会根据令牌的 subject 识别用户，并用**自己的** eidmongolia.mn RP 凭据获取数据 —
因此各应用无需持有 eID 凭据。

## 两类服务

| 服务 | 公开路径 | 端点 |
|---|---|---|
| **`eid-proxy`**（个人） | `https://sso.gerege.mn/rp/eid/*` | `summary` · `certificates` · `devices` · `activity` |
| **`eid-org-proxy`**（组织） | `https://sso.gerege.mn/rp/eid-org/*` | `organizations` · `organizations/{regNo}/signers` |

全部为**只读**（GET）。个人服务与组织服务分组独立，便于管理员分别管理。

## 调用代理

```bash
GET https://sso.gerege.mn/rp/eid/summary
Authorization: Bearer <该用户的 SSO access token>
```

响应即为该用户的 eID 数据（由 SSO 用其 RP 凭据获取）。

## 授权

应用必须被**授予**该服务。授权体现为客户端 OAuth2 允许 scope 中的**服务 scope**
（`svc:eid-proxy` / `svc:eid-org-proxy`）— 在管理界面把服务授予应用即会添加该 scope。

每次请求时 SSO 会：

1. 内省令牌（RFC 7662）→ 得到 `active` + `sub`。
2. 按令牌的 `client_id` 查找客户端，检查是否已被授予该服务 scope
   （检查的是**当前**授权状态，因此授予/撤销即刻生效）。
3. 由 `sub` 解析出用户，并从 eID Mongolia 获取数据。

| 条件 | 响应 |
|---|---|
| 无令牌 / 已过期 | `401` |
| 应用未被授予该服务 | `403` |
| 服务在网关中被停用 | `503` |
| 成功 | `200` + 数据 |

!!! tip "如何授予？"
    管理 → 应用 → 选中该应用 → 勾选 **eid-proxy** / **eid-org-proxy** → 保存。
    未获授权的应用会收到 403。详情参见 [API 网关](api-gateway.md)。

## 运行时开关

两个服务都注册在 **API 网关目录**中，可在管理端网关界面中运行时
**启用/停用**（停用后返回 `503`）。可以只关闭个人 eID 而保持组织 eID 继续工作（彼此独立）。
