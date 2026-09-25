import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..', '..');
const outputRoot = path.join(projectRoot, 'public', '__chunks');
const chunkBytes = 16 * 1024 * 1024;

const releases = [
  {
    "id": "windows-setup",
    "fileName": "CYB-Math-1.0.5-x64-Setup.exe",
    "version": "1.0.5",
    "bytes": 118902991,
    "sha256": "245F0F232BB1E6E78E0B978A2D2CD212C4113A81FD09343BF847814EFEE78C68"
  },
  {
    "id": "windows-portable",
    "fileName": "CYB-Math-1.0.5-x64-Portable.exe",
    "version": "1.0.5",
    "bytes": 118692448,
    "sha256": "9B34CC91B0926A33BC399D17403A6584B648B025E7C8006DE9AEE316D1E84AF1"
  },
  {
    "id": "android",
    "fileName": "CYB-Math-Android-1.0.4.apk",
    "version": "1.0.4",
    "bytes": 12189646,
    "sha256": "F1B403D5591A2383630642CD69969422C04B259EA127524B70BB7C9C30391D07"
  },
  {
    "id": "source",
    "fileName": "CYB-Math-Source-2026-09-24.zip",
    "version": "2026-09-24",
    "bytes": 36928656,
    "sha256": "C1BD9506C4A8FC66E28028DE1B32208125BFF79664016B235FC953D8705277D2"
  }
];

fs.mkdirSync(outputRoot, { recursive: true });

for (const release of releases) {
  const source = fs.readFileSync(path.join(process.env.CYB_RELEASE_ROOT || path.join(workspaceRoot, 'outputs'), release.fileName));
  assert.equal(source.byteLength, release.bytes, `${release.id}: source size changed`);
  assert.equal(createHash('sha256').update(source).digest('hex').toUpperCase(), release.sha256, `${release.id}: source hash changed`);

  const targetDirectory = path.join(outputRoot, release.id);
  fs.mkdirSync(targetDirectory, { recursive: true });
  const partCount = Math.ceil(source.byteLength / chunkBytes);
  for (let part = 0; part < partCount; part += 1) {
    const start = part * chunkBytes;
    const end = Math.min(source.byteLength, start + chunkBytes);
    fs.writeFileSync(path.join(targetDirectory, `${String(part).padStart(3, '0')}.part`), source.subarray(start, end));
  }

  const rebuilt = Buffer.concat(
    Array.from({ length: partCount }, (_, part) => fs.readFileSync(path.join(targetDirectory, `${String(part).padStart(3, '0')}.part`))),
  );
  assert.equal(createHash('sha256').update(rebuilt).digest('hex').toUpperCase(), release.sha256, `${release.id}: rebuilt hash mismatch`);
  console.log(`${release.id}: ${partCount} parts, ${source.byteLength} bytes, SHA-256 verified`);
}
