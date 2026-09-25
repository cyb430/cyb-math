'use strict';

const SITE_BY_APP_HOST = Object.freeze({
  main: 'cyb-math',
  tools: 'math-tools-pro',
  plotter: 'math-plotter',
  complex: 'math-complex',
  equation: 'math-equation',
  geometry: 'math-geometry',
  algebra: 'math-algebra',
  linear: 'math-linear',
  '3d': 'math-3d',
  theory: 'math-theory',
  sequence: 'math-sequence',
  latex: 'math-latex',
  fourier: 'math-fourier',
});

const LABEL_BY_APP_HOST = Object.freeze({
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

const WEB_HOST_TO_APP_HOST = Object.freeze({
  'cyb-math.cn': 'main',
  'cyb-math.pages.dev': 'main',
  'tools.cyb-math.cn': 'tools',
  'math-tools-pro.pages.dev': 'tools',
  'plotter.cyb-math.cn': 'plotter',
  'math-plotter.pages.dev': 'plotter',
  'complex.cyb-math.cn': 'complex',
  'math-complex.pages.dev': 'complex',
  'equation.cyb-math.cn': 'equation',
  'math-equation.pages.dev': 'equation',
  'geometry.cyb-math.cn': 'geometry',
  'math-geometry.pages.dev': 'geometry',
  'algebra.cyb-math.cn': 'algebra',
  'math-algebra.pages.dev': 'algebra',
  'linear.cyb-math.cn': 'linear',
  'math-linear.pages.dev': 'linear',
  '3d.cyb-math.cn': '3d',
  'math-3d.pages.dev': '3d',
  'theory.cyb-math.cn': 'theory',
  'math-theory.pages.dev': 'theory',
  'sequence.cyb-math.cn': 'sequence',
  'math-sequence.pages.dev': 'sequence',
  'latex.cyb-math.cn': 'latex',
  'math-latex.pages.dev': 'latex',
  'fourier.cyb-math.cn': 'fourier',
  'math-fourier.pages.dev': 'fourier',
});

function mapWebUrlToAppUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol === 'cyb-math:') return parsed.toString();
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const appHost = WEB_HOST_TO_APP_HOST[parsed.hostname.toLowerCase()];
  if (!appHost) return null;

  return `cyb-math://${appHost}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function getSiteDirectory(appHost) {
  return SITE_BY_APP_HOST[appHost.toLowerCase()] ?? null;
}

function getToolLabel(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const appHost = parsed.protocol === 'cyb-math:'
      ? parsed.hostname.toLowerCase()
      : WEB_HOST_TO_APP_HOST[parsed.hostname.toLowerCase()];
    return LABEL_BY_APP_HOST[appHost] ?? '数学工具';
  } catch {
    return '数学工具';
  }
}

module.exports = {
  LABEL_BY_APP_HOST,
  SITE_BY_APP_HOST,
  WEB_HOST_TO_APP_HOST,
  getSiteDirectory,
  getToolLabel,
  mapWebUrlToAppUrl,
};
