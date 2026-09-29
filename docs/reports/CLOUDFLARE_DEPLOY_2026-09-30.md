# CYB Math Cloudflare 部署与线上验收（2026-09-30）

部署源码：GitHub 主分支提交 `6c40b7c5466bf9fcb696e14af07b2f7abc1cfb7d`；正式附件：[`v2026.09.28`](https://github.com/cyb430/cyb-math/releases/tag/v2026.09.28)。本次只更新现有 Cloudflare 项目，未新建项目、删除域名或更改旧 `pages.dev` 地址。

## Pages

| 项目 | 自定义域名 |
| --- | --- |
| cyb-math | https://cyb-math.cn/ |
| math-tools-pro | https://tools.cyb-math.cn/ |
| math-plotter | https://plotter.cyb-math.cn/ |
| math-complex | https://complex.cyb-math.cn/ |
| math-equation | https://equation.cyb-math.cn/ |
| math-geometry | https://geometry.cyb-math.cn/ |
| math-algebra | https://algebra.cyb-math.cn/ |
| math-linear | https://linear.cyb-math.cn/ |
| math-3d | https://3d.cyb-math.cn/ |
| math-theory | https://theory.cyb-math.cn/ |
| math-sequence | https://sequence.cyb-math.cn/ |
| math-latex | https://latex.cyb-math.cn/ |
| math-fourier | https://fourier.cyb-math.cn/ |

13 个现有 Direct Upload 项目均收到部署完成回执。部署后实际请求 13 个自定义域名及相应的 13 个 `pages.dev` 地址：26/26 返回 HTTP 200，且页面在还原 Cloudflare 自动邮箱保护标记和解码脚本后，SHA-256 与 `sites/<project>/index.html` 完全一致。邮箱保护是 Cloudflare 对含反馈邮箱页面的自动变换，因此其原始线上字节不应直接与源码逐字节比较。13/13 自定义域名保留 CSP、HSTS 和 `X-Content-Type-Options: nosniff` 响应头。

## Workers 与附件

- 个人主页 Worker `cyb-personal-home` 已部署，版本 `1e60a8cb-ab91-44db-b617-9a9a54c82406`。`https://home.cyb-math.cn/` 与 `https://about.cyb-math.cn/` 均返回 HTTP 200，页面 SHA-256 与本地构建输入一致。
- 下载中心 Worker `cyb-math-download` 已部署，版本 `d95e013a-5400-4d26-89d5-9a52caac10c1`。`https://download.cyb-math.cn/health` 返回 `ok: true`、发行日期 `2026-09-28` 和 4 个文件。简体、繁体、英语页面均返回 HTTP 200 并包含四个正式附件；英语页的 `html lang` 为 `en`。
- 四个附件的线上 HEAD 文件长度、ETag、首段 Range 响应均与发布清单和本地文件一致。随后从下载中心完整下载全部四个附件，各自总字节数和 SHA-256 均与 `release/release.json` 一致：Windows Setup `119001305` 字节、Portable `118790769` 字节、Android APK `12340847` 字节、源码 ZIP `98373245` 字节。

## 发布过程说明

Wrangler 4.135.0 在打印部署完成回执后没有正常退出，使顺序发布脚本停在首个项目。确认云端已接收部署后，后续 Pages 项目逐项续发；两个 Worker 也在收到版本 ID 与域名回执后结束挂起的本地命令。线上页面及完整附件下载验收通过，不以本地进程退出码替代云端验证。部署输入和应用源码未因此修改。
