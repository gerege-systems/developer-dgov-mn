// Платформын таних тэмдгийн ЦОРЫН ГАНЦ эх сурвалж.
//
// Брэндийн мөрийг кодод шууд бичихийг `scripts/check-brand.mjs` хориглоно —
// тэр нь флотын репо хооронд файлуудыг зохиомлоор зөрүүлж, дундын багц
// (`@gerege/ui-core`) гаргахыг хаадаг байсан.
//
// Landing хуудасны маркетингийн текст нь `components/landing/copy.ts`-д —
// тэр нь бүтцээрээ дундын, агуулгаараа платформынх.

export const brand = {
  /** Бүтэн нэр — <title>, PWA `name`, толгой мөр, хөл хэсэг. */
  name: 'Government Template Platform V3.0',

  /** Богино нэр — PWA `short_name`, iOS-ийн дүрсний доорх бичиг (12 тэмдэгт хүртэл). */
  short: 'GovTemplate',

  /** Үндсэн домэйн (схемгүй). */
  domain: 'template.dgov.mn',

  /** Нийтийн баримтын сайт — хэлний угтвар нэмэхэд бэлэн, ард нь `/`-тай. */
  docsUrl: 'https://template.dgov.mn/docs/',

  /**
   * Баримтын сайт БОДИТООР ямар хэлтэй вэ — `docs-site/mkdocs.yml`-ийн
   * `i18n.languages`-тай ижил. Эхнийх нь үндсэн локал (угтваргүй); энд
   * байхгүй хэлээр интерфэйс ажиллавал хоёр дахь хэл рүү уналт хийнэ.
   */
  docsLangs: ['mn', 'en', 'ru', 'zh'],

  /** PWA `theme_color` ба `viewport.themeColor` — globals.css-ийн брэнд токентой ижил. */
  themeColor: '#0064E1',

  /** Нэг өгүүлбэрийн тайлбар — PWA manifest ба `<meta description>`. */
  description:
    'Төрийн цахим үйлчилгээг бүтээх, үйлдвэрлэлд бэлэн суурь — eID-д суурилсан, AI-аар хүчирхэгжсэн',

  /** Эзэмшигч байгууллага — footer, эрх зүйн мэдэгдэл. */
  owner: 'Gerege Systems ХХК',
} as const;

/** Хуудасны гарчиг — `<page> — <brand>`. Хуудасгүй бол зөвхөн брэнд. */
export function pageTitle(page?: string): string {
  return page ? `${page} — ${brand.name}` : brand.name;
}
