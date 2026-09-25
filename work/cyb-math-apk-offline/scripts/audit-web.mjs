import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILE_TO_WEB, HOST_TO_FILE, SOURCE_ROOT, SITES } from './site-map.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = fileURLToPath(SOURCE_ROOT);
const webRoot = path.join(projectRoot, 'web');
const bridgeSource = fs.readFileSync(path.join(projectRoot, 'src', 'cyb-mobile-bridge.js'), 'utf8');
const bridgeTag = `<!-- CYB_MOBILE_BRIDGE_START -->\n<script>\n${bridgeSource}\n</script>\n<!-- CYB_MOBILE_BRIDGE_END -->\n`;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

assert.equal(SITES.length, 13, 'Expected one main page and twelve tools');
assert.equal(new Set(SITES.map(site => site.file)).size, 13, 'Output filenames must be unique');
assert.equal(Object.keys(HOST_TO_FILE).length, 26, 'Every custom and legacy domain must be mapped');
assert.equal(Object.keys(FILE_TO_WEB).length, 13, 'Every local page needs an official share URL');

for (const site of SITES) {
  const source = fs.readFileSync(path.join(sourceRoot, site.source, 'index.html'), 'utf8');
  const bundled = fs.readFileSync(path.join(webRoot, site.file), 'utf8');
  assert.ok(bundled.includes('CYB_MOBILE_BRIDGE_START'), `Missing mobile bridge in ${site.file}`);
  assert.equal(
    sha256(bundled.replace(bridgeTag, '')),
    sha256(source),
    `Source page changed beyond the navigation bridge: ${site.file}`
  );
}

const bridge = bridgeSource;
for (const [host, file] of Object.entries(HOST_TO_FILE)) {
  assert.ok(bridge.includes(`'${host}': '${file}'`), `Bridge lacks mapping for ${host}`);
}

const remoteRuntimePatterns = [
  /<script[^>]+src=["']https?:\/\//i,
  /<link[^>]+rel=["'][^"']*stylesheet[^"']*["'][^>]+href=["']https?:\/\//i,
  /<link[^>]+href=["']https?:\/\/[^>]+rel=["'][^"']*stylesheet[^"']*["']/i
];
for (const site of SITES) {
  const html = fs.readFileSync(path.join(webRoot, site.file), 'utf8');
  assert.equal(
    remoteRuntimePatterns.some(pattern => pattern.test(html)),
    false,
    `Remote runtime dependency found in ${site.file}`
  );
}

console.log(`APK web audit passed: ${SITES.length} pages, ${Object.keys(HOST_TO_FILE).length} domain mappings, no remote runtime assets.`);
