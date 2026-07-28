// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Аппын эхлэх цэг. Энэ бүрхүүл нь web аппыг 1:1-ээр ачаалдаг — өөрийн UI
// байхгүй, зөвхөн цонх, цэс, аюулгүй байдлын бодлого, серверийн сонголт.

import { app, BrowserWindow, ipcMain, session } from 'electron';
import { normalizeAppURL, resolveAppURL, SERVER_PRESETS } from './config';
import { buildMenu } from './menu';
import { allowPermission, desktopUserAgent } from './policy';
import { readState, writeState } from './store';
import {
  activeAppWindow,
  appWindows,
  attachNavigationPolicy,
  createMainWindow,
  getAppOrigin,
  openServerWindow,
  reloadAllWindows,
  reloadApp,
  setAppOrigin,
} from './windows';

/** Орчны хувьсагчаар тогтоосон эсэх — тийм бол цэсний сонголт түр зуурынх. */
const envURL = normalizeAppURL(process.env.GEREGE_APP_URL);

// Нэг л хувь ажиллана — хоёр дахь удаа нээхэд байгаа цонх фокус авна.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = activeAppWindow();
    if (!win) {
      createMainWindow(getAppOrigin());
      return;
    }
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  void app.whenReady().then(start);
}

function start(): void {
  // preload-д хүрэх цорын ганц зам (sandbox-д app модуль байхгүй).
  process.env.GEREGE_APP_VERSION = app.getVersion();

  setAppOrigin(resolveAppURL(process.env.GEREGE_APP_URL, readState().serverURL));

  const ua = desktopUserAgent(session.defaultSession.getUserAgent(), app.getName());
  app.userAgentFallback = ua;
  session.defaultSession.setUserAgent(ua);

  applyPermissionPolicy(session.defaultSession);

  // WebContents бүрд бодлогыг ЯГ НЭГ УДАА тогтооно (popup цонхыг ч хамарна).
  app.on('web-contents-created', (_event, contents) => attachNavigationPolicy(contents));

  registerIPC();
  buildMenu();

  const win = createMainWindow(getAppOrigin());
  if (process.env.GEREGE_DEVTOOLS === '1') win.webContents.openDevTools({ mode: 'detach' });

  app.on('activate', () => {
    if (appWindows().length === 0) createMainWindow(getAppOrigin());
  });
}

// macOS дээр бүх цонх хаагдсан ч апп Dock-д үлдэнэ (жишиг зан төлөв).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/**
 * Хөтчийн эрх: зөвхөн аппын origin, зөвхөн цагаан жагсаалт.
 * Микрофон нээлттэй (AI чат, амьд орчуулга), камер/байршил хаалттай.
 */
function applyPermissionPolicy(ses: Electron.Session): void {
  ses.setPermissionRequestHandler((_contents, permission, callback, details) => {
    const origin = normalizeAppURL(details.requestingUrl) ?? '';
    // mediaTypes зөвхөн media хүсэлтэд байдаг — union-ыг нарийсгана.
    const mediaTypes = 'mediaTypes' in details ? details.mediaTypes : undefined;
    callback(allowPermission(permission, origin, getAppOrigin(), mediaTypes));
  });

  ses.setPermissionCheckHandler((_contents, permission, requestingOrigin) =>
    allowPermission(permission, normalizeAppURL(requestingOrigin) ?? '', getAppOrigin()),
  );

  // HID / Serial / USB төхөөрөмж — апп хэрэглэдэггүй.
  ses.setDevicePermissionHandler(() => false);
}

/** Аппын ДОТООД (file://) хуудаснаас ирсэн эсэхийг шалгана. */
function fromInternalPage(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): boolean {
  return (event.senderFrame?.url ?? '').startsWith('file://');
}

function registerIPC(): void {
  ipcMain.on('shell:retry', (event) => {
    if (!fromInternalPage(event)) return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) reloadApp(win);
  });

  ipcMain.on('shell:close', (event) => {
    if (!fromInternalPage(event)) return;
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.on('shell:open-server', (event) => {
    if (!fromInternalPage(event)) return;
    openServerWindow(BrowserWindow.fromWebContents(event.sender));
  });

  ipcMain.handle('shell:server-info', (event) => {
    if (!fromInternalPage(event)) return null;
    return {
      current: getAppOrigin(),
      presets: SERVER_PRESETS.map((p) => ({ ...p })),
      // GEREGE_APP_URL тогтоосон бол хадгалсан утга дараагийн ажиллагаанд хүчингүй.
      envLocked: envURL !== null,
    };
  });

  ipcMain.handle('shell:set-server', (event, raw: unknown) => {
    if (!fromInternalPage(event)) return false;
    const origin = normalizeAppURL(typeof raw === 'string' ? raw : '');
    if (!origin) return false;

    writeState({ serverURL: origin });
    setAppOrigin(envURL ?? origin);
    BrowserWindow.fromWebContents(event.sender)?.close();
    reloadAllWindows();
    return true;
  });
}
