# CYB Math 源码版本库

CYB Math 的公开源码与发布报告版本库，整合了早期独立页面、V1–V6 生产快照及 2026-09-24 三语版本。

## 当前版本

`main` 分支中的 `sites/` 是 **2026-09-24 三语生产版**（简体中文、繁體中文、English），包含主站和 12 个工具站：

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
sites/                         当前三语生产源码
archive/original-revisions/    早期逐文件源码版本
archive/kimi/                  Kimi 阶段的源码与报告
archive/codex-supplemental/    未进入主版本链的补充源码快照
docs/reports/                  修复、部署、测试与域名迁移报告
docs/VERSION_HISTORY.md        版本、标签和提交对应关系
```

本次补充了 Windows、Android、个人主页及下载中心的源码和构建脚本。依赖目录、构建缓存、安装包、签名私钥和密码不纳入 Git。历史归档及已有标签保留。

## 查看旧版本

```powershell
git tag --list
git switch --detach v5-linear
git switch main
```


## 应用和下载

- Windows 1.0.5（安装版、便携版）：`work/cyb-math-exe-offline/`
- Android 1.0.4：`work/cyb-math-apk-offline/`
- 个人主页（home/about 两个域名）：`work/cyb-personal-home/`
- 下载中心：`work/cyb-math-download/`
- [最新安装包与源码下载](https://download.cyb-math.cn/)
- [百度网盘：4 个发行文件](https://pan.baidu.com/s/1HOlhpnb_63O-GX17Z-R_SQ?pwd=math)，提取码 `math`
- 文件大小及 SHA-256：`docs/releases/2026-09-24.json`
- 本次变更与验证范围：`docs/releases/2026-09-24.md`

## 本地构建

Windows：进入 `work/cyb-math-exe-offline`，运行 `npm ci`、`npm test`、`npm run build`。

Android：进入 `work/cyb-math-apk-offline`，运行 `npm ci`、`npm test`。准备 Android SDK 和 Java 后运行构建脚本。正式签名须自行准备私钥；仓库不含原发行版的签名材料。

下载中心：进入 `work/cyb-math-download`，运行 `npm ci`。将发行文件放在仓库根目录的 `outputs/`（或设置 `CYB_RELEASE_ROOT`），运行 `npm run assets` 生成分片，然后 `npm run check`。部署需要自己的 Cloudflare 授权。
