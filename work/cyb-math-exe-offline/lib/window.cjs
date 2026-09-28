'use strict';

const { app, BrowserWindow, shell, ipcMain, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { mapWebUrlToAppUrl } = require('./routes.cjs');
const { restoreBounds } = require('./window-state.cjs');
const { installMenu, rememberSession, restoreProject, checkUpdates } = require('./native-app.cjs');

function isSafeExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

const LANGUAGES = new Set(['zh-Hans', 'zh-Hant', 'en']);
function readLanguage() { try { const value = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'language.json'), 'utf8')).language; return LANGUAGES.has(value) ? value : null; } catch { return null; } }
function withLanguage(rawUrl, language) { const url = new URL(rawUrl); if (LANGUAGES.has(language) && !LANGUAGES.has(url.searchParams.get('lang'))) url.searchParams.set('lang', language); return url.href; }
function attachNavigationPolicy(window, openExternal = (url) => shell.openExternal(url)) {
  window.cybLanguage = readLanguage();
  const rememberLanguage = (event, language) => {
    if (event.sender !== window.webContents || !LANGUAGES.has(language)) return;
    window.cybLanguage = language;
    if (window.cybNativeMenus) installMenu(window);
    try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(path.join(app.getPath('userData'), 'language.json'), JSON.stringify({ language })); } catch {}
  };
  ipcMain.on('cyb-language', rememberLanguage);
  window.once('closed', () => ipcMain.removeListener('cyb-language', rememberLanguage));
  const navigate = async url => { await rememberSession(window); if (!window.isDestroyed()) await window.loadURL(withLanguage(url, window.cybLanguage)); };
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl.startsWith('cyb-math://')) {
      if (targetUrl === window.webContents.getURL()) return;
      event.preventDefault();
      void navigate(targetUrl).catch(() => {});
      return;
    }

    const localUrl = mapWebUrlToAppUrl(targetUrl);
    event.preventDefault();
    if (localUrl) {
      void navigate(localUrl).catch(() => {});
    } else if (isSafeExternalUrl(targetUrl)) {
      void openExternal(targetUrl);
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    const localUrl = mapWebUrlToAppUrl(url);
    if (localUrl) void navigate(localUrl).catch(() => {});
    else if (isSafeExternalUrl(url)) void openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.alt && input.key === 'ArrowLeft' && window.webContents.canGoBack()) {
      event.preventDefault();
      window.webContents.goBack();
    } else if (input.alt && input.key === 'ArrowRight' && window.webContents.canGoForward()) {
      event.preventDefault();
      window.webContents.goForward();
    }
  });
}

function createWindow({ show = true, openExternal } = {}) {
  const statePath = path.join(app.getPath('userData'), 'window-state.json');
  let saved;
  try { saved = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
  const displays = [screen.getPrimaryDisplay(), ...screen.getAllDisplays().filter(display => display.id !== screen.getPrimaryDisplay().id)];
  const window = new BrowserWindow({
    title: 'CYB Math',
    ...restoreBounds(saved, displays),
    minWidth: 640,
    minHeight: 480,
    backgroundColor: '#f7f8fb',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  attachNavigationPolicy(window, openExternal);
  window.cybNativeMenus = true;
  window.on('focus', () => installMenu(window));
  installMenu(window);
  if (saved?.maximized) window.maximize();
  window.on('close', event => {
    if (!window.cybClosing && !window.webContents.isDestroyed()) {
      event.preventDefault();
      void rememberSession(window).finally(() => { window.cybClosing = true; window.close(); });
      return;
    }
    try {
      fs.mkdirSync(app.getPath('userData'), { recursive: true });
      fs.writeFileSync(statePath, JSON.stringify({ bounds: window.getNormalBounds(), maximized: window.isMaximized() }));
    } catch {}
  });
  if (show) window.once('ready-to-show', () => window.show());
  window.cybReady = window.loadURL(withLanguage('cyb-math://main/', window.cybLanguage)).then(async () => {
    try {
      const raw = fs.readFileSync(path.join(app.getPath('userData'), 'last-project.json'), 'utf8');
      await restoreProject(window, raw);
    } catch (_) {}
    if (show && !window.isDestroyed()) void checkUpdates(window);
  }).catch(error => { if (!window.isDestroyed()) console.error('Offline window could not open:', error.message); });
  return window;
}

module.exports = { attachNavigationPolicy, createWindow, isSafeExternalUrl };
