import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..', '..');
const outputRoot = path.join(projectRoot, 'public', '__chunks');
const chunkBytes = 16 * 1024 * 1024;

const releases = JSON.parse(fs.readFileSync(path.join(projectRoot, 'scripts/release-manifest.json'), 'utf8')).releases;

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
