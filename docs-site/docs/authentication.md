# Нэвтрэлт (eID + OIDC)

Хэрэглэгч тань порталаар хэрхэн баталгаажих вэ:

- **eID нэвтрэлт** — цахим үнэмлэхээр (QR / App2App / РД push).
- **Google холболт** — eID баталгаажуулалтын дараа Google дансаа холбож, цаашид
  нэг товшилтоор нэвтэрнэ.
- **OIDC провайдер** — портал өөрөө OpenID Connect провайдер; таны апп
  баталгаажсан identity-г стандарт claim-аар авна.

## eID нэвтрэлт

Цахим үнэмлэхийн апп руу шууд мэдэгдэл (App2App) илгээх, эсвэл QR код уншуулна.
Порталын session нь JWT access + refresh (rotation); logout хоёуланг хүчингүй
болгоно (refresh + access deny-list). Нууц үг / и-мэйл-OTP нэвтрэлт огт байхгүй.

`sub` (subject) нь порталын **тогтвортой, opaque per-citizen танигч** (user UUID)
— нэг хэрэглэгч таны апп-д үргэлж ижил `sub`-тай ирнэ.

## OIDC провайдер

Портал нь **өөрийн Go код** дээр суурилсан OpenID Connect провайдер (гадны OAuth
сервергүй). Relying party (RP) апп-ууд нэвтрэлтээ порталд даатган, хэрэглэгчийн
баталгаажсан мэдээллийг стандарт claim-аар авна.

```mermaid
sequenceDiagram
  participant App as Таны апп (RP)
  participant Portal as developer.dgov.mn
  participant eID as eID Mongolia
  App->>Portal: /oauth2/auth?client_id&redirect_uri&scope
  Portal->>eID: eID-ээр баталгаажуулах
  eID-->>Portal: иргэн баталгаажлаа
  Portal-->>App: redirect_uri?code&state
  App->>Portal: /oauth2/token (code → access + id token)
  Portal-->>App: access_token, id_token
```

!!! tip "Нэвтрэлт бол суурь (built-in) үйлчилгээ"
    OIDC нэвтрэлт нь **бүх бүртгэгдсэн апп**-д base scope (`openid profile
    email`)-оор автоматаар үйлчилнэ. Нэвтрэлтийг per-app checkbox-оор олгодоггүй,
    хаадаггүй. Харин **нэмэлт** service-үүд (eID proxy гэх мэт) нь per-app
    зөвшөөрөл шаарддаг — [eID Service Proxy](eid-services.md)-г үз.

Апп-аа холбохын тулд [Апп холбох](sso-integration.md), эсвэл
[Түргэн эхлэл](quickstart.md)-ээс эхэл.
