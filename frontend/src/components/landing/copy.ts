// Gerege Template Platform V3.0
// Gerege Systems Development Team & Claude AI, 2026
//
// Gerege Template Platform V3.0 — «Цахим үйлчилгээг бүтээх суурь» нүүр
// (landing) хуудасны маркетингийн текст — mn / en / zh / ru дөрвүүлээ. Апп-ын
// үндсэн dict (lib/i18n.ts)-ийг бөглөхгүйн тулд landing-ийн урт мөрүүдийг энд
// төвлөрүүлэв. Бүх түлхүүр дөрвөн хэлэнд адил байх ёстой (i18n.ts-тэй нэг
// зарчим).

import type { Lang } from '@/lib/i18n';

export interface LandingCopy {
  /** Брэнд нэр (nav + footer). Хоосон бол 'Gerege Template Platform V3.0'. Theme-ээр солино. */
  brand?: string;
  nav: { features: string; security: string; tech: string; docs: string; login: string };
  hero: {
    badge: string;
    titleLead: string;
    titleAccent: string;
    titleTail: string;
    lede: string;
    ctaLogin: string;
    ctaExplore: string;
    stackLabel: string;
    stats: { value: string; label: string }[];
  };
  advantages: {
    heading: string;
    sub: string;
    eidTag: string;
    eidTitle: string;
    eidBody: string;
    googleTitle: string;
    googleBody: string;
    secTitle: string;
    secBody: string;
    ssoTitle: string;
    ssoBody: string;
    signTitle: string;
    signBody: string;
    consentTitle: string;
    consentBody: string;
  };
  tech: {
    heading: string;
    sub: string;
    backendTitle: string;
    backendBody: string;
    frontendTitle: string;
    frontendBody: string;
    aiTitle: string;
    aiBody: string;
    trustTitle: string;
    trustBadge: string;
    trustItems: string[];
  };
  everything: { heading: string; sub: string; items: { title: string; body: string }[] };
  cta: { title: string; sub: string; ctaLogin: string; ctaExplore: string; tagline: string };
  footer: { tagline: string; links: string[]; copyright: string };
  /** Нүүрийн баруун доод буланд хөвөх AI туслахын виджет (нэвтрэлтгүй). */
  chat: {
    /** Хөвөгч товчны tooltip / aria-label. */
    open: string;
    close: string;
    title: string;
    /** Гарчгийн доорх тайлбар — нэвтрэлтгүй гэдгийг ойлгуулна. */
    sub: string;
    /** Чат хоосон үеийн урилга. */
    greeting: string;
    placeholder: string;
    send: string;
    thinking: string;
    error: string;
    /** Хувийн мэдээлэл бүү бич — нээлттэй суваг гэдгийн сануулга. */
    privacy: string;
    /** Санал болгох эхний асуултууд. */
    suggestions: string[];
    /** Push-to-talk: товчийг дарж барихыг заасан tooltip. */
    hold: string;
    /** Бичиж байх үеийн төлөв. */
    recording: string;
    /** Бичиж байх үед доод мөрөнд гарах заавар. */
    recordingHint: string;
    /** Дуут мессежийн бөмбөлөгт харагдах текст. */
    voiceMsg: string;
    /** Хариултыг сонсох товчны шошго. */
    listen: string;
    /** Микрофон боломжгүй үеийн алдаа. */
    micError: string;
    /** Микрофоны зөвшөөрөл татгалзсан үеийн алдаа. */
    micDenied: string;
    /** Зөвшөөрөл өгсний дараах зөвлөмж (эхний даралт бичлэг болоогүй үед). */
    micReady: string;
    /** Хэт богино даралт — санамсаргүй товшилт. */
    tooShort: string;
    /** Яриа таниагүй (чимээгүй бичлэг). */
    noSpeech: string;
    /** Дуут хувилбар бэлдэж чадаагүй үеийн алдаа. */
    ttsError: string;
  };
}

const mn: LandingCopy = {
  brand: 'Gerege Template Platform V3.0',
  nav: { features: 'Боломжууд', security: 'Аюулгүй байдал', tech: 'Технологи', docs: 'Баримт', login: 'Нэвтрэх' },
  hero: {
    badge: 'Gerege Template Platform V3.0 · eID суурьтай · AI-жуулсан · Нээлттэй эх',
    titleLead: 'Цахим үйлчилгээг',
    titleAccent: 'бүтээх',
    titleTail: 'суурь',
    lede:
      'Gerege Template Platform V3.0 нь төрийн байгууллага ба хувийн хэвшлийн аль алины цахим үйлчилгээг дээр нь босгож болох, үйлдвэрлэлд бэлэн, аюулгүй байдлаар хатуужуулсан бүрэн стек. Баталгаажсан иргэний танилт (eID), нэгдсэн нэвтрэлт, цахим гарын үсэг, AI туслах — банк, даатгал, финтек, эрүүл мэнд, боловсрол, төрийн үйлчилгээ хаана ч ижил суурь дээр.',
    ctaLogin: 'Gerege SSO-оор нэвтрэх',
    ctaExplore: 'GitHub дээр үзэх',
    stackLabel: 'Дэмждэг стандартууд',
    stats: [
      { value: 'Clean Arch', label: 'Цэгцтэй, өргөтгөхөд бэлэн бүтэц' },
      { value: 'eID · OIDC', label: 'Цахим үнэмлэх + нээлттэй стандарт' },
      { value: 'AI', label: 'Gemini туслах суулгасан' },
    ],
  },
  advantages: {
    heading: 'Дээр нь бүтээхэд бэлэн, бат бөх суурь',
    sub: 'Төрийн үйлчилгээний өндөр найдвартай байдлын шаардлагаар хатуужуулж, хувийн хэвшлийн бүтээгдэхүүний хурдад тохируулан бүтээв. Та танилт, аюулгүй байдал, нийцлийн дэд бүтцийг бус, үнэ цэнийг л бүтээнэ.',
    eidTag: 'Баталгаажуулалт',
    eidTitle: 'Цахим үнэмлэхээр хормын дотор',
    eidBody:
      'Гар утасны цахим үнэмлэхийн апп руу шууд мэдэгдэл илгээх, эсвэл QR код уншуулан хормын дотор нэвтэрнэ. Нэг утсан дээр ч, компьютер-утас хослуулан ч ажиллана. Нэг ч нууц үг цээжлэх шаардлагагүй — бэлэн, найдвартай нэвтрэлт эхний өдрөөс.',
    googleTitle: 'Google холболт',
    googleBody:
      'Цахим үнэмлэхээрээ нэг удаа баталгаажуулж Google дансаа холбоно. Улмаар нэг товшилтоор, аюулгүй байдлаа огт алдалгүйгээр хурдан нэвтэрнэ.',
    secTitle: 'Өндөр түвшний хамгаалалт',
    secBody:
      'Нэвтрэлтийн түлхүүр зөвхөн серверт хадгалагдаж, хөтчийн код руу хэзээ ч ил гардаггүй. Давхар CSRF хамгаалалт, өгөгдлийн мөр бүрийн хандалтын хяналт (RLS), CSP/HSTS толгой, хүсэлтийн ухаалаг хязгаарлалтаар анхнаасаа бүрхэгдсэн.',
    ssoTitle: 'Нэгдсэн нэвтрэлтийн үйлчилгээ (SSO / OIDC)',
    ssoBody:
      'Платформ өөрөө OpenID Connect үйлчилгээ хангагч болж чадна. Холбогдсон аппликейшнүүд нэвтрэлтээ энэ суурьт даатган, хэрэглэгчийн баталгаажсан мэдээллийг олон улсын нээлттэй стандартаар аюулгүй хүлээн авна. Хэрэглэгч нэг л удаа нэвтэрч, холбогдсон бүх системд орно.',
    signTitle: 'Цахим гарын үсгийн зуучлал',
    signBody:
      'Холбогдсон системүүд платформын eID итгэмжлэлээр дамжуулан баримт бичигт цахим гарын үсэг (PAdES) зуруулж чадна — өөрсдөө тусад нь гэрчилгээ эзэмших шаардлагагүйгээр.',
    consentTitle: 'Зөвшөөрлийг санана',
    consentBody:
      'Аппликейшн бүр таны зөвшөөрлийг зөвхөн анх удаа асууна. Дараа нь дахин төвөг учруулахгүй — жигд, тасралтгүй туршлага.',
  },
  tech: {
    heading: 'Орчин үеийн, батжсан технологийн суурь дээр',
    sub: 'Хурд, найдвар, аюулгүй байдлыг эрхэмлэн, удаан насжих зарчмаар сонгосон бүрэлдэхүүн.',
    backendTitle: 'Сервер тал — Go, Clean Architecture',
    backendBody:
      'Цэвэр архитектур бүхий Go (chi · net/http) сервер, ORM-гүй гар бичмэл SQL (pgx) дээр PostgreSQL, Redis түргэн санах ой. Давхаргууд тод ялгаатай тул шинэ боломжийг эмх цэгцтэй нэмнэ. OAuth2/OIDC-ийг платформ өөрөө (өөрийн Go provider) хангадаг.',
    frontendTitle: 'Хэрэглэгчийн тал — Next.js BFF',
    frontendBody:
      'Хөтч зөвхөн өөрийн эх сурвалжтай харилцаж, серверийн тал нь дотоод системтэй холбогдоно (BFF загвар). Нэвтрэлтийн түлхүүр хэрэглэгчийн код руу хэзээ ч гардаггүй. TanStack Query өгөгдлийн давхарга, mn/en/zh/ru дөрвөн хэл, гэрэл/харанхуй загвар бэлэн.',
    aiTitle: 'Gemini хиймэл оюун туслах',
    aiBody:
      'SDK-гүй REST урсгал, серверийн талд ажиллах хэрэгслүүд (function calling), өгөгдлийн сангаас тохируулах цар хүрээ/зааврууд. Асуултад хариулж, хэрэглэгчийн хэл дээр (mn/en/zh/ru) найдвартай нөөц хариу өгнө.',
    trustTitle: 'Найдварын баталгаа',
    trustBadge: 'ҮЙЛДВЭРЛЭЛД БЭЛЭН',
    trustItems: [
      'Цэвэр архитектур · ORM-гүй pgx SQL',
      'eID баталгаажуулалт + OAuth2/OIDC',
      'Түлхүүр зөвхөн серверт нууцлагдана',
      'Мөр бүрийн хандалтын хяналт (RLS)',
      'CSP · HSTS · CSRF · хязгаарлалт',
    ],
  },
  everything: {
    heading: 'Бүх боломж нэг суурин дээр',
    sub: 'Төрийн байгууллага, банк, даатгал, эрүүл мэнд, боловсрол — салбар бүрийн баг эхний өдрөөс ашиглана. Доороос нь дахин бүтээх шаардлагагүй.',
    items: [
      { title: 'eID нэвтрэлт', body: 'Регистрийн дугаараар иргэний апп руу мэдэгдэл, QR, App2App.' },
      { title: 'SSO / OIDC хангагч', body: 'Платформ өөрөө нэвтрэлт хангаж, RP-үүдийг холбоно.' },
      { title: 'Google холболт', body: 'Нэг удаа баталгаажуулснаар цаашид түргэн нэвтрэлт.' },
      { title: 'Цахим гарын үсэг', body: 'PAdES PDF гарын үсэг, eID зуучлалаар.' },
      { title: 'Gemini AI туслах', body: 'Чат, дуу хоолой, орчуулга — серверийн хэрэгслүүдтэй.' },
      { title: 'RBAC & супер админ', body: '4 түвшний эрх, динамик роль, аудит бүртгэл.' },
      { title: 'Дөрвөн хэл · загвар', body: 'Бүх дэлгэц mn/en/zh/ru, гэрэл/харанхуй горим.' },
      { title: 'Олон давхар хамгаалалт', body: 'RLS, CSP/HSTS, CSRF, хүсэлт бүрийн шалгалт.' },
    ],
  },
  cta: {
    title: 'Цахим үйлчилгээгээ өнөөдрөөс бүтээж эхэл',
    sub: 'Gerege Template Platform V3.0 нь танилт, аюулгүй байдал, нийцлийн дэд бүтцийг бэлэн болгож өгнө — та зөвхөн үйлчилгээгээ бүтээхэд анхаарна. eID-ээр нэвтэрч, бэлэн боломжуудыг өөрөө туршина уу.',
    ctaLogin: 'Gerege SSO-оор нэвтрэх',
    ctaExplore: 'GitHub дээр үзэх',
    tagline: 'Цэвэр архитектур · Нээлттэй стандарт · Найдвартай хамгаалалт',
  },
  footer: {
    tagline: 'Gerege Template Platform V3.0 — цахим үйлчилгээг бүтээх, үйлдвэрлэлд бэлэн суурь. Gerege Systems, 2026.',
    links: ['Үйлчилгээний нөхцөл', 'Нууцлалын бодлого', 'Холбоо барих'],
    copyright: '© 2026 Gerege Systems · Gerege Template Platform V3.0',
  },
  chat: {
    open: 'AI туслахтай ярих',
    close: 'Хаах',
    title: 'AI туслах',
    sub: 'Нэвтрэхгүйгээр асууж болно',
    greeting: 'Сайн байна уу! Gerege платформын талаар юу ч асууж болно — нэвтрэх шаардлагагүй.',
    placeholder: 'Асуултаа бичнэ үү…',
    send: 'Илгээх',
    thinking: 'Бодож байна…',
    error: 'Хариу авахад алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.',
    privacy: 'Нээлттэй суваг — хувийн мэдээлэл (РД, утас, нууц үг) бүү бичнэ үү.',
    suggestions: ['Энэ платформ юу вэ?', 'eID-ээр яаж нэвтрэх вэ?', 'Ямар аюулгүй байдлын хамгаалалттай вэ?'],
    hold: 'Дарж барьж ярина уу',
    recording: 'Сонсож байна…',
    recordingHint: 'Товчийг барьж ярина уу — тавихад илгээгдэнэ (дээд тал нь 15 секунд).',
    voiceMsg: 'Дуут мессеж',
    listen: 'Хариултыг сонсох',
    micError: 'Микрофон ашиглах боломжгүй байна.',
    micDenied: 'Микрофоны зөвшөөрөл олгогдоогүй байна. Хөтчийн хаяг мөрний зүүн талын тэмдэглэгээнээс микрофоныг зөвшөөрөөд дахин оролдоно уу.',
    micReady: 'Микрофон бэлэн. Одоо товчийг дарж барин ярина уу.',
    tooShort: 'Хэт богино байна — товчийг барьж байгаад ярина уу.',
    noSpeech: 'Яриа сонсогдсонгүй. Товчийг барьж байгаад тодорхой ярина уу.',
    ttsError: 'Дуут хувилбарыг бэлдэж чадсангүй. Дараа дахин оролдоно уу.',
  },
};

const en: LandingCopy = {
  brand: 'Gerege Template Platform V3.0',
  nav: { features: 'Features', security: 'Security', tech: 'Technology', docs: 'Docs', login: 'Sign in' },
  hero: {
    badge: 'Gerege Template Platform V3.0 · eID-based · AI-enabled · Open Source',
    titleLead: 'The foundation to',
    titleAccent: 'build',
    titleTail: 'digital services',
    lede:
      'Gerege Template Platform V3.0 is a production-ready, security-hardened full stack for building digital services — for government agencies and private-sector companies alike. Verified citizen identity (eID), single sign-on, e-signatures and an AI assistant: the same foundation for banking, insurance, fintech, healthcare, education and public services.',
    ctaLogin: 'Sign in with Gerege SSO',
    ctaExplore: 'View on GitHub',
    stackLabel: 'Standards supported',
    stats: [
      { value: 'Clean Arch', label: 'Layered, ready to extend' },
      { value: 'eID · OIDC', label: 'Electronic-ID + open standards' },
      { value: 'AI', label: 'Gemini assistant built in' },
    ],
  },
  advantages: {
    heading: 'A solid foundation, ready to build on',
    sub: 'Hardened to the assurance bar of public services, tuned to the pace of private-sector product teams — so you build value, not identity, security and compliance plumbing.',
    eidTag: 'Authentication',
    eidTitle: 'Instant eID sign-in',
    eidBody:
      'Push straight to the eID app or scan a QR — App2App on one device, reliable cross-device flows on two. Verified identity with no passwords to remember, working out of the box.',
    googleTitle: 'Google linking',
    googleBody:
      'Link your Google account once behind an eID verification, then sign in with a single tap — convenience without giving up assurance.',
    secTitle: 'Security hardened',
    secBody:
      'Tokens in httpOnly cookies (never exposed to browser JS), double CSRF defense, row-level security (RLS), CSP/HSTS headers and per-IP rate limiting — baked in, not bolted on.',
    ssoTitle: 'SSO provider for third parties (OAuth2 / OIDC)',
    ssoBody:
      'The platform itself can act as an OpenID Connect provider (a built-in Go provider). Relying applications (RPs) delegate sign-in to this foundation and receive verified user data as standard claims.',
    signTitle: 'Signature relay',
    signBody:
      'Third-party RPs can have documents e-signed (PAdES) through the platform’s eID RP credentials — without holding their own eID certificates.',
    consentTitle: 'Remembers consent',
    consentBody:
      'Each application asks for your consent only the first time. After that it never re-prompts — a smooth, uninterrupted experience.',
  },
  tech: {
    heading: 'On a modern, proven stack',
    sub: 'Components chosen for speed, reliability and security — and built to last.',
    backendTitle: 'Go backend · Clean Architecture',
    backendBody:
      'A Clean-Architecture Go (chi · net/http) backend with hand-written SQL (pgx, no ORM) over PostgreSQL and Redis caching. Clear layers make new features easy to add. OAuth2/OIDC is served by a built-in Go provider — no external OAuth server.',
    frontendTitle: 'Next.js frontend (BFF)',
    frontendBody:
      'The browser talks only to same-origin Next.js routes, which proxy to the backend server-side. Tokens never reach client JS. TanStack Query data layer, four languages (mn/en/zh/ru), light/dark themes — all included.',
    aiTitle: 'Gemini AI assistant',
    aiBody:
      'An SDK-free REST pipeline with server-side tools (function calling), DB-configurable scope/instructions and a resilient fallback in the user’s language on failure.',
    trustTitle: 'Trust guarantees',
    trustBadge: 'PRODUCTION-READY',
    trustItems: [
      'Clean Architecture · no-ORM pgx SQL',
      'eID identity + OAuth2 / OpenID Connect',
      'httpOnly cookies · CSRF defense',
      'PostgreSQL row-level security (RLS)',
      'CSP · HSTS · rate limiting',
    ],
  },
  everything: {
    heading: 'Every capability on one foundation',
    sub: 'Government agencies, banks, insurers, hospitals, schools — every team starts from day one. No need to rebuild the basics.',
    items: [
      { title: 'eID sign-in', body: 'Push to the citizen app by ID number, QR, App2App.' },
      { title: 'SSO / OIDC provider', body: 'The platform issues sign-in and connects RPs.' },
      { title: 'Google linking', body: 'Fast sign-in after an eID-verified first link.' },
      { title: 'Document signing', body: 'PAdES PDF signing via the eID relay.' },
      { title: 'Gemini AI assistant', body: 'Chat, voice, translation — with server-side tools.' },
      { title: 'RBAC & super admin', body: '4-role model, dynamic roles, hash-chained audit.' },
      { title: 'Four languages · theming', body: 'Every screen mn/en/zh/ru, light/dark modes.' },
      { title: 'Security headers', body: 'RLS, CSP, HSTS, CSRF and origin checks.' },
    ],
  },
  cta: {
    title: 'Start building your digital service today',
    sub: 'Gerege Template Platform V3.0 gives you identity, security and compliance infrastructure ready-made — so you focus only on your service. Sign in with eID and try the built-in capabilities yourself.',
    ctaLogin: 'Sign in with Gerege SSO',
    ctaExplore: 'View on GitHub',
    tagline: 'Clean Architecture · Open standards · Secure by design',
  },
  footer: {
    tagline: 'Gerege Template Platform V3.0 — a production-ready foundation for building digital services. Gerege Systems, 2026.',
    links: ['Terms of Service', 'Privacy Policy', 'Contact'],
    copyright: '© 2026 Gerege Systems · Gerege Template Platform V3.0',
  },
  chat: {
    open: 'Chat with the AI assistant',
    close: 'Close',
    title: 'AI assistant',
    sub: 'Ask without signing in',
    greeting: 'Hi! Ask anything about the Gerege platform — no sign-in required.',
    placeholder: 'Type your question…',
    send: 'Send',
    thinking: 'Thinking…',
    error: 'Could not get a reply. Please try again in a moment.',
    privacy: 'Public channel — please do not share personal data (ID number, phone, passwords).',
    suggestions: ['What is this platform?', 'How does eID login work?', 'What security does it provide?'],
    hold: 'Hold to talk',
    recording: 'Listening…',
    recordingHint: 'Hold the button and speak — release to send (15 seconds max).',
    voiceMsg: 'Voice message',
    listen: 'Listen to the reply',
    micError: 'Microphone is not available.',
    micDenied: 'Microphone permission was denied. Allow the microphone from the icon in your browser address bar and try again.',
    micReady: 'Microphone ready. Now press and hold the button to speak.',
    tooShort: 'That was too short — keep holding the button while you speak.',
    noSpeech: 'I could not hear any speech. Hold the button and speak clearly.',
    ttsError: 'Could not generate the audio. Please try again.',
  },
};

const zh: LandingCopy = {
  brand: 'Gerege Template Platform V3.0',
  nav: { features: '功能', security: '安全', tech: '技术', docs: '文档', login: '登录' },
  hero: {
    badge: 'Gerege Template Platform V3.0 · 基于 eID · 内置 AI · 开源',
    titleLead: '构建数字服务的',
    titleAccent: '坚实',
    titleTail: '基础',
    lede:
      'Gerege Template Platform V3.0 是一套可直接投入生产、经过安全加固的全栈平台，政府机构与私营企业均可在其上构建数字服务。已验证的公民身份（eID）、单点登录、电子签名和 AI 助手 — 银行、保险、金融科技、医疗、教育和政务服务共用同一套基础。',
    ctaLogin: '使用 Gerege SSO 登录',
    ctaExplore: '在 GitHub 上查看',
    stackLabel: '支持的标准',
    stats: [
      { value: 'Clean Arch', label: '分层清晰，易于扩展' },
      { value: 'eID · OIDC', label: '电子身份证 + 开放标准' },
      { value: 'AI', label: '内置 Gemini 助手' },
    ],
  },
  advantages: {
    heading: '可直接构建其上的坚实基础',
    sub: '按公共服务的高可信标准加固，又契合私营产品团队的开发节奏 — 让您专注于创造价值，而不是搭建身份、安全与合规的底层管道。',
    eidTag: '身份认证',
    eidTitle: '电子身份证瞬时登录',
    eidBody:
      '可直接向手机上的电子身份证应用推送通知，也可扫描二维码瞬时登录。单设备（App2App）和电脑—手机跨设备流程都能可靠运行。无需记忆任何密码 — 开箱即用的可信登录。',
    googleTitle: 'Google 账户绑定',
    googleBody:
      '通过一次 eID 验证绑定您的 Google 账户，之后一键即可快速登录，安全性丝毫不减。',
    secTitle: '高等级防护',
    secBody:
      '令牌保存在 httpOnly Cookie 中，绝不暴露给浏览器 JS；双重 CSRF 防护、数据行级访问控制（RLS）、CSP/HSTS 响应头和按 IP 的限流 — 内建于平台，而非事后补装。',
    ssoTitle: '面向第三方的单点登录（OAuth2 / OIDC）',
    ssoBody:
      '平台自身即可作为 OpenID Connect 提供方（内置 Go provider）。接入的应用（RP）将登录委托给这一基础平台，并以国际开放标准安全地获取用户的已验证信息。用户只需登录一次，即可进入所有已接入的系统。',
    signTitle: '电子签名中继',
    signBody:
      '第三方 RP 可借助平台的 eID 凭据为文件加盖电子签名（PAdES） — 无需自行持有 eID 证书。',
    consentTitle: '记住授权',
    consentBody:
      '每个应用只在首次询问您的授权，此后不再重复打扰 — 体验顺畅不中断。',
  },
  tech: {
    heading: '构建于现代且成熟的技术栈之上',
    sub: '以速度、可靠性和安全性为准则，按长期可维护的原则选型。',
    backendTitle: '服务端 — Go，Clean Architecture',
    backendBody:
      '采用整洁架构的 Go（chi · net/http）后端，无 ORM 的手写 SQL（pgx）搭配 PostgreSQL，并以 Redis 做缓存。分层清晰，新功能易于有序扩展。OAuth2/OIDC 由平台自带的 Go provider 提供，无需外部 OAuth 服务器。',
    frontendTitle: '前端 — Next.js BFF',
    frontendBody:
      '浏览器只与同源的 Next.js 路由通信，由服务端代理到内部后端（BFF 模式）。令牌绝不进入客户端 JS。内置 TanStack Query 数据层、蒙/英/中/俄四种语言和明暗主题。',
    aiTitle: 'Gemini 人工智能助手',
    aiBody:
      '免 SDK 的 REST 流水线、服务端运行的工具（function calling）、可从数据库配置的适用范围与指令。能够回答提问，并在必要时以用户所用语言给出可靠的兜底回复。',
    trustTitle: '可信保障',
    trustBadge: '生产就绪',
    trustItems: [
      '整洁架构 · 无 ORM 的 pgx SQL',
      'eID 身份认证 + OAuth2 / OpenID Connect',
      '令牌仅存于服务端（httpOnly Cookie）',
      'PostgreSQL 行级安全（RLS）',
      'CSP · HSTS · CSRF · 限流',
    ],
  },
  everything: {
    heading: '所有能力，同一套基础',
    sub: '政府机构、银行、保险、医疗、教育 — 各行业团队都能从第一天开始使用，无需从零重建基础设施。',
    items: [
      { title: 'eID 登录', body: '按登记号向公民应用推送通知、二维码、App2App。' },
      { title: 'SSO / OIDC 提供方', body: '平台自身签发登录并接入各 RP。' },
      { title: 'Google 绑定', body: '经 eID 验证首次绑定后，之后可快速登录。' },
      { title: '电子签名', body: '通过 eID 中继完成 PAdES PDF 签署。' },
      { title: 'Gemini AI 助手', body: '聊天、语音、翻译 — 配合服务端工具。' },
      { title: 'RBAC 与超级管理员', body: '四级权限模型、动态角色、哈希链审计日志。' },
      { title: '四语 · 主题', body: '所有页面支持蒙/英/中/俄，明暗两种模式。' },
      { title: '多层防护', body: 'RLS、CSP、HSTS、CSRF 及来源校验。' },
    ],
  },
  cta: {
    title: '从今天开始构建您的数字服务',
    sub: 'Gerege Template Platform V3.0 为您备好身份、安全与合规基础设施 — 您只需专注于自己的业务服务。用 eID 登录，亲自体验内置的各项能力。',
    ctaLogin: '使用 Gerege SSO 登录',
    ctaExplore: '在 GitHub 上查看',
    tagline: '整洁架构 · 开放标准 · 安全可靠',
  },
  footer: {
    tagline: 'Gerege Template Platform V3.0 — 构建数字服务的生产就绪基础平台。Gerege Systems，2026。',
    links: ['服务条款', '隐私政策', '联系我们'],
    copyright: '© 2026 Gerege Systems · Gerege Template Platform V3.0',
  },
  chat: {
    open: '与 AI 助手对话',
    close: '关闭',
    title: 'AI 助手',
    sub: '无需登录即可提问',
    greeting: '您好！关于 Gerege 平台的任何问题都可以问我 — 无需登录。',
    placeholder: '请输入您的问题…',
    send: '发送',
    thinking: '正在思考…',
    error: '获取回复失败，请稍后再试。',
    privacy: '公开渠道 — 请勿填写个人信息（身份证号、电话、密码）。',
    suggestions: ['这个平台是什么？', 'eID 登录如何工作？', '提供哪些安全保障？'],
    hold: '按住说话',
    recording: '正在聆听…',
    recordingHint: '按住按钮说话 — 松开即发送（最长 15 秒）。',
    voiceMsg: '语音消息',
    listen: '朗读回复',
    micError: '麦克风不可用。',
    micDenied: '麦克风权限被拒绝。请在浏览器地址栏的图标中允许麦克风后重试。',
    micReady: '麦克风已就绪。现在按住按钮说话即可。',
    tooShort: '太短了 — 请按住按钮再说话。',
    noSpeech: '没有听到语音。请按住按钮清晰地说话。',
    ttsError: '语音合成失败，请稍后再试。',
  },
};

const ru: LandingCopy = {
  brand: 'Gerege Template Platform V3.0',
  nav: { features: 'Возможности', security: 'Безопасность', tech: 'Технологии', docs: 'Документация', login: 'Войти' },
  hero: {
    badge: 'Gerege Template Platform V3.0 · на базе eID · с AI · Open Source',
    titleLead: 'Основа для',
    titleAccent: 'создания',
    titleTail: 'цифровых услуг',
    lede:
      'Gerege Template Platform V3.0 — готовый к продакшену, усиленный по безопасности full-stack для создания цифровых услуг как государственных органов, так и частного сектора. Подтверждённая личность гражданина (eID), единый вход, электронная подпись и AI-ассистент — одна и та же основа для банков, страхования, финтеха, здравоохранения, образования и госуслуг.',
    ctaLogin: 'Войти через Gerege SSO',
    ctaExplore: 'Посмотреть на GitHub',
    stackLabel: 'Поддерживаемые стандарты',
    stats: [
      { value: 'Clean Arch', label: 'Чёткие слои, готово к расширению' },
      { value: 'eID · OIDC', label: 'Электронное удостоверение + открытые стандарты' },
      { value: 'AI', label: 'Встроенный ассистент Gemini' },
    ],
  },
  advantages: {
    heading: 'Прочная основа, готовая к застройке',
    sub: 'Усилена под требования надёжности государственных услуг и настроена под скорость продуктовых команд частного сектора — вы создаёте ценность, а не инфраструктуру идентификации, безопасности и соответствия.',
    eidTag: 'Аутентификация',
    eidTitle: 'Мгновенный вход по электронному удостоверению',
    eidBody:
      'Push прямо в приложение eID или сканирование QR-кода — вход за секунды. Работает и на одном телефоне, и в связке компьютер—телефон. Не нужно запоминать ни одного пароля — надёжный вход с первого дня.',
    googleTitle: 'Привязка Google',
    googleBody:
      'Один раз подтвердите себя через eID и привяжите аккаунт Google. Дальше вход в одно касание — без потери уровня доверия.',
    secTitle: 'Защита высокого уровня',
    secBody:
      'Токены хранятся только на сервере и никогда не попадают в код браузера. Двойная защита от CSRF, построчный контроль доступа к данным (RLS), заголовки CSP/HSTS и разумные ограничения на количество запросов — заложены изначально.',
    ssoTitle: 'Единый вход как сервис (SSO / OIDC)',
    ssoBody:
      'Платформа сама может выступать провайдером OpenID Connect. Подключённые приложения делегируют ей вход и получают подтверждённые данные пользователя по международным открытым стандартам. Пользователь входит один раз — и попадает во все подключённые системы.',
    signTitle: 'Ретрансляция электронной подписи',
    signBody:
      'Подключённые системы могут подписывать документы электронной подписью (PAdES) через eID-полномочия платформы — без собственных сертификатов.',
    consentTitle: 'Помнит согласие',
    consentBody:
      'Каждое приложение спрашивает ваше согласие только в первый раз. Дальше оно больше не беспокоит — ровный, непрерывный опыт.',
  },
  tech: {
    heading: 'На современном, проверенном стеке',
    sub: 'Компоненты выбраны ради скорости, надёжности и безопасности — и с расчётом на долгую жизнь.',
    backendTitle: 'Серверная часть — Go, Clean Architecture',
    backendBody:
      'Go-бэкенд (chi · net/http) с чистой архитектурой, рукописный SQL без ORM (pgx) поверх PostgreSQL и кэш Redis. Слои чётко разделены, поэтому новые возможности добавляются аккуратно. OAuth2/OIDC обеспечивает сама платформа (собственный Go-провайдер).',
    frontendTitle: 'Клиентская часть — Next.js BFF',
    frontendBody:
      'Браузер общается только со своим origin, а серверная часть ходит во внутренние системы (модель BFF). Токены никогда не попадают в клиентский код. Слой данных TanStack Query, четыре языка (mn/en/zh/ru), светлая и тёмная темы — уже включены.',
    aiTitle: 'AI-ассистент Gemini',
    aiBody:
      'REST-конвейер без SDK, инструменты, выполняемые на сервере (function calling), настраиваемые из базы область применения и инструкции. Отвечает на вопросы, а при сбоях даёт надёжный резервный ответ на языке пользователя.',
    trustTitle: 'Гарантии надёжности',
    trustBadge: 'ГОТОВО К ПРОДАКШЕНУ',
    trustItems: [
      'Чистая архитектура · SQL на pgx без ORM',
      'Аутентификация eID + OAuth2/OIDC',
      'Токены остаются только на сервере',
      'Построчный контроль доступа (RLS)',
      'CSP · HSTS · CSRF · ограничение запросов',
    ],
  },
  everything: {
    heading: 'Все возможности на одной основе',
    sub: 'Госорганы, банки, страхование, здравоохранение, образование — команды любой отрасли начинают с первого дня. Не нужно строить фундамент заново.',
    items: [
      { title: 'Вход через eID', body: 'Push в приложение гражданина по регистрационному номеру, QR, App2App.' },
      { title: 'Провайдер SSO / OIDC', body: 'Платформа сама выдаёт вход и подключает RP.' },
      { title: 'Привязка Google', body: 'После первого подтверждения через eID — быстрый вход.' },
      { title: 'Электронная подпись', body: 'Подписание PDF (PAdES) через ретрансляцию eID.' },
      { title: 'AI-ассистент Gemini', body: 'Чат, голос, перевод — с серверными инструментами.' },
      { title: 'RBAC и суперадмин', body: '4 уровня ролей, динамические роли, журнал аудита.' },
      { title: 'Четыре языка · темы', body: 'Все экраны на mn/en/zh/ru, светлый и тёмный режимы.' },
      { title: 'Многослойная защита', body: 'RLS, CSP/HSTS, CSRF и проверка каждого запроса.' },
    ],
  },
  cta: {
    title: 'Начните создавать свою цифровую услугу сегодня',
    sub: 'Gerege Template Platform V3.0 даёт готовую инфраструктуру идентификации, безопасности и соответствия — вы сосредотачиваетесь только на своей услуге. Войдите через eID и попробуйте встроенные возможности сами.',
    ctaLogin: 'Войти через Gerege SSO',
    ctaExplore: 'Посмотреть на GitHub',
    tagline: 'Чистая архитектура · Открытые стандарты · Надёжная защита',
  },
  footer: {
    tagline: 'Gerege Template Platform V3.0 — готовая к продакшену основа для создания цифровых услуг. Gerege Systems, 2026.',
    links: ['Условия использования', 'Политика конфиденциальности', 'Контакты'],
    copyright: '© 2026 Gerege Systems · Gerege Template Platform V3.0',
  },
  chat: {
    open: 'Чат с AI-помощником',
    close: 'Закрыть',
    title: 'AI-помощник',
    sub: 'Спрашивайте без входа в систему',
    greeting: 'Здравствуйте! Спросите что угодно о платформе Gerege — вход не требуется.',
    placeholder: 'Введите вопрос…',
    send: 'Отправить',
    thinking: 'Думаю…',
    error: 'Не удалось получить ответ. Попробуйте ещё раз через минуту.',
    privacy: 'Открытый канал — не указывайте личные данные (ИНН, телефон, пароли).',
    suggestions: ['Что это за платформа?', 'Как работает вход по eID?', 'Какая обеспечена безопасность?'],
    hold: 'Нажмите и говорите',
    recording: 'Слушаю…',
    recordingHint: 'Удерживайте кнопку и говорите — отпустите, чтобы отправить (до 15 секунд).',
    voiceMsg: 'Голосовое сообщение',
    listen: 'Прослушать ответ',
    micError: 'Микрофон недоступен.',
    micDenied: 'Доступ к микрофону запрещён. Разрешите микрофон в значке адресной строки браузера и попробуйте снова.',
    micReady: 'Микрофон готов. Теперь нажмите и удерживайте кнопку.',
    tooShort: 'Слишком коротко — удерживайте кнопку, пока говорите.',
    noSpeech: 'Речь не распознана. Удерживайте кнопку и говорите чётче.',
    ttsError: 'Не удалось озвучить ответ. Попробуйте ещё раз.',
  },
};

export const landingCopy: Record<Lang, LandingCopy> = { mn, en, zh, ru };
