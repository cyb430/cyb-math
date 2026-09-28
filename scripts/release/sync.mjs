import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const releasePath = path.join(repositoryRoot, 'release/release.json');
const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
const manifest = { date: release.date, releases: release.artifacts };

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(path.join(repositoryRoot, relative)), { recursive: true });
  fs.writeFileSync(path.join(repositoryRoot, relative), `${JSON.stringify(value, null, 2)}\n`);
}

function updatePackage(relative, version) {
  const file = path.join(repositoryRoot, relative);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  value.version = version;
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function updatePackageLock(relative, version) {
  const file = path.join(repositoryRoot, relative);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  value.version = version;
  if (value.packages?.['']) value.packages[''].version = version;
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

updatePackage('work/cyb-math-exe-offline/package.json', release.windows.version);
updatePackage('package.json', release.date.split('-').map(Number).join('.'));
updatePackageLock('package-lock.json', release.date.split('-').map(Number).join('.'));
updatePackage('work/cyb-math-apk-offline/package.json', release.android.version);
updatePackageLock('work/cyb-math-exe-offline/package-lock.json', release.windows.version);
updatePackageLock('work/cyb-math-apk-offline/package-lock.json', release.android.version);
writeJson(`docs/releases/${release.date}.json`, manifest);
writeJson('work/cyb-math-download/scripts/release-manifest.json', manifest);

const gradlePath = path.join(repositoryRoot, 'work/cyb-math-apk-offline/android/app/build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${release.android.versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${release.android.version}"`);
fs.writeFileSync(gradlePath, gradle);

const downloadPath = path.join(repositoryRoot, 'work/cyb-math-download/src/index.ts');
let download = fs.readFileSync(downloadPath, 'utf8');
download = download.replace(/const RELEASE_DATE = '[^']+';/, `const RELEASE_DATE = '${release.date}';`);
for (const artifact of release.artifacts) {
  const objectPattern = new RegExp(`(\\{\\s*id:\\s*'${artifact.id}',[\\s\\S]*?\\n\\s*\\},)`);
  const match = download.match(objectPattern);
  if (!match) throw new Error(`Download metadata block not found: ${artifact.id}`);
  let block = match[1];
  block = block.replace(/fileName:\s*'[^']+'/, `fileName: '${artifact.fileName}'`);
  block = block.replace(/version:\s*'[^']+'/, `version: '${artifact.version}'`);
  block = block.replace(/size:\s*'[^']+'/, `size: '${(artifact.bytes / 1048576).toFixed(1)} MiB'`);
  block = block.replace(/bytes:\s*\d+/, `bytes: ${artifact.bytes}`);
  block = block.replace(/sha256:\s*'[A-F0-9]+'/, `sha256: '${artifact.sha256}'`);
  download = download.replace(match[1], block);
}
const windowsVersion = release.windows.version;
const androidVersion = release.android.version;
// A new GitHub release does not update the independently maintained mirror.
fs.writeFileSync(downloadPath, download);

let readme = fs.readFileSync(path.join(repositoryRoot, 'README.md'), 'utf8');
readme = readme.replace(/Windows \d+\.\d+\.\d+（安装版、便携版）/, `Windows ${windowsVersion}（安装版、便携版）`);
readme = readme.replace(/Android \d+\.\d+\.\d+/, `Android ${androidVersion}`);
fs.writeFileSync(path.join(repositoryRoot, 'README.md'), readme);

console.log(`Release metadata synchronized for ${release.tag}.`);
