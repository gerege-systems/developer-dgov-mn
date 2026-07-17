// Gerege Template Version 27.0
// Нүүр хуудасны (landing + auth бүрхүүл) ажиллаж байх үед тохируулдаг
// харагдацын хуваалцсан төрөл + туслахууд. Backend нь энэ баримтыг opaque
// JSON-оор хадгалдаг тул схемийг ЭНД (frontend) эзэмшинэ. Сервер (RSC) болон
// клиент (админ засварлагч, LandingContent) хоёул импортолдог тул энэ файл
// server-only ЗҮЙЛ импортлохгүй — цэвэр TS.

import type { Lang } from './i18n';

/** Хоёр хэлтэй текст — mn/en хосоор хадгална (i18n дүрэм). */
export interface LocalizedText {
  mn: string;
  en: string;
}

export interface LandingTheme {
  // Өнгө — globals.css-ийн CSS хувьсагчид буулгана. Хоосон = өгөгдмөл (light/dark хэвээр).
  colors: {
    danBlue: string;
    danBlueHover: string;
    gold: string;
    bg: string;
    surface: string;
    fg: string;
    border: string;
  };
  // Фонт stack — --font-*-stack хувьсагчид. Хоосон = next/font өгөгдмөл.
  fonts: {
    displayStack: string;
    bodyStack: string;
    monoStack: string;
  };
  // Хэмжээ — px эсвэл дурын CSS утга. Хоосон = өгөгдмөл.
  sizes: {
    titlePx: string;
    bodyPx: string;
    radiusCard: string;
    radiusInput: string;
    topbarH: string;
  };
  weights: {
    title: string;
  };
}

export interface LandingNavItem {
  label: LocalizedText;
  href: string;
  external: boolean;
  show: boolean;
}

export type LandingButtonVariant = 'primary' | 'secondary';

export interface LandingButton {
  id: string;
  label: LocalizedText;
  action: string; // route ('/login'), BFF ('/api/auth/sso/start') эсвэл гадаад URL
  variant: LandingButtonVariant;
  icon: string; // lucide нэр (allowlist-аас); танихгүй бол зураггүй
  show: boolean;
  order: number;
}

export interface LandingBadge {
  label: LocalizedText;
  show: boolean;
}

export interface LandingConfig {
  theme: LandingTheme;
  rawCss: string;
  brand: { name: LocalizedText; logoUrl: string };
  nav: LandingNavItem[];
  content: { title: LocalizedText; lede: LocalizedText; helper: LocalizedText };
  buttons: LandingButton[];
  badges: LandingBadge[];
  footer: { text: LocalizedText };
}

/** DEFAULT_LANDING_CONFIG нь одоогийн (гар хүрээгүй) нүүрний харагдац. Theme
 *  хоосон = globals.css-ийн өгөгдмөл; агуулга нь одоогийн mn текст + en орчуулга. */
export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  theme: {
    colors: { danBlue: '', danBlueHover: '', gold: '', bg: '', surface: '', fg: '', border: '' },
    fonts: { displayStack: '', bodyStack: '', monoStack: '' },
    sizes: { titlePx: '', bodyPx: '', radiusCard: '', radiusInput: '', topbarH: '' },
    weights: { title: '' },
  },
  rawCss: '',
  brand: { name: { mn: 'Gerege Template', en: 'Gerege Template' }, logoUrl: '/brand.webp' },
  nav: [],
  content: {
    title: { mn: 'Gerege Template', en: 'Gerege Template' },
    lede: {
      mn: 'Gerege Template (chi + pgx) дээр суурилсан жишээ апп. eID апп-аараа QR кодыг уншуулан нэвтэрч, профайл болон аюулгүй байдлын тохиргоогоо нэг дороос удирдана.',
      en: 'A sample app built on Gerege Template (chi + pgx). Scan the QR code with your eID app to sign in and manage your profile and security settings in one place.',
    },
    helper: {
      mn: 'Нэвтрэлт нь eID аппаар баталгаажиж, богино TTL-тэй access болон урт TTL-тэй refresh JWT хослолоор хийгдэнэ.',
      en: 'Sign-in is verified by the eID app and uses a short-TTL access plus long-TTL refresh JWT pair.',
    },
  },
  buttons: [
    { id: 'eid', label: { mn: 'eID-ээр нэвтрэх', en: 'Sign in with eID' }, action: '/login', variant: 'primary', icon: 'LogIn', show: true, order: 1 },
    { id: 'sso', label: { mn: 'Gerege SSO-гоор нэвтрэх', en: 'Sign in with Gerege SSO' }, action: '/api/auth/sso/start', variant: 'secondary', icon: 'ShieldCheck', show: true, order: 2 },
  ],
  badges: [
    { label: { mn: 'JWT', en: 'JWT' }, show: true },
    { label: { mn: 'eID', en: 'eID' }, show: true },
    { label: { mn: 'chi + pgx', en: 'chi + pgx' }, show: true },
    { label: { mn: 'TLS 1.3', en: 'TLS 1.3' }, show: true },
  ],
  footer: { text: { mn: '© 2026 Gerege Systems · Gerege Template', en: '© 2026 Gerege Systems · Gerege Template' } },
};

/** pickText нь хоёр хэлтэй текстээс одоогийн хэлийг сонгоно (mn fallback). */
export function pickText(t: LocalizedText | undefined, lang: Lang): string {
  if (!t) return '';
  return (lang === 'en' ? t.en : t.mn) || t.mn || t.en || '';
}

/** px нь зөвхөн тоон утганд 'px' залгана; бусад CSS утгыг хэвээр үлдээнэ. */
function px(v: string): string {
  const s = (v || '').trim();
  return /^\d+(\.\d+)?$/.test(s) ? `${s}px` : s;
}

// Theme талбар → CSS хувьсагчийн буулгалт. Хоосон утгыг алгасна.
const COLOR_VARS: Array<[keyof LandingTheme['colors'], string]> = [
  ['danBlue', '--dan-blue'],
  ['danBlueHover', '--dan-blue-hover'],
  ['gold', '--gold'],
  ['bg', '--bg'],
  ['surface', '--surface'],
  ['fg', '--fg'],
  ['border', '--border'],
];
const FONT_VARS: Array<[keyof LandingTheme['fonts'], string]> = [
  ['displayStack', '--font-display-stack'],
  ['bodyStack', '--font-body-stack'],
  ['monoStack', '--font-mono-stack'],
];
const SIZE_VARS: Array<[keyof LandingTheme['sizes'], string, boolean]> = [
  ['radiusCard', '--radius-card', true],
  ['radiusInput', '--radius-input', true],
  ['topbarH', '--topbar-h', true],
];

/** cssVarsBody нь theme-ээс хоосон биш утгуудыг `--var: value;` мөр болгоно. */
export function cssVarsBody(theme: LandingTheme): string {
  const parts: string[] = [];
  for (const [key, cssVar] of COLOR_VARS) {
    const v = (theme.colors?.[key] || '').trim();
    if (v) parts.push(`${cssVar}: ${v};`);
  }
  for (const [key, cssVar] of FONT_VARS) {
    const v = (theme.fonts?.[key] || '').trim();
    if (v) parts.push(`${cssVar}: ${v};`);
  }
  for (const [key, cssVar, asPx] of SIZE_VARS) {
    const v = (theme.sizes?.[key] || '').trim();
    if (v) parts.push(`${cssVar}: ${asPx ? px(v) : v};`);
  }
  return parts.join(' ');
}

/** cssVarsStyle нь theme-ийг React inline style объект болгоно (CSS custom
 *  property-ууд) — админ засварлагчийн preview-д хувьсагчдыг тухайн контейнерт
 *  л scope хийж, глобал <style> шахахгүйгээр харуулахад ашиглана. */
export function cssVarsStyle(theme: LandingTheme): Record<string, string> {
  const s: Record<string, string> = {};
  for (const [key, cssVar] of COLOR_VARS) {
    const v = (theme.colors?.[key] || '').trim();
    if (v) s[cssVar] = v;
  }
  for (const [key, cssVar] of FONT_VARS) {
    const v = (theme.fonts?.[key] || '').trim();
    if (v) s[cssVar] = v;
  }
  for (const [key, cssVar, asPx] of SIZE_VARS) {
    const v = (theme.sizes?.[key] || '').trim();
    if (v) s[cssVar] = asPx ? px(v) : v;
  }
  return s;
}

/** sanitizeCss — админы advanced CSS-ээс <style>/script таслах, @import,
 *  expression(), javascript: векторуудыг арилгана (backend-ийн толь). */
export function sanitizeCss(css: string): string {
  let out = (css || '').replace(/\0/g, '');
  for (const tok of ['</style', '<!--', '-->', '</script', '<script', '@import', 'expression(', 'javascript:']) {
    out = stripFold(out, tok);
  }
  return out.slice(0, 20 * 1024);
}

function stripFold(s: string, sub: string): string {
  if (!sub) return s;
  const ls = s.toLowerCase();
  const lsub = sub.toLowerCase();
  let out = '';
  let i = 0;
  for (;;) {
    const j = ls.indexOf(lsub, i);
    if (j < 0) {
      out += s.slice(i);
      break;
    }
    out += s.slice(i, j);
    i = j + sub.length;
  }
  return out;
}

/** themeCss нь SigninShell-д шахах бүрэн <style> агуулгыг угсарна: theme
 *  хувьсагчид (light + dark аль алинд ижил утгаар — тохируулсан өнгө хоёр
 *  горимд ч харагдана) + ариутгасан advanced CSS. SigninShell зөвхөн landing/
 *  auth хуудаснуудад render хийгддэг тул rawCss нь апп-ын хуудсанд алдагдахгүй. */
export function themeCss(config: LandingConfig): string {
  const body = cssVarsBody(config.theme);
  let css = '';
  if (body) {
    css += `.signin-shell{${body}}\n`;
    css += `:root[data-theme="dark"] .signin-shell{${body}}\n`;
  }
  const raw = sanitizeCss(config.rawCss || '');
  if (raw) css += `${raw}\n`;
  return css;
}

/** normalizeConfig нь хэсэгчилсэн/дутуу баримтыг өгөгдмөлөөр дүүргэж бүрэн
 *  LandingConfig болгоно — DB fail-open (`{}`) эсвэл хуучин баримт ирсэн ч
 *  хуудас эвдрэхгүй. */
export function normalizeConfig(raw: Partial<LandingConfig> | null | undefined): LandingConfig {
  const d = DEFAULT_LANDING_CONFIG;
  const r = raw ?? {};
  return {
    theme: {
      colors: { ...d.theme.colors, ...(r.theme?.colors ?? {}) },
      fonts: { ...d.theme.fonts, ...(r.theme?.fonts ?? {}) },
      sizes: { ...d.theme.sizes, ...(r.theme?.sizes ?? {}) },
      weights: { ...d.theme.weights, ...(r.theme?.weights ?? {}) },
    },
    rawCss: r.rawCss ?? d.rawCss,
    brand: {
      name: { ...d.brand.name, ...(r.brand?.name ?? {}) },
      logoUrl: r.brand?.logoUrl ?? d.brand.logoUrl,
    },
    nav: Array.isArray(r.nav) ? r.nav : d.nav,
    content: {
      title: { ...d.content.title, ...(r.content?.title ?? {}) },
      lede: { ...d.content.lede, ...(r.content?.lede ?? {}) },
      helper: { ...d.content.helper, ...(r.content?.helper ?? {}) },
    },
    buttons: Array.isArray(r.buttons) ? r.buttons : d.buttons,
    badges: Array.isArray(r.badges) ? r.badges : d.badges,
    footer: { text: { ...d.footer.text, ...(r.footer?.text ?? {}) } },
  };
}
