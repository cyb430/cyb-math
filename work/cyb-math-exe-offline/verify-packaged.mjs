import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const packageJson = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const executable = path.resolve(process.argv[2] || `dist/CYB-Math-${packageJson.version}-x64-Portable.exe`);
const port = Number(process.argv[3] || 9247);
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cyb-math-packaged-verify-'));
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const child = spawn(executable, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userData}`,
  '--disable-gpu',
  '--no-sandbox',
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
], {
  stdio: 'ignore',
  windowsHide: true,
});

let targets;
for (let attempt = 0; attempt < 300; attempt += 1) {
  try {
    targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    if (targets.some((target) => target.type === 'page' && target.webSocketDebuggerUrl)) break;
  } catch {}
  await sleep(100);
}

const target = targets?.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
assert.ok(target, `Packaged app did not expose a page: ${executable}`);

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

let nextId = 1;
const pending = new Map();
const requests = [];
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  }
  if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
};

function send(method, params = {}) {
  const request = new Promise((resolve, reject) => {
    const id = nextId;
    nextId += 1;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return Promise.race([
    request,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`CDP ${method} timed out`)), 15000)),
  ]);
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      if (await evaluate(expression)) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

try {
  await send('Runtime.enable');
  await send('Network.enable');
  await waitFor(`document.readyState === 'complete' && location.href === 'cyb-math://main/'`);

  const home = await evaluate(`({
    title: document.title,
    cards: document.querySelectorAll('.tool-card').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  })`);
  assert.equal(home.title, 'CYB Math｜免费数学工具集');
  assert.equal(home.cards, 12);
  assert.equal(home.overflow, false);

  await evaluate(`document.querySelector('[data-id="geometry"]').click()`);
  await waitFor(`location.host === 'geometry' && Boolean(document.querySelector('#cyb-desktop-loading .cyb-loading-name'))`);
  const loadingLabel = await evaluate(`document.querySelector('#cyb-desktop-loading .cyb-loading-name')?.textContent || document.documentElement.dataset.cybDesktopLoadingShown`);
  assert.equal(loadingLabel, '几何画板');

  await evaluate(`location.href = 'https://linear.cyb-math.cn/'`);
  await waitFor(`location.protocol === 'cyb-math:' && location.host === 'linear' && document.readyState === 'complete'`);
  const determinant = await evaluate(`(() => {
    matrixA.value = '1 2\\n3 4';
    matrixOp.value = 'det';
    matrixCalc.click();
    return matrixResult.innerText;
  })()`);
  assert.match(determinant.replace(/-/g, '−'), /det\(A\)\s*=\s*−2/);

  const httpRequests = requests.filter((url) => /^https?:/i.test(url));
  assert.deepEqual(httpRequests, [], `Packaged app made network requests:\n${httpRequests.join('\n')}`);
  console.log(JSON.stringify({ passed: true, executable, home, loadingLabel, internalNavigation: true, determinant: '-2', httpRequests }, null, 2));
} finally {
  try {
    socket.send(JSON.stringify({ id: nextId, method: 'Browser.close' }));
    nextId += 1;
  } catch {}
  await sleep(800);
  try { socket.close(); } catch {}
  if (!child.killed) child.kill();
  try { fs.rmSync(userData, { recursive: true, force: true }); } catch {}
}
