import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';

const directory = path.resolve('.toolchain/harmony');
if (/^c:/i.test(directory)) throw new Error('HarmonyOS tools must not be installed on C:');
fs.mkdirSync(directory, { recursive: true });
const name = 'commandline-tools-linux-x64-5.1.0.840.zip';
const url = `https://repo.huaweicloud.com/harmonyos/ohpm/5.1.0/${name}`;
const expected = (await fetch(`${url}.sha256`).then(response => {
  if (!response.ok) throw new Error(`Checksum HTTP ${response.status}`);
  return response.text();
})).trim().split(/\s+/)[0].toLowerCase();
if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error('Invalid vendor checksum');
const file = path.join(directory, name);
async function hash(file) { const digest = createHash('sha256'); await pipeline(fs.createReadStream(file), digest); return digest.digest('hex'); }
if (!fs.existsSync(file) || await hash(file) !== expected) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Tool download HTTP ${response.status}`);
  let bytes = 0; let printed = 0;
  const progress = new Transform({ transform(chunk, encoding, callback) {
    bytes += chunk.length;
    if (bytes - printed > 128 * 1024 * 1024) { printed = bytes; console.log(`HarmonyOS tools downloaded: ${Math.round(bytes / 1024 / 1024)} MiB`); }
    callback(null, chunk);
  } });
  await pipeline(Readable.fromWeb(response.body), progress, fs.createWriteStream(file));
}
const actual = await hash(file);
if (actual !== expected) throw new Error('HarmonyOS tool checksum mismatch; do not run');
console.log(JSON.stringify({ source: url, file, sha256: actual, verified: true }));
