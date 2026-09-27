import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const release = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'release/release.json'), 'utf8'));
const token = process.env.GITHUB_TOKEN;
const releaseRoot = process.env.CYB_RELEASE_ROOT || path.join(repositoryRoot, 'outputs');
if (!token) throw new Error('GITHUB_TOKEN is required');

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

let current;
const lookup = await fetch(`${apiBase}/releases/tags/${encodeURIComponent(release.tag)}`, { headers });
if (lookup.status === 404) {
  current = await github(`${apiBase}/releases`, {
    method: 'POST',
    body: JSON.stringify({
      tag_name: release.tag,
      target_commitish: release.targetCommitish,
      name: release.name,
      body: fs.readFileSync(path.join(repositoryRoot, `release/notes-${release.date}.md`), 'utf8'),
      draft: false,
      prerelease: false,
      generate_release_notes: false,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
} else {
  if (!lookup.ok) throw new Error(`GitHub release lookup failed: ${lookup.status}`);
  current = await lookup.json();
  current = await github(`${apiBase}/releases/${current.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: release.name,
      body: fs.readFileSync(path.join(repositoryRoot, `release/notes-${release.date}.md`), 'utf8'),
      draft: false,
      prerelease: false,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

const existingAssets = await github(`${apiBase}/releases/${current.id}/assets?per_page=100`);
for (const artifact of release.artifacts) {
  const file = path.join(releaseRoot, artifact.fileName);
  if (!fs.existsSync(file)) throw new Error(`Missing release asset: ${file}`);
  const existing = existingAssets.find((asset) => asset.name === artifact.fileName);
  if (existing) await github(`${apiBase}/releases/assets/${existing.id}`, { method: 'DELETE' });
  const extension = path.extname(file).toLowerCase();
  const contentType = extension === '.apk' ? 'application/vnd.android.package-archive'
    : extension === '.zip' ? 'application/zip'
      : 'application/vnd.microsoft.portable-executable';
  await github(`https://uploads.github.com/repos/${release.github.owner}/${release.github.repository}/releases/${current.id}/assets?name=${encodeURIComponent(artifact.fileName)}`, {
    method: 'POST',
    body: fs.readFileSync(file),
    headers: { 'Content-Type': contentType, 'Content-Length': String(fs.statSync(file).size) },
  });
  console.log(`Uploaded ${artifact.fileName}`);
}

console.log(JSON.stringify({ published: true, tag: release.tag, url: current.html_url, assets: release.artifacts.length }, null, 2));
