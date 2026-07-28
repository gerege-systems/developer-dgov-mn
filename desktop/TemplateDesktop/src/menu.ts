// Gerege Template Platform V3.0
// Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

// Системийн цэс. Web агуулгыг өөрчлөхгүй — зөвхөн хөтчийн оронд desktop-ийн
// жишиг үйлдлүүдийг (буцах, томсгох, хэвлэх, шилжих) native байдлаар нээнэ.

import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron';
import { activeAppWindow, createMainWindow, getAppOrigin, navigateTo, openServerWindow } from './windows';

const DOCS_URL = 'https://gerege-systems.github.io/template-gerege-mn/';
const GITHUB_URL = 'https://github.com/gerege-systems/template-gerege-mn';
const HELP_URL = 'https://dgov.mn/help';

const isMac = process.platform === 'darwin';

function withActiveWindow(fn: (win: Electron.BrowserWindow) => void): () => void {
  return () => {
    const win = activeAppWindow();
    if (win) fn(win);
  };
}

export function buildMenu(): void {
  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [{
        label: app.getName(),
        submenu: [
          { role: 'about', label: `${app.getName()} тухай` },
          { type: 'separator' },
          {
            label: 'Тохиргоо…',
            accelerator: 'CmdOrCtrl+,',
            click: () => navigateTo('/me/settings'),
          },
          {
            label: 'Сервер солих…',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => openServerWindow(activeAppWindow()),
          },
          { type: 'separator' },
          { role: 'services', label: 'Үйлчилгээ' },
          { type: 'separator' },
          { role: 'hide', label: `${app.getName()}-ыг нуух` },
          { role: 'hideOthers', label: 'Бусдыг нуух' },
          { role: 'unhide', label: 'Бүгдийг харуулах' },
          { type: 'separator' },
          { role: 'quit', label: 'Гарах' },
        ],
      }]
    : [];

  const fileMenu: MenuItemConstructorOptions = {
    label: 'Файл',
    submenu: [
      {
        label: 'Шинэ цонх',
        accelerator: 'CmdOrCtrl+N',
        click: () => createMainWindow(getAppOrigin()),
      },
      { type: 'separator' },
      {
        label: 'Хэвлэх…',
        accelerator: 'CmdOrCtrl+P',
        click: withActiveWindow((win) => win.webContents.print()),
      },
      { type: 'separator' },
      ...(isMac
        ? ([{ role: 'close', label: 'Цонх хаах' }] as MenuItemConstructorOptions[])
        : ([
            {
              label: 'Тохиргоо…',
              accelerator: 'CmdOrCtrl+,',
              click: () => navigateTo('/me/settings'),
            },
            {
              label: 'Сервер солих…',
              accelerator: 'CmdOrCtrl+Shift+S',
              click: () => openServerWindow(activeAppWindow()),
            },
            { type: 'separator' },
            { role: 'quit', label: 'Гарах' },
          ] as MenuItemConstructorOptions[])),
    ],
  };

  const editMenu: MenuItemConstructorOptions = {
    label: 'Засах',
    submenu: [
      { role: 'undo', label: 'Буцаах' },
      { role: 'redo', label: 'Дахин хийх' },
      { type: 'separator' },
      { role: 'cut', label: 'Тасалж авах' },
      { role: 'copy', label: 'Хуулах' },
      { role: 'paste', label: 'Буулгах' },
      ...(isMac
        ? ([{ role: 'pasteAndMatchStyle', label: 'Загварт тааруулж буулгах' }] as MenuItemConstructorOptions[])
        : []),
      { role: 'delete', label: 'Устгах' },
      { type: 'separator' },
      { role: 'selectAll', label: 'Бүгдийг сонгох' },
    ],
  };

  const viewMenu: MenuItemConstructorOptions = {
    label: 'Харах',
    submenu: [
      { role: 'reload', label: 'Дахин ачаалах' },
      { role: 'forceReload', label: 'Хүчээр дахин ачаалах' },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Бодит хэмжээ' },
      { role: 'zoomIn', label: 'Томсгох' },
      { role: 'zoomOut', label: 'Жижигрүүлэх' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Бүтэн дэлгэц' },
      { type: 'separator' },
      { role: 'toggleDevTools', label: 'Хөгжүүлэгчийн хэрэгсэл' },
    ],
  };

  const goMenu: MenuItemConstructorOptions = {
    label: 'Шилжих',
    submenu: [
      {
        label: 'Буцах',
        accelerator: 'CmdOrCtrl+[',
        click: withActiveWindow((win) => {
          if (win.webContents.navigationHistory.canGoBack()) win.webContents.navigationHistory.goBack();
        }),
      },
      {
        label: 'Урагш',
        accelerator: 'CmdOrCtrl+]',
        click: withActiveWindow((win) => {
          if (win.webContents.navigationHistory.canGoForward()) win.webContents.navigationHistory.goForward();
        }),
      },
      { type: 'separator' },
      { label: 'Нүүр хуудас', accelerator: 'CmdOrCtrl+Shift+H', click: () => navigateTo('/') },
      { label: 'Хяналтын самбар', click: () => navigateTo('/me/dashboard') },
      { label: 'Миний профайл', click: () => navigateTo('/me/profile') },
      { label: 'AI туслах', click: () => navigateTo('/me/ai') },
      { label: 'Мэдэгдэл', click: () => navigateTo('/me/notifications') },
      { type: 'separator' },
      { label: 'Админ самбар', click: () => navigateTo('/admin/dashboard') },
    ],
  };

  const windowMenu: MenuItemConstructorOptions = {
    label: 'Цонх',
    submenu: [
      { role: 'minimize', label: 'Багасгах' },
      { role: 'zoom', label: 'Дэлгэцэд тааруулах' },
      ...(isMac
        ? ([
            { type: 'separator' },
            { role: 'front', label: 'Бүгдийг урагш авчрах' },
          ] as MenuItemConstructorOptions[])
        : ([{ role: 'close', label: 'Хаах' }] as MenuItemConstructorOptions[])),
    ],
  };

  const helpMenu: MenuItemConstructorOptions = {
    role: 'help',
    label: 'Тусламж',
    submenu: [
      { label: 'Баримт бичиг', click: () => void shell.openExternal(DOCS_URL) },
      { label: 'GitHub репозитор', click: () => void shell.openExternal(GITHUB_URL) },
      { label: 'Тусламжийн төв', click: () => void shell.openExternal(HELP_URL) },
    ],
  };

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([...appMenu, fileMenu, editMenu, viewMenu, goMenu, windowMenu, helpMenu]),
  );
}
