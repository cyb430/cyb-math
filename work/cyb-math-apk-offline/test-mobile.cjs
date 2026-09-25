'use strict';

const { app, BrowserWindow, session } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const files = [
  'index.html', 'math-tools-pro.html', 'math-plotter.html', 'math-complex.html',
  'math-equation.html', 'math-geometry-theorems.html', 'math-algebra.html',
  'math-linear.html', 'math-3d.html', 'math-theory.html', 'math-sequence.html',
  'math-latex.html', 'math-fourier.html'
];
const webRoot = path.resolve(__dirname, 'web');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cyb-math-mobile-test-'));
const remoteRequests = [];
const consoleErrors = [];
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
app.setPath('userData', userData);

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function waitFor(window, expression, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { if (await window.webContents.executeJavaScript(expression)) return; } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function main() {
  await app.whenReady();
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (/^https?:/i.test(details.url)) remoteRequests.push(details.url);
    callback({ cancel: false });
  });

  const window = new BrowserWindow({
    show: false,
    width: 390,
    height: 844,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  window.webContents.on('console-message', event => {
    if (event.level === 'error') consoleErrors.push({ message: event.message, source: event.sourceId, line: event.lineNumber });
  });

  const pages = [];
  for (const file of files) {
    const started = Date.now();
    await window.loadURL(pathToFileURL(path.join(webRoot, file)).href);
    await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const result = await window.webContents.executeJavaScript(`({
      title: document.title,
      readyState: document.readyState,
      bodyTextLength: document.body?.innerText?.length || 0,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflowElements: [...document.querySelectorAll('body *')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.right > document.documentElement.clientWidth + 2 || rect.left < -2;
      }).slice(0, 8).map(element => ({ tag: element.tagName, id: element.id, className: String(element.className || ''), rect: element.getBoundingClientRect().toJSON() })),
      bridge: window.__CYB_MOBILE_BRIDGE__ === true
    })`);
    assert.equal(result.readyState, 'complete', `${file} failed to load`);
    assert.ok(result.title, `${file} has no title`);
    assert.ok(result.bodyTextLength > 50, `${file} rendered too little content`);
    assert.ok(result.scrollWidth < result.viewportWidth * 4, `${file} has catastrophic horizontal overflow: ${JSON.stringify(result)}`);
    assert.equal(result.bridge, true, `${file} did not load the mobile bridge`);
    assert.equal(await window.webContents.executeJavaScript(`document.documentElement.dataset.theme || 'light'`), 'light', `${file} should default to light mode on Android`);
    pages.push({ file, title: result.title, loadMs: Date.now() - started, viewportWidth: result.viewportWidth, scrollWidth: result.scrollWidth });
  }

  await window.loadURL(pathToFileURL(path.join(webRoot, 'index.html')).href);
  const home = await window.webContents.executeJavaScript(`(() => {
    const search = document.getElementById('tool-search');
    search.focus();
    search.value = '行列式';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      cards: document.querySelectorAll('.tool-card').length,
      linearHref: document.querySelector('[data-id="linear"]').getAttribute('href'),
      suggestions: [...document.querySelectorAll('#search-suggestions a')].map(item => item.getAttribute('href')),
      share: window.cybPreferredURL()
    };
  })()`);
  await sleep(50);
  const rewrittenSuggestions = await window.webContents.executeJavaScript(`[...document.querySelectorAll('#search-suggestions a')].map(item => item.getAttribute('href'))`);
  assert.equal(home.cards, 12);
  assert.equal(home.linearHref, 'math-linear.html');
  assert.ok(rewrittenSuggestions.some(href => href.startsWith('math-linear.html?feature=matrix')));
  assert.equal(home.share, 'https://cyb-math.cn/');

  await window.loadURL(pathToFileURL(path.join(webRoot, 'math-linear.html')).href + '?feature=matrix');
  await waitFor(window, `Boolean(document.getElementById('matrixCalc'))`);
  const determinant = await window.webContents.executeJavaScript(`(() => {
    matrixA.value = '1 2\\n3 4';
    matrixOp.value = 'det';
    matrixCalc.click();
    return matrixResult.innerText;
  })()`);
  assert.match(determinant.replace(/-/g, '−'), /det\(A\)\s*=\s*−2/);

  const exportPayload = await window.webContents.executeJavaScript(`new Promise(resolve => {
    window.Capacitor = {
      isNativePlatform: () => true,
      Plugins: { FileSaver: { save: payload => { window.__cybSaved = payload; return Promise.resolve({ path: 'test' }); } } }
    };
    const anchor = document.createElement('a');
    anchor.download = 'test.txt';
    anchor.href = 'data:text/plain;base64,SGVsbG8=';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => resolve(window.__cybSaved), 100);
  })`);
  assert.equal(exportPayload.fileName, 'test.txt');
  assert.equal(exportPayload.base64, 'SGVsbG8=');

  await window.loadURL(pathToFileURL(path.join(webRoot, 'math-plotter.html')).href + '?feature=inequality');
  await waitFor(window, `typeof solveInequality === 'function' && Boolean(document.getElementById('ineqInput'))`);
  const inequality = await window.webContents.executeJavaScript(`(() => {
    ineqInput.value = '(x-1)/(x+2)>=0';
    solveInequality(false);
    return ineqResult.querySelector('.ineq-answer')?.textContent || '';
  })()`);
  assert.equal(inequality.replace(/−/g, '-'), '(-∞, -2) ∪ [1, +∞)');

  await window.loadURL(pathToFileURL(path.join(webRoot, 'math-complex.html')).href);
  await waitFor(window, `document.getElementById('renderInfo')?.textContent.startsWith('渲染')`, 30000);
  const complex = await window.webContents.executeJavaScript(`({ width: cv.width, height: cv.height, message: exprMsg.textContent })`);
  assert.ok(complex.width > 300 && complex.height > 300 && complex.message.includes('已编译'));

  await window.loadURL(pathToFileURL(path.join(webRoot, 'index.html')).href);
  await window.webContents.executeJavaScript(`localStorage.setItem('cyb-language', 'en')`);
  await window.loadURL(pathToFileURL(path.join(webRoot, 'index.html')).href);
  await waitFor(window, `document.documentElement.lang === 'en' && document.getElementById('cyb-language-switcher')`);
  assert.equal(await window.webContents.executeJavaScript(`document.querySelector('#cyb-language-switcher select').value`), 'en');
  assert.equal(await window.webContents.executeJavaScript('document.title'), 'CYB Math | Free Math Toolkit');

  await window.webContents.executeJavaScript(`localStorage.setItem('cyb-language', 'zh-Hant')`);
  await window.loadURL(pathToFileURL(path.join(webRoot, 'index.html')).href);
  await waitFor(window, `document.documentElement.lang === 'zh-Hant' && document.getElementById('cyb-language-switcher')`);
  assert.match(await window.webContents.executeJavaScript('document.title'), /免費數學工具集/);

  assert.deepEqual(remoteRequests, [], `Offline pages attempted remote requests: ${remoteRequests.join(', ')}`);
  assert.deepEqual(consoleErrors, [], `Renderer console errors: ${JSON.stringify(consoleErrors)}`);
  console.log(JSON.stringify({ passed: true, pages, languages: ['zh-Hans', 'zh-Hant', 'en'], defaultTheme: 'light', determinant, inequality, complex }, null, 2));
  window.destroy();
  app.quit();
}

main().catch(error => {
  console.error(error);
  app.exit(1);
}).finally(() => {
  try { fs.rmSync(userData, { recursive: true, force: true }); } catch {}
});
