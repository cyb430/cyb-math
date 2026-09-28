import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { root, startServer } from './serve.mjs';

const output = path.join(root, 'test-results/ux');
fs.mkdirSync(output, { recursive: true });
const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
const sites = JSON.parse(fs.readFileSync(path.join(root, 'release/release.json'))).sites.map(s => s.directory);
const pages = [];
try {
  for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
    for (const site of [...sites, 'home', 'download']) {
      const context = await browser.newContext({ viewport, locale: 'zh-CN' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const started = Date.now();
      await page.goto(`${base}/${site}/?lang=zh-Hans`, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(site === 'math-tools-pro' ? 1600 : 600);
      const inspection = await page.evaluate(() => {
        const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const controls = [...document.querySelectorAll('button,input,select,textarea,a[role=button]')].filter(visible);
        return {
          title: document.title,
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyLength: document.body.innerText.length,
          controls: controls.map(el => ({ tag: el.tagName, id: el.id, label: el.getAttribute('aria-label') || el.title || el.textContent?.trim().slice(0, 80), type: el.type, width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) })),
          overflow: [...document.querySelectorAll('body *')].filter(visible).filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 2 && getComputedStyle(el).position !== 'fixed'; }).slice(0, 12).map(el => ({ tag: el.tagName, id: el.id, class: String(el.className), right: Math.round(el.getBoundingClientRect().right) })),
          unlabeled: controls.filter(el => !el.textContent?.trim() && !el.getAttribute('aria-label') && !el.title && !el.labels?.length && !el.placeholder).map(el => ({ tag: el.tagName, id: el.id })),
          canvases: [...document.querySelectorAll('canvas')].filter(visible).map(el => ({ id: el.id, width: el.width, height: el.height }))
        };
      });
      await page.screenshot({ path: path.join(output, `${site}-${viewport.width}.png`) });
      if (site === 'math-linear') {
        await page.locator('[data-tab="fit"]').click();await page.locator('#fitCalc').click();
        await page.screenshot({ path: path.join(output, `least-squares-${viewport.width}.png`), fullPage: true });
      }
      pages.push({ site, viewport, loadMs: Date.now() - started, errors, ...inspection });
      console.log(`${site} ${viewport.width}: overflow=${inspection.scrollWidth > viewport.width + 2} errors=${errors.length} controls=${inspection.controls.length}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  fs.writeFileSync(path.join(output, 'audit.json'), JSON.stringify({ date: new Date().toISOString(), pages }, null, 2));
}
