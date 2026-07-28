# Gerege Template Platform V3.0 — Desktop App (TemplateDesktop)

> 🌐 **Монгол** · [中文](README_ZH.md) · [Русский](README_RU.md)

> **Цахим үйлчилгээг бүтээх суурь** — _Нэг суурь — төр, хувийн хэвшлийн бүх үйлчилгээ._

**Gerege Template Platform V3.0**-ийн **desktop клиент**. Энэ бол Electron
бүрхүүл — платформын web интерфейсийг **1:1** ачаалж, хөтчийн оронд native
цонх, цэс, товчлол, эрхийн бодлого нэмнэ.

> **Юуг нь дахин бичээгүй вэ:** хуудас, урсгал, дизайн, i18n, BFF — бүгд
> `frontend/`-ийн яг тэр код. Desktop тал нь өөрийн UI-гүй тул web дээр гарсан
> шинэчлэлт **дахин build хийхгүйгээр** аппад шууд тусна.

Одоогийн дэмжигдсэн платформ нь **macOS 12+**. Windows/Linux-ийн суурь тохиргоо
`electron-builder.yml`-д бэлдсэн боловч туршигдаагүй.

## Архитектур

```
┌────────────────────────────┐
│  TemplateDesktop (Electron)│  цонх · цэс · шилжилтийн бодлого · эрх
│  ┌──────────────────────┐  │
│  │ Chromium BrowserWindow│ │  →  https://template.gerege.mn  (Next.js BFF)
│  └──────────────────────┘  │           │
└────────────────────────────┘           └→  Go API (/api/v1/*) — апп шууд хандахгүй
```

- Апп **backend-тэй шууд харьцахгүй** — бүх хүсэлт web аппын BFF-ээр явна.
- Session нь **httpOnly cookie** (`dgov_access` / `dgov_refresh`). Chromium-ы
  cookie сав нь `userData` дотор тогтвортой хадгалагдана — апп хаагаад нээхэд
  нэвтэрсэн хэвээр байна.
- CSRF, Origin шалгалт, CSP — бүгд web талын хэвээрээ. Desktop нь ямар ч
  токен барихгүй, JS рүү нэвтрүүлэхгүй.

### Цонхны preload

Preload нь ачаалж буй хуудасны схемээр хоёр өөр гүүр тавина:

| Хуудас | Схем | Гүүр | Чадвар |
|---|---|---|---|
| Web апп | `https:` | `window.geregeDesktop` | зөвхөн уншигдах тэмдэглэгээ (`isDesktop`, `platform`, `appVersion`) |
| Дотоод хуудас | `file:` | `window.geregeShell` | сервер солих, дахин ачаалах, цонх хаах |

Алсын агуулга бүрхүүлийн IPC-д **хэзээ ч** хүрэхгүй. Main процесс нь IPC бүрийг
илгээгчийн `file://` хаягаар давхар шалгадаг (`src/main.ts` → `fromInternalPage`).

### Шилжилтийн бодлого (`src/policy.ts`)

| Хаяг | Үйлдэл |
|---|---|
| Аппын өөрийн origin | цонхон дотор |
| `*.gerege.mn`, `eidmongolia.mn`, `accounts.google.com`, `*.dropbox.com` | цонхон дотор — OAuth callback нь аппын cookie сав руу буцах ёстой |
| Бусад `http(s)` (баримт бичиг, GitHub, dgov.mn) | системийн хөтчөөр |
| `mailto:`, `geregesmartid://` гэх мэт | үйлдлийн систем рүү |
| `javascript:`, `data:`, өөр origin-ы `blob:` | бүрэн хаагдана |

`<webview>` таслагдана, төхөөрөмжийн (HID/Serial/USB) эрх хаалттай. Хөтчийн
эрхээс зөвхөн **микрофон** (AI чат · дуут мессеж · амьд орчуулга), мэдэгдэл,
бүтэн дэлгэц нээлттэй — камер, байршил хаалттай.

User-Agent-аас `Electron/…` шошго хасагддаг: Google/Dropbox зэрэг нэвтрэлтийн
үйлчилгээ уг шошготой агентыг татгалздаг. Chromium-ы жинхэнэ хувилбар үлдэнэ.

## Хөгжүүлэлт

```bash
cd desktop/TemplateDesktop
npm install

npm start        # үйлдвэрлэлийн сервер рүү (template.gerege.mn)
npm run dev      # локал frontend руу (localhost:3000) + DevTools
npm test         # шилжилт / эрхийн бодлогын тест (node --test)
npm run typecheck
```

`npm run dev`-ийг ажиллуулахын өмнө өөр терминалд `cd frontend && npm run dev`.

### Серверийг сонгох

Эрэмбэ: `GEREGE_APP_URL` орчны хувьсагч → аппад хадгалсан сонголт → `template.gerege.mn`.

Цэсээс **Сервер солих…** (`⌘⇧S`) — бэлэн сонголт эсвэл өөрийн хаяг. Сонголт
`userData/state.json`-д хадгалагдана. `GEREGE_APP_URL` тогтоогдсон бол дараагийн
ажиллагаанд түүнийг ашиглана (цонхонд анхааруулга гарна).

## Багцлах

```bash
npm run icon           # frontend/public/brand.webp → resources/icon.icns
npm run dist:mac       # release/*.dmg + *.zip (arm64 · x64), гарын үсэггүй
```

Гарын үсэггүй build нь **зөвхөн локал турших** зориулалттай — macOS Gatekeeper
"эвдэрсэн" гэж анхааруулна (`xattr -dr com.apple.quarantine "/Applications/Gerege Template.app"`
эсвэл Системийн тохиргоо → Аюулгүй байдал → "Ямар ч байсан нээх").

Тараахад Apple Developer ID шаардлагатай:

```bash
export CSC_LINK=... CSC_KEY_PASSWORD=...          # Developer ID Application гэрчилгээ
export APPLE_ID=... APPLE_APP_SPECIFIC_PASSWORD=... APPLE_TEAM_ID=...
npm run dist:mac:signed                            # signed + notarized
```

Hardened runtime, entitlements (`build/entitlements.mac.plist`) болон
`NSMicrophoneUsageDescription` нь урьдчилан тохируулагдсан.

## Файлын бүтэц

```
src/
  main.ts        аппын эхлэх цэг — session, эрх, IPC, амьдралын мөчлөг
  windows.ts     цонх үүсгэх, байрлал хадгалах, шилжилтийн бодлого тогтоох
  menu.ts        системийн цэс (монгол)
  policy.ts      цэвэр шийдвэрүүд — classifyURL, allowPermission, UA цэвэрлэгээ
  config.ts      суурь хаягууд, цагаан жагсаалт, хаяг цэгцлэх
  store.ts       userData/state.json (цонхны байрлал, сонгосон сервер)
  preload.ts     схемээс хамаарсан хоёр гүүр
  policy.test.ts бодлогын тест
static/          дотоод хуудсууд — offline.html, server.html, shell.css
build/           entitlements
resources/       icon.icns
scripts/         make-icon.sh
```

## Товчлолууд

| Товчлол | Үйлдэл |
|---|---|
| `⌘R` / `⌘⇧R` | дахин ачаалах / хүчээр |
| `⌘[` / `⌘]` | буцах / урагш (хоёр хуруутай зөөлт бас) |
| `⌘+` / `⌘-` / `⌘0` | томсгох / жижигрүүлэх / бодит хэмжээ |
| `⌘N` | шинэ цонх |
| `⌘P` | хэвлэх |
| `⌘,` | тохиргоо (`/me/settings`) |
| `⌘⇧S` | сервер солих |
| `⌘⇧H` | нүүр хуудас |

## Хязгаарлалт ба анхаарах зүйл

- **Интернэт шаардана** — офлайн горим байхгүй. Сервер хүрэхгүй бол дотоод
  офлайн хуудас гарч, "Дахин оролдох"-оор сэргэнэ (сүлжээ сэргэмэгц автоматаар).
- **Авто-шинэчлэлт байхгүй.** Web агуулга үргэлж шинэ байх тул зөвхөн бүрхүүл
  өөрчлөгдөх үед шинэ хувилбар тараана.
- `geregetemp://eid/callback` (iOS App2App гүүр) desktop дээр бүртгэгдээгүй —
  desktop-ийн eID урсгал `/auth/eid/callback`-аар явна.
- `npm audit` нь `electron-builder`-ийн шилжсэн хамаарлуудад анхааруулга өгдөг.
  Эдгээр нь **зөвхөн build хугацааны** хэрэгсэл — багцад орохгүй. Засвар нь
  electron-builder-ийн эвдрэлтэй downgrade шаарддаг тул хойшлуулав.

## Холбоотой

- [frontend/README.md](../../frontend/README.md) — web апп (эх сурвалж нь)
- [ios/TemplateApp/README.md](../../ios/TemplateApp/README.md) — iOS клиент
- [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md) — серверийн байршуулалт
