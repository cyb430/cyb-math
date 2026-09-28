await import('../../work/cyb-math-apk-offline/scripts/build-web.mjs');
await import('../../work/cyb-math-harmony/scripts/prepare-web.mjs');
await import('./test.mjs');
if (process.exitCode) process.exit(process.exitCode);
await import('./test-harmony.mjs');
