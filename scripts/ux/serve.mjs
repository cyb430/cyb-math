import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function startServer(port = 0) {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/download/' || url.pathname === '/download/index.html') {
      const { default: worker } = await import('../../work/cyb-math-download/src/index.ts');
      const result = await worker.fetch(new Request('http://localhost/' + url.search, { headers: { 'Accept-Language': request.headers['accept-language'] || 'zh-CN' } }), { BAIDU_SHARE_URL: 'https://pan.baidu.com/s/1HOlhpnb_63O-GX17Z-R_SQ?pwd=math', BAIDU_EXTRACT_CODE: 'math' });
      response.writeHead(result.status, Object.fromEntries(result.headers)); response.end(Buffer.from(await result.arrayBuffer())); return;
    }
    let relative;
    try { relative = decodeURIComponent(url.pathname).replace(/^\/+/, ''); } catch { response.writeHead(400).end('Bad Request'); return; }
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    if (relative.startsWith('home/')) relative = relative.replace('home/', 'work/cyb-personal-home/public/');
    else if (relative.startsWith('android/')) relative = relative.replace('android/', 'work/cyb-math-apk-offline/web/');
    else if (relative.startsWith('harmony/')) relative = relative.replace('harmony/', 'work/cyb-math-harmony/entry/src/main/resources/rawfile/pages/');
    else if (!relative.startsWith('sites/')) relative = 'sites/' + relative;
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try {
      const content = fs.readFileSync(file);
      response.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream');
      response.end(content);
    } catch { response.writeHead(404).end('Not found'); }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startServer(Number(process.env.PORT || 4173));
  console.log(`CYB Math preview: http://127.0.0.1:${server.address().port}/cyb-math/`);
}
