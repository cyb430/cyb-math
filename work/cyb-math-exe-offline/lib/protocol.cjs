'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { net, protocol } = require('electron');
const { getSiteDirectory } = require('./routes.cjs');

function resolveSitesRoot(app) {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'sites')
    : path.join(__dirname, '..', 'sites');
}

function safeResolve(root, requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const candidate = path.resolve(root, relative);
  const normalizedRoot = `${path.resolve(root)}${path.sep}`;
  if (candidate !== path.resolve(root) && !candidate.startsWith(normalizedRoot)) return null;

  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    return path.join(candidate, 'index.html');
  }
  return candidate;
}

function registerOfflineProtocol(app) {
  const sitesRoot = resolveSitesRoot(app);

  protocol.handle('cyb-math', async (request) => {
    const url = new URL(request.url);
    const siteDirectory = getSiteDirectory(url.hostname);
    if (!siteDirectory) return new Response('Unknown CYB Math tool', { status: 404 });

    const siteRoot = path.join(sitesRoot, siteDirectory);
    const filePath = safeResolve(siteRoot, url.pathname);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(new URL(`file:///${filePath.replace(/\\/g, '/')}`).toString());
  });
}

module.exports = { registerOfflineProtocol, resolveSitesRoot, safeResolve };
