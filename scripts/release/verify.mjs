import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const release = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'release/release.json'), 'utf8'));
const requireArtifacts = process.argv.includes('--require-artifacts');
const releaseRoot = process.env.CYB_RELEASE_ROOT || [
  path.join(repositoryRoot, 'outputs'),
  path.resolve(repositoryRoot, '../../outputs'),
].find((candidate) => fs.existsSync(candidate));

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(repositoryRoot, relative), 'utf8'));
}

function manifestFromRelease() {
  return { date: release.date, releases: release.artifacts };
}

function digest(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

assert.equal(release.schemaVersion, 1);
assert.match(release.tag, /^v\d{4}\.\d{2}\.\d{2}$/);
assert.equal(release.sites.length, 13, 'Expected the main site plus twelve tools');
assert.equal(new Set(release.sites.map((site) => site.project)).size, 13, 'Cloudflare project names must be unique');
assert.equal(new Set(release.artifacts.map((artifact) => artifact.fileName)).size, release.artifacts.length, 'Artifact names must be unique');

const desktopPackage = readJson('work/cyb-math-exe-offline/package.json');
const androidPackage = readJson('work/cyb-math-apk-offline/package.json');
assert.equal(desktopPackage.version, release.windows.version, 'Windows package version is out of sync');
assert.equal(androidPackage.version, release.android.version, 'Android package version is out of sync');

const gradle = fs.readFileSync(path.join(repositoryRoot, 'work/cyb-math-apk-offline/android/app/build.gradle'), 'utf8');
assert.match(gradle, new RegExp(`versionCode\\s+${release.android.versionCode}\\b`), 'Android versionCode is out of sync');
assert.match(gradle, new RegExp(`versionName\\s+"${release.android.version.replaceAll('.', '\\.')}"`), 'Android versionName is out of sync');

const expectedManifest = manifestFromRelease();
assert.deepEqual(readJson(`docs/releases/${release.date}.json`), expectedManifest, 'Public release manifest is out of sync');
assert.deepEqual(readJson('work/cyb-math-download/scripts/release-manifest.json'), expectedManifest, 'Download manifest is out of sync');

const downloadSource = fs.readFileSync(path.join(repositoryRoot, 'work/cyb-math-download/src/index.ts'), 'utf8');
assert.ok(downloadSource.includes(`const RELEASE_DATE = '${release.date}'`), 'Download page date is out of sync');
for (const artifact of release.artifacts) {
  for (const value of [artifact.fileName, artifact.version, String(artifact.bytes), artifact.sha256]) {
    assert.ok(downloadSource.includes(value), `Download page is missing ${artifact.id} metadata: ${value}`);
  }
}

for (const site of release.sites) {
  const directory = path.join(repositoryRoot, 'sites', site.directory);
  for (const file of ['index.html', '_headers', '_worker.js']) assert.ok(fs.existsSync(path.join(directory, file)), `${site.directory}: missing ${file}`);
  const worker = fs.readFileSync(path.join(directory, '_worker.js'), 'utf8');
  assert.ok(worker.includes(site.domain), `${site.directory}: redirect worker does not name ${site.domain}`);
}

const bank = readJson('work/cyb-math-exe-offline/tests/math-regression/cases.json');
const toolSites = release.sites.map((site) => site.directory).filter((site) => site !== 'cyb-math');
for (const site of toolSites) {
  const cases = bank.cases.filter((testCase) => testCase.site === site);
  for (const category of ['typical', 'boundary', 'invalid']) {
    assert.ok(cases.some((testCase) => testCase.category === category), `${site}: missing ${category} regression case`);
  }
}

if (requireArtifacts) {
  assert.ok(releaseRoot && fs.existsSync(releaseRoot), 'Release artifact directory was not found; set CYB_RELEASE_ROOT');
  for (const artifact of release.artifacts) {
    const file = path.join(releaseRoot, artifact.fileName);
    assert.ok(fs.existsSync(file), `Missing release artifact: ${file}`);
    assert.equal(fs.statSync(file).size, artifact.bytes, `${artifact.id}: byte count changed`);
    assert.equal(digest(file), artifact.sha256, `${artifact.id}: SHA-256 changed`);
  }
}

console.log(JSON.stringify({
  passed: true,
  tag: release.tag,
  sites: release.sites.length,
  tools: toolSites.length,
  regressionCases: bank.cases.length,
  artifactsVerified: requireArtifacts ? release.artifacts.length : 0,
  releaseRoot: requireArtifacts ? releaseRoot : null,
}, null, 2));
