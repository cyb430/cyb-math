# CYB Math 2026-09-28 交付验收

验收对象：本工作副本、`v2026.09.28` 正式附件和 GitHub 主分支。用户体验问题及具体改动见 [UX_REVIEW_2026-09-27.md](UX_REVIEW_2026-09-27.md)。本文件记录再次验收的结果和未完成的外部发布边界。

## 功能和页面

| 范围 | 结果 |
| --- | --- |
| 13 个网页、简体/繁体/英语、典型操作和错误恢复 | 82/82 用户流程通过；含两种视口的 3D 非空画布和真实旋转 |
| 13 个网页及个人主页、下载中心，1366 px / 390 px | 30/30 页面无横向溢出或浏览器脚本错误 |
| 数学回归题库 | 44/44 通过，覆盖典型、边界、无效输入 |
| Windows 桌面应用 | 13 页三语离线加载、窗口恢复、原生项目往返、PDF、三种升级情境通过 |
| Android | 13 页、26 条离线路由；9/9 原生桥接场景通过；先前模拟器实测输入法、数学键插入和系统下载目录保存 |
| HarmonyOS NEXT | 13/13 离线引擎一致，3/3 桥接流程通过；官方编译器已构建无签名 HAP |
| 下载中心 | 4 个附件的本地完整传输、Range/续传、缓存和错误路径通过；三语页面检查通过 |

## 包体与源码一致性

- 源码 ZIP 的 `sites/` 下 44 个文件与当前仓库逐文件 SHA-256 相同；包含 13 个站点、Windows、Android 和 HarmonyOS NEXT 源码。
- Windows 已解包构建的 `resources/sites/` 31 个文件与构建目录逐文件 SHA-256 相同；Setup 和 Portable 两个交付 EXE 均与对应构建输出 SHA-256 相同。
- Android 正式 APK 内 `assets/public/` 的 15 个文件与打包目录逐文件 SHA-256 相同；交付 APK 与 Release 构建输出 SHA-256 相同。包元数据为 `cn.cybmath.app`、`1.0.5`、versionCode 6。
- HarmonyOS NEXT 无签名 HAP 内 13 个页面与编译输入逐文件 SHA-256 相同；工程输出与 `outputs/engineering/` 交付副本相同。
- `npm run release:verify:artifacts` 通过：本地 4 个正式附件的文件名、字节数和 SHA-256 与 `release/release.json` 一致；源码 ZIP 文件名清单未发现签名密钥、`.env`、依赖缓存或本地工具链。
- 源码 ZIP 取自校验清单定稿之前的源码提交。ZIP 内的清单不能用来校验 ZIP 自身；应以 GitHub 标签中的 `release/release.json` 和发行页的校验值为准，避免把自身 SHA-256 递归写进自身。

## GitHub 远端

2026-09-28 再次通过 GitHub API 核验：验收时主分支为 `9bde1c4a6af5fdf530a83cda40148d198eed5cd2`，发布标签为 `b62e94e77c7b788f62f051b78058e5252d596656`。`v2026.09.28` 是公开正式发布，四个附件的大小与 GitHub 返回的 SHA-256 均与发布清单一致。两个提交上的 Quality checks 和 pages build and deployment 均成功。主分支当时比标签多一笔仅涉及发布记录和显示链接的提交，未更改发行包；此验收报告本身可能作为后续文档提交。

## 未宣称通过的边界

- **Cloudflare 自定义域名未发布本次版本。** 实测 12 个可访问站点均返回 200，但页面字节与本次 `sites/` 源码不相同；`tools.cyb-math.cn` 和对应旧 Pages 地址两次请求超时。GitHub Pages 工作流成功不等于 13 个 Cloudflare 站点更新。本次按用户指定发布到 GitHub，未擅自覆盖生产域名。
- Windows 两个 EXE 均未做 Authenticode 签名；便携版已运行验收，安装向导未在本机执行。Android 已在模拟器而非实体手机验收；鸿蒙没有签名证书和测试设备，HAP 未安装运行。因此不声称三平台实体设备全部通过。
- 线上站点与新版本完全一致、Windows 安装向导实装、Android/鸿蒙真机长期使用，需要在对应发布与设备条件具备后单独复验。
