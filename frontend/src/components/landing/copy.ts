// Government Template Platform V3.0
// Gerege Systems Development Team & Claude AI, 2026
//
// DGOV-Developer Portal нүүр (landing) хуудасны маркетингийн текст — mn / en хосоор.
// Хөгжүүлэгчдэд зориулсан: аппликейшндээ үндэсний eID нэвтрэлтийг OAuth2 / OIDC-ээр
// нэмэх. Апп-ын үндсэн dict (lib/i18n.ts)-ийг бөглөхгүйн тулд landing-ийн урт
// мөрүүдийг энд төвлөрүүлэв. Бүх түлхүүр хоёр хэлэнд адил байх ёстой (i18n.ts-тэй нэг зарчим).

export interface LandingCopy {
  nav: { features: string; security: string; tech: string; login: string };
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
}

const mn: LandingCopy = {
  nav: { features: 'Боломжууд', security: 'Аюулгүй байдал', tech: 'Технологи', login: 'Нэвтрэх' },
  hero: {
    badge: 'Хөгжүүлэгчийн портал · eID + OpenID Connect',
    titleLead: 'Аппдаа',
    titleAccent: 'үндэсний eID',
    titleTail: 'нэвтрэлт нэм',
    lede:
      'DGOV-Developer Portal нь аппликейшндээ үндэсний цахим үнэмлэг (eID)-ийн нэвтрэлтийг OAuth2 / OpenID Connect-ээр нэмэх боломжийг олгоно. Аппаа бүртгэж, client_id болон нууц түлхүүрээ аваад, хэдхэн минутын дотор баталгаажсан хэрэглэгчийн мэдээллийг стандарт claim хэлбэрээр хүлээн авч эхэлнэ.',
    ctaLogin: 'Консолд нэвтрэх',
    ctaExplore: 'Боломжийг үзэх',
    stackLabel: 'Дэмждэг стандартууд',
    stats: [
      { value: 'OAuth2 · OIDC', label: 'Ory Hydra дээр суурилсан' },
      { value: 'eID', label: 'Баталгаажсан иргэний identity' },
      { value: '~5 мин', label: 'Бүртгэлээс эхний claim хүртэл' },
    ],
  },
  advantages: {
    heading: 'Интеграци — цөөхөн алхамд',
    sub: 'Апп бүртгэх, redirect URI тохируулах, scope сонгох — өөрийн eID-ээр нэвтэрч, үйлчилгээгээ хэдхэн минутад холбоно.',
    eidTag: 'Identity',
    eidTitle: 'eID-ээр баталгаажсан хэрэглэгч',
    eidBody:
      'Нэвтрэлтээ DAN-д даатгаснаар хэрэглэгч гар утасны eID апп руу мэдэгдэл авах, эсвэл QR уншуулан баталгаажна. Та нууц үг хадгалах, хувийн мэдээлэл цуглуулах дарамтгүйгээр зөвхөн баталгаажсан identity-г хүлээн авна.',
    googleTitle: 'Google холболт',
    googleBody:
      'Хэрэглэгч eID-ээр нэг удаа баталгаажуулаад Google дансаа холбож, дараа нь нэг товшилтоор нэвтэрнэ — таны талд нэмэлт код бичих шаардлагагүй.',
    secTitle: 'Апп бүрт тусдаа хамгаалалт',
    secBody:
      'Апп бүр өөрийн client_id/secret, зөвшөөрөгдсөн redirect URI болон scope-той. Токен зөвхөн серверт (httpOnly) хадгалагдаж, өгөгдлийн мөрийн хандалтын хяналт (RLS), хүсэлтийн хязгаарлалтаар хамгаалагдана.',
    ssoTitle: 'OAuth2 / OpenID Connect provider',
    ssoBody:
      'Аппаа relying party (RP) болгон бүртгэж, нэвтрэлтээ DAN-аар гүйцэтгүүлнэ. Хэрэглэгчийн баталгаажсан мэдээллийг олон улсын нээлттэй стандарт (OIDC) claim-ээр хүлээн авах бөгөөд дурын OIDC сантай нийцнэ.',
    signTitle: 'Цахим гарын үсгийн API',
    signBody:
      'Өөрөө тусад нь гэрчилгээ эзэмшихгүйгээр, DAN-ий eID итгэмжлэлээр дамжуулан баримт бичигт цахим гарын үсэг зуруулах API-г дуудна.',
    consentTitle: 'Зөвшөөрлийн дэлгэц бэлэн',
    consentBody:
      'Хэрэглэгчийн зөвшөөрлийг асуух дэлгэц болон түүнийг санах логик аль хэдийн бэлэн. Та consent урсгалыг өөрөө хийх шаардлагагүй.',
  },
  tech: {
    heading: 'Стандарт дээр суурилсан, хаана ч ажиллана',
    sub: 'Дурын хэл, framework дээрх аппликейшнд нийцэхээр нээлттэй стандарт дээр бүтээв.',
    backendTitle: 'Ory Hydra OIDC хөдөлгүүр',
    backendBody:
      'OAuth2 / OIDC-ийг олон улсад батжсан Ory Hydra гүйцэтгэнэ. Authorization code + PKCE, refresh token болон стандарт discovery (.well-known) endpoint-ууд.',
    frontendTitle: 'Дурын хэл / framework',
    frontendBody:
      'Стандарт OpenID Connect тул та дуртай OIDC сангаа (Next.js, Spring, Django, mobile SDK гэх мэт) ашиглана. Тусгай SDK шаардлагагүй.',
    aiTitle: 'Gemini AI туслах',
    aiBody:
      'Интеграцийн явцад асуултад хариулж, алдаа шалгахад туслах серверийн AI туслах — шаардлагатай үед монгол хэлээр найдвартай хариулна.',
    trustTitle: 'Итгэлийн баталгаа',
    trustBadge: 'ИДЭВХТЭЙ',
    trustItems: [
      'OAuth2 / OpenID Connect стандарт',
      'Authorization code + PKCE',
      'Апп бүрт тусдаа client_id / secret',
      'Токен зөвхөн серверт (httpOnly)',
      'Хүсэлтийн хязгаарлалт, RLS хамгаалалт',
    ],
  },
  everything: {
    heading: 'Бүх хэрэгсэл нэг дор',
    sub: 'Хөгжүүлэгчид эхний өдрөөс интеграци эхлэхэд бэлэн.',
    items: [
      { title: 'eID нэвтрэлт', body: 'Хэрэглэгч eID апп эсвэл QR-аар баталгаажина.' },
      { title: 'Discovery endpoint', body: 'Стандарт .well-known/openid-configuration.' },
      { title: 'Client credentials', body: 'client_id/secret, redirect URI, scope удирдлага.' },
      { title: 'Гарын үсгийн API', body: 'DAN-ий итгэмжлэлээр баримтад цахим гарын үсэг.' },
      { title: 'Баталгаат claim', body: 'Баталгаажсан профайлыг стандарт claim-ээр авна.' },
      { title: 'Хоёр хэл (mn/en)', body: 'Консол ба дэлгэцүүд монгол, англиар.' },
      { title: 'Sandbox ба хязгаар', body: 'Тест орчин, тодорхой rate limit-үүд.' },
      { title: 'Олон давхар хамгаалалт', body: 'CSP, HSTS, origin шалгалт, RLS.' },
    ],
  },
  cta: {
    title: 'Өнөөдөр build хийж эхэл',
    sub: 'Өөрийн eID-ээр консолд нэвтэрч, аппаа бүртгээд эхний eID нэвтрэлтээ хэдхэн минутад турших боломжтой.',
    ctaLogin: 'Консолд нэвтрэх',
    ctaExplore: 'Боломжийг үзэх',
    tagline: 'eID · OAuth2 / OIDC · Найдвартай хамгаалалт',
  },
  footer: {
    tagline: 'Аппликейшндээ үндэсний eID нэвтрэлт нэмэх хөгжүүлэгчийн портал. Gerege Systems, 2026.',
    links: ['Баримт бичиг', 'Үйлчилгээний нөхцөл', 'Холбоо барих'],
    copyright: '© 2026 Gerege Systems · DGOV-Developer Portal',
  },
};

const en: LandingCopy = {
  nav: { features: 'Features', security: 'Security', tech: 'Technology', login: 'Sign in' },
  hero: {
    badge: 'Developer portal · eID + OpenID Connect',
    titleLead: 'Add',
    titleAccent: 'national eID',
    titleTail: 'sign-in to your app',
    lede:
      'DGOV-Developer Portal lets you add national electronic-ID (eID) sign-in to your application over OAuth2 / OpenID Connect. Register your app, grab your client_id and secret, and start receiving verified user identity as standard claims in minutes.',
    ctaLogin: 'Open the console',
    ctaExplore: 'Explore features',
    stackLabel: 'Standards supported',
    stats: [
      { value: 'OAuth2 · OIDC', label: 'Powered by Ory Hydra' },
      { value: 'eID', label: 'Verified citizen identity' },
      { value: '~5 min', label: 'From app to first claim' },
    ],
  },
  advantages: {
    heading: 'Integration in a few steps',
    sub: 'Register an app, set your redirect URIs, pick your scopes — sign in with your own eID and connect your service in minutes.',
    eidTag: 'Identity',
    eidTitle: 'eID-verified users',
    eidBody:
      'Delegate sign-in to DAN: your users approve with a push to the eID app or a QR scan. You receive a verified identity with no passwords to store and no PII-collection burden.',
    googleTitle: 'Google linking',
    googleBody:
      'Users can link a Google account behind a one-time eID verification and then sign in with a single tap — no extra code on your side.',
    secTitle: 'Per-app isolation',
    secBody:
      'Every app has its own client_id/secret, allow-listed redirect URIs and scopes. Tokens stay server-side (httpOnly), protected by row-level security (RLS) and per-IP rate limiting.',
    ssoTitle: 'OAuth2 / OpenID Connect provider',
    ssoBody:
      'Register your app as a relying party (RP) and delegate sign-in to DAN. Receive verified user data as standard OIDC claims — compatible with any OIDC library.',
    signTitle: 'Signature API',
    signBody:
      'Call the signing API to have documents e-signed through DAN’s eID RP credentials — without holding your own eID certificates.',
    consentTitle: 'Consent screen included',
    consentBody:
      'The consent prompt and its remember-me logic are already built. You never have to implement the consent flow yourself.',
  },
  tech: {
    heading: 'Standards-based — works anywhere',
    sub: 'Built on open standards so it fits applications in any language or framework.',
    backendTitle: 'Ory Hydra OIDC engine',
    backendBody:
      'OAuth2 / OIDC is powered by the battle-tested Ory Hydra: authorization code + PKCE, refresh tokens and standard discovery (.well-known) endpoints.',
    frontendTitle: 'Any language / framework',
    frontendBody:
      'Because it is standard OpenID Connect, use your favorite OIDC library (Next.js, Spring, Django, mobile SDKs). No proprietary SDK required.',
    aiTitle: 'Gemini AI assistant',
    aiBody:
      'A server-side AI assistant that answers integration questions and helps debug — with a resilient Mongolian fallback on failure.',
    trustTitle: 'Trust guarantees',
    trustBadge: 'PRODUCTION',
    trustItems: [
      'OAuth2 / OpenID Connect standard',
      'Authorization code + PKCE',
      'Per-app client_id / secret',
      'Tokens server-side (httpOnly)',
      'Rate limiting · row-level security',
    ],
  },
  everything: {
    heading: 'Every tool in one place',
    sub: 'Ready for developers to integrate from day one.',
    items: [
      { title: 'eID sign-in', body: 'Users verify with the eID app or a QR scan.' },
      { title: 'Discovery endpoint', body: 'Standard .well-known/openid-configuration.' },
      { title: 'Client credentials', body: 'Manage client_id/secret, redirect URIs, scopes.' },
      { title: 'Signature API', body: 'E-sign documents via DAN’s eID credentials.' },
      { title: 'Verified claims', body: 'Verified profile delivered as standard claims.' },
      { title: 'Bilingual (mn/en)', body: 'Console and screens in Mongolian and English.' },
      { title: 'Sandbox & limits', body: 'A test environment with clear rate limits.' },
      { title: 'Security headers', body: 'CSP, HSTS, origin checks and RLS.' },
    ],
  },
  cta: {
    title: 'Start building today',
    sub: 'Sign in to the console with your eID, register an app, and test your first eID sign-in within minutes.',
    ctaLogin: 'Open the console',
    ctaExplore: 'Explore features',
    tagline: 'eID · OAuth2 / OIDC · Secure by design',
  },
  footer: {
    tagline: 'The developer portal for adding national eID sign-in to your app. Gerege Systems, 2026.',
    links: ['Docs', 'Terms of Service', 'Contact'],
    copyright: '© 2026 Gerege Systems · DGOV-Developer Portal',
  },
};

export const landingCopy: Record<'mn' | 'en', LandingCopy> = { mn, en };
