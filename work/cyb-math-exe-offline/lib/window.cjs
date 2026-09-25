'use strict';

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { mapWebUrlToAppUrl } = require('./routes.cjs');

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
    try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(path.join(app.getPath('userData'), 'language.json'), JSON.stringify({ language })); } catch {}
  };
  ipcMain.on('cyb-language', rememberLanguage);
  window.once('closed', () => ipcMain.removeListener('cyb-language', rememberLanguage));
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (targetUrl.startsWith('cyb-math://')) {
      const localized = withLanguage(targetUrl, window.cybLanguage);
      if (localized !== targetUrl) { event.preventDefault(); void window.loadURL(localized); }
      return;
    }

    const localUrl = mapWebUrlToAppUrl(targetUrl);
    event.preventDefault();
    if (localUrl) {
      void window.loadURL(withLanguage(localUrl, window.cybLanguage));
    } else if (isSafeExternalUrl(targetUrl)) {
      void openExternal(targetUrl);
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    const localUrl = mapWebUrlToAppUrl(url);
    if (localUrl) void window.loadURL(withLanguage(localUrl, window.cybLanguage));
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
  const window = new BrowserWindow({
    title: 'CYB Math',
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#f7f8fb',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    autoHideMenuBar: true,
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
  if (show) window.once('ready-to-show', () => window.show());
  void window.loadURL(withLanguage('cyb-math://main/', window.cybLanguage));
  return window;
}

module.exports = { attachNavigationPolicy, createWindow, isSafeExternalUrl };
