import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('../../sites');
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
}

walk(root);

const results = [];
const patterns = [
  { kind: 'asset', re: /<(?:script|img|source)\b[^>]*?\bsrc\s*=\s*["'](https?:\/\/[^"']+)["']/gi },
  { kind: 'style', re: /<link\b(?=[^>]*\brel\s*=\s*["'](?:stylesheet|preload|modulepreload)["'])[^>]*?\bhref\s*=\s*["'](https?:\/\/[^"']+)["']/gi },
  { kind: 'fetch', re: /\b(?:fetch|importScripts|loadPyodide)\s*\(\s*["'`](https?:\/\/[^"'`]+)["'`]/gi },
  { kind: 'css', re: /url\(\s*["']?(https?:\/\/[^)"']+)/gi },
];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const { kind, re } of patterns) {
    re.lastIndex = 0;
    for (let match; (match = re.exec(text)); ) {
      results.push({ file: path.relative(root, file), kind, url: match[1] });
    }
  }
}

const unique = [...new Map(results.map((item) => [`${item.file}\0${item.kind}\0${item.url}`, item])).values()];
console.log(JSON.stringify({ htmlFiles: files.length, externalReferences: unique }, null, 2));
