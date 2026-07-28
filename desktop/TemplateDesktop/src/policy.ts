// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Шилжилт (navigation) ба эрхийн бодлого. Electron-оос хамаарахгүй цэвэр
// функцууд — main процесс эдгээрийн шийдвэрийг л хэрэгжүүлнэ.

import { ALLOWED_PERMISSIONS, AUTH_HOSTS } from './config';

/**
 * Шилжилтийн шийдвэр:
 *  - `allow`    — цонхон дотор ачаална (аппын origin ба нэвтрэлтийн хостууд)
 *  - `external` — системийн хөтчөөр нээнэ (гадаад холбоос, custom scheme)
 *  - `block`    — огт хийхгүй (javascript:, data: гэх мэт)
 */
export type NavDecision = 'allow' | 'external' | 'block';

/** Хост нь загварт тохирч байна уу. Цэгээр эхэлсэн загвар = дэд домэйн бүхэлдээ. */
export function hostMatches(host: string, pattern: string): boolean {
  const h = host.toLowerCase();
  const p = pattern.toLowerCase();
  if (p.startsWith('.')) return h === p.slice(1) || h.endsWith(p);
  return h === p;
}

/** Нэвтрэлт / интеграцийн урсгалд цонхон дотор зөвшөөрөгдөх хост эсэх. */
export function isAuthHost(host: string): boolean {
  return AUTH_HOSTS.some((pattern) => hostMatches(host, pattern));
}

/**
 * Хаягийг ангилна. `appOrigin` нь тухайн үед ачаалсан серверийн origin.
 *
 * Аппын дотоод хуудсууд (offline.html, server.html) нь `file:` схемтэй тул
 * зөвшөөрөгдөнө — тэдгээрийг зөвхөн main процесс өөрөө ачаалдаг.
 */
export function classifyURL(target: string, appOrigin: string): NavDecision {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return 'block';
  }

  switch (url.protocol) {
    case 'file:':
      return 'allow';
    case 'about:':
      // window.open() эхлээд about:blank үүсгээд дараа нь шилждэг (OAuth popup).
      return url.pathname === 'blank' ? 'allow' : 'block';
    case 'blob:':
      // blob:<origin>/<uuid> — зөвхөн аппын өөрийн үүсгэсэн blob (файл татах,
      // урьдчилан харах). URL.origin нь blob дээр "null" буцаадаг тул мөрөөр шалгана.
      return target.startsWith(`blob:${appOrigin}/`) ? 'allow' : 'block';
    case 'javascript:':
    case 'data:':
    case 'vbscript:':
      return 'block';
    case 'http:':
    case 'https:':
      if (url.origin === appOrigin) return 'allow';
      return isAuthHost(url.hostname) ? 'allow' : 'external';
    default:
      // mailto:, tel:, geregesmartid:// зэрэг — үйлдлийн систем шийдэг.
      return 'external';
  }
}

/**
 * Эрхийн хүсэлтийг шийднэ. Зөвхөн аппын origin, зөвхөн цагаан жагсаалт.
 * Камерыг тусад нь хаана — апп камер хэрэглэдэггүй (Permissions-Policy-той нийцнэ).
 */
export function allowPermission(
  permission: string,
  requestingOrigin: string,
  appOrigin: string,
  mediaTypes?: readonly string[],
): boolean {
  if (requestingOrigin !== appOrigin) return false;
  if (!ALLOWED_PERMISSIONS.includes(permission)) return false;
  if (permission === 'media' && mediaTypes?.includes('video')) return false;
  return true;
}

/**
 * Electron-ы User-Agent-аас бүрхүүлийн шошгыг хасна.
 *
 * Шалтгаан: Google/Dropbox зэрэг OAuth үйлчилгээ "Electron/…" тэмдэглэгээтэй
 * агентыг таньж нэвтрэлтийг татгалздаг. Үлдэх нь Chromium-ын жинхэнэ хувилбар
 * тул хөтчийн чадвар тайлагналт үнэн хэвээр — зөвхөн бүрхүүлийн нэр хасагдана.
 */
export function desktopUserAgent(rawUA: string, appName: string): string {
  const escaped = appName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return rawUA
    .replace(/\s*Electron\/\S+/g, '')
    .replace(new RegExp(`\\s*${escaped}\\/\\S+`, 'g'), '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
