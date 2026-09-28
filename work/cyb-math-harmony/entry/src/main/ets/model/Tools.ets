export interface MathTool { site: string; file: string; hans: string; hant: string; english: string; terms: string; }
export const TOOLS: MathTool[] = [
  { site: 'cyb-math', file: 'index.html', hans: '工具总览', hant: '工具總覽', english: 'All tools', terms: 'home tools' },
  { site: 'math-tools-pro', file: 'math-tools-pro.html', hans: '数学实用工具', hant: '數學實用工具', english: 'Quick Math', terms: 'calculate statistics 计算 统计' },
  { site: 'math-plotter', file: 'math-plotter.html', hans: '函数绘图', hant: '函數繪圖', english: 'Function Plotter', terms: 'graph plot 函数 绘图' },
  { site: 'math-complex', file: 'math-complex.html', hans: '复变函数', hant: '複變函數', english: 'Complex Functions', terms: 'complex 复数' },
  { site: 'math-equation', file: 'math-equation.html', hans: '方程求解', hant: '方程求解', english: 'Equation Solver', terms: 'equation root integral 积分 方程' },
  { site: 'math-geometry', file: 'math-geometry-theorems.html', hans: '几何画板', hant: '幾何畫板', english: 'Geometry', terms: 'geometry 几何 画板' },
  { site: 'math-algebra', file: 'math-algebra.html', hans: '代数', hant: '代數', english: 'Algebra', terms: 'algebra symbolic 因式 展开' },
  { site: 'math-linear', file: 'math-linear.html', hans: '线性代数', hant: '線性代數', english: 'Linear Algebra', terms: 'matrix least squares fit 矩阵 最小二乘 拟合' },
  { site: 'math-3d', file: 'math-3d.html', hans: '3D 绘图', hant: '3D 繪圖', english: '3D Plotter', terms: '3d surface 三维 曲面' },
  { site: 'math-theory', file: 'math-theory.html', hans: '数论', hant: '數論', english: 'Number Theory', terms: 'integer prime 整数 同余' },
  { site: 'math-sequence', file: 'math-sequence.html', hans: '数列', hant: '數列', english: 'Sequences', terms: 'sequence fibonacci 数列 递推' },
  { site: 'math-latex', file: 'math-latex.html', hans: 'LaTeX 公式', hant: 'LaTeX 公式', english: 'LaTeX Editor', terms: 'latex formula 公式' },
  { site: 'math-fourier', file: 'math-fourier.html', hans: '傅里叶', hant: '傅里葉', english: 'Fourier', terms: 'fourier wave 傅里叶 波形' }
];
export function toolLabel(tool: MathTool, language: string): string { return language === 'en' ? tool.english : language === 'zh-Hant' ? tool.hant : tool.hans; }
export function translate(language: string, hans: string, hant: string, english: string): string { return language === 'en' ? english : language === 'zh-Hant' ? hant : hans; }
