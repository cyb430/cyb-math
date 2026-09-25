type Release = {
  id: string;
  fileName: string;
  title: string;
  version: string;
  platform: string;
  description: string;
  size: string;
  bytes: number;
  sha256: string;
  contentType: string;
  tone: 'blue' | 'green' | 'amber';
  badge?: string;
};

type Locale = 'zh-Hans' | 'zh-Hant' | 'en';

const UI = Object.freeze({
  'zh-Hans': {
    htmlLang: 'zh-CN', meta: '下载 CYB Math Windows、Android 离线版与当前项目源码。', title: '下载中心｜CYB Math',
    back: '返回工具总览 →', kicker: '下载中心', heading: '把完整数学工具箱\n带到你的设备上',
    lead: 'Windows 与 Android 版均可离线使用；免费、无需登录。源码包同步提供，方便学习、检查与本地构建。',
    proofs: ['本地计算', '无需登录', '公开 SHA-256', 'Cloudflare 分发'], downloadsLabel: '下载项目',
    version: '版本', download: '下载', fileInfo: '文件信息与 SHA-256', copyHash: '复制校验值', copied: '已复制', manualCopy: '请手动复制',
    mirrorKicker: '备用下载', mirrorTitle: '百度网盘下载', mirrorText: '包含 Windows 1.0.5 安装版与便携版、Android 1.0.4，以及 2026-09-24 源码包，共 4 个文件，均包含本次三语修复。',
    openBaidu: '打开百度网盘', extractCode: '提取码', noticeLabel: '安装提示：',
    notice: 'Windows 发行包目前没有商业代码签名证书，SmartScreen 可能显示“未知发布者”；Android 首次安装需要允许安装未知应用。请只使用本页或公开的百度网盘备用链接，并核对 SHA-256。数学结果仅供学习辅助，关键结果请自行复核。',
    released: '发布于', footer: '© CYB Math · 免费数学工具集', language: '语言', recommended: '推荐',
  },
  'zh-Hant': {
    htmlLang: 'zh-Hant', meta: '下載 CYB Math Windows、Android 離線版與目前的專案原始碼。', title: '下載中心｜CYB Math',
    back: '返回工具總覽 →', kicker: '下載中心', heading: '把完整的數學工具箱\n帶到你的裝置上',
    lead: 'Windows 與 Android 版本均可離線使用；免費、無須登入。同時提供原始碼，方便學習、檢查與在本機建置。',
    proofs: ['本機運算', '無須登入', '公開 SHA-256', 'Cloudflare 分發'], downloadsLabel: '下載項目',
    version: '版本', download: '下載', fileInfo: '檔案資訊與 SHA-256', copyHash: '複製校驗值', copied: '已複製', manualCopy: '請手動複製',
    mirrorKicker: '備用下載', mirrorTitle: '百度網盤下載', mirrorText: '包含 Windows 1.0.5 安裝版與免安裝版、Android 1.0.4，以及 2026-09-24 原始碼壓縮檔，共 4 個檔案，皆包含本次三語修復。',
    openBaidu: '開啟百度網盤', extractCode: '提取碼', noticeLabel: '安裝提示：',
    notice: 'Windows 發行檔目前未使用商業程式碼簽章憑證，SmartScreen 可能顯示「未知的發行者」；Android 首次安裝時需允許安裝未知的應用程式。請只使用本頁或公開的百度網盤備用連結，並核對 SHA-256。數學結果僅供學習輔助，重要結果請自行驗證。',
    released: '發佈於', footer: '© CYB Math · 免費數學工具集', language: '語言', recommended: '推薦',
  },
  en: {
    htmlLang: 'en', meta: 'Download CYB Math for Windows and Android, or get the current project source.', title: 'Downloads | CYB Math',
    back: 'Back to all tools →', kicker: 'Download center', heading: 'Take the complete math toolkit\nwith you',
    lead: 'The Windows and Android apps work fully offline. They are free and require no account. The source archive is also available for learning, review, and local builds.',
    proofs: ['Runs locally', 'No sign-in', 'Published SHA-256', 'Cloudflare delivery'], downloadsLabel: 'Downloads',
    version: 'Version', download: 'Download', fileInfo: 'File details and SHA-256', copyHash: 'Copy checksum', copied: 'Copied', manualCopy: 'Copy manually',
    mirrorKicker: 'Alternative download', mirrorTitle: 'Baidu Netdisk download', mirrorText: 'Includes four files: Windows 1.0.5 installer and portable app, Android 1.0.4, and the September 24, 2026 source archive. All include the latest language fixes.',
    openBaidu: 'Open Baidu Netdisk', extractCode: 'Code', noticeLabel: 'Before you install: ',
    notice: 'The Windows builds are not signed with a commercial code-signing certificate, so SmartScreen may show “Unknown publisher.” Android may ask you to allow installation from this source the first time. Download only from this page or the published Baidu mirror, and verify the SHA-256 checksum. The math results are learning aids; verify important results independently.',
    released: 'Released', footer: '© CYB Math · Free math toolkit', language: 'Language', recommended: 'Recommended',
  },
});

const RELEASE_COPY = Object.freeze({
  'zh-Hans': {
    'windows-setup': ['Windows 安装版', 'Windows 10 / 11 · x64', '可选择安装目录，并创建桌面与开始菜单快捷方式。'],
    'windows-portable': ['Windows 便携版', 'Windows 10 / 11 · x64', '无需安装，下载后直接运行，适合 U 盘或临时使用。'],
    android: ['Android 版', 'Android 7.0 及以上', '完全离线运行，不申请网络权限；首次安装需允许安装未知应用。'],
    source: ['项目源码', '网页 + Windows + Android 工程', '包含 13 个工具站、个人主页及双端离线外壳源码；不含签名私钥、密码和构建缓存。'],
  },
  'zh-Hant': {
    'windows-setup': ['Windows 安裝版', 'Windows 10 / 11 · x64', '可選擇安裝位置，並建立桌面與開始功能表捷徑。'],
    'windows-portable': ['Windows 免安裝版', 'Windows 10 / 11 · x64', '下載後即可直接執行，適合隨身碟或臨時使用。'],
    android: ['Android 版', 'Android 7.0 以上', '完全離線運作，不要求網路權限；首次安裝時需允許安裝未知的應用程式。'],
    source: ['專案原始碼', '網頁 + Windows + Android 專案', '包含 13 個工具網站、個人首頁與兩端離線應用程式的原始碼；不含簽章私鑰、密碼或建置快取。'],
  },
  en: {
    'windows-setup': ['Windows installer', 'Windows 10 / 11 · x64', 'Choose an installation folder and add Desktop and Start menu shortcuts.'],
    'windows-portable': ['Windows portable', 'Windows 10 / 11 · x64', 'No installation required. Run it directly from a folder or USB drive.'],
    android: ['Android app', 'Android 7.0 or later', 'Works fully offline and requests no network permission. Android may ask for install permission the first time.'],
    source: ['Project source', 'Web + Windows + Android projects', 'Includes all 13 tool sites, the personal homepage, and both offline app shells. Signing keys, passwords, and build caches are excluded.'],
  },
});

const RELEASE_DATE = '2026-09-24';
const CHUNK_BYTES = 16 * 1024 * 1024;

const RELEASES: readonly Release[] = Object.freeze([
  {
    id: 'windows-setup',
    fileName: 'CYB-Math-1.0.5-x64-Setup.exe',
    title: 'Windows 安装版',
    version: '1.0.5',
    platform: 'Windows 10 / 11 · x64',
    description: '可选择安装目录，并创建桌面与开始菜单快捷方式。',
    size: '113.4 MiB',
    bytes: 118902991,
    sha256: '245F0F232BB1E6E78E0B978A2D2CD212C4113A81FD09343BF847814EFEE78C68',
    contentType: 'application/vnd.microsoft.portable-executable',
    tone: 'blue',
    badge: '推荐',
  },
  {
    id: 'windows-portable',
    fileName: 'CYB-Math-1.0.5-x64-Portable.exe',
    title: 'Windows 便携版',
    version: '1.0.5',
    platform: 'Windows 10 / 11 · x64',
    description: '无需安装，下载后直接运行，适合 U 盘或临时使用。',
    size: '113.2 MiB',
    bytes: 118692448,
    sha256: '9B34CC91B0926A33BC399D17403A6584B648B025E7C8006DE9AEE316D1E84AF1',
    contentType: 'application/vnd.microsoft.portable-executable',
    tone: 'blue',
  },
  {
    id: 'android',
    fileName: 'CYB-Math-Android-1.0.4.apk',
    title: 'Android 版',
    version: '1.0.4',
    platform: 'Android 7.0 及以上',
    description: '完全离线运行，不申请网络权限；首次安装需允许安装未知应用。',
    size: '11.6 MiB',
    bytes: 12189646,
    sha256: 'F1B403D5591A2383630642CD69969422C04B259EA127524B70BB7C9C30391D07',
    contentType: 'application/vnd.android.package-archive',
    tone: 'green',
  },
  {
    id: 'source',
    fileName: 'CYB-Math-Source-2026-09-24.zip',
    title: '项目源码',
    version: '2026-09-24',
    platform: '网页 + Windows + Android 工程',
    description: '包含 13 个工具站、个人主页及双端离线外壳源码；不含签名私钥、密码和构建缓存。',
    size: '35.2 MiB',
    bytes: 36928656,
    sha256: 'C1BD9506C4A8FC66E28028DE1B32208125BFF79664016B235FC953D8705277D2',
    contentType: 'application/zip',
    tone: 'amber',
  },
]);

const BY_FILE = new Map(RELEASES.map((release) => [release.fileName, release]));

const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

function releaseCard(release: Release, locale: Locale): string {
  const text = UI[locale];
  const copy = RELEASE_COPY[locale][release.id as keyof typeof RELEASE_COPY[typeof locale]];
  const badge = release.badge ? `<span class="badge">${escapeHtml(text.recommended)}</span>` : '';
  return `
    <article class="release-card ${release.tone}">
      <div class="card-top">
        <div>
          <div class="platform">${escapeHtml(copy[1])}</div>
          <h2>${escapeHtml(copy[0])}</h2>
        </div>
        ${badge}
      </div>
      <p>${escapeHtml(copy[2])}</p>
      <div class="meta"><span>${escapeHtml(text.version)} ${escapeHtml(release.version)}</span><span>${escapeHtml(release.size)}</span></div>
      <a class="download-button" href="/files/${encodeURIComponent(release.fileName)}">${escapeHtml(text.download)}</a>
      <details>
        <summary>${escapeHtml(text.fileInfo)}</summary>
        <div class="file-name">${escapeHtml(release.fileName)}</div>
        <code>${release.sha256}</code>
        <button class="copy" type="button" data-copy="${release.sha256}">${escapeHtml(text.copyHash)}</button>
      </details>
    </article>`;
}

function renderPage(env: Env, locale: Locale): string {
  const text = UI[locale];
  const hasBaiduMirror = /^https:\/\//i.test(env.BAIDU_SHARE_URL);
  const baiduMirror = hasBaiduMirror ? `
    <section class="mirror" aria-labelledby="mirror-title">
      <div>
        <div class="kicker">${escapeHtml(text.mirrorKicker)}</div>
        <h2 id="mirror-title">${escapeHtml(text.mirrorTitle)}</h2>
        <p>${escapeHtml(text.mirrorText)}</p>
      </div>
      <a class="secondary-button" href="${escapeHtml(env.BAIDU_SHARE_URL)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text.openBaidu)}${env.BAIDU_EXTRACT_CODE ? ` · ${escapeHtml(text.extractCode)} ${escapeHtml(env.BAIDU_EXTRACT_CODE)}` : ''}</a>
    </section>` : '';

  return `<!doctype html>
<html lang="${text.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeHtml(text.meta)}">
  <title>${escapeHtml(text.title)}</title>
  <style>
    :root { color-scheme: light; --ink:#17243a; --muted:#60708a; --line:#dce4ef; --paper:#fff; --wash:#f5f8fc; --blue:#356fca; --green:#218568; --amber:#a96818; }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin:0; color:var(--ink); background:linear-gradient(180deg,#eef5ff 0,#f8fafc 280px,#f5f7fa 100%); font:15px/1.65 "Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif; }
    a { color:inherit; }
    .shell { width:min(1080px,calc(100% - 32px)); margin:0 auto; }
    header { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:25px 0; }
    .head-actions { display:flex; align-items:center; gap:12px; }
    .language { min-height:36px; padding:0 8px; border:1px solid var(--line); border-radius:9px; color:#40516d; background:#fff; font:600 12px/1 system-ui,sans-serif; cursor:pointer; }
    .brand { display:flex; align-items:center; gap:11px; text-decoration:none; font-weight:720; letter-spacing:.02em; }
    .mark { display:grid; place-items:center; width:34px; height:34px; border-radius:11px; color:white; background:#356fca; box-shadow:0 7px 18px rgba(53,111,202,.23); font:700 17px/1 Georgia,serif; }
    .back { color:#4e607b; text-decoration:none; font-size:14px; }
    .back:hover { color:#234b87; }
    .hero { padding:54px 0 40px; }
    .kicker { color:#356fca; font-size:12px; font-weight:750; letter-spacing:.12em; text-transform:uppercase; }
    h1 { max-width:800px; margin:10px 0 16px; font-size:clamp(32px,5vw,55px); line-height:1.13; letter-spacing:-.035em; }
    .lead { max-width:710px; margin:0; color:#50617d; font-size:17px; }
    .proof { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
    .proof span { padding:7px 11px; border:1px solid rgba(73,103,148,.15); border-radius:999px; color:#435773; background:rgba(255,255,255,.7); font-size:13px; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; padding:8px 0 34px; }
    .release-card { position:relative; overflow:hidden; padding:24px; border:1px solid var(--line); border-radius:19px; background:rgba(255,255,255,.94); box-shadow:0 10px 28px rgba(40,61,94,.07); }
    .release-card::before { content:""; position:absolute; inset:0 auto 0 0; width:4px; background:var(--blue); }
    .release-card.green::before { background:var(--green); }
    .release-card.amber::before { background:var(--amber); }
    .card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }
    .platform { color:var(--muted); font-size:12px; }
    h2 { margin:4px 0 0; font-size:21px; line-height:1.3; }
    .badge { padding:4px 8px; border-radius:999px; color:#245aa8; background:#e7f0ff; font-size:12px; font-weight:700; }
    .release-card p { min-height:50px; margin:14px 0; color:#5d6d85; }
    .meta { display:flex; gap:8px 16px; flex-wrap:wrap; color:#6a7890; font-size:13px; }
    .download-button,.secondary-button { display:inline-flex; align-items:center; justify-content:center; min-height:42px; margin-top:19px; padding:0 18px; border-radius:11px; color:white; background:#2f68bd; text-decoration:none; font-weight:680; }
    .green .download-button { background:#21775f; }
    .amber .download-button { background:#9a621c; }
    .download-button:hover,.secondary-button:hover { filter:brightness(.95); transform:translateY(-1px); }
    details { margin-top:16px; padding-top:14px; border-top:1px solid #e7ecf3; color:#64738a; font-size:12px; }
    summary { cursor:pointer; }
    .file-name { margin-top:10px; overflow-wrap:anywhere; color:#394b68; }
    code { display:block; margin-top:7px; padding:9px 10px; overflow-wrap:anywhere; border-radius:9px; color:#40516d; background:#f2f5f9; font:11px/1.55 Consolas,monospace; }
    .copy { margin-top:8px; padding:5px 9px; border:1px solid #cfdae8; border-radius:8px; color:#4e607a; background:#fff; cursor:pointer; }
    .mirror { display:flex; align-items:center; justify-content:space-between; gap:24px; margin:6px 0 34px; padding:22px 24px; border:1px solid #d9e3f0; border-radius:18px; background:#fff; }
    .mirror p { margin:7px 0 0; color:#5d6d85; }
    .mirror .secondary-button { flex:0 0 auto; margin:0; background:#3f6daa; }
    .notice { margin:0 0 34px; padding:20px 22px; border:1px solid #e1e7ef; border-radius:16px; color:#56667e; background:rgba(255,255,255,.72); }
    .notice strong { color:#283b59; }
    footer { display:flex; justify-content:space-between; gap:18px; padding:25px 0 36px; border-top:1px solid #dde5ef; color:#718098; font-size:13px; }
    @media (max-width:720px) { .grid{grid-template-columns:1fr}.hero{padding-top:34px}.release-card p{min-height:0}.mirror,footer{align-items:flex-start;flex-direction:column}.mirror .secondary-button{width:100%}.head-actions{gap:7px}.back{font-size:0}.back::after{content:'⌂';font-size:18px} }
    @media (prefers-reduced-motion:reduce) { html{scroll-behavior:auto}.download-button,.secondary-button{transition:none} }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="https://cyb-math.cn/"><span class="mark">∑</span><span>CYB Math</span></a>
      <div class="head-actions"><label><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)">${escapeHtml(text.language)}</span><select class="language" id="language" aria-label="${escapeHtml(text.language)}"><option value="zh-Hans"${locale === 'zh-Hans' ? ' selected' : ''}>简体</option><option value="zh-Hant"${locale === 'zh-Hant' ? ' selected' : ''}>繁體</option><option value="en"${locale === 'en' ? ' selected' : ''}>EN</option></select></label><a class="back" href="https://cyb-math.cn/">${escapeHtml(text.back)}</a></div>
    </header>
    <main>
      <section class="hero">
        <div class="kicker">${escapeHtml(text.kicker)}</div>
        <h1>${escapeHtml(text.heading).replace('\n', '<br>')}</h1>
        <p class="lead">${escapeHtml(text.lead)}</p>
        <div class="proof">${text.proofs.map((proof) => `<span>${escapeHtml(proof)}</span>`).join('')}</div>
      </section>
      <section class="grid" aria-label="${escapeHtml(text.downloadsLabel)}">
        ${RELEASES.map((release) => releaseCard(release, locale)).join('')}
      </section>
      ${baiduMirror}
      <section class="notice">
        <strong>${escapeHtml(text.noticeLabel)}</strong>${escapeHtml(text.notice)}
      </section>
    </main>
    <footer><span>${escapeHtml(text.released)} ${RELEASE_DATE}</span><span>${escapeHtml(text.footer)}</span></footer>
  </div>
  <script>
    const language = document.getElementById('language');
    language.addEventListener('change', () => {
      try { localStorage.setItem('cyb-language', language.value); } catch {}
      document.cookie = 'cyb-language=' + encodeURIComponent(language.value) + '; Domain=.cyb-math.cn; Path=/; Max-Age=31536000; SameSite=Lax';
      const next = new URL(location.href); next.searchParams.set('lang', language.value); location.href = next;
    });
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-copy]');
      if (!button) return;
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = ${JSON.stringify(text.copied)};
        setTimeout(() => { button.textContent = ${JSON.stringify(text.copyHash)}; }, 1200);
      } catch { button.textContent = ${JSON.stringify(text.manualCopy)}; }
    });
  </script>
</body>
</html>`;
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function resolveLocale(request: Request): Locale {
  const url = new URL(request.url);
  const query = url.searchParams.get('lang');
  if (query === 'zh-Hans' || query === 'zh-Hant' || query === 'en') return query;
  const cookie = request.headers.get('Cookie')?.match(/(?:^|;\s*)cyb-language=([^;]+)/)?.[1];
  if (cookie) {
    try {
      const value = decodeURIComponent(cookie);
      if (value === 'zh-Hans' || value === 'zh-Hant' || value === 'en') return value;
    } catch {}
  }
  const accepted = request.headers.get('Accept-Language') || '';
  if (/^zh-(TW|HK|MO|Hant)/i.test(accepted)) return 'zh-Hant';
  if (/^en/i.test(accepted)) return 'en';
  return 'zh-Hans';
}

function pageResponse(request: Request, env: Env): Response {
  const locale = resolveLocale(request);
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; img-src data:; font-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  });
  headers.set('Content-Language', UI[locale].htmlLang);
  headers.set('Vary', 'Cookie, Accept-Language');
  return withSecurityHeaders(new Response(renderPage(env, locale), { headers }));
}

type ByteRange = { start: number; end: number };

function parseByteRange(value: string | null, total: number): ByteRange | 'invalid' | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return 'invalid';

  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return 'invalid';
    return { start: Math.max(0, total - suffix), end: total - 1 };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : total - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start >= total || requestedEnd < start) return 'invalid';
  return { start, end: Math.min(requestedEnd, total - 1) };
}

function chunkPath(release: Release, part: number): string {
  return `/__chunks/${release.id}/${String(part).padStart(3, '0')}.part`;
}

function compositeStream(request: Request, env: Env, release: Release, range: ByteRange): ReadableStream<Uint8Array> {
  // Native piping avoids running JavaScript for each network buffer. Fixed length
  // also makes truncated transfers fail instead of appearing to be complete files.
  const { readable, writable } = new FixedLengthStream(range.end - range.start + 1);
  const pipeline = (async () => {
    const first = Math.floor(range.start / CHUNK_BYTES);
    const last = Math.floor(range.end / CHUNK_BYTES);
    for (let part = first; part <= last; part += 1) {
      const length = Math.min(CHUNK_BYTES, release.bytes - part * CHUNK_BYTES);
      const start = Math.max(0, range.start - part * CHUNK_BYTES);
      const end = Math.min(length - 1, range.end - part * CHUNK_BYTES);
      const partial = start !== 0 || end !== length - 1;
      const asset = await env.ASSETS.fetch(new Request(new URL(chunkPath(release, part), request.url)));
      if (asset.status !== 200 || !asset.body) throw new Error('Release chunk unavailable');
      if (partial) {
        // Asset bindings do not consistently honor Range. A boundary chunk is
        // bounded to 16 MiB; only full chunks use the zero-copy native pipeline.
        const buffer = await asset.arrayBuffer();
        if (buffer.byteLength !== length) throw new Error('Release chunk size mismatch');
        const writer = writable.getWriter();
        try { await writer.write(new Uint8Array(buffer, start, end - start + 1)); }
        finally { writer.releaseLock(); }
      } else {
        await asset.body.pipeTo(writable, { preventClose: true });
      }
    }
    await writable.close();
  })();
  void pipeline.catch(async (error: unknown) => {
    console.error('Release stream failed', error instanceof Error ? error.message : 'unknown error');
    try { await writable.abort(error); } catch {}
  });
  return readable;
}

function fileResponse(request: Request, env: Env, release: Release): Response {
  const parsedRange = parseByteRange(request.headers.get('Range'), release.bytes);
  if (parsedRange === 'invalid') {
    return withSecurityHeaders(new Response('Requested Range Not Satisfiable', {
      status: 416,
      headers: { 'Content-Range': `bytes */${release.bytes}` },
    }));
  }

  const range = parsedRange ?? { start: 0, end: release.bytes - 1 };
  const partial = parsedRange !== null;
  const headers = new Headers();
  headers.set('Content-Type', release.contentType);
  headers.set('ETag', `"sha256-${release.sha256}"`);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Disposition', `attachment; filename="${release.fileName}"`);
  headers.set('Cache-Control', 'public, max-age=86400, immutable');
  headers.set('Content-Length', String(range.end - range.start + 1));
  if (partial) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${release.bytes}`);
  if (request.method === 'HEAD') return withSecurityHeaders(new Response(null, { status: partial ? 206 : 200, headers }));
  return withSecurityHeaders(new Response(compositeStream(request, env, release, range), { status: partial ? 206 : 200, headers }));
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return withSecurityHeaders(new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } }));
    }

    if (url.pathname === '/' || url.pathname === '/index.html') return request.method === 'HEAD'
      ? withSecurityHeaders(new Response(null, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
      : pageResponse(request, env);

    if (url.pathname === '/health') {
      return withSecurityHeaders(Response.json({ ok: true, releaseDate: RELEASE_DATE, files: RELEASES.length }));
    }

    if (url.pathname.startsWith('/files/')) {
      let fileName: string;
      try {
        fileName = decodeURIComponent(url.pathname.slice('/files/'.length));
      } catch {
        return withSecurityHeaders(new Response('Bad Request', { status: 400 }));
      }
      const release = BY_FILE.get(fileName);
      if (!release) return withSecurityHeaders(new Response('Not Found', { status: 404 }));
      return fileResponse(request, env, release);
    }

    return withSecurityHeaders(new Response('Not Found', { status: 404 }));
  },
} satisfies ExportedHandler<Env>;
