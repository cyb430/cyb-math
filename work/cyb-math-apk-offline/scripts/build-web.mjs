import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE_ROOT, SITES } from './site-map.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = fileURLToPath(SOURCE_ROOT);
const webRoot = path.join(projectRoot, 'web');
const bridgeSource = fs.readFileSync(path.join(projectRoot, 'src', 'cyb-mobile-bridge.js'), 'utf8');
const bridgeTag = `<!-- CYB_MOBILE_BRIDGE_START -->\n<script>\n${bridgeSource}\n</script>\n<!-- CYB_MOBILE_BRIDGE_END -->`;

fs.rmSync(webRoot, { recursive: true, force: true });
fs.mkdirSync(webRoot, { recursive: true });

for (const site of SITES) {
  const sourceFile = path.join(sourceRoot, site.source, 'index.html');
  const destinationFile = path.join(webRoot, site.file);
  let html = fs.readFileSync(sourceFile, 'utf8');
  if (!/<\/head>/i.test(html)) throw new Error(`Missing </head> in ${sourceFile}`);
  html = html.replace(/<\/head>/i, `${bridgeTag}\n</head>`);
  fs.writeFileSync(destinationFile, html, 'utf8');
}

console.log(`Prepared ${SITES.length} offline pages in ${webRoot}`);
