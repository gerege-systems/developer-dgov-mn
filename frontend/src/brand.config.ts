// Платформын таних тэмдгийн ЦОРЫН ГАНЦ эх сурвалж.
//
// Брэндийн мөрийг кодод шууд бичихийг `scripts/check-brand.mjs` хориглоно —
// тэр нь флотын репо хооронд файлуудыг зохиомлоор зөрүүлж, дундын багц
// (`@gerege/ui-core`) гаргахыг хаадаг байсан.
//
// Landing текст (`components/landing/copy.ts`) нь платформын маркетингийн
// өмч — тэр багцад орохгүй тул брэндээ нэрлэж болно.

export const brand = {
  /** Бүтэн нэр — <title>, толгой мөр, хөл хэсэг. */
  name: 'Government Developer Portal V3.0',

  /** Богино нэр — дүрсний доорх бичиг (12 тэмдэгт хүртэл). */
  short: 'Gov Dev',

  /** Үндсэн домэйн (схемгүй). */
  domain: 'developer.dgov.mn',

  /** Нийтийн техник баримт бичгийн сайт, ард нь `/`-тай. */
  docsUrl: 'https://gerege-systems.github.io/developer-dgov-mn/',

  /**
   * Баримтын сайт БОДИТООР ямар хэлтэй вэ — `docs-site/mkdocs.yml`-ийн
   * `i18n.languages`-тай ижил эрэмбэтэй. Эхнийх нь үндсэн локал (угтваргүй).
   */
  docsLangs: ['mn', 'en'],

  /** Брэндийн үндсэн өнгө — globals.css-ийн токентой ижил. */
  themeColor: '#0064E1',

  /** Нэг өгүүлбэрийн тайлбар — `<meta description>`. */
  description:
    'eID based, AI enabled. Аппликейшндээ үндэсний цахим үнэмлэх (eID)-ийн нэвтрэлтийг OAuth2 / OpenID Connect-ээр нэмэх хөгжүүлэгчийн портал: апп бүртгэх, client_id/secret, баталгаажсан claim, гарын үсгийн API.',

  /** Эзэмшигч байгууллага — footer, эрх зүйн мэдэгдэл. */
  owner: 'Gerege Systems ХХК',
} as const;

/** Хуудасны гарчиг — `<page> — <brand>`. Хуудасгүй бол зөвхөн брэнд. */
export function pageTitle(page?: string): string {
  return page ? `${page} — ${brand.name}` : brand.name;
}
