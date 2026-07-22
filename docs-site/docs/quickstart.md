# Түргэн эхлэл

Апп бүртгэлээс эхний баталгаажсан claim хүртэл — **5 минут**.

## 1. Консолд нэвтрэх

[developer.dgov.mn](https://developer.dgov.mn) дээр өөрийн **eID**-ээр нэвтэрнэ
(eID апп руу push мэдэгдэл эсвэл QR). Бүртгэл, нууц үг шаардлагагүй.

## 2. Апп бүртгэх

**Консол → Applications → Шинэ апп** дээр:

- **Нэр** — хэрэглэгчид зөвшөөрлийн дэлгэц дээр харагдана
- **Redirect URI** — жишээ нь `https://myapp.mn/auth/callback`
- **Төрөл** — сервертэй web апп (confidential) эсвэл mobile/SPA (public, PKCE)

Хадгалмагц `client_id`, (confidential бол) `client_secret` олгогдоно.

!!! warning "client_secret нэг л удаа харагдана"
    Secret-ийг аюулгүй газарт (secret manager) хадгал. Алдвал **rotate** хийнэ —
    хуучин нь шууд хүчингүй болно.

## 3. Discovery-г шалгах

Бүх endpoint стандарт discovery баримтад зарлагдсан:

```bash
curl https://developer.dgov.mn/.well-known/openid-configuration | jq
```

```json
{
  "issuer": "https://developer.dgov.mn",
  "authorization_endpoint": "https://developer.dgov.mn/oauth2/auth",
  "token_endpoint": "https://developer.dgov.mn/oauth2/token",
  "userinfo_endpoint": "https://developer.dgov.mn/userinfo",
  "jwks_uri": "https://developer.dgov.mn/.well-known/jwks.json",
  "scopes_supported": ["openid", "offline_access", "profile", "email", "nationalid"],
  "code_challenge_methods_supported": ["S256"]
}
```

Ихэнх OIDC сан зөвхөн issuer URL + client креденшлээр өөрийгөө тохируулдаг.

## 4. Нэвтрэлт эхлүүлэх

Хэрэглэгчээ authorize URL руу шилжүүл:

```text
https://developer.dgov.mn/oauth2/auth
  ?response_type=code
  &client_id=<CLIENT_ID>
  &redirect_uri=https://myapp.mn/auth/callback
  &scope=openid profile email
  &state=<санамсаргүй-32-тэмдэгт>
  &nonce=<санамсаргүй-32-тэмдэгт>
```

Хэрэглэгч eID-ээр баталгаажаад таны `redirect_uri` руу `?code=...&state=...`
параметртэй буцна.

## 5. Code-ийг токен болгох

```bash
curl -s https://developer.dgov.mn/oauth2/token \
  -u "<CLIENT_ID>:<CLIENT_SECRET>" \
  -d grant_type=authorization_code \
  -d code=<CODE> \
  -d redirect_uri=https://myapp.mn/auth/callback | jq
```

```json
{
  "access_token": "...",
  "id_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

## 6. Баталгаажсан claim авах

```bash
curl -s https://developer.dgov.mn/userinfo \
  -H "Authorization: Bearer <ACCESS_TOKEN>" | jq
```

```json
{
  "sub": "8b1c...",
  "name": "Бат-Эрдэнэ",
  "family_name": "Доржийн",
  "email": "bat@example.mn",
  "email_verified": true
}
```

🎉 **Боллоо!** Хэрэглэгч тань eID-ээр баталгаажсан, та нэг ч нууц үг хадгалаагүй.

## Дараагийн алхам

- [Апп холбох](sso-integration.md) — PKCE, refresh token, logout-ын бүрэн урсгал
- [API лавлагаа](api-reference.md) — бүх endpoint, scope, claim
- [eID Service Proxy ба гарын үсэг](eid-services.md) — eID өгөгдөл + PAdES гарын үсэг
