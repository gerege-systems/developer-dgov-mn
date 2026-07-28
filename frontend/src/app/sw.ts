// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Service worker-ийн эх файл. @serwist/next үүнийг build үед хөрвүүлж
// public/sw.js болгоно (dev-д огт үүсэхгүй — next.config.mjs дахь `disable`).
//
// ЗАРЧИМ: кэш нь ЗӨВХӨН статик хөрөнгөд. Session cookie, CSRF толгой, eID-ийн
// long-poll зэрэг нь хэзээ ч кэшнээс өгөгдөж болохгүй тул /api/* ба нэвтрэлт /
// eID-ийн бүх хуудас NetworkOnly-оор явна. HTML огт кэшлэхгүй — офлайн үед
// зөвхөн /~offline fallback харагдана.
//
// Cross-origin хүсэлтийг ямар ч дүрэм БАРИХГҮЙ (matcher бүр `sameOrigin`
// шаарддаг). Учир нь: тэднийг барьвал SW доторх fetch() нь энэ аппын CSP
// (`connect-src 'self'`)-д захирагдаж, Google профайл зураг зэрэг гадаад эх
// сурвалж блоклогдоно. Барихгүй бол хөтөч шууд өөрөө татна.

import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, CacheableResponsePlugin, ExpirationPlugin, NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Хэзээ ч кэшлэхгүй замын угтварууд — BFF, нэвтрэлт, OIDC provider, SSO.
 * Угтвар нь сегментийн хилээр таарна (`/login` нь `/login/verify`-г ч хамарна,
 * гэхдээ `/loginsomething`-ыг хамаарахгүй).
 */
const NEVER_CACHE_PREFIXES = [
  '/api', // бүх BFF route — токен, CSRF, eID long-poll
  '/auth', // eID callback
  '/oauth', // OIDC provider — login / consent / logout
  '/provider', // relying-party нүүр
  '/sso', // SSO consumer callback
  '/login', // нэвтрэх + РД баталгаажуулалт
  '/logout',
];

/** Зам нь угтвартай сегментийн хилээр таарч байна уу. */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Кэшлэхийг бүрэн хориглох зам мөн үү (eID-ийн дурын дэд зам ч мөн). */
function isNeverCache(pathname: string): boolean {
  // Build-ийн hash-тай статик гаралтыг эндээс УРЬДЧИЛАН гаргана. Next.js нь
  // chunk-ийг route-ийн замаар нэрлэдэг тул нэр нь "/…/app/api/…" эсвэл
  // "/…/me/eid/…" гэж харагдаж болох ч эдгээр нь нийтэд өгөгддөг, өөрчлөгдөшгүй
  // JS файлууд — session өгөгдөл агуулдаггүй.
  if (pathname.startsWith('/_next/static/')) return false;

  if (NEVER_CACHE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) return true;
  // /me/eid/*, /app/eid/*, /auth/eid/* — eID-ийн бүх гадаргуу.
  return /(^|\/)eid(\/|$)/.test(pathname);
}

const runtimeCaching: RuntimeCaching[] = [
  {
    // 1) Хамгийн түрүүнд — эмзэг зам бүр сүлжээнээс ЗӨВХӨН.
    matcher: ({ url, sameOrigin }) => sameOrigin && isNeverCache(url.pathname),
    handler: new NetworkOnly(),
  },
  {
    // 2) Build-ийн статик хөрөнгө — агуулга-хаяглалттай (hash) тул мөнхөд хүчинтэй.
    //    next/font-ийн өөрөө host хийсэн фонтууд мөн энд (/_next/static/media).
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'gerege-next-static',
      plugins: [
        new ExpirationPlugin({ maxEntries: 256, maxAgeSeconds: 60 * 60 * 24 * 365, maxAgeFrom: 'last-used' }),
      ],
    }),
  },
  {
    // 3) public/ доторх зураг — брэнд, дүрс, hero.
    matcher: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
    handler: new CacheFirst({
      cacheName: 'gerege-images',
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30, maxAgeFrom: 'last-used' }),
      ],
    }),
  },
  {
    // 4) public/ доторх фонт (хэрэв нэмэгдвэл) — /_next/static-аас гадуурх.
    matcher: ({ request, sameOrigin }) => sameOrigin && request.destination === 'font',
    handler: new CacheFirst({
      cacheName: 'gerege-fonts',
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365, maxAgeFrom: 'last-used' }),
      ],
    }),
  },
  {
    // 5) Бусад бүх ижил-origin хуудас (document). HTML-ийг КЭШЛЭХГҮЙ — энэ дүрэм
    //    зөвхөн доорх `fallbacks`-ыг идэвхжүүлэхийн тулд байна: сүлжээ унавал
    //    /~offline харагдана.
    matcher: ({ request, sameOrigin }) => sameOrigin && request.destination === 'document',
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        // ЗӨВХӨН хуудсанд (document) — /api/* нь JSON хүлээдэг тул HTML
        // fallback авбал клиент талд ойлгомжгүй алдаа болно.
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
