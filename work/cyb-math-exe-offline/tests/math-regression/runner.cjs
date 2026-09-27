'use strict';

const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '../../../..');
const sitesRoot = path.join(repositoryRoot, 'sites');
const bank = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));
const requestedSite = process.argv.find((argument) => argument.startsWith('--site='))?.slice('--site='.length);
const selectedCases = requestedSite ? bank.cases.filter((testCase) => testCase.site === requestedSite) : bank.cases;
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cyb-math-regression-'));

app.setPath('userData', userData);
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('use-gl', 'angle');
app.commandLine.appendSwitch('use-angle', 'swiftshader');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function makeServer() {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    const match = /^\/([a-z0-9-]+)(?:\/(.*))?$/.exec(pathname);
    const relative = match ? (match[2] || 'index.html') : '';
    const file = match ? path.resolve(sitesRoot, match[1], relative) : '';
    const siteRoot = match ? path.resolve(sitesRoot, match[1]) : '';
    if (!match || (!file.startsWith(siteRoot + path.sep) && file !== path.join(siteRoot, 'index.html')) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end('Not Found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentType(file),
      'Content-Length': fs.statSync(file).size,
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(response);
  });
}

async function waitFor(window, expression, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      if (await window.webContents.executeJavaScript(expression)) return;
    } catch {}
    await pause(100);
  }
  throw new Error(`Timed out waiting for ${expression} at ${window.webContents.getURL()}`);
}

function assertExpectation(actual, expectation) {
  if ('error' in expectation) {
    assert.equal(Boolean(actual?.error), expectation.error);
    return;
  }
  if ('equals' in expectation) {
    assert.equal(actual, expectation.equals);
    return;
  }
  if ('deepEquals' in expectation) {
    assert.deepEqual(actual, expectation.deepEquals);
    return;
  }
  if ('approx' in expectation) {
    assert.ok(Number.isFinite(actual), `Expected a finite number, got ${actual}`);
    assert.ok(Math.abs(actual - expectation.approx) <= expectation.tolerance, `${actual} is not within ${expectation.tolerance} of ${expectation.approx}`);
    return;
  }
  if ('match' in expectation) {
    assert.match(String(actual), new RegExp(expectation.match, 'iu'));
    return;
  }
  if ('truthy' in expectation) {
    assert.equal(Boolean(actual), expectation.truthy);
    return;
  }
  throw new Error(`Unsupported expectation: ${JSON.stringify(expectation)}`);
}

async function main() {
  assert.equal(bank.schemaVersion, 1, 'Unsupported regression-bank schema');
  assert.ok(selectedCases.length > 0, requestedSite ? `Unknown site ${requestedSite}` : 'Regression bank is empty');
  const categories = new Set(['typical', 'boundary', 'invalid']);
  for (const testCase of selectedCases) assert.ok(categories.has(testCase.category), `${testCase.id}: invalid category`);

  const server = makeServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  await app.whenReady();

  const window = new BrowserWindow({
    show: false,
    width: 1365,
    height: 900,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const evaluate = (expression) => window.webContents.executeJavaScript(expression);
  const open = async (site, suffix = '') => {
    await window.loadURL(`${baseUrl}/${site}/?lang=zh-Hans&regression=${Date.now()}${suffix}`);
    await waitFor(window, `document.readyState === 'complete'`);
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  };

  const operations = {
    async toolsCalculator(testCase) {
      await evaluate(`App.show('calc')`);
      await pause(250);
      return evaluate(`(() => {
        const editor = document.querySelector('.expr');
        editor.textContent = ${JSON.stringify(testCase.input)};
        editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        return document.querySelector('.res').textContent.trim();
      })()`);
    },
    async toolsCalculatorError(testCase) {
      await evaluate(`App.show('calc')`);
      await pause(200);
      return evaluate(`(() => {
        const editor = document.querySelector('.expr');
        editor.textContent = ${JSON.stringify(testCase.input)};
        editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        const result = document.querySelector('.res');
        return Boolean(result && (result.textContent.trim() || result.classList.contains('err') || result.classList.contains('error')));
      })()`);
    },
    plotterInequality(testCase) {
      return evaluate(`(() => {
        ineqInput.value = ${JSON.stringify(testCase.input)};
        solveInequality(false);
        return (ineqResult.querySelector('.ineq-answer')?.textContent || '').replace(/−/g, '-');
      })()`);
    },
    plotterInvalid(testCase) {
      return evaluate(`(() => {
        ineqInput.value = ${JSON.stringify(testCase.input)};
        solveInequality(false);
        return ineqResult.querySelectorAll('img').length === 0 && ineqResult.textContent.trim().length > 0;
      })()`);
    },
    complexEvaluate(testCase) {
      return evaluate(`window.CVZ.compileExpr(${JSON.stringify(testCase.input.expression)}).fn(${JSON.stringify(testCase.input.z)})`);
    },
    complexInvalid(testCase) {
      return evaluate(`(() => { try { window.CVZ.compileExpr(${JSON.stringify(testCase.input)}); return ''; } catch (error) { return error.message; } })()`);
    },
    equationRoot(testCase) {
      return evaluate(`(() => {
        document.getElementById('r-f').value = ${JSON.stringify(testCase.input.expression)};
        document.getElementById('r-a').value = ${JSON.stringify(testCase.input.a)};
        document.getElementById('r-b').value = ${JSON.stringify(testCase.input.b)};
        document.getElementById('r-eps').value = '1e-9';
        document.getElementById('r-m').value = 'bisect';
        document.getElementById('r-max').value = '100';
        solveRoot();
        return Number(document.querySelector('#r-out .v').textContent);
      })()`);
    },
    equationAnalytic(testCase) {
      return evaluate(`(() => {
        document.getElementById('a-f').value = ${JSON.stringify(testCase.input)};
        solveAna();
        return document.getElementById('a-out').innerText + '\\n' + document.getElementById('a-forms').innerText;
      })()`);
    },
    equationInvalidBracket(testCase) {
      return evaluate(`(() => {
        document.getElementById('r-f').value = ${JSON.stringify(testCase.input.expression)};
        document.getElementById('r-a').value = ${JSON.stringify(testCase.input.a)};
        document.getElementById('r-b').value = ${JSON.stringify(testCase.input.b)};
        document.getElementById('r-m').value = 'bisect';
        solveRoot();
        return document.getElementById('r-out').innerText;
      })()`);
    },
    geometryMidpoint() {
      return evaluate(`(() => {
        if (typeof closeWelcome === 'function') closeWelcome();
        objects = []; selectedObjects = [];
        const a = addPoint(0, 0), b = addPoint(300, 400);
        selectedObjects = [a, b]; constructMidpoint();
        const point = objects.find(object => object.def?.kind === 'midpoint');
        return [point.x, point.y];
      })()`);
    },
    geometryCircleIntersections(testCase) {
      return evaluate(`circleCircleIntersection(${JSON.stringify(testCase.input.c1)}, ${testCase.input.r1}, ${JSON.stringify(testCase.input.c2)}, ${testCase.input.r2}).length`);
    },
    geometryInvalidRange() {
      return evaluate(`(() => {
        if (typeof closeWelcome === 'function') closeWelcome();
        objects = [];
        document.getElementById('funcExpr').value = 'x^2';
        document.getElementById('funcMin').value = '6';
        document.getElementById('funcMax').value = '5';
        createFunction();
        return !objects.some(object => object.type === 'function') && statusText.textContent.trim().length > 0;
      })()`);
    },
    async algebra(testCase) {
      const input = testCase.input;
      const state = Buffer.from(JSON.stringify({ e: input.expression, m: input.mode, v: 'x', x: input.extras || {} })).toString('base64url');
      await open('math-algebra', `#s=${state}`);
      let result;
      for (let attempt = 0; attempt < 240; attempt += 1) {
        result = await evaluate(`({
          ready: document.getElementById('resultArea').style.display === 'block',
          error: document.getElementById('errDialog').style.display === 'flex',
          tex: document.querySelector('#primaryMath annotation')?.textContent || document.getElementById('primaryMath').textContent || '',
          message: document.getElementById('errMsg').textContent
        })`);
        if (result.ready || result.error) break;
        await pause(100);
      }
      assert.ok(result?.ready || result?.error, `Algebra case timed out: ${input.expression}`);
      return result.error ? { error: true, message: result.message } : result.tex;
    },
    threeDistance() {
      return evaluate(`Geom3D.distPointPlane([0,0,5], {n:[0,0,1], d:2})`);
    },
    threeZeroVector() {
      return evaluate(`Number.isNaN(Geom3D.angleVecVec([0,0,0], [1,0,0]))`);
    },
    async threeInvalidExpression() {
      await evaluate(`(() => {
        document.getElementById('objType').value = 'explicit';
        document.getElementById('objType').dispatchEvent(new Event('change'));
        document.querySelector('#objForm input').value = 'sin(';
        document.getElementById('addObjBtn').click();
      })()`);
      await pause(150);
      return evaluate(`document.querySelector('#objForm .invalid') !== null`);
    },
    async theoryGcd(testCase) {
      await evaluate(`activate('gcd'); document.getElementById('g-a').value=${JSON.stringify(testCase.input.a)}; document.getElementById('g-b').value=${JSON.stringify(testCase.input.b)}; toolGcd()`);
      await waitFor(window, `curTask === null`);
      return evaluate(`document.getElementById('g-out').textContent`);
    },
    async theoryCongruence(testCase) {
      await evaluate(`activate('cong'); document.getElementById('c-a').value=${JSON.stringify(testCase.input.a)}; document.getElementById('c-b').value=${JSON.stringify(testCase.input.b)}; document.getElementById('c-m').value=${JSON.stringify(testCase.input.m)}; toolCong(false)`);
      await waitFor(window, `curTask === null`);
      return evaluate(`document.getElementById('c-out').textContent`);
    },
    async theoryInvalid(testCase) {
      await evaluate(`activate('prime'); document.getElementById('p-n').value=${JSON.stringify(testCase.input)}; document.getElementById('p-prime').click()`);
      await waitFor(window, `curTask === null`);
      return evaluate(`document.getElementById('p-out').textContent`);
    },
    async sequenceExample(testCase) {
      await evaluate(`document.querySelector('[data-ex=${JSON.stringify(testCase.input)}]').click()`);
      await pause(400);
      return evaluate(`document.querySelector('#tableWrap tbody tr:last-child').cells[1].textContent`);
    },
    async sequenceDivisionZero() {
      await evaluate(`(() => {
        document.querySelector('.f-input').value = 'a_n=1/(n-2)';
        document.getElementById('nFrom').value = '1';
        document.getElementById('nTo').value = '5';
        document.getElementById('calcBtn').click();
      })()`);
      await pause(350);
      return evaluate(`document.querySelector('.cell-err')?.title || ''`);
    },
    async latexRender(testCase) {
      await evaluate(`document.getElementById('editor').value=${JSON.stringify(testCase.input)}; document.getElementById('editor').dispatchEvent(new Event('input'))`);
      await pause(350);
      return evaluate(`document.querySelector('#preview annotation')?.textContent || ''`);
    },
    async latexEmpty() {
      await evaluate(`document.getElementById('editor').value=''; document.getElementById('editor').dispatchEvent(new Event('input'))`);
      await pause(250);
      return evaluate(`document.getElementById('editor').value === '' && document.getElementById('err-box').classList.contains('hidden')`);
    },
    async latexInvalid(testCase) {
      await evaluate(`document.getElementById('editor').value=${JSON.stringify(testCase.input)}; document.getElementById('editor').dispatchEvent(new Event('input'))`);
      await pause(300);
      return evaluate(`!document.getElementById('err-box').classList.contains('hidden')`);
    },
    fourierFirstHarmonic() {
      return evaluate(`FCore.computeWaveCoeffs('square', 4096).harmonics[0].amp`);
    },
    fourierJump() {
      return evaluate(`FCore.waveValue('square', 0.5)`);
    },
    async fourierInvalidSvg() {
      await evaluate(`document.getElementById('svgInputA').value='M0 0 A10 10 0 0 1 20 20'; document.getElementById('btnLoadSvgA').click()`);
      await pause(150);
      return evaluate(`document.getElementById('svgErrA').textContent || document.body.innerText`);
    },
    linearMatrix(testCase) {
      return evaluate(`(() => {
        matrixA.value = ${JSON.stringify(testCase.input.matrix)};
        matrixOp.value = ${JSON.stringify(testCase.input.op)};
        matrixCalc.click();
        return matrixResult.innerText;
      })()`);
    },
  };

  const results = [];
  try {
    for (const site of [...new Set(selectedCases.map((testCase) => testCase.site))]) {
      await open(site);
      if (site === 'math-tools-pro') await waitFor(window, `typeof App !== 'undefined' && typeof App.show === 'function'`, 45000);
      if (site === 'math-complex') await waitFor(window, `window.CVZ && typeof CVZ.compileExpr === 'function'`);
      if (site === 'math-fourier') await waitFor(window, `window.FCore && typeof FCore.computeWaveCoeffs === 'function'`);
      if (site === 'math-3d') await waitFor(window, `window.Geom3D && typeof Geom3D.distPointPlane === 'function'`, 30000);
      for (const testCase of selectedCases.filter((candidate) => candidate.site === site)) {
        const started = Date.now();
        const operation = operations[testCase.operation];
        assert.equal(typeof operation, 'function', `${testCase.id}: unknown operation ${testCase.operation}`);
        try {
          const actual = await operation(testCase);
          assertExpectation(actual, testCase.expect);
          results.push({ id: testCase.id, site, category: testCase.category, title: testCase.title, passed: true, durationMs: Date.now() - started });
        } catch (error) {
          results.push({ id: testCase.id, site, category: testCase.category, title: testCase.title, passed: false, durationMs: Date.now() - started, error: error.stack || error.message });
        }
      }
    }
  } finally {
    window.destroy();
    server.close();
    try { fs.rmSync(userData, { recursive: true, force: true }); } catch {}
  }

  const failures = results.filter((result) => !result.passed);
  const summary = {
    schemaVersion: bank.schemaVersion,
    testedAt: new Date().toISOString(),
    passed: results.length - failures.length,
    failed: failures.length,
    total: results.length,
    sites: new Set(results.map((result) => result.site)).size,
    categories: Object.fromEntries([...categories].map((category) => [category, results.filter((result) => result.category === category && result.passed).length])),
    failures,
    results,
  };
  const reportDirectory = path.join(repositoryRoot, 'test-results');
  fs.mkdirSync(reportDirectory, { recursive: true });
  fs.writeFileSync(path.join(reportDirectory, 'math-regression.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  app.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  try { fs.rmSync(userData, { recursive: true, force: true }); } catch {}
  app.exit(1);
});
