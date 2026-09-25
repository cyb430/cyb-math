import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { SITE_BY_APP_HOST, WEB_HOST_TO_APP_HOST, mapWebUrlToAppUrl } = require('./lib/routes.cjs');

const sourceRoot = path.resolve('../../sites');
const bundledRoot = path.resolve('sites');
const expectedSites = Object.values(SITE_BY_APP_HOST).sort();

assert.equal(expectedSites.length, 13, 'Expected one main site and twelve tools');
assert.equal(new Set(expectedSites).size, expectedSites.length, 'Site directories must be unique');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

for (const site of expectedSites) {
  const source = path.join(sourceRoot, site, 'index.html');
  const bundled = path.join(bundledRoot, site, 'index.html');
  assert.ok(fs.existsSync(source), `Missing source ${site}/index.html`);
  assert.ok(fs.existsSync(bundled), `Missing bundled ${site}/index.html`);
  assert.equal(sha256(bundled), sha256(source), `Bundled HTML changed for ${site}`);
}

for (const [webHost, appHost] of Object.entries(WEB_HOST_TO_APP_HOST)) {
  assert.equal(
    mapWebUrlToAppUrl(`https://${webHost}/path?q=1#state`),
    `cyb-math://${appHost}/path?q=1#state`,
    `URL mapping failed for ${webHost}`,
  );
}

assert.equal(mapWebUrlToAppUrl('https://example.com/'), null, 'External URL must stay external');
console.log(`Static desktop checks passed: ${expectedSites.length} unchanged pages and ${Object.keys(WEB_HOST_TO_APP_HOST).length} domain mappings.`);
