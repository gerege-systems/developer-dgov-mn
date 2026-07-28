// ⚠️ next 16 — Turbopack анхдагч болсон ч энэ апп WEBPACK-ээр build хийнэ.
//
// Шалтгаан: PWA-гийн service worker-ыг `@serwist/next` үүсгэдэг бөгөөд тэр нь
// webpack тохиргоо тарьдаг. Serwist-ийн Turbopack дэмжлэг туршилтын шатанд
// (serwist#54). Turbopack-аар build хийвэл webpack тохиргоо үл тоомсорлогдож
// service worker үүсэхгүй — PWA чимээгүй эвдэрнэ.
//
// Тиймээс package.json-ы `dev`/`build` дээр `--webpack` тугийг ЗААВАЛ өгнө.
// Serwist Turbopack-ыг тогтвортой дэмжмэгц энэ тугийг хасаж болно.

/** @type {import('next').NextConfig} */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import withSerwistInit from '@serwist/next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// /~offline-ийн precache хувилбар. Commit SHA байвал түүнийг (deploy бүрд
// шинэчлэгдэнэ); Docker builder-т .git байдаггүй тул тэнд build бүрд шинэ UUID.
const gitSHA = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim();
const swRevision = gitSHA || randomUUID();

// Content-Security-Policy: бодит, ажиллах боломжтой бодлого.
// - script-src: 'self' нь /theme-bootstrap.js (same-origin) болон Next.js-ийн
//   chunk-уудыг хамарна. 'unsafe-inline' нь Next.js-ийн inline bootstrap
//   script-уудад (мөн зарим inline) шаардлагатай pragmatic dev default —
//   production-д nonce руу шилжих нь зохистой.
// - style-src: апп `style=` inline attribute ашигладаг тул 'unsafe-inline' хэрэгтэй.
// - connect-src 'self': browser зөвхөн same-origin BFF (/api/*) рүү хандана.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Google профайл зураг (dashboard-д холбогдсон Google account) нь
  // lh3.googleusercontent.com зэрэг Google CDN-ээс ирдэг тул зөвшөөрнө.
  // gstatic — Google Drive интеграцийн файлын icon (iconLink) ба browser-т
  // шууд ачаалагддаг тул зөвшөөрнө.
  "img-src 'self' data: https://*.googleusercontent.com https://*.gstatic.com",
  "font-src 'self' data:",
  // media-src: AI-ийн ярианы хариу (TTS) нь BFF-ээс base64-ээр ирээд
  // `new Audio('data:audio/…')`-аар тоглодог (lib/audio.ts). default-src нь
  // media-г ч хамардаг тул энэ мөр байхгүй бол дуу гарахгүй (CSP блоклоно).
  "media-src 'self' data: blob:",
  "connect-src 'self'",
  // frame-src: Google Drive + Dropbox файлын урьдчилан харах (preview) iframe —
  // эдгээр нь провайдерын интерактив preview хуудас тул BFF-ээр дамжуулах
  // боломжгүй (провайдер proxied origin-оос framing-ийг татгалздаг). Интеграцийн
  // OAuth тохируулаагүй үед эдгээр хост руу хэзээ ч хандахгүй (feature inert).
  "frame-src 'self' https://drive.google.com https://docs.google.com https://*.dropboxusercontent.com https://www.dropbox.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  // Standalone output → slim production Docker image (server.js + minimal
  // node_modules) instead of shipping the whole tree. See frontend/Dockerfile.
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  // iOS Universal Links — Apple нь /.well-known/apple-app-site-association-ыг
  // татдаг. Next.js dot-folder route-ыг найдваргүй тул /api/aasa руу rewrite хийнэ.
  async rewrites() {
    return [
      { source: '/.well-known/apple-app-site-association', destination: '/api/aasa' },
    ];
  },
  // Security headers applied to every response.
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        // microphone=(self): AI-ийн дуут боломжууд (нүүрийн push-to-talk чат,
        // /me/ai дуут мессеж, амьд орчуулга) нь getUserMedia({audio}) дууддаг.
        // `microphone=()` байхад хөтөч үүнийг БАРИМТЫН түвшинд хааж, зөвшөөрөл
        // асуухгүйгээр шууд унагаадаг байв. Camera/geolocation хэвээр хаалттай
        // — апп тэднийг хэрэглэдэггүй. (self) нь зөвхөн энэ origin-д зөвшөөрч,
        // гуравдагч талын iframe-д олгохгүй.
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(self), geolocation=()',
      },
      { key: 'Content-Security-Policy', value: CSP },
    ];

    // HSTS-ийг зөвхөн production-д илгээнэ — dev дээр http тул HSTS тохиромжгүй.
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains',
      });
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Serwist — PWA-ийн service worker. Эх файл нь src/app/sw.ts, гаралт нь
// public/sw.js (git-д ordoггүй, build бүрд дахин үүснэ).
//
// CSP тэмдэглэл: SW-ийн бүртгэл нэмэлт CSP өөрчлөлт ШААРДААГҮЙ. `worker-src`
// заагаагүй үед CSP нь child-src → default-src руу уналт хийдэг бөгөөд
// `default-src 'self'` нь ижил-origin /sw.js-ийг зөвшөөрнө. SW дотор гадаад
// origin руу fetch хийвэл `connect-src 'self'` таслах байсан тул sw.ts дэх бүх
// matcher зөвхөн ижил-origin хүсэлт барьдаг (гадаадыг хөтөч өөрөө татна).
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [{ url: '/~offline', revision: swRevision }],
  // Хөгжүүлэлтэд SW огт үүсэхгүй — hot reload, хуучин кэшийн зөрчлөөс сэргийлнэ.
  disable: process.env.NODE_ENV === 'development',
  reloadOnOnline: true,
});

export default withSerwist(nextConfig);
