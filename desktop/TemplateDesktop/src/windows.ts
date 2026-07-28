// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Цонх үүсгэх, шилжилтийн бодлогыг хэрэгжүүлэх давхарга.

import { BrowserWindow, shell, screen, type WebContents } from 'electron';
import path from 'node:path';
import { classifyURL } from './policy';
import { readState, writeState } from './store';

const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
// Web апп нь responsive тул нарийн өргөнд мобайл layout руу шилжинэ —
// доод хязгаарыг зориуд бага байлгав.
const MIN_WIDTH = 420;
const MIN_HEIGHT = 560;

const STATIC_DIR = path.join(__dirname, '..', 'static');
const PRELOAD = path.join(__dirname, 'preload.js');

/** Ачаалж буй серверийн origin — шилжилтийн бодлогын гол хэмжүүр. */
let appOrigin = '';

/** Туслах (тохиргооны) цонхнуудын webContents id — аппын цонхноос ялгахад. */
const helperContents = new Set<number>();

export function setAppOrigin(origin: string): void {
  appOrigin = origin;
}

export function getAppOrigin(): string {
  return appOrigin;
}

/** Аппын цонхнууд (туслах цонхыг оруулахгүй). */
export function appWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows().filter((w) => !helperContents.has(w.webContents.id));
}

/** Фокустай аппын цонх, эс бөгөөс хамгийн сүүлийнх. */
export function activeAppWindow(): BrowserWindow | null {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !helperContents.has(focused.webContents.id)) return focused;
  const windows = appWindows();
  return windows[windows.length - 1] ?? null;
}

/**
 * Шилжилт, цонх нээх, эрхийн бодлогыг тухайн webContents дээр тогтооно.
 * Гадаад холбоос системийн хөтчөөр нээгдэнэ — аппын cookie сав хамгаалагдана.
 */
export function attachNavigationPolicy(contents: WebContents): void {
  contents.on('will-navigate', (event, url) => {
    const decision = classifyURL(url, appOrigin);
    if (decision === 'allow') return;
    event.preventDefault();
    if (decision === 'external') void openExternal(url);
  });

  contents.setWindowOpenHandler(({ url }) => {
    const decision = classifyURL(url, appOrigin);
    if (decision === 'allow') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          minWidth: MIN_WIDTH,
          minHeight: MIN_HEIGHT,
          webPreferences: baseWebPreferences(),
        },
      };
    }
    if (decision === 'external') void openExternal(url);
    return { action: 'deny' };
  });

  // <webview> ашигладаггүй — оролдлого бүрийг таслана.
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });

  // Ачаалж чадаагүй үед офлайн хуудас руу (тасалдсан хүсэлтийг тооцохгүй).
  contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (errorCode === -3) return; // ERR_ABORTED — хэрэглэгч өөрөө тасалсан
    if (validatedURL.startsWith('file://')) return;
    const win = BrowserWindow.fromWebContents(contents);
    if (win) showOffline(win, errorDescription || String(errorCode));
  });
}

async function openExternal(url: string): Promise<void> {
  try {
    await shell.openExternal(url);
  } catch {
    // Схемийг зохицуулах апп байхгүй байж болно (жишээ нь geregesmartid://) —
    // энэ нь алдаа биш, чимээгүй алгасна.
  }
}

function baseWebPreferences(): Electron.WebPreferences {
  return {
    preload: PRELOAD,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webviewTag: false,
    // Монгол хэлний толь байхгүй тул spellcheck-ийг унтраав (толь татахгүй).
    spellcheck: false,
  };
}

/** Дэлгэцийн ажлын талбайд багтаах — өмнөх дэлгэц салсан байж болно. */
function fitToScreen(bounds: { x?: number; y?: number; width: number; height: number }) {
  const area = screen.getDisplayMatching({
    x: bounds.x ?? 0,
    y: bounds.y ?? 0,
    width: bounds.width,
    height: bounds.height,
  }).workArea;

  const width = Math.min(bounds.width, area.width);
  const height = Math.min(bounds.height, area.height);
  const x = bounds.x === undefined ? undefined : Math.min(Math.max(bounds.x, area.x), area.x + area.width - width);
  const y = bounds.y === undefined ? undefined : Math.min(Math.max(bounds.y, area.y), area.y + area.height - height);
  return { x, y, width, height };
}

export function createMainWindow(url: string): BrowserWindow {
  const state = readState();
  const saved = state.bounds ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  const bounds = fitToScreen(saved);

  const win = new BrowserWindow({
    ...bounds,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    title: 'Gerege Template',
    // Хуудасны өнгө ачаалагдах хүртэл цагаан анивчихаас сэргийлнэ.
    backgroundColor: '#0b1220',
    webPreferences: baseWebPreferences(),
  });

  if (state.maximized) win.maximize();

  win.once('ready-to-show', () => win.show());

  // macOS-ийн хоёр хуруутай зөөлт — хуудас ухрах / урагшлах.
  win.on('swipe', (_event, direction) => {
    if (direction === 'left' && win.webContents.navigationHistory.canGoBack()) {
      win.webContents.navigationHistory.goBack();
    } else if (direction === 'right' && win.webContents.navigationHistory.canGoForward()) {
      win.webContents.navigationHistory.goForward();
    }
  });

  const persistBounds = () => {
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    writeState({ maximized: win.isMaximized(), ...(win.isMaximized() ? {} : { bounds: win.getNormalBounds() }) });
  };
  win.on('resize', persistBounds);
  win.on('move', persistBounds);
  win.on('close', persistBounds);

  // attachNavigationPolicy-г main.ts дэх `web-contents-created` тогтоодог —
  // энд давхар холбовол гадаад холбоос хоёр удаа нээгдэнэ.
  void win.loadURL(url);
  return win;
}

/**
 * Сүлжээ тасарсан / сервер хүрэхгүй үеийн дотоод хуудас. Цонх аппын цонх хэвээр
 * үлдэнэ — "Дахин оролдох" дарахад мөн энэ цонхон дотор апп сэргэнэ.
 *
 * Тэмдэглэл: офлайн хуудсанд preload-internal ачаалагдана — цонх үүсэх үедээ
 * тогтоогддог тул main процесс IPC-г илгээгчийн file:// хаягаар шалгана.
 */
export function showOffline(win: BrowserWindow, reason: string): void {
  void win.loadFile(path.join(STATIC_DIR, 'offline.html'), {
    query: { origin: appOrigin, reason },
  });
}

/** Офлайн хуудаснаас гарч жинхэнэ апп руу буцна. */
export function reloadApp(win: BrowserWindow): void {
  void win.loadURL(appOrigin);
}

let serverWindow: BrowserWindow | null = null;

/** "Сервер солих…" — жижиг дотоод тохиргооны цонх. */
export function openServerWindow(parent: BrowserWindow | null): BrowserWindow {
  if (serverWindow && !serverWindow.isDestroyed()) {
    serverWindow.focus();
    return serverWindow;
  }

  const win = new BrowserWindow({
    width: 520,
    height: 420,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Сервер солих',
    parent: parent ?? undefined,
    modal: false,
    show: false,
    backgroundColor: '#0b1220',
    webPreferences: baseWebPreferences(),
  });

  helperContents.add(win.webContents.id);
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    serverWindow = null;
  });

  void win.loadFile(path.join(STATIC_DIR, 'server.html'));
  serverWindow = win;
  return win;
}

/** Аппын дотор замаар шилжинэ (цэсний хурдан холбоосууд). */
export function navigateTo(routePath: string): void {
  const win = activeAppWindow() ?? createMainWindow(appOrigin);
  void win.loadURL(new URL(routePath, appOrigin).toString());
  win.focus();
}

/** Бүх аппын цонхыг (шинэ) сервер рүү шилжүүлнэ. */
export function reloadAllWindows(): void {
  const windows = appWindows();
  if (windows.length === 0) {
    createMainWindow(appOrigin);
    return;
  }
  for (const win of windows) void win.loadURL(appOrigin);
}
