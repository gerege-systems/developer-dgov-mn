# eID Mongolia — 新增 RP 侧端点的请求

> 🌐 [Монгол](EID_ENDPOINT_REQUESTS.md) · **中文**

> ✅ **已实现 · 历史存档（2026-07-17）。** 本文档所请求的 RP 侧端点已在上游 eID
> 平台实现，并已在 RP 侧投入使用。实时客户端调用位于
> `backend/pkg/eid/eid_pki.go`（`PersonSummary`、`PersonCertificates`、
> `PersonDevices`、`PersonActivity`）以及组织的添加/移除
> （`AddRepresentation`/`RemoveRepresentation`，`backend/pkg/eid/eid.go`）；
> 在 RP API 上以
> `/api/v1/users/me/eid/{summary,certificates,devices,activity,organizations}`
> 的形式对外提供。本文档作为**历史记录**保留 — 下文各节都标注了实现状态。

> 请求方：**sso.gerege.mn**（RP UUID `c4f371c3-20bd-462e-8d97-5bc4a20fde08`）
> 接收方：**eID Mongolia platform**（`gerege-systems/eid-platform-mn`）
> 日期：2026-07-04 · API 基址：`https://eidmongolia.mn/v3`

## 目标

我们希望在 RP（依赖方）侧为公民搭建一个内容丰富的**控制面板**：
证书数量（有效/已吊销）、登录/签署历史与次数、已绑定设备、所代表的组织、e-Seal。
其中部分数据现有的 RP 端点已经能够提供；另一部分则**需要新的 RP 侧端点**。
本文档记录现有能力，并以明确的请求形式提出缺失的端点。

所有建议的端点都假定与 v3 一致，使用 `Authorization: Bearer <rp_sk_…>` +
`relyingPartyUUID/Name` 的认证方式。

---

## A. 现有能力（用 RP Bearer 即可工作 — 已验证）

| 能力 | 端点 | 响应 |
|--------|----------|-------|
| 登录时的证书 + 身份 | session `COMPLETE` 中的 `person` + `cert.value`（DER） | civil_id、姓名、证书等级、X.509 |
| 所代表的组织 | `GET /v3/organization/representations/etsi/{personEtsi}` | `RepresentationsResponse{ representations[] }` |
| 组织的 e-Seal 证书 | `GET /v3/seal/certificate/{orgEtsi}` | `SealCertificateResponse`（serial、subjectDn、notBefore/After、level） |
| e-Seal 签发 / 盖章 | `POST /v3/seal/certificate/{orgEtsi}`、`POST /v3/seal/{orgEtsi}` | 需要 `SEAL` 权限 |
| 某台设备是否处于活动状态 | `GET /v3/device-status`（`X-Device-Token`） | 仅限调用方**自己**的设备 |

→ **这些 RP 现在即可直接使用**（例如用 representations 搭建「所代表的组织」板块）。

---

## B. 新请求的 RP 侧端点

### 1. 证书列表 / 数量 — `GET /v3/certificates/etsi/{personEtsi}`

**状态：✅ 已实现** — `PersonCertificates`（`backend/pkg/eid/eid_pki.go`）→
`GET /api/v1/users/me/eid/certificates`。

**原因：** 在个人资料页展示「有效 N、无效 M、共 K 张证书」以及证书列表。
目前 RP 只能看到登录时的那**一张**证书。

**建议的响应：**

```json
{
  "personEtsi": "PNOMN-...",
  "certificates": [
    {
      "documentNumber": "…",
      "type": "AUTH | SIGN | SEAL",
      "serialNumber": "…",
      "certificateLevel": "ADVANCED | QUALIFIED | QSCD",
      "status": "VALID | REVOKED | EXPIRED | SUSPENDED",
      "notBefore": "RFC3339",
      "notAfter": "RFC3339",
      "issuerDn": "…"
    }
  ]
}
```

**隐私：** 属于公民 PII，因此 —（a）仅凭近期成功的 auth session id 放行，
或（b）在向 RP 授予专门的 `CERTIFICATES_READ` 权限后开放。
RP 作用域版本（仅与该 RP 相关的证书）更为合适。

### 2. 活动历史 / 次数（RP 作用域）— `GET /v3/rp/activity/etsi/{personEtsi}`

**状态：✅ 已实现** — `PersonActivity`（`backend/pkg/eid/eid_pki.go`）→
`GET /api/v1/users/me/eid/activity`。

**原因：** 在控制面板/安全页展示「登录：N，签署：M」的计数以及最近的 session。

**查询参数：** `?flow=AUTHENTICATION|SIGNATURE&limit=20&offset=0`

**建议的响应：**

```json
{
  "personEtsi": "PNOMN-...",
  "counts": { "authentication": 42, "signature": 7 },
  "sessions": [
    { "sessionId": "…", "flow": "AUTHENTICATION", "outcome": "OK", "timestamp": "RFC3339" }
  ]
}
```

**备注：** `GET /v3/mobile/activity/{documentNumber}` 已经存在，
但**仅对手机应用**开放（App Attest + `X-Device-Token`），且是全局的（涵盖所有 RP）。
若要向 RP 开放，需要一个**只返回该 RP 自身 session** 的 RP 作用域、
RP-Bearer 版本（以免泄露其他 RP 的信息）。

### 3. 已绑定设备 — `GET /v3/devices/etsi/{personEtsi}`

**状态：✅ 已实现** — `PersonDevices`（`backend/pkg/eid/eid_pki.go`）→
`GET /api/v1/users/me/eid/devices`。

**原因：** 在安全板块列出公民已登记的活动设备（"Linked devices"）。

**建议的响应：**

```json
{
  "personEtsi": "PNOMN-...",
  "devices": [
    { "documentNumber": "…", "platform": "iOS | Android", "model": "…",
      "enrolledAt": "RFC3339", "lastSeenAt": "RFC3339", "active": true }
  ]
}
```

**备注：** `/v3/device-status` 只能用 `X-Device-Token` 检查调用方**自己**的一台设备 —
没有办法向 RP 列出公民的全部设备。

### 4.（可选）组织登记 / 绑定的 RP 流程

**状态：✅ 已实现** — `AddRepresentation`/`RemoveRepresentation`
（`backend/pkg/eid/eid.go`）→ `GET/POST/DELETE /api/v1/users/me/eid/organizations`。

**原因：** 让公民能在 RP 内部登记/绑定自己所代表的组织。目前这只能由
**admin** 完成（`POST /v3/admin/organizations` + `/representatives`）。
**请求：** 开放一个基于授权的 RP 侧流程，或把从 RP 发起组织登记的推荐流程文档化。

---

## C. 横向要求（适用于所有新端点）

- **隐私/授权模型：** 每个端点都应明确说明它是 RP 作用域的、由新鲜的 auth session
  把守的，还是需要专门的 RP 权限（如 `SEAL`）。我们更倾向于 RP 作用域 + 明确的权限授予。
- **认证：** 与 v3 一致，`Authorization: Bearer <rp_sk_…>` + `relyingPartyUUID`。
- **分页：** activity/certificates 需要 `limit`/`offset` 或 cursor。
- **Well-known：** 把新端点加入 `.well-known/eid` 的 `endpoints` map。
- **ETSI 标识：** person 用 `PNOMN-<civilId>`，org 用 `NTRMN-<register>`
  （与现行约定保持一致）。

---

## D. 依赖（RP 侧均已就绪）

sso.gerege.mn 一旦拿到上述数据即可展示：
个人资料页的 eID 身份 + 证书（已实现），以及后续的证书数量、
auth/sign 计数、已绑定设备、组织等板块。端点每开放一项，
我们就会将其加入自己的 `pkg/eid` 客户端，并丰富相应页面。
