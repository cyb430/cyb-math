'use strict';

const { app, Menu, dialog, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { SITE_BY_APP_HOST, LABEL_BY_APP_HOST } = require('./routes.cjs');
const MAX_PROJECT_BYTES = 12 * 1024 * 1024;
const text = {
  'zh-Hans': { file: '文件', save: '保存学习项目', open: '打开学习项目', print: '打印', pdf: '导出 PDF', edit: '编辑', tools: '数学工具', view: '视图', back: '返回', home: '工具总览', help: '帮助', update: '检查更新', automatic: '自动检查更新', latest: '已是最新版本', offline: '暂时无法检查更新，离线计算不受影响。', available: '发现新版本', later: '稍后', ignore: '忽略此版本', download: '前往下载', failed: '操作未完成', replace: '打开项目将替换当前工具的输入，是否继续？', cancel: '取消', continue: '打开', folder: '打开下载文件夹' },
  'zh-Hant': { file: '檔案', save: '儲存學習專案', open: '開啟學習專案', print: '列印', pdf: '匯出 PDF', edit: '編輯', tools: '數學工具', view: '檢視', back: '返回', home: '工具總覽', help: '說明', update: '檢查更新', automatic: '自動檢查更新', latest: '已是最新版本', offline: '暫時無法檢查更新，離線計算不受影響。', available: '發現新版本', later: '稍後', ignore: '忽略此版本', download: '前往下載', failed: '操作未完成', replace: '開啟專案將取代目前工具的輸入，是否繼續？', cancel: '取消', continue: '開啟', folder: '開啟下載資料夾' },
  en: { file: 'File', save: 'Save learning project', open: 'Open learning project', print: 'Print', pdf: 'Export PDF', edit: 'Edit', tools: 'Math tools', view: 'View', back: 'Back', home: 'All tools', help: 'Help', update: 'Check for updates', automatic: 'Check automatically', latest: 'You are up to date', offline: 'Unable to check for updates. Offline calculations remain available.', available: 'Update available', later: 'Later', ignore: 'Ignore this version', download: 'Download', failed: 'Operation not completed', replace: 'Opening a project replaces the current tool inputs. Continue?', cancel: 'Cancel', continue: 'Open', folder: 'Open Downloads folder' }
};
const englishTools = ['All tools','Quick Math Tools','Function Plotter','Complex Functions','Equation Solver','Geometry Sketchpad','Algebra','Linear Algebra','3D Plotter','Number Theory','Sequences','LaTeX Editor','Fourier'];
const traditionalTools = ['工具總覽','數學實用工具','函數繪圖','複變函數','方程求解','幾何畫板','代數','線性代數','3D 繪圖','數論','數列','LaTeX 編輯器','傅里葉分析'];
function labels(window) { return text[window.cybLanguage] || text['zh-Hans']; }
function preferences() { try { return JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'app-preferences.json'))); } catch { return {}; } }
function writePreferences(data) { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(path.join(app.getPath('userData'), 'app-preferences.json'), JSON.stringify(data)); }
function newer(a, b) { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if (x[i] !== y[i]) return x[i] > y[i]; } return false; }
function validateProject(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > MAX_PROJECT_BYTES) throw new Error('Invalid project size');
  const data = JSON.parse(raw);
  if (data?.format !== 'CYB-Math-Project' || data.version !== 1 || !Object.values(SITE_BY_APP_HOST).includes(data.site) || !Array.isArray(data.fields) || !Array.isArray(data.storage) || data.fields.length > 1000 || data.storage.length > 500 || typeof data.hash !== 'string' || data.hash.length > 2 * 1024 * 1024) throw new Error('Invalid CYB Math project');
  for (const field of data.fields) {
    if (!field || typeof field.id !== 'string' || field.id.length > 200 || typeof field.value !== 'string' || field.value.length > 100000 || typeof field.checked !== 'boolean') throw new Error('Invalid project field');
  }
  for (const pair of data.storage) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || !/^(cyb[-:]|es-|mf-|seq|nt-|gsp_|algcalc|plot|cvz-|me-|math-)/.test(pair[0]) || pair[0] === 'cyb-app-pending-session' || typeof pair[1] !== 'string' || pair[1].length > 2 * 1024 * 1024) throw new Error('Invalid project storage');
  }
  return data;
}
async function snapshot(window) {
  const raw = await window.webContents.executeJavaScript('window.CYBSession?.snapshot()');
  validateProject(raw); return raw;
}
async function rememberSession(window) {
  try {
    const raw = await snapshot(window);
    const directory = app.getPath('userData');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'last-project.tmp'), raw);
    fs.renameSync(path.join(directory, 'last-project.tmp'), path.join(directory, 'last-project.json'));
  } catch (_) {}
}
async function saveProject(window) {
  const raw = await snapshot(window);
  const result = await dialog.showSaveDialog(window, { title: labels(window).save, defaultPath: path.join(app.getPath('documents'), 'CYB-Math.cybmath.json'), filters: [{ name: 'CYB Math', extensions: ['cybmath.json'] }] });
  if (!result.canceled && result.filePath) fs.writeFileSync(result.filePath, raw);
  return !result.canceled;
}
async function restoreProject(window, raw) {
  const data = validateProject(raw);
  const host = Object.keys(SITE_BY_APP_HOST).find(key => SITE_BY_APP_HOST[key] === data.site);
  const current = new URL(window.webContents.getURL());
  if (current.hostname !== host) await window.loadURL(`cyb-math://${host}/?lang=${window.cybLanguage || 'zh-Hans'}`);
  const loaded = new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); window.webContents.removeListener('did-finish-load', done); };
    const done = () => { cleanup(); resolve(); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Project reload timed out')); }, 15000);
    window.webContents.once('did-finish-load', done);
  });
  await window.webContents.executeJavaScript(`window.CYBSession.stage(${JSON.stringify(raw)})`);
  await loaded;
}
async function openProject(window) {
  const result = await dialog.showOpenDialog(window, { title: labels(window).open, properties: ['openFile'], filters: [{ name: 'CYB Math', extensions: ['json'] }] });
  if (result.canceled) return false;
  const file = result.filePaths[0];
  if (fs.statSync(file).size > MAX_PROJECT_BYTES) throw new Error('Project exceeds 12 MB');
  const raw = fs.readFileSync(file, 'utf8'); validateProject(raw);
  const l = labels(window);
  const answer = await dialog.showMessageBox(window, { type: 'question', message: l.replace, buttons: [l.cancel, l.continue], defaultId: 0, cancelId: 0 });
  if (answer.response !== 1) return false;
  await rememberSession(window);
  await restoreProject(window, raw); return true;
}
async function exportPDF(window) {
  const result = await dialog.showSaveDialog(window, { title: labels(window).pdf, defaultPath: 'CYB-Math.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (result.canceled) return;
  const bytes = await window.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
  fs.writeFileSync(result.filePath, bytes);
}
async function checkUpdates(window, manual = false) {
  if (app.commandLine.hasSwitch('cyb-offline-test')) return;
  if (window.cybCheckingUpdate) return;
  const prefs = preferences();
  if (!manual && (prefs.automaticUpdates === false || Date.now() - (prefs.lastUpdateCheck || 0) < 86400000)) return;
  window.cybCheckingUpdate = true;
  const l = labels(window);
  try {
    const response = await fetch('https://api.github.com/repos/cyb430/cyb-math/releases/latest', { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'CYB-Math' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Update server unavailable');
    const release = await response.json();
    const version = release.assets?.map(asset => /^CYB-Math-(\d+\.\d+\.\d+)-x64-Setup\.exe$/.exec(asset.name)?.[1]).find(Boolean);
    if (!version || release.draft || release.prerelease) throw new Error('Invalid release metadata');
    writePreferences({ ...preferences(), lastUpdateCheck: Date.now() });
    if (!newer(version, app.getVersion())) { if (manual) await dialog.showMessageBox(window, { message: l.latest }); return; }
    if (!manual && prefs.ignoredVersion === version) return;
    const url = `https://github.com/cyb430/cyb-math/releases/tag/${encodeURIComponent(release.tag_name)}`;
    const result = await dialog.showMessageBox(window, { type: 'info', message: `${l.available}: ${version}`, detail: `${app.getVersion()} → ${version}`, buttons: [l.download, l.later, l.ignore], defaultId: 1, cancelId: 1 });
    if (result.response === 0) await shell.openExternal(url);
    if (result.response === 2) writePreferences({ ...preferences(), ignoredVersion: version });
  } catch (_) { if (manual && !window.isDestroyed()) await dialog.showMessageBox(window, { message: l.offline }); }
  finally { window.cybCheckingUpdate = false; }
}
function installMenu(window) {
  if (window.isDestroyed()) return;
  const l = labels(window);
  const run = operation => () => Promise.resolve(operation(window)).catch(error => { if (!window.isDestroyed()) void dialog.showMessageBox(window, { type: 'error', message: l.failed, detail: error.message }); });
  const items = Object.keys(SITE_BY_APP_HOST).map((host, i) => ({ label: window.cybLanguage === 'en' ? englishTools[i] : window.cybLanguage === 'zh-Hant' ? traditionalTools[i] : LABEL_BY_APP_HOST[host], click: run(async () => { await rememberSession(window); await window.loadURL(`cyb-math://${host}/?lang=${window.cybLanguage || 'zh-Hans'}`); }) }));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: l.file, submenu: [{ label: l.open, accelerator: 'CmdOrCtrl+O', click: run(openProject) }, { label: l.save, accelerator: 'CmdOrCtrl+S', click: run(saveProject) }, { type: 'separator' }, { label: l.print, accelerator: 'CmdOrCtrl+P', click: () => window.webContents.print({ printBackground: true }) }, { label: l.pdf, click: run(exportPDF) }, { label: l.folder, click: () => void shell.openPath(app.getPath('downloads')) }, { type: 'separator' }, { role: 'quit' }] },
    { label: l.edit, submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: l.tools, submenu: items },
    { label: l.view, submenu: [{ label: l.home, accelerator: 'CmdOrCtrl+Home', click: items[0].click }, { label: l.back, accelerator: 'Alt+Left', click: () => { if (window.webContents.navigationHistory.canGoBack()) window.webContents.navigationHistory.goBack(); } }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
    { label: l.help, submenu: [{ label: l.update, click: () => void checkUpdates(window, true) }, { label: l.automatic, type: 'checkbox', checked: preferences().automaticUpdates !== false, click: item => writePreferences({ ...preferences(), automaticUpdates: item.checked }) }] }
  ]));
  window.setMenuBarVisibility(true);
}
module.exports = { installMenu, checkUpdates, rememberSession, restoreProject, saveProject, openProject, exportPDF, snapshot, validateProject, newer };
