import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const releasePath = path.join(repositoryRoot, 'release/release.json');
const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
const releaseRoot = process.env.CYB_RELEASE_ROOT || path.join(repositoryRoot, 'outputs');

for (const artifact of release.artifacts) {
  const file = path.join(releaseRoot, artifact.fileName);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  artifact.bytes = fs.statSync(file).size;
  artifact.sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

fs.writeFileSync(releasePath, `${JSON.stringify(release, null, 2)}\n`);
console.log(`Updated ${release.artifacts.length} artifact checksums in release/release.json.`);
