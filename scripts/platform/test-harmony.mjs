import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer, root } from '../ux/serve.mjs';
import { SITES } from '../../work/cyb-math-apk-offline/scripts/site-map.mjs';

const bridge = fs.readFileSync(path.join(root, 'work/cyb-math-harmony/src/harmony-bridge.js'), 'utf8');
for (const site of SITES) {
  const original = fs.readFileSync(path.join(root, 'sites', site.source, 'index.html'), 'utf8');
  const prepared = fs.readFileSync(path.join(root, 'work/cyb-math-harmony/entry/src/main/resources/rawfile/pages', site.file), 'utf8');
  assert.equal(prepared, original.replace('</head>', `<script>\n${bridge}\n</script>\n</head>`), `Harmony engine differs from canonical ${site.source}`);
}

const server = await startServer(0);
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const language of ['zh-Hans', 'zh-Hant', 'en']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      window.hostMessages = [];
      window.CYBNative = {
        editorState: raw => window.hostMessages.push({ type: 'editor', data: JSON.parse(raw) }),
        pageState: raw => window.hostMessages.push({ type: 'page', data: JSON.parse(raw) }),
        persist: raw => window.hostMessages.push({ type: 'persist', data: JSON.parse(raw) }),
        handoff: raw => window.hostMessages.push({ type: 'handoff', data: JSON.parse(raw) }),
        save: raw => { const request = JSON.parse(raw); window.hostMessages.push({ type: 'save', data: request }); window.CYBHarmony.result(request.id, { saved: true }); },
        open: raw => { const request = JSON.parse(raw); window.hostMessages.push({ type: 'open', data: request }); window.CYBHarmony.result(request.id, { canceled: true }); },
        share: raw => { const request = JSON.parse(raw); window.hostMessages.push({ type: 'share', data: request }); window.CYBHarmony.result(request.id, { saved: true }); }
      };
    });
    const page = await context.newPage();
    const remote = [];
    page.on('request', request => { if (!request.url().startsWith(origin)) remote.push(request.url()); });
    await page.goto(`${origin}/harmony/math-linear.html?lang=${language}`);
    await page.waitForFunction(() => window.hostMessages?.some(item => item.type === 'page'));
    assert.equal(await page.locator('#cyb-suite-bar').isVisible(), false);
    await page.locator('#matrixA').focus();
    await page.waitForFunction(() => window.hostMessages?.some(item => item.type === 'editor' && item.data.active));
    await page.evaluate(() => window.CYBHarmony.insert('7'));
    assert.match(await page.locator('#matrixA').inputValue(), /7/);
    await page.evaluate(() => window.CYBHarmony.saveProject());
    await page.waitForFunction(() => window.hostMessages?.some(item => item.type === 'save'));
    const saved = await page.evaluate(() => window.hostMessages.find(item => item.type === 'save').data.payload);
    assert.equal(JSON.parse(Buffer.from(saved.base64, 'base64').toString()).site, 'math-linear');
    await page.evaluate(() => window.CYBHarmony.openProject());
    await page.waitForFunction(() => window.hostMessages?.some(item => item.type === 'open'));
    await page.evaluate(() => navigator.share({ url: 'https://linear.cyb-math.cn/' }));
    assert.match(await page.evaluate(() => window.hostMessages.find(item => item.type === 'share').data.payload.text), /https:\/\/linear\.cyb-math\.cn/);
    await page.evaluate(() => { const link = document.createElement('a'); link.id = 'harmony-route-test'; link.href = 'https://latex.cyb-math.cn/'; document.body.append(link); });
    await page.waitForFunction(() => document.getElementById('harmony-route-test')?.getAttribute('href') === 'math-latex.html');
    assert.deepEqual(remote, [], `Harmony shared engine made network requests: ${remote.join(', ')}`);
    results.push({ language, passed: true });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
fs.mkdirSync(path.join(root, 'test-results/ux'), { recursive: true });
fs.writeFileSync(path.join(root, 'test-results/ux/harmony.json'), JSON.stringify({ sharedPages: SITES.length, results }, null, 2));
console.log(`${SITES.length}/${SITES.length} Harmony engines identical; ${results.length}/${results.length} native bridge journeys passed`);
