import fs from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { root } from './serve.mjs';
import vm from 'node:vm';

const css = fs.readFileSync(path.join(root, 'scripts/ux/common.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'scripts/ux/common.js'), 'utf8');
const translations = {};
const dictionaryPatch = script.match(/Object\.assign\(window\.__CYB_I18N__\?\.dictionary \|\| \{\}, \{[\s\S]*?\n  \}\);/)[0];
vm.runInNewContext(dictionaryPatch, { window: { __CYB_I18N__: { dictionary: translations } }, Object });
const platform = ['editor.js', 'session.js'].map(file => fs.readFileSync(path.join(root, 'scripts/platform', file), 'utf8')).join('\n');
const sites = JSON.parse(fs.readFileSync(path.join(root, 'release/release.json'))).sites;
const matrixLibrary = buildSync({ entryPoints: [path.join(root, 'scripts/ux/matrix-library.js')], bundle: true, minify: true, format: 'iife', globalName: 'CYBMatrix', write: false, target: ['chrome100'] }).outputFiles[0].text;
const matrixPackages = ['ml-matrix', 'is-any-array', 'ml-array-rescale', 'ml-array-min', 'ml-array-max'];
const matrixNotices = matrixPackages.map(name => {
  const directory = path.join(root, 'node_modules', name);
  const info = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const license = ['LICENSE', 'LICENSE.txt', 'LICENSE.md'].map(file => path.join(directory, file)).find(file => fs.existsSync(file));
  if (!license) throw new Error(`Missing library license: ${name}`);
  return `${name} ${info.version}\n${fs.readFileSync(license, 'utf8')}`;
}).join('\n\n');
fs.writeFileSync(path.join(root, 'docs/MATRIX_LIBRARY_NOTICES.txt'), matrixNotices);
for (const site of sites) {
  const file = path.join(root, 'sites', site.directory, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/(window\.__CYB_I18N__=)([^\n]+?)(;<\/script>)/, (_, assignment, json, suffix) => {
    const config = JSON.parse(json);
    Object.assign(config.dictionary, translations);
    return assignment + JSON.stringify(config) + suffix;
  });
  html = html.replace(/<!-- CYB_UX_START -->[\s\S]*?<!-- CYB_UX_END -->\s*/g, '');
  html = html.replace(/<!-- CYB_MATRIX_START -->[\s\S]*?<!-- CYB_MATRIX_END -->\s*/g, '');
  const inline = `<!-- CYB_UX_START -->\n<style>${css}</style>\n<script data-site="${site.directory}">${script}\n${platform}</script>\n<!-- CYB_UX_END -->\n`;
  html = html.replace('</head>', inline + '</head>');
  if (site.directory === 'math-linear') html = html.replace('</head>', `<!-- CYB_MATRIX_START -->\n<script>/*\n${matrixNotices.replace(/\*\//g, '* /')}\n*/\n${matrixLibrary}</script>\n<!-- CYB_MATRIX_END -->\n</head>`);
  fs.writeFileSync(file, html);
  fs.copyFileSync(file, path.join(root, 'work/cyb-math-exe-offline/sites', site.directory, 'index.html'));
}
fs.copyFileSync(path.join(root, 'work/cyb-personal-home/public/index.html'), path.join(root, 'work/cyb-personal-home/index.html'));
console.log('Synchronized self-contained UX improvements across 13 web and desktop pages.');
