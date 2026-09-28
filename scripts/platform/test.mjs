import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startServer, root } from '../ux/serve.mjs';
const server = await startServer(0);
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
async function check(name, operation) { try { await operation(); results.push({ name, passed: true }); console.log(`PASS ${name}`); } catch (error) { results.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); } }
try {
  for (const language of ['zh-Hans', 'zh-Hant', 'en']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 600 } });
    await context.addInitScript(() => {
      window.hostMessages = [];
      window.Capacitor = { isNativePlatform: () => true, Plugins: {
        AppHost: { pageState: async data => { window.hostMessages.push({ type: 'page', data }); return {}; }, editorState: async data => { window.hostMessages.push({ type: 'editor', data }); return {}; }, share: async data => { window.hostMessages.push({ type: 'share', data }); return {}; }, openProject: async () => ({ canceled: true }) },
        FileSaver: { save: async data => { window.hostMessages.push({ type: 'save', data }); return { canceled: false }; } }
      } };
    });
    const page = await context.newPage();
    await check(`Android native editor and project / ${language}`, async () => {
      await page.goto(`${url}/android/math-linear.html?lang=${language}`);
      await page.waitForFunction(() => Boolean(window.CYBApp));
      assert.equal(await page.locator('#cyb-suite-bar').isVisible(), false);
      await page.locator('#matrixA').fill('1 2\n3 4');
      await page.locator('#matrixA').evaluate(el => { el.focus(); el.setSelectionRange(2, 3); document.dispatchEvent(new Event('selectionchange')); });
      await page.evaluate(() => window.CYBEditor.insert('5'));
      assert.equal(await page.locator('#matrixA').inputValue(), '1 5\n3 4');
      assert.ok(await page.evaluate(() => window.hostMessages.some(item => item.type === 'editor' && item.data.keys.some(key => key.value === '\n'))));
      const raw = await page.evaluate(() => window.CYBSession.snapshot());
      assert.equal(JSON.parse(raw).site, 'math-linear');
      await page.locator('#matrixA').fill('9');
      await page.evaluate(raw => window.CYBSession.stage(raw), raw);
      await page.waitForFunction(() => document.getElementById('matrixA')?.value === '1 5\n3 4');
      await page.evaluate(() => window.CYBApp.saveProject());
      await page.waitForFunction(() => window.hostMessages.some(item => item.type === 'save'));
      const saved = await page.evaluate(() => window.hostMessages.find(item => item.type === 'save').data);
      assert.equal(JSON.parse(Buffer.from(saved.base64, 'base64').toString()).fields.find(field => field.id === 'matrixA').value, '1 5\n3 4');
      await page.evaluate(() => window.CYBApp.share());
      await page.waitForFunction(() => window.hostMessages.some(item => item.type === 'share'));
      assert.match(await page.evaluate(() => window.hostMessages.find(item => item.type === 'share').data.text), /https:\/\/linear.cyb-math.cn\//);
    });
    await check(`Mobile LaTeX insertion and caret / ${language}`, async () => {
      await page.goto(`${url}/android/math-latex.html?lang=${language}`);
      await page.locator('#editor').fill('');
      await page.locator('#editor').focus();
      await page.evaluate(() => window.CYBEditor.insert('\\frac{}{}'));
      assert.equal(await page.locator('#editor').inputValue(), '\\frac{}{}');
      assert.equal(await page.locator('#editor').evaluate(el => el.selectionStart), 6);
      await page.evaluate(() => window.CYBEditor.insert('2'));
      assert.equal(await page.locator('#editor').inputValue(), '\\frac{2}{}');
      await page.locator('#editor').fill('α😀');
      await page.evaluate(() => window.CYBEditor.insert('backspace'));
      assert.equal(await page.locator('#editor').inputValue(), 'α');
    });
    await check(`Project rejects unsafe schema / ${language}`, async () => {
      const valid = await page.evaluate(() => window.CYBSession.snapshot());
      const bad = JSON.parse(valid); bad.storage = [['unrelated-password', 'secret']];
      assert.equal(await page.evaluate(raw => { try { window.CYBSession.validate(raw); return false; } catch { return true; } }, JSON.stringify(bad)), true);
      bad.storage = []; bad.site = '../../external';
      assert.equal(await page.evaluate(raw => { try { window.CYBSession.validate(raw); return false; } catch { return true; } }, JSON.stringify(bad)), true);
    });
    await context.close();
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
fs.mkdirSync(path.join(root, 'test-results/ux'), { recursive: true });
fs.writeFileSync(path.join(root, 'test-results/ux/platform.json'), JSON.stringify({ results }, null, 2));
if (results.some(result => !result.passed)) process.exitCode = 1;
console.log(`${results.filter(result => result.passed).length}/${results.length} Android native bridge scenarios passed`);
