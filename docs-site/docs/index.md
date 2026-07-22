# Government Developer Portal

> **Аппдаа үндэсний eID нэвтрэлт нэм** — аппаа бүртгэж, `client_id`-гаа аваад,
> баталгаажсан хэрэглэгчийн мэдээллийг стандарт OpenID Connect claim-аар хүлээн ав.

**Government Developer Portal** ([developer.dgov.mn](https://developer.dgov.mn))
нь аппликейшндээ үндэсний цахим үнэмлэг (eID)-ийн нэвтрэлтийг **OAuth2 /
OpenID Connect**-ээр нэмэх хөгжүүлэгчийн портал юм. Нэг ч нууц үг хадгалахгүй,
хувийн мэдээлэл цуглуулахгүй — зөвхөн баталгаажсан identity-г хүлээн авна.

!!! tip "Нээлттэй эх (Open Source)"
    Энэхүү платформ бол **нээлттэй эх** төсөл — эх кодыг бүрэн эхээр нь үзэж,
    fork хийж, өөрийн байгууллагадаа ашиглаж болно.
    :material-github: [GitHub дээр үзэх](https://github.com/gerege-systems/developer-dgov-mn)

<div class="grid cards" markdown>

- :material-rocket-launch: **[Түргэн эхлэл](quickstart.md)**  
  Апп бүртгэлээс эхний баталгаажсан claim хүртэл — 5 минутад. `curl` жишээтэй.

- :material-shield-key: **[Апп холбох (OAuth2 / OIDC)](sso-integration.md)**  
  Authorization code + PKCE урсгал, refresh token, logout — бүрэн интеграцийн
  гарын авлага.

- :material-api: **[API лавлагаа](api-reference.md)**  
  Endpoint-ууд, scope, claim, токены шалгалт (introspection), rate limit, алдааны формат.

- :material-draw-pen: **[eID Service Proxy ба гарын үсэг](eid-services.md)**  
  Хэрэглэгчийн eID мэдээллийг proxy-оор авах, баримтад цахим гарын үсэг (PAdES)
  зуруулах API.

</div>

## Юу авах вэ?

| Чадвар | Тайлбар |
|---|---|
| **eID нэвтрэлт** | Хэрэглэгч eID апп руу push мэдэгдэл эсвэл QR-аар баталгаажина |
| **Стандарт OIDC** | Discovery, JWKS, RS256 id_token — дурын OIDC сантай нийцнэ |
| **PKCE (S256)** | Public (mobile/SPA) client-д RFC 9700 дагуу PKCE заавал |
| **Баталгаат claim** | `name`, `email`, `national_id`, `register_number` гэх мэт |
| **Гарын үсгийн API** | eID итгэмжлэлээр PAdES PDF гарын үсэг — өөрийн гэрчилгээгүйгээр |
| **Зөвшөөрлийн дэлгэц** | Consent + санах логик бэлэн — та юу ч хийхгүй |

## Экосистем

| Домэйн | Үүрэг |
|---|---|
| **developer.dgov.mn** | Энэ портал — хөгжүүлэгчийн консол + OIDC провайдер (issuer) |
| **sso.dgov.mn** | Government SSO — eID Relying Party цөм (eID креденшл эзэмшдэг) |
| **eidmongolia.mn** | Үндэсний eID үйлчилгээ (цахим үнэмлэхийн апп) |

Таны апп **developer.dgov.mn**-ий OIDC урсгалаар нэвтрэлт авна; портал нь eID
Mongolia-тай харилцах ажлыг бүрэн хариуцдаг тул та eID креденшл эзэмших
шаардлагагүй.

!!! tip "Хаанаас эхлэх вэ?"
    [Түргэн эхлэл](quickstart.md) — консолд нэвтэрч аппаа бүртгээд эхний
    токеноо 5 минутад аваарай.
