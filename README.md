# CYB Math 源码版本库

CYB Math 的公开源码与发布报告版本库，整合了早期独立页面以及 V1–V6 生产快照。

## 当前版本

`main` 分支中的 `sites/` 是 **V6 自定义域名生产版**，对应标签 `v6-custom-domains`，包含主站和 12 个工具站：

- `sites/cyb-math`：主站 `https://cyb-math.cn/`
- `sites/math-3d`：3D 绘图
- `sites/math-algebra`：代数计算
- `sites/math-complex`：复变函数
- `sites/math-equation`：方程求解
- `sites/math-fourier`：傅里叶可视化
- `sites/math-geometry`：几何画板
- `sites/math-latex`：LaTeX 编辑器
- `sites/math-linear`：线性代数
- `sites/math-plotter`：函数绘图
- `sites/math-sequence`：数列工具
- `sites/math-theory`：数论工具
- `sites/math-tools-pro`：数学实用工具

每个站点目录都可作为独立的 Cloudflare Pages 静态站点发布。

## 仓库结构

```text
sites/                         当前 V6 生产源码
archive/original-revisions/    早期逐文件源码版本
archive/kimi/                  Kimi 阶段的源码与报告
archive/codex-supplemental/    未进入主版本链的补充源码快照
docs/reports/                  修复、部署、测试与域名迁移报告
docs/VERSION_HISTORY.md        版本、标签和提交对应关系
```

构建脚本、自动化测试材料、临时文件、依赖目录、浏览器缓存以及含本机路径的来源清单均未进入公开历史。报告内原有的本机绝对路径已替换为通用占位符。

## 查看旧版本

```powershell
git tag --list
git switch --detach v5-linear
git switch main
```

