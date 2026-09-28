# CYB Math 源码版本库

CYB Math 的公开源码与发布报告版本库，整合早期独立页面、V1–V6 生产快照、三语版本及用户体验改进。

## 当前版本

`main` 分支中的 `sites/` 是 **2026-09-28 跨平台体验改进版**（简体中文、繁體中文、English），包含主站和 12 个工具站。本次发布到 GitHub，不代表线上 Cloudflare 网站或百度网盘已同步升级；原有域名和旧版本链接保留。

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
sites/                         当前三语源码
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

- Windows 1.0.6（安装版、便携版）：`work/cyb-math-exe-offline/`
- Android 1.0.5：`work/cyb-math-apk-offline/`
- HarmonyOS NEXT 1.0.0 原生工程：`work/cyb-math-harmony/`。已编译未签名 HAP；无开发者证书及实体设备，不作为正式可安装包发布。
- 个人主页（home/about 两个域名）：`work/cyb-personal-home/`
- 下载中心：`work/cyb-math-download/`
- [本次安装包与源码](https://github.com/cyb430/cyb-math/releases/tag/v2026.09.28)
- [原下载中心](https://download.cyb-math.cn/)，线上版本以页面标注为准。
- [百度网盘：2026-09-24 发行文件](https://pan.baidu.com/s/1HOlhpnb_63O-GX17Z-R_SQ?pwd=math)，提取码 `math`，本次未更新网盘。
- 文件大小及 SHA-256：`docs/releases/2026-09-28.json`
- 本次变更与验证范围：`docs/releases/2026-09-28.md`
- 完整体验审查与改进报告：`docs/reports/UX_REVIEW_2026-09-27.md`

本次新增直线/线性方程组最小二乘拟合、残差和 CSV 导出；补全收藏、搜索回车、草稿恢复、结果复制、数列 CSV、清空确认及 Android 系统文件保存。Windows 和移动端提供原生菜单/数学键盘、学习项目文件与升级提示；鸿蒙版采用 ArkTS/ArkUI 原生导航、输入键、文件与分享界面，数学引擎与网站共用离线源码。

## 本地构建

Windows：进入 `work/cyb-math-exe-offline`，运行 `npm ci`、`npm test`、`npm run build`。

Android：进入 `work/cyb-math-apk-offline`，运行 `npm ci`、`npm test`。准备 Android SDK 和 Java 后运行构建脚本。正式签名须自行准备私钥；仓库不含原发行版的签名材料。

下载中心：进入 `work/cyb-math-download`，运行 `npm ci`。将发行文件放在仓库根目录的 `outputs/`（或设置 `CYB_RELEASE_ROOT`），运行 `npm run assets` 生成分片，然后 `npm run check`。部署需要自己的 Cloudflare 授权。

## 使用体验与发布

- 仓库根目录先运行 `npm ci`。`npm run preview` 打开本地体验入口；`npm run ux:audit` 保存桌面/手机截图，`npm run test:ux` 执行 82 项三语使用旅程。浏览器测试使用本机 Chrome。
- `npm run ux:sync`：将公共体验修复和最小二乘依赖内嵌到单文件网页，并同步桌面源码。Android 通过自己的准备脚本同步网页。
- `npm test`：在真实 Electron 页面中执行 12 个数学工具的 44 个回归用例，覆盖典型题、边界题、拟合和错误输入。
- `node scripts/ux/test-download.mjs`：检查下载接口元数据、范围请求、缓存和非法路径；设置 `CYB_DOWNLOAD_TEST_URL` 后额外实际下载四个文件校验 SHA-256 和跨分片续传。
- `release/release.json`：网站、应用版本、安装包、下载地址和 SHA-256 的单一发布清单。
- `npm run release:verify`：检查三端版本、13 个站点、下载页和回归题库是否同步。
- `npm run release:prepare`：构建应用、执行测试并准备发行文件。
- GitHub Actions 中的 `Quality` 会在推送和合并请求时自动复验；`Publish release` 可一次完成应用构建、正式 Release 和可选的 Cloudflare 部署。

完整步骤及所需密钥见 `docs/RELEASE_PROCESS.md`。
