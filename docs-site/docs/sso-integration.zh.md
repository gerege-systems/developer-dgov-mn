# 应用接入（Gerege SSO / OIDC RP）

将您的应用接入为 **Gerege SSO（sso.gerege.mn）** 的依赖方。用户点击登录后会被重定向到
sso.gerege.mn，用 eID 完成认证，然后返回您的应用。

## 1. 将应用注册为 RP 客户端

有两种方式：

=== "管理界面"

    在 **管理 → 应用 → 新建应用** 中填写名称、重定向 URI 和标签后保存。
    通过复选框授予您需要的 eID 服务（例如 eid-proxy）。
    随后您会获得 `client_id` / `client_secret`。

=== "命令行辅助脚本"

    在服务器上，`register-rp.sh` 会同时正确设置登录重定向**和**登出后重定向 URI
    （这样登出流程才不会失败）：

    ```bash
    cd /srv/sso-dgov-mn
    ./scripts/register-rp.sh "My app" https://myapp.dgov.mn
    # → 输出 client_id + client_secret
    #   redirect_uri            = https://myapp.dgov.mn/sso/callback
    #   post_logout_redirect_uri= https://myapp.dgov.mn/
    ```

## 2. 应用配置

如果您的应用基于本模板构建，请在 `backend.env` 中设置：

```env
SSO_ISSUER=https://sso.gerege.mn
SSO_CLIENT_ID=<client_id>
SSO_CLIENT_SECRET=<client_secret>
SSO_REDIRECT_URI=https://myapp.dgov.mn/sso/callback
SSO_SCOPE=openid profile email
```

## 3. 登录流程

1. 用户点击 **“Sign in with Gerege SSO”** → `/api/auth/sso/start`。
2. 后端 `/sso/start` 创建 state（存于 Redis），构建 `sso.gerege.mn/oauth2/auth`
   的 authorize URL，并将浏览器重定向过去。
3. 用户在 sso.gerege.mn 上用 eID 完成认证。
4. sso.gerege.mn 重定向回 `https://myapp.dgov.mn/sso/callback?code&state`。
5. 后端 `/sso/callback` 用 code 换取令牌，按 `sso_sub` upsert 该公民，
   并签发本应用自己的会话（JWT）。

## 4. 登出

由 RP 发起的登出会重定向到 `sso.gerege.mn/oauth2/sessions/logout`，并带上
`id_token_hint` 和 `post_logout_redirect_uri`。该登出后 URI 必须**已在客户端上注册**
（`register-rp.sh` 会自动设置）。

!!! warning "务必注册登出后重定向 URI"
    如果某个应用只注册了登录重定向，登出会失败并提示
    *“post_logout_redirect_uri is not whitelisted”*。`register-rp.sh` 与管理界面
    都会同时设置登录**和**登出后 URI，因此不会出现该错误。

## 授予附加服务

除登录之外，若您的应用还需要 SSO 的**附加**服务（例如 eID 代理），
则由管理员将该服务授予此应用。参见 [eID 服务代理](eid-services.md)
与 [API 网关](api-gateway.md)。
