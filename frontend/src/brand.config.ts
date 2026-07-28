// Платформын таних тэмдгийн ЦОРЫН ГАНЦ эх сурвалж.
//
// Энэ template-ээс салбарласан платформ (gerege-app · gerege-pos ·
// gerege-kiosk …) бүр ЗӨВХӨН ЭНЭ ФАЙЛЫГ өөрчилнө. Бусад бүх файлд брэндийн
// нэрийг шууд бичихийг хориглоно — `npm run check:brand` үүнийг барина.
//
// Яагаад: өмнө нь брэндийн нэр 37 файлд тархсан байсан тул upstream-ээс
// merge хийх бүрд тэдгээр файл зохиомлоор зөрж, conflict үүсгэдэг байв.
// Хэмжилтээр «бүгд өөр» гэсэн 43 файлын 35 нь ердөө гарчиг дахь нэг мөрөөр
// л ялгаатай байсан. Тэрхүү зөрүүг эндээс тасална.
//
// Дэлгэрэнгүй: vision-gerege-mn/UI_CORE_PLAN.md §3.

export const brand = {
  /** Бүтэн нэр — гарчиг, metadata, landing-ийн default. */
  name: 'Gerege Template Platform V3.0',

  /** Богино нэр — PWA `short_name`, iOS-ийн дүрсний доорх бичиг (12 тэмдэгт хүртэл). */
  short: 'Gerege',

  /** Үндсэн домэйн (схемгүй). */
  domain: 'template.gerege.mn',

  /** Нийтийн баримтын сайт — хэлний угтвар нэмэхэд бэлэн, ард нь `/`-тай. */
  docsUrl: 'https://docs.gerege.mn/',

  /**
   * Баримтын сайт БОДИТООР ямар хэлтэй вэ — `docs-site/mkdocs.yml`-ийн
   * `i18n.languages` жагсаалттай ижил байлгана. Эхнийх нь үндсэн локал
   * (угтваргүй). Энд байхгүй хэлээр интерфэйс ажиллаж байвал хоёр дахь хэл
   * рүү уналт хийнэ — байхгүй локал руу явуулж 404 гаргахгүйн тулд.
   */
  docsLangs: ['mn', 'en', 'ru', 'zh'],

  /** PWA `theme_color` ба `viewport.themeColor` — globals.css-ийн брэнд токентой ижил. */
  themeColor: '#0064E1',

  /** Нэг өгүүлбэрийн тайлбар — PWA manifest ба `<meta description>`. */
  description:
    'Цахим үйлчилгээг бүтээх суурь — eID-д суурилсан, AI-аар хүчирхэгжсэн',

  /** Эзэмшигч байгууллага — footer, эрх зүйн мэдэгдэл. */
  owner: 'Gerege Systems ХХК',
} as const;

/**
 * Хуудасны `<title>` — «<хуудас> — <брэнд>» гэсэн нэгдсэн загвар.
 *
 *     export const metadata = { title: pageTitle('Профайл') };
 *     // → "Профайл — Gerege Template Platform V3.0"
 *
 * Аргумент өгөхгүй бол зөвхөн брэндийн нэрийг буцаана (нүүр хуудас).
 */
export function pageTitle(page?: string): string {
  return page ? `${page} — ${brand.name}` : brand.name;
}
