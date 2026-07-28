// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Бүх цонхны preload. Ачаалж буй хуудасны схемээр хоёр өөр гүүр тавина:
//
//  - Алсын web апп (http/https) — ямар ч чадвар НЭЭХГҮЙ. Апп нь хөтөч дээрхтэй
//    1:1 ажиллах ёстой тул зөвхөн уншигдах тэмдэглэгээ өгнө.
//  - Аппын дотоод хуудсууд (file://: offline.html, server.html) — зөвхөн эдгээрт
//    бүрхүүлийн IPC нээгдэнэ. Main процесс мөн илгээгчийн file:// хаягийг
//    дахин шалгадаг тул энэ нь давхар хамгаалалт.

import { contextBridge, ipcRenderer } from 'electron';

if (location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('geregeShell', Object.freeze({
    /** Аппын хаягийг дахин ачаална (офлайн хуудасны "Дахин оролдох"). */
    retry: (): void => {
      ipcRenderer.send('shell:retry');
    },
    /** Одоогийн сервер + бэлэн сонголтуудыг авна. */
    serverInfo: (): Promise<{
      current: string;
      presets: { label: string; url: string }[];
      envLocked: boolean;
    } | null> => ipcRenderer.invoke('shell:server-info'),
    /** Серверийг солиод дахин ачаална. Хүчингүй хаяг бол `false`. */
    setServer: (url: string): Promise<boolean> => ipcRenderer.invoke('shell:set-server', url),
    /** "Сервер солих" цонхыг нээнэ (офлайн хуудаснаас). */
    openServerSettings: (): void => {
      ipcRenderer.send('shell:open-server');
    },
    /** Цонхыг хаана. */
    close: (): void => {
      ipcRenderer.send('shell:close');
    },
  }));
} else {
  contextBridge.exposeInMainWorld('geregeDesktop', Object.freeze({
    isDesktop: true,
    platform: process.platform,
    appVersion: process.env.GEREGE_APP_VERSION ?? '',
  }));
}
