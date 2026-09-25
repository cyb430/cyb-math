'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(__dirname, '..', 'node_modules', '@ionic', 'utils-terminal', 'dist', 'info.js');
if (!fs.existsSync(target)) process.exit(0);

const source = fs.readFileSync(target, 'utf8');
if (source.includes("catch (_) {\n        shell = undefined;")) process.exit(0);

const before = '    const { shell } = os.userInfo();';
const after = [
  '    let shell;',
  '    try {',
  '        ({ shell } = os.userInfo());',
  '    }',
  '    catch (_) {',
  '        shell = undefined;',
  '    }'
].join('\n');

if (!source.includes(before)) throw new Error('The Ionic terminal compatibility patch no longer matches');
fs.writeFileSync(target, source.replace(before, after), 'utf8');
console.log('Applied Windows terminal compatibility patch.');
