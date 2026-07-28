# Түргэн эхлэл

> Локал дээр бүтэн стекийг өргөж, eID-ээр нэвтрэх хүртэл ~5 минут.

## Шаардлага

| Хэрэгсэл | Хувилбар | Тэмдэглэл |
|---|---|---|
| Go | 1.26+ | зөвхөн backend-ийг гараар ажиллуулах бол |
| Node.js | 20+ | зөвхөн frontend-ийг гараар ажиллуулах бол |
| Docker + Compose | сүүлийн | **зөвлөж буй зам** — бүх стекийг нэг командаар |
| PostgreSQL / Redis | 15+ / 7+ | Docker ашиглавал шаардлагагүй |

## 1. Хамгийн хурдан зам — Docker Compose

```bash
git clone https://github.com/gerege-systems/public-gerege-template.git
cd public-gerege-template
docker compose up -d --build
```

Энэ нь `db` · `redis` · `migrate` (нэг удаагийн) · `api` · `web` үйлчилгээг өргөнө.
Дараа нь **<http://localhost:3000>** нээнэ.

!!! note "Migration автоматаар ажиллана"
    `migrate` үйлчилгээ `up` бүрд ажиллаж, хэрэгжсэн migration-ийг алгасдаг тул
    дахин ажиллуулахад аюулгүй (idempotent).

## 2. Гараар ажиллуулах (хөгжүүлэлт)

=== "Backend"

    ```bash
    cd backend
    cp internal/config/.env.example internal/config/.env
    # JWT_SECRET (≥32 тэмдэгт), DB, Redis, EID_* RP креденшлээ тохируул
    go run ./cmd/api          # → http://localhost:8080
    ```

=== "Frontend"

    ```bash
    cd frontend
    cp .env.example .env.local     # BACKEND_URL=http://localhost:8080
    npm install
    npm run dev                    # → http://localhost:3000
    ```

## 3. Нэвтрэх

Нүүр хуудсан дээрх **eID-ээр нэвтрэх**-ийг сонгоод дараах гурван замын аль нэгийг ашиглана:

- **QR код** — компьютер дээрх QR-ыг eID мобайл аппаар уншуулна.
- **App2App** — утсан дээрээ шууд eID апп руу үсэрнэ.
- **Регистрийн дугаар** — РД оруулбал апп руу push мэдэгдэл очно.

Google холболт нь түүний креденшл тохируулагдсан үед л харагдана.

!!! tip "eID креденшлгүй туршихад"
    `EID_*` тохируулаагүй үед нэвтрэлт ажиллахгүй. Зөвхөн UI/архитектурыг үзэх
    зорилготой бол backend-ийн unit тестүүд (`go test ./...`) FakeEID stub
    ашигладаг тул тэндээс урсгалыг харж болно.

## 4. Шалгах

```bash
cd backend && go test ./...     # unit тест (mock, хурдан)
cd frontend && npm run build    # build + lint + typecheck (CI-тэй ижил)
```

CI-ийн бүх шалгуурыг локалд давтах:

```bash
cd backend && make pre-push     # lint + test + swag drift + build
```

## Дараа нь

<div class="grid cards" markdown>

- :material-layers: **[Архитектур](architecture.md)** — давхаргууд, dependency урсгал
- :material-shield-key: **[Нэвтрэлт](authentication.md)** — eID + SSO урсгал
- :material-connection: **[Апп холбох](sso-integration.md)** — өөрийн аппаа RP болгох
- :material-cog: **[Тохиргоо](configuration.md)** — env хувьсагчийн лавлагаа

</div>
