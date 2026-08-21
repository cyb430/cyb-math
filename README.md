# CYB 数学工具箱 · CYB Math Toolbox

一套纯前端的在线数学工具集，共 11 个独立 HTML 页面，无需安装、无需联网加载框架，双击即可在浏览器中使用。
A collection of 11 pure front-end, single-file online math tools. No installation or build step required — just open in a browser.

🌐 **在线访问 / Live Demo**: https://cyb-math.pages.dev/guide.html （首选 / Primary）
🔄 **备用地址 / Fallback**: https://cyb430.github.io/cyb-math/guide.html

---

## 📚 工具列表 · Tools

| 文件 / File | 名称 / Name | 功能简介 / Description |
|---|---|---|
| `guide.html` | 工具箱导航首页 · Toolbox Guide | 全部工具的导航入口与功能概览 / Navigation hub and overview of all tools |
| `math-plotter.html` | 函数图像绘制器 v3.1 · Function Plotter | 函数绘图、定积分与曲线间面积计算、圆锥曲线分析、点吸附 / Plot functions, definite integrals & area between curves, conic section analysis, point snapping |
| `math-3d.html` | 三维数学绘图器 · 3D Math Plotter | 三维曲面与空间曲线可视化 / 3D surface and space curve visualization |
| `math-equation.html` | 方程求解器 Pro · Equation Solver Pro | 各类方程与方程组求解 / Solve equations and systems of equations |
| `math-algebra.html` | 代数式化简器 v1.3 · Algebra Simplifier | 代数式展开、化简与符号运算 / Expand, simplify and manipulate algebraic expressions |
| `math-latex.html` | LaTeX 公式编辑器 · LaTeX Editor | 可视化编辑并预览 LaTeX 数学公式 / Visually edit and preview LaTeX math formulas |
| `math-fourier.html` | 傅里叶级数可视化 · Fourier Series | 傅里叶级数展开与波形合成动画演示 / Fourier series expansion and waveform synthesis animation |
| `math-geometry-theorems.html` | 几何画板 · Geometry Sketchpad | 几何图形绘制与定理演示（几何画板 5.06 迷你增强版）/ Draw geometric figures and demonstrate theorems |
| `math-sequence.html` | 数列工具 · Sequence Tools | 数列通项、求和与递推分析 / Sequence terms, summation and recurrence analysis |
| `math-theory.html` | 数论工具箱 · Number Theory Toolbox | 质数、因数分解、同余等数论计算 / Primes, factorization, modular arithmetic and more |
| `math-tools-pro.html` | 数学帝国工具箱 · Math Empire | 集成式综合计算平台 / All-in-one integrated math computing platform |

---

## 🚀 使用方法 · Usage

### 在线使用 · Online

首选访问 Cloudflare Pages 部署地址：
Primary access via the Cloudflare Pages deployment:

```
https://cyb-math.pages.dev/guide.html
```

如果首选地址不可用，可访问 GitHub Pages 备用地址：
If the primary address is unavailable, use the GitHub Pages fallback:

```
https://cyb430.github.io/cyb-math/guide.html
```

也可以把 `guide.html` 换成任意工具文件名单独访问，例如：
You can also replace `guide.html` with any tool's filename, e.g.:

```
https://cyb-math.pages.dev/math-plotter.html
```

### 本地使用 · Local

克隆仓库后，用浏览器打开任意 `.html` 文件即可，无需任何构建或依赖安装：
Clone the repo and open any `.html` file in a browser — no build or dependencies needed:

```bash
git clone https://github.com/cyb430/cyb-math.git
cd cyb-math-repo
# Windows: 双击 guide.html
# macOS:   open guide.html
# Linux:   xdg-open guide.html
```

---

## 🛠 技术说明 · Tech Notes

- 每个工具均为**单文件 HTML**，样式与脚本全部内嵌，可离线运行。
  Each tool is a **single HTML file** with inline CSS/JS — works fully offline.
- 纯静态站点，源文件即部署产物；首选托管在 Cloudflare Pages，GitHub Pages 作为备用镜像。
  A purely static site — the source files are the deployment; primarily hosted on Cloudflare Pages, with GitHub Pages as a fallback mirror.
- 兼容现代浏览器（Chrome / Edge / Firefox / Safari），建议使用桌面端获得最佳体验。
  Compatible with modern browsers (Chrome / Edge / Firefox / Safari); desktop recommended for the best experience.

---

## 📄 许可 · License

仅供学习与交流使用。 / For learning and educational use only.
