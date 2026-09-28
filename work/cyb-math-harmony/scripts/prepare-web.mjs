import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES } from '../../cyb-math-apk-offline/scripts/site-map.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(project, '../..');
const destination = path.join(project, 'entry/src/main/resources/rawfile/pages');
fs.mkdirSync(destination, { recursive: true });
const bridge = fs.readFileSync(path.join(project, 'src/harmony-bridge.js'), 'utf8');
for (const site of SITES) {
  const original = fs.readFileSync(path.join(root, 'sites', site.source, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(destination, site.file), original.replace('</head>', `<script>\n${bridge}\n</script>\n</head>`));
}
for (const folder of ['AppScope/resources/base/media', 'entry/src/main/resources/base/media']) {
  fs.mkdirSync(path.join(project, folder), { recursive: true });
  fs.copyFileSync(path.join(root, 'work/cyb-math-exe-offline/assets/icon.png'), path.join(project, folder, 'app_icon.png'));
}
console.log(`Prepared ${SITES.length} shared offline math engines for native HarmonyOS.`);
