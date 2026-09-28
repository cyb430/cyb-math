import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { startServer } from './serve.mjs';

const require = createRequire(import.meta.url);
const { restoreBounds } = require('../../work/cyb-math-exe-offline/lib/window-state.cjs');
const server = await startServer(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
const results = [];
async function test(name, action) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN', acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.addInitScript(() => {
    window.__copies = [];
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => window.__copies.push(text) }, configurable: true });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try { await action(page, context); assert.deepEqual(errors, []); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error.stack }); }
  finally { await context.close(); }
  console.log(`${results.at(-1).passed ? 'PASS' : 'FAIL'} ${name}${results.at(-1).error ? ': ' + results.at(-1).error.split('\n')[0] : ''}`);
}
async function open(page, site, language = 'zh-Hans') { await page.goto(`${base}/${site}/?lang=${language}`); await page.waitForTimeout(site === 'math-tools-pro' ? 1200 : 400); }
async function downloadText(page, selector) {
  const promise = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await promise;
  assert.equal(await download.failure(), null);
  return fs.readFile(await download.path(), 'utf8');
}

try {
  const sites = (await fs.readdir('sites', { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name);
  for (const language of ['zh-Hans', 'zh-Hant', 'en']) {
    for (const site of sites) await test(`${site}: usable first screen / ${language}`, async page => {
      await open(page, site, language);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true);
      assert.equal(await page.locator('dialog[open], .modal.show, .help-overlay.show, #helpModal.show').count(), 0);
      assert.equal(await page.locator('#cyb-language-switcher select').inputValue(), language);
      const nav = page.locator('.cyb-suite-nav, #cyb-suite-bar, .top-actions').first();
      if (await nav.count()) assert.equal(await nav.locator('#cyb-language-switcher').count(), 1);
      const theme = page.locator('#cyb-suite-theme, #theme, #themeBtn').first();
      if (await theme.count()) {
        const before = await page.evaluate(() => document.documentElement.dataset.theme);
        await theme.click();
        const after = await page.evaluate(() => document.documentElement.dataset.theme);
        assert.notEqual(before, after);
      }
    });
    await test(`Main: pin, return, search Enter / ${language}`, async page => {
      await open(page, 'cyb-math', language);
      await page.locator('.tool-item').filter({ has: page.locator('[data-id="linear"]') }).locator('.pin-tool').click();
      assert.equal(await page.locator('#favorite-section a').count(), 1);
      await page.reload();
      assert.equal(await page.locator('#favorite-section a').count(), 1);
      await page.locator('#tool-search').fill(language === 'en' ? 'determinant' : '行列式');
      await page.locator('#tool-search').press('Tab');
      await page.reload();
      assert.notEqual(await page.locator('#tool-search').inputValue(), '');
      await page.locator('#tool-search').focus();
      await page.route('https://linear.cyb-math.cn/**', route => route.fulfill({ status: 200, body: '<h1>Math task</h1>', contentType: 'text/html' }));
      await page.locator('#tool-search').press('Enter');
      await page.waitForURL('https://linear.cyb-math.cn/**');
    });
    await test(`Linear: draft, error recovery, copy/TXT, tiny value / ${language}`, async page => {
      await open(page, 'math-linear', language);
      await page.locator('#matrixOp').selectOption('det');
      assert.equal(await page.locator('#matrixB').isVisible(), false);
      await page.locator('#matrixA').fill('1 2\n3');
      await page.locator('#matrixCalc').click();
      assert.ok(await page.locator('#matrixResult .bad').count());
      await page.locator('#matrixA').fill('1e-12 0\n0 2e-12');
      await page.reload();
      assert.equal(await page.locator('#matrixA').inputValue(), '1e-12 0\n0 2e-12');
      await page.locator('#matrixCalc').click();
      assert.match(await page.locator('#matrixResult').innerText(), /2e-24/);
      await page.locator('#copyResult').click();
      assert.match(await page.evaluate(() => window.__copies.at(-1)), /2e-24/);
      assert.match(await downloadText(page, '#exportResult'), /2e-24/);
      const copies = await page.evaluate(() => window.__copies.length);
      await page.locator('#matrixA').fill('1e309');await page.locator('#matrixCalc').click();
      assert.ok(await page.locator('#matrixResult .bad').count());
      await page.locator('#matrixA').fill('1 2\n3 4');await page.locator('#matrixCalc').click();
      assert.match(await page.locator('#matrixResult').innerText(), /[-−]2/);
      await page.locator('#matrixA').fill('5 6\n7 8');await page.locator('#copyResult').click();
      assert.equal(await page.evaluate(() => window.__copies.length), copies);
    });
    await test(`Equation: unfinished draft and current tab / ${language}`, async page => {
      await open(page, 'math-equation', language);
      await page.locator('nav [data-p="int"]').click();
      await page.locator('#i-f').fill('x^3+7');
      await page.reload();
      assert.equal(await page.locator('#i-f').inputValue(), 'x^3+7');
      assert.equal(await page.locator('#p-int').isVisible(), true);
      await page.locator('#cyb-suite-share').click();
      assert.ok((await page.evaluate(() => window.__copies.at(-1))).includes('#'));
    });
    await test(`Least squares: calculation, residual CSV, persistence / ${language}`, async page => {
      await open(page, 'math-linear', language);
      await page.locator('[data-tab="fit"]').click();
      await page.locator('#fitInput').fill('0 1\n1 3\n2 5');await page.locator('#fitCalc').click();
      assert.match(await page.locator('#fitResult').innerText(), /y = 2x \+ 1/);
      assert.equal(await page.locator('#fitCanvas').isVisible(), true);
      assert.ok((await downloadText(page, '#fitCSV')).includes('b-Ax'));
      await page.locator('#fitInput').fill('0 2\n1 4\n2 6');await page.reload();
      assert.equal(await page.locator('#panel-fit').isVisible(), true);
      assert.equal(await page.locator('#fitInput').inputValue(), '0 2\n1 4\n2 6');
      await page.locator('#fitCalc').click();assert.match(await page.locator('#fitResult').innerText(), /y = 2x \+ 2/);
      await page.locator('#fitMode').selectOption('system');await page.locator('#fitInput').fill('1 1 2\n2 2 4');await page.locator('#fitCalc').click();
      assert.ok(await page.locator('#fitResult .warn').count());
    });
    await test(`Theory: unfinished exact integer draft / ${language}`, async page => {
      await open(page, 'math-theory', language);
      await page.locator('[data-tool="gcd"]').click();
      await page.locator('#g-a').fill('9007199254740993');
      await page.reload();
      assert.equal(await page.locator('#g-a').inputValue(), '9007199254740993');
      assert.equal(await page.locator('#tool-gcd').isVisible(), true);
      await page.locator('#cyb-suite-share').click();
      assert.match(await page.evaluate(() => window.__copies.at(-1)), /#s=/);
    });
    await test(`LaTeX: unfinished draft / ${language}`, async page => {
      await open(page, 'math-latex', language);
      await page.locator('#editor').fill('Draft: $\\frac{7}{13}$');
      await page.reload();
      assert.equal(await page.locator('#editor').inputValue(), 'Draft: $\\frac{7}{13}$');
    });
    await test(`Download center: manual checksum fallback / ${language}`, async page => {
      await open(page, 'download', language);
      assert.equal(await page.locator('.release-card').count(), 4);
      await page.locator('details').first().locator('summary').click();
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Denied'); } }, configurable: true }));
      await page.locator('.copy').first().click();
      assert.match(await page.evaluate(() => window.getSelection().toString()), /^[A-F0-9]{64}$/);
      assert.equal(await page.locator('.download-button[aria-label]').count(), 4);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true);
    });
    await test(`Personal homepage: theme and download/source entry / ${language}`, async page => {
      await open(page, 'home', language);
      assert.equal(await page.locator('a[href="https://download.cyb-math.cn/"]').count(), 1);
      assert.equal(await page.locator('a[href="https://github.com/cyb430/cyb-math"]').count(), 1);
      await page.locator('#themeToggle').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true);
    });
    await test(`Sequence: exact big integer CSV and sharing / ${language}`, async page => {
      await open(page, 'math-sequence', language);
      await page.locator('[data-ex="big"]').click();
      const csv = await downloadText(page, '#csvBtn');
      assert.ok(csv.includes('1267650600228229401496703205375'));
      await page.locator('#cyb-suite-share').click();
      assert.match(await page.evaluate(() => window.__copies.at(-1)), /#s=/);
    });
    await test(`Plotter: function, SVG, invalid range, native help / ${language}`, async page => {
      await open(page, 'math-plotter', language);
      const count = await page.locator('#funcList li').count();
      await page.locator('#exprInput').fill('y=x^2+1');await page.locator('#addBtn').click();
      assert.ok(await page.locator('#funcList li').count() > count);
      assert.match(await downloadText(page, '#fabSvg'), /<svg/);
      await page.locator('#xMin').fill('5');await page.locator('#xMax').fill('-5');await page.locator('#applyRangeBtn').click();
      assert.equal(await page.locator('#msgBar').isVisible(), true);
      await page.locator('#cyb-suite-share').click();assert.ok((await page.evaluate(() => window.__copies.at(-1))).includes('#'));
      await page.locator('#cyb-suite-help-button').click();assert.equal(await page.locator('#helpMask').isVisible(), true);
      assert.equal(await page.locator('#cyb-suite-help').isVisible(), false);
      await page.locator('#helpNoMore').uncheck();await page.locator('#helpClose').click();await page.reload();
      assert.equal(await page.locator('#helpMask').isVisible(), true);
    });
    await test(`Complex: expression error recovery and PNG / ${language}`, async page => {
      await open(page, 'math-complex', language);
      await page.locator('#expr').fill('z+');await page.locator('#btnApply').click();
      const invalid = await page.locator('#exprMsg').innerText();
      await page.locator('#expr').fill('z^2-1');await page.locator('#btnApply').click();await page.waitForTimeout(500);
      assert.notEqual(await page.locator('#exprMsg').innerText(), invalid);
      const pending = page.waitForEvent('download');await page.locator('#btnPng').click();const download=await pending;
      const image=PNG.sync.read(await fs.readFile(await download.path()));assert.ok(image.width>100&&image.height>100);
    });
    await test(`Fourier: invalid path, recovery, SVG / ${language}`, async page => {
      await open(page, 'math-fourier', language);
      await page.locator('#svgInputA').fill('M0 0 A10 10 0 0 1 20 20');await page.locator('#btnLoadSvgA').click();
      assert.ok((await page.locator('#svgErrA').innerText()).length);
      await page.locator('#svgInputA').fill('M0 0 L100 0 L100 100 L0 100 Z');await page.locator('#btnLoadSvgA').click();
      assert.match(await downloadText(page, '#btnSvgA'), /<svg/);
    });
    await test(`Geometry: cancel and confirm new document / ${language}`, async page => {
      await open(page,'math-geometry',language);
      await page.evaluate(()=>addPoint(50,60));
      const count=await page.evaluate(()=>objects.length);
      page.once('dialog',dialog=>dialog.dismiss());await page.keyboard.press('Control+n');
      assert.equal(await page.evaluate(()=>objects.length),count);
      page.once('dialog',dialog=>dialog.accept());await page.keyboard.press('Control+n');
      assert.equal(await page.evaluate(()=>objects.length),0);
    });
  }
  for (const width of [1366,390]) await test(`3D: nonblank canvas and real rotation / ${width}`, async page => {
    await page.setViewportSize({width,height:width===390?844:900});await open(page,'math-3d');await page.waitForTimeout(500);
    assert.ok(await page.locator('#objList li').count());
    const canvas=page.locator('#glcanvas'),before=PNG.sync.read(await canvas.screenshot());
    const colors=new Set();for(let i=0;i<before.data.length;i+=80)colors.add(before.data.subarray(i,i+3).toString('hex'));assert.ok(colors.size>16,'3D canvas is flat');
    await page.locator('#tbSpin').click();await page.waitForTimeout(600);
    const after=PNG.sync.read(await canvas.screenshot());assert.equal(before.data.length,after.data.length);
    let changed=0;for(let i=0;i<before.data.length;i+=4)if(before.data[i]!==after.data[i]||before.data[i+1]!==after.data[i+1]||before.data[i+2]!==after.data[i+2])changed++;
    assert.ok(changed>100,'3D rotation did not change rendered pixels');
  });
  await test('Quick tools: all nine modules are usable', async page => {
    await page.setViewportSize({width:1366,height:900});await open(page,'math-tools-pro');
    for(const id of ['plotter','calc','numerics','stats','fractal','physics','geometry','python','guide']) {
      await page.evaluate(id=>App.show(id),id);await page.waitForTimeout(id==='python'?1500:150);
      assert.ok((await page.locator('#toolbar').innerText()).length,id+' toolbar is empty');
      assert.equal(await page.locator('#cyb-tools-theme').count(),1);
    }
  });
  await test('Desktop: restore bounds after display changes', async () => {
    const displays = [{ workArea: { x: 0, y: 0, width: 1024, height: 768 } }];
    assert.deepEqual(restoreBounds({ bounds: { x: 800, y: 500, width: 1000, height: 700 } }, displays), { x: 24, y: 68, width: 1000, height: 700 });
    assert.deepEqual(restoreBounds({ bounds: { x: -2000, y: 0, width: 1280, height: 900 } }, displays), { x: 0, y: 0, width: 1024, height: 768 });
    assert.equal(restoreBounds({ bounds: { x: 0, y: 0, width: 10, height: 10 } }, displays).width, 640);
  });
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
  await fs.mkdir('test-results/ux', { recursive: true });
  await fs.writeFile(path.resolve('test-results/ux/journeys.json'), JSON.stringify({ passed: results.every(result => result.passed), results }, null, 2));
}
console.log(`${results.filter(result => result.passed).length}/${results.length} journeys passed`);
if (results.some(result => !result.passed)) process.exitCode = 1;
