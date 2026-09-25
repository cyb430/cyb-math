# CYB Math 离线桌面版

该工程将 V6 生产源码原样封装为 Windows Electron 应用。页面 HTML 不做修改；应用外壳负责把正式域名和旧 `pages.dev` 地址映射到内置页面。

## 特性

- 主站与 12 个工具全部离线内置。
- UI 与网页生产版保持一致。
- 数学功能、状态参数、查询参数和分享网址格式保持不变。
- 不允许渲染页面获得 Node.js 权限。
- 非 CYB Math 外链交给系统默认浏览器。

## 命令

- `npm start`：运行开发版。
- `npm test`：执行源码一致性、离线请求和 13 页 Electron 冒烟测试。
- `npm run build`：生成 Windows 安装版与便携版。

生产源码来自 `sites`。
