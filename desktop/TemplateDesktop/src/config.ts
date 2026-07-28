// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Аппын тохиргоо. Энэ файл electron-оос хамаарахгүй — цэвэр функцууд тул
// `node --test`-ээр шууд шалгагдана.

/** Үйлдвэрлэлийн жишиг deployment. */
export const DEFAULT_APP_URL = 'https://template.gerege.mn';

/** Локал хөгжүүлэлт — `npm run dev` (frontend/) 3000 порт дээр өргөнө. */
export const DEV_APP_URL = 'http://localhost:3000';

/** "Сервер солих" цонхонд харагдах бэлэн сонголтууд. */
export const SERVER_PRESETS: ReadonlyArray<{ label: string; url: string }> = [
  { label: 'Үйлдвэрлэл — template.gerege.mn', url: DEFAULT_APP_URL },
  { label: 'Локал хөгжүүлэлт — localhost:3000', url: DEV_APP_URL },
];

/**
 * Нэвтрэлт / интеграцийн урсгалд цонхон дотор шилжихийг зөвшөөрөх хостууд.
 *
 * Эдгээр урсгал нь аппын cookie сав (session) дээр тулгуурладаг тул системийн
 * хөтчид гаргаж болохгүй: OAuth callback нь эргээд аппын origin дээр cookie
 * бичдэг. Цэгээр эхэлсэн загвар нь дэд домэйныг бүхэлд нь хамарна.
 *
 *  - `.gerege.mn`      — Gerege SSO (sso.gerege.mn) ба бусад дотоод үйлчилгээ
 *  - `eidmongolia.mn`  — eID Mongolia Smart-ID баталгаажуулалт
 *  - `accounts.google.com` — Google нэвтрэлт / Drive · Meet интеграцийн зөвшөөрөл
 *  - `.dropbox.com`    — Dropbox интеграцийн зөвшөөрөл
 */
export const AUTH_HOSTS: readonly string[] = [
  '.gerege.mn',
  'gerege.mn',
  'eidmongolia.mn',
  '.eidmongolia.mn',
  'accounts.google.com',
  'accounts.youtube.com',
  'dropbox.com',
  '.dropbox.com',
];

/** Аппын origin дээр л зөвшөөрөгдөх хөтчийн эрхүүд. */
export const ALLOWED_PERMISSIONS: readonly string[] = [
  'media', // микрофон — AI чат, дуут мессеж, амьд орчуулга (камер тусад нь хаагдана)
  'clipboard-sanitized-write',
  'notifications',
  'fullscreen',
];

/** Хадгалагдсан төлөвийн бүтэц (userData/state.json). */
export type DesktopState = {
  serverURL?: string;
  bounds?: { x?: number; y?: number; width: number; height: number };
  maximized?: boolean;
};

/**
 * Ачаалах хаягийг тодорхойлно. Эрэмбэ: орчны хувьсагч → хадгалсан сонголт →
 * үндсэн утга. Буруу/аюултай хаягийг чимээгүй хаяж үндсэн утга руу буцна.
 */
export function resolveAppURL(env: string | undefined, stored: string | undefined): string {
  return normalizeAppURL(env) ?? normalizeAppURL(stored) ?? DEFAULT_APP_URL;
}

/**
 * Хэрэглэгчийн оруулсан хаягийг цэгцэлнэ: зөвхөн http/https, зөвхөн origin
 * (зам, query, fragment-ыг хасна). Тохирохгүй бол `null`.
 */
export function normalizeAppURL(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Схемгүй бичсэн бол https гэж үзнэ ("template.gerege.mn" → https://…). Гэхдээ
  // зөвхөн хостын дүр төрхтэй байвал — эс тэгвэл ямар ч утга (жишээ нь санамсаргүй
  // үг) хүчинтэй IDN хост болж хувирч, ойлгомжгүй origin руу аваачна.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
  if (!hasScheme) {
    const bareHost = (trimmed.split('/')[0] ?? '').split(':')[0] ?? '';
    if (bareHost !== 'localhost' && !bareHost.includes('.')) return null;
  }
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname) return null;
  return url.origin;
}
