# CYB Math 部署说明

## 版本选择

- `cyb-math-v1-fixed`：修复版，保留原视觉风格并补齐统一产品体验与安全措施。
- `cyb-math-v2-ui`：推荐发布版；功能与 V1 相同，界面更统一、清晰，桌面和移动端体验更好。

两个目录都是完整交付物。请选择其中一个版本部署，不要混用两个版本中的页面。

## Cloudflare Pages 项目映射

| 站点 | 域名 | 交付文件 |
|---|---|---|
| 总览 | `cyb-math.pages.dev` | `index.html` |
| 综合工具 | `math-tools-pro.pages.dev` | `math-tools-pro.html` |
| 函数绘图 | `math-plotter.pages.dev` | `math-plotter.html` |
| 方程解析 | `math-equation.pages.dev` | `math-equation.html` |
| 几何画板 | `math-geometry.pages.dev` | `math-geometry-theorems.html` |
| 代数系统 | `math-algebra.pages.dev` | `math-algebra.html` |
| 3D 绘图 | `math-3d.pages.dev` | `math-3d.html` |
| 数论工具 | `math-theory.pages.dev` | `math-theory.html` |
| 数列工具 | `math-sequence.pages.dev` | `math-sequence.html` |
| LaTeX 编辑器 | `math-latex.pages.dev` | `math-latex.html` |
| 傅里叶分析 | `math-fourier.pages.dev` | `math-fourier.html` |

## 每个项目的部署方法

1. 在对应版本目录中找到该站点的交付文件。
2. 子站部署时，将对应的 `math-*.html` 复制并改名为该项目根目录的 `index.html`；主站直接使用现有 `index.html`。
3. 把同版本目录中的 `_headers` 一并放到每个项目的根目录。
4. 部署后检查首页、统一顶部栏、工具切换器、主题、帮助和核心计算。
5. 在浏览器网络面板中确认 CSP、HSTS、Permissions-Policy 等响应头已生效。

不要只部署 HTML 而遗漏 `_headers`，否则本轮新增的浏览器安全策略不会在线上生效。

## 回滚

发布前保留当前线上构建。若生产环境出现差异，可在 Cloudflare Pages 的部署记录中回滚到上一版本；本交付没有直接修改或发布任何线上站点。
