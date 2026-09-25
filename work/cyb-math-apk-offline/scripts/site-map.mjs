export const SOURCE_ROOT = new URL('../../../sites/', import.meta.url);

export const SITES = Object.freeze([
  { source: 'cyb-math', file: 'index.html', host: 'cyb-math.cn', legacy: 'cyb-math.pages.dev' },
  { source: 'math-tools-pro', file: 'math-tools-pro.html', host: 'tools.cyb-math.cn', legacy: 'math-tools-pro.pages.dev' },
  { source: 'math-plotter', file: 'math-plotter.html', host: 'plotter.cyb-math.cn', legacy: 'math-plotter.pages.dev' },
  { source: 'math-complex', file: 'math-complex.html', host: 'complex.cyb-math.cn', legacy: 'math-complex.pages.dev' },
  { source: 'math-equation', file: 'math-equation.html', host: 'equation.cyb-math.cn', legacy: 'math-equation.pages.dev' },
  { source: 'math-geometry', file: 'math-geometry-theorems.html', host: 'geometry.cyb-math.cn', legacy: 'math-geometry.pages.dev' },
  { source: 'math-algebra', file: 'math-algebra.html', host: 'algebra.cyb-math.cn', legacy: 'math-algebra.pages.dev' },
  { source: 'math-linear', file: 'math-linear.html', host: 'linear.cyb-math.cn', legacy: 'math-linear.pages.dev' },
  { source: 'math-3d', file: 'math-3d.html', host: '3d.cyb-math.cn', legacy: 'math-3d.pages.dev' },
  { source: 'math-theory', file: 'math-theory.html', host: 'theory.cyb-math.cn', legacy: 'math-theory.pages.dev' },
  { source: 'math-sequence', file: 'math-sequence.html', host: 'sequence.cyb-math.cn', legacy: 'math-sequence.pages.dev' },
  { source: 'math-latex', file: 'math-latex.html', host: 'latex.cyb-math.cn', legacy: 'math-latex.pages.dev' },
  { source: 'math-fourier', file: 'math-fourier.html', host: 'fourier.cyb-math.cn', legacy: 'math-fourier.pages.dev' }
]);

export const HOST_TO_FILE = Object.freeze(Object.fromEntries(
  SITES.flatMap(site => [[site.host, site.file], [site.legacy, site.file]])
));

export const FILE_TO_WEB = Object.freeze(Object.fromEntries(
  SITES.map(site => [site.file, `https://${site.host}/`])
));
