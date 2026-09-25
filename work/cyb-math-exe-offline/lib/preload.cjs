'use strict';
const { ipcRenderer } = require('electron');
const LOCAL_LABELS = {"en":{"main":"All tools","tools":"Quick Math Tools","plotter":"Function Plotter","complex":"Complex Function Visualizer","equation":"Equation Solver","geometry":"Geometry Sketchpad","algebra":"Algebra Calculator","linear":"Linear Algebra","3d":"3D Math Plotter","theory":"Number Theory Toolbox","sequence":"Sequence Explorer","latex":"LaTeX Formula Editor","fourier":"Fourier Visualizer"},"zh-Hant":{"main":"工具總覽","tools":"數學實用工具","plotter":"函數繪圖與分析","complex":"複變函數視覺化","equation":"方程解析器","geometry":"幾何畫板","algebra":"代數工具","linear":"線性代數","3d":"三維函數繪圖","theory":"數論工具","sequence":"數列工具","latex":"LaTeX 公式編輯器","fourier":"傅里葉級數視覺化"}};
function language() { const q = new URLSearchParams(location.search).get('lang'); let stored; try { stored = localStorage.getItem('cyb-language'); } catch {} return [q, stored].find(v => ['zh-Hans','zh-Hant','en'].includes(v)) || (/^zh-(TW|HK|MO|Hant)/i.test(navigator.language) ? 'zh-Hant' : /^en/i.test(navigator.language) ? 'en' : 'zh-Hans'); }
document.addEventListener('change', event => { if (event.target.matches?.('#cyb-language-switcher select')) ipcRenderer.send('cyb-language', event.target.value); }, true);
window.addEventListener('DOMContentLoaded', () => ipcRenderer.send('cyb-language', language()), { once:true });

const LABELS = Object.freeze({
  main: '工具总览',
  tools: '数学实用工具',
  plotter: '函数绘图与分析',
  complex: '复变函数可视化',
  equation: '方程解析器',
  geometry: '几何画板',
  algebra: '代数工具',
  linear: '线性代数',
  '3d': '三维函数绘图',
  theory: '数论工具',
  sequence: '数列工具',
  latex: 'LaTeX 公式编辑器',
  fourier: '傅里叶级数可视化',
});

const HEAVY_TOOLS = new Set(['geometry', '3d', 'complex']);
const startedAt = performance.now();
let overlay;

function mountLoadingOverlay() {
  if (overlay || !document.documentElement) return;

  const host = location.hostname.toLowerCase();
  const lang = language();
  const label = LOCAL_LABELS[lang]?.[host] ?? LABELS[host] ?? (lang === 'en' ? 'Math tools' : '數學工具');
  const style = document.createElement('style');
  style.id = 'cyb-desktop-loading-style';
  style.textContent = `
    #cyb-desktop-loading {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      pointer-events: none;
      background: rgba(246, 249, 253, .76);
      opacity: 1;
      transition: opacity .18s ease;
    }
    #cyb-desktop-loading.cyb-is-leaving { opacity: 0; }
    #cyb-desktop-loading .cyb-loading-card {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 292px;
      max-width: calc(100vw - 40px);
      padding: 19px 21px;
      border: 1px solid rgba(77, 103, 146, .18);
      border-radius: 18px;
      color: #21314c;
      background: rgba(252, 253, 255, .98);
      box-shadow: 0 14px 38px rgba(28, 48, 82, .16);
      font-family: "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif;
    }
    #cyb-desktop-loading .cyb-loading-spinner {
      width: 34px;
      height: 34px;
      flex: 0 0 auto;
      border: 3px solid #dce6f4;
      border-top-color: #3978d4;
      border-radius: 50%;
      animation: cyb-loading-spin .8s linear infinite;
    }
    #cyb-desktop-loading .cyb-loading-eyebrow {
      margin-bottom: 5px;
      color: #687a95;
      font-size: 12px;
      letter-spacing: .08em;
    }
    #cyb-desktop-loading .cyb-loading-name {
      overflow: hidden;
      color: #1c2f4f;
      font-size: 16px;
      font-weight: 650;
      line-height: 1.45;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #cyb-desktop-loading .cyb-loading-hint {
      margin-top: 4px;
      color: #71809a;
      font-size: 12px;
    }
    @keyframes cyb-loading-spin { to { transform: rotate(360deg); } }
    @media (prefers-color-scheme: dark) {
      #cyb-desktop-loading { background: rgba(20, 26, 37, .76); }
      #cyb-desktop-loading .cyb-loading-card {
        border-color: rgba(180, 201, 230, .2);
        color: #ecf2fb;
        background: rgba(27, 35, 49, .98);
        box-shadow: 0 16px 42px rgba(0, 0, 0, .32);
      }
      #cyb-desktop-loading .cyb-loading-spinner { border-color: #34445c; border-top-color: #70a7f5; }
      #cyb-desktop-loading .cyb-loading-eyebrow,
      #cyb-desktop-loading .cyb-loading-hint { color: #aebbd0; }
      #cyb-desktop-loading .cyb-loading-name { color: #f3f7fc; }
    }
    @media (prefers-reduced-motion: reduce) {
      #cyb-desktop-loading,
      #cyb-desktop-loading .cyb-loading-spinner { transition: none; animation-duration: 1.6s; }
    }
  `;

  overlay = document.createElement('div');
  overlay.id = 'cyb-desktop-loading';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('data-cyb-i18n-ignore', '');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <div class="cyb-loading-card">
      <div class="cyb-loading-spinner" aria-hidden="true"></div>
      <div>
        <div class="cyb-loading-eyebrow">CYB MATH</div>
        <div class="cyb-loading-name"></div>
        <div class="cyb-loading-hint">${lang === 'en' ? 'Preparing offline resources…' : lang === 'zh-Hant' ? '正在準備離線資源…' : '正在准备离线资源…'}</div>
      </div>
    </div>
  `;
  overlay.querySelector('.cyb-loading-name').textContent = label;
  document.documentElement.dataset.cybDesktopLoadingShown = label;
  document.documentElement.append(style, overlay);

  const minimumVisible = HEAVY_TOOLS.has(host) ? 620 : 180;
  window.addEventListener('load', () => {
    const remaining = Math.max(0, minimumVisible - (performance.now() - startedAt));
    setTimeout(() => {
      if (!overlay?.isConnected) return;
      overlay.classList.add('cyb-is-leaving');
      setTimeout(() => {
        overlay?.remove();
        style.remove();
      }, 200);
    }, remaining);
  }, { once: true });
}

if (document.documentElement) {
  mountLoadingOverlay();
} else {
  const observer = new MutationObserver(() => {
    if (!document.documentElement) return;
    observer.disconnect();
    mountLoadingOverlay();
  });
  observer.observe(document, { childList: true });
}
