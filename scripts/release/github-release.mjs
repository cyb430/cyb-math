import fs from 'node:fs';
import crypto from 'node:crypto';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const release = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'release/release.json'), 'utf8'));
const token = process.env.GITHUB_TOKEN;
const releaseRoot = process.env.CYB_RELEASE_ROOT || path.join(repositoryRoot, 'outputs');
if (!token) throw new Error('GITHUB_TOKEN is required');

for (const artifact of release.artifacts) {
  const file = path.join(releaseRoot, artifact.fileName);
  const bytes = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
  if (bytes.length !== artifact.bytes || hash !== artifact.sha256.toUpperCase()) {
    throw new Error(`Release asset does not match the manifest: ${artifact.fileName}`);
  }
}

const apiBase = `https://api.github.com/repos/${release.github.owner}/${release.github.repository}`;
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'User-Agent': 'CYB-Math-Release-Automation',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function github(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API ${response.status}: ${message.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function uploadAsset(url, file, contentType) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': contentType, 'Content-Length': String(fs.statSync(file).size) },
      timeout: 15 * 60 * 1000,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GitHub upload ${response.statusCode}: ${body.slice(0, 500)}`));
          return;
        }
        resolve(JSON.parse(body));
      });
    });
    request.on('timeout', () => request.destroy(new Error('GitHub upload timed out')));
    request.on('error', reject);
    fs.createReadStream(file).on('error', (error) => request.destroy(error)).pipe(request);
  });
}

let current;
const lookup = await fetch(`${apiBase}/releases/tags/${encodeURIComponent(release.tag)}`, { headers });
if (lookup.status === 404) {
  current = (await github(`${apiBase}/releases?per_page=100`)).find((item) => item.tag_name === release.tag);
  if (!current) {
    current = await github(`${apiBase}/releases`, {
      method: 'POST',
      body: JSON.stringify({
        tag_name: release.tag,
        target_commitish: release.targetCommitish,
        name: release.name,
        body: fs.readFileSync(path.join(repositoryRoot, `release/notes-${release.date}.md`), 'utf8'),
        draft: true,
        prerelease: false,
        generate_release_notes: false,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!current.draft) throw new Error(`Release tag ${release.tag} is not a draft but tag lookup returned 404`);
} else {
  if (!lookup.ok) throw new Error(`GitHub release lookup failed: ${lookup.status}`);
  current = await lookup.json();
  current = await github(`${apiBase}/releases/${current.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: release.name,
      body: fs.readFileSync(path.join(repositoryRoot, `release/notes-${release.date}.md`), 'utf8'),
      draft: current.draft,
      prerelease: false,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

for (const artifact of release.artifacts) {
  const file = path.join(releaseRoot, artifact.fileName);
  if (!fs.existsSync(file)) throw new Error(`Missing release asset: ${file}`);
  const extension = path.extname(file).toLowerCase();
  const contentType = extension === '.apk' ? 'application/vnd.android.package-archive'
    : extension === '.zip' ? 'application/zip'
      : 'application/vnd.microsoft.portable-executable';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const assets = await github(`${apiBase}/releases/${current.id}/assets?per_page=100`);
    const existing = assets.find((asset) => asset.name === artifact.fileName);
    if (existing) {
      if (existing.size === artifact.bytes && existing.digest?.toUpperCase() === `SHA256:${artifact.sha256}`) {
        console.log(`Already uploaded ${artifact.fileName}`);
        break;
      }
      if (!current.draft) throw new Error(`Published asset already exists with different content: ${artifact.fileName}. Use a new release tag.`);
      await github(`${apiBase}/releases/assets/${existing.id}`, { method: 'DELETE' });
    }
    try {
      await uploadAsset(`https://uploads.github.com/repos/${release.github.owner}/${release.github.repository}/releases/${current.id}/assets?name=${encodeURIComponent(artifact.fileName)}`, file, contentType);
      console.log(`Uploaded ${artifact.fileName}`);
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`Upload retry ${attempt}/3 for ${artifact.fileName}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}

await github(`${apiBase}/releases/${current.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ draft: false }),
  headers: { 'Content-Type': 'application/json' },
});

console.log(JSON.stringify({ published: true, tag: release.tag, url: current.html_url, assets: release.artifacts.length }, null, 2));
