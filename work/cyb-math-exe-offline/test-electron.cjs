'use strict';

const { app, BrowserWindow, protocol, session } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { registerOfflineProtocol } = require('./lib/protocol.cjs');
const { SITE_BY_APP_HOST } = require('./lib/routes.cjs');
const { attachNavigationPolicy } = require('./lib/window.cjs');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'cyb-math',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

const remoteRequests = [];
const consoleErrors = [];
const pageResults = [];
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cyb-math-electron-test-'));
app.setPath('userData', userData);
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(window, expression, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      if (await window.webContents.executeJavaScript(expression)) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function main() {
  await app.whenReady();
  registerOfflineProtocol(app);

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (/^https?:/i.test(details.url)) remoteRequests.push(details.url);
    callback({ cancel: false });
  });

  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 840,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'lib', 'preload.cjs'),
    },
  });
  attachNavigationPolicy(window, () => Promise.resolve());

  window.webContents.on('console-message', (event) => {
    if (event.level === 'error') {
      consoleErrors.push({ message: event.message, line: event.lineNumber, sourceId: event.sourceId });
    }
  });

  for (const appHost of Object.keys(SITE_BY_APP_HOST)) {
    const target = `cyb-math://${appHost}/`;
    await window.loadURL(target);
    await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const result = await window.webContents.executeJavaScript(`({
      title: document.title,
      bodyTextLength: document.body?.innerText?.length ?? 0,
      scriptCount: document.scripts.length,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      readyState: document.readyState,
      href: location.href
    })`);
    assert.equal(result.readyState, 'complete', `${appHost} did not finish loading`);
    assert.ok(result.title.length > 0, `${appHost} has no title`);
    assert.ok(result.bodyTextLength > 50, `${appHost} rendered too little content`);
    assert.equal(result.horizontalOverflow, false, `${appHost} has desktop horizontal overflow`);
    if (appHost === 'geometry') {
      const loadingLabel = await window.webContents.executeJavaScript(
        `document.querySelector('#cyb-desktop-loading .cyb-loading-name')?.textContent || document.documentElement.dataset.cybDesktopLoadingShown`,
      );
      assert.equal(loadingLabel, '几何画板', 'Geometry loading feedback did not render');
    }
    pageResults.push({ appHost, ...result });
  }

  await window.loadURL('cyb-math://main/?feature=offline#desktop');
  const stateRoundTrip = await window.webContents.executeJavaScript(`(() => {
    localStorage.setItem('cyb-desktop-test', 'ok');
    return { value: localStorage.getItem('cyb-desktop-test'), search: location.search, hash: location.hash };
  })()`);
  assert.deepEqual(stateRoundTrip, { value: 'ok', search: '?feature=offline', hash: '#desktop' });

  await window.loadURL('cyb-math://main/?lang=en');
  const home = await window.webContents.executeJavaScript(`({
    cards: document.querySelectorAll('.tool-card').length,
    hasComplex: Boolean(document.querySelector('[data-id="complex"]')),
    hasLinear: Boolean(document.querySelector('[data-id="linear"]'))
  })`);
  assert.deepEqual(home, { cards: 12, hasComplex: true, hasLinear: true });

  const searchResults = await window.webContents.executeJavaScript(`(() => {
    const input = document.getElementById('tool-search');
    input.focus();
    input.value = '行列式';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return [...document.querySelectorAll('#search-suggestions a')].map((item) => item.href);
  })()`);
  assert.ok(
    searchResults.some((url) => /(?:linear\.cyb-math\.cn|cyb-math:\/\/linear)/.test(url)),
    `Fuzzy search lost the determinant recommendation: ${JSON.stringify(searchResults)}`,
  );

  await window.webContents.executeJavaScript(`location.href = 'https://linear.cyb-math.cn/?feature=matrix#desktop-test'`);
  await waitFor(window, `location.protocol === 'cyb-math:' && location.host === 'linear' && document.readyState === 'complete'`);
  assert.equal(await window.webContents.executeJavaScript('location.search'), '?feature=matrix&lang=en');
  assert.match(await window.webContents.executeJavaScript('location.hash'), /^#s=/);

  const determinant = await window.webContents.executeJavaScript(`(() => {
    matrixA.value = '1 2\\n3 4';
    matrixOp.value = 'det';
    matrixCalc.click();
    return matrixResult.innerText;
  })()`);
  assert.match(determinant.replace(/-/g, '−'), /det\(A\)\s*=\s*−2/);

  await window.loadURL('cyb-math://plotter/?feature=inequality');
  await waitFor(window, `typeof solveInequality === 'function' && Boolean(document.getElementById('ineqInput'))`);
  const inequality = await window.webContents.executeJavaScript(`(() => {
    ineqInput.value = '(x-1)/(x+2)>=0';
    solveInequality(false);
    return ineqResult.querySelector('.ineq-answer')?.textContent || '';
  })()`);
  assert.equal(inequality.replace(/−/g, '-'), '(-∞, -2) ∪ [1, +∞)');

  await window.loadURL('cyb-math://complex/');
  await waitFor(window, `document.getElementById('renderInfo')?.textContent.startsWith('渲染')`, 30000);
  const complex = await window.webContents.executeJavaScript(`({
    width: cv.width,
    height: cv.height,
    message: exprMsg.textContent
  })`);
  assert.ok(complex.width > 500 && complex.height > 400 && complex.message.includes('已编译'));

  await window.loadURL('cyb-math://main/');
  await window.webContents.executeJavaScript(`localStorage.setItem('cyb-language', 'en')`);
  await window.loadURL('cyb-math://main/?lang=en');
  await waitFor(window, `document.documentElement.lang === 'en' && document.getElementById('cyb-language-switcher')`);
  const english = await window.webContents.executeJavaScript(`({
    title: document.title,
    language: document.documentElement.lang,
    selector: document.querySelector('#cyb-language-switcher select')?.value,
    email: document.body.innerText.includes('cybcyb666@qq.com')
  })`);
  assert.deepEqual(english, { title: 'CYB Math | Free Math Toolkit', language: 'en', selector: 'en', email: true });

  await window.loadURL('cyb-math://theory/?lang=en');
  await waitFor(window, `document.documentElement.lang === 'en' && document.getElementById('cyb-language-switcher')`);
  assert.equal(await window.webContents.executeJavaScript(`document.querySelector('#cyb-language-switcher select').value`), 'en');

  await window.webContents.executeJavaScript(`localStorage.setItem('cyb-language', 'zh-Hant')`);
  await window.loadURL('cyb-math://main/?lang=zh-Hant');
  await waitFor(window, `document.documentElement.lang === 'zh-Hant' && document.getElementById('cyb-language-switcher')`);
  assert.match(await window.webContents.executeJavaScript('document.title'), /免費數學工具集/);

  assert.deepEqual(remoteRequests, [], `Offline app attempted remote requests:\n${remoteRequests.join('\n')}`);
  assert.deepEqual(consoleErrors, [], `Renderer console errors:\n${JSON.stringify(consoleErrors, null, 2)}`);

  console.log(JSON.stringify({ passed: true, pages: pageResults.length, languages: ['zh-Hans', 'zh-Hant', 'en'], pageResults }, null, 2));
  window.destroy();
  app.quit();
  try { fs.rmSync(userData, { recursive: true, force: true }); } catch {}
}

main().catch((error) => {
  console.error(error);
  try { fs.rmSync(userData, { recursive: true, force: true }); } catch {}
  app.exit(1);
});
