'use strict';

const { app, BrowserWindow, protocol } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { registerOfflineProtocol } = require('./lib/protocol.cjs');
const { SITE_BY_APP_HOST } = require('./lib/routes.cjs');

protocol.registerSchemesAsPrivileged([{
  scheme: 'cyb-math',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cyb-math-i18n-performance-'));
app.setPath('userData', userData);
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

function withTimeout(promise, milliseconds, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} exceeded ${milliseconds} ms`)), milliseconds)),
  ]);
}

async function main() {
  await app.whenReady();
  registerOfflineProtocol(app);
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 840,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  const results = [];
  for (const appHost of Object.keys(SITE_BY_APP_HOST)) {
    const started = Date.now();
    await withTimeout(window.loadURL(`cyb-math://${appHost}/?lang=en`), 20000, `${appHost} English load`);
    const probe = await withTimeout(window.webContents.executeJavaScript(`new Promise((resolve) => {
      const started = performance.now();
      let last = started;
      let maxDelay = 0;
      let ticks = 0;
      const element = document.createElement('div');
      element.id = 'cyb-i18n-stress-probe';
      element.style.display = 'none';
      document.body.append(element);
      const heartbeat = setInterval(() => {
        const now = performance.now();
        maxDelay = Math.max(maxDelay, now - last);
        last = now;
        ticks += 1;
      }, 20);
      let updates = 0;
      const churn = setInterval(() => {
        element.textContent = updates % 2 ? '加载中' : '计算';
        element.setAttribute('aria-label', updates % 2 ? '加载中' : '计算');
        updates += 1;
        if (updates >= 160) clearInterval(churn);
      }, 4);
      setTimeout(() => {
        clearInterval(heartbeat);
        clearInterval(churn);
        resolve({
          language: document.documentElement.lang,
          selector: document.querySelector('#cyb-language-switcher select')?.value,
          ticks,
          maxDelay,
          elapsed: performance.now() - started,
          text: element.textContent,
          label: element.getAttribute('aria-label'),
        });
      }, 1200);
    })`), 7000, `${appHost} event-loop probe`);

    assert.equal(probe.language, 'en', `${appHost}: language did not persist`);
    assert.equal(probe.selector, 'en', `${appHost}: language selector`);
    assert.ok(probe.ticks >= 20, `${appHost}: renderer heartbeat stalled (${probe.ticks})`);
    assert.ok(probe.maxDelay < 2500, `${appHost}: renderer blocked for ${probe.maxDelay} ms`);
    assert.match(probe.text, /^(Calculate|Loading)$/);
    assert.match(probe.label, /^(Calculate|Loading)$/);
    results.push({ appHost, loadMs: Date.now() - started, ticks: probe.ticks, maxDelay: Math.round(probe.maxDelay) });

    await withTimeout(window.loadURL(`cyb-math://${appHost}/`), 20000, `${appHost} persisted English reload`);
    assert.equal(await window.webContents.executeJavaScript('document.documentElement.lang'), 'en');
  }

  console.log(JSON.stringify({ passed: true, pages: results.length, results }, null, 2));
  window.destroy();
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.exit(1);
}).finally(() => {
  try { fs.rmSync(userData, { recursive: true, force: true }); } catch {}
});
