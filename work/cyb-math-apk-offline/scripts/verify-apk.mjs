import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SITES } from './site-map.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apk = path.join(projectRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const release = JSON.parse(fs.readFileSync(path.resolve(projectRoot, '../../release/release.json'), 'utf8'));
const toolRoot = process.env.CYB_TOOLCHAIN_ROOT || path.join(projectRoot, '.toolchain');
const sdkRoot = path.join(toolRoot, 'android-sdk');
const javaHome = path.join(toolRoot, 'jdk-21');
const buildTools = path.join(sdkRoot, 'build-tools', '36.0.0');
const env = { ...process.env, JAVA_HOME: javaHome, PATH: `${path.join(javaHome, 'bin')};${process.env.PATH || ''}` };

assert.ok(fs.existsSync(apk), 'Release APK is missing');

const entries = execFileSync('tar.exe', ['-tf', apk], { encoding: 'utf8' }).split(/\r?\n/);
for (const site of SITES) {
  const entry = `assets/public/${site.file}`;
  assert.ok(entries.includes(entry), `APK is missing ${entry}`);
  const packed = execFileSync('tar.exe', ['-xOf', apk, entry], { maxBuffer: 64 * 1024 * 1024 });
  const expected = fs.readFileSync(path.join(projectRoot, 'web', site.file));
  assert.equal(crypto.createHash('sha256').update(packed).digest('hex'), crypto.createHash('sha256').update(expected).digest('hex'), `${entry} changed while packaging`);
}

const badging = execFileSync(path.join(buildTools, 'aapt.exe'), ['dump', 'badging', apk], { encoding: 'utf8', env });
assert.ok(badging.includes(`package: name='cn.cybmath.app' versionCode='${release.android.versionCode}' versionName='${release.android.version}'`), 'APK version differs from release manifest');
assert.match(badging, /sdkVersion:'24'/);
assert.match(badging, /targetSdkVersion:'36'/);
assert.match(badging, /android\.permission\.INTERNET/, 'Native update checking requires Internet permission');

const signer = execFileSync('cmd.exe', ['/d', '/c', path.join(buildTools, 'apksigner.bat'), 'verify', '--verbose', '--print-certs', apk], { encoding: 'utf8', env });
assert.match(signer, /Verified using v2 scheme.*true/i);

console.log(JSON.stringify({
  passed: true,
  apk,
  bytes: fs.statSync(apk).size,
  pages: SITES.length,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex'),
  signer: signer.split(/\r?\n/).filter(line => /Signer #1 certificate SHA-256 digest/.test(line))[0]
}, null, 2));
