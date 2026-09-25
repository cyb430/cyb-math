# CYB Math 下载中心

`download.cyb-math.cn` 的 Cloudflare Worker 源码。页面由 Worker 返回；四个发行文件拆分为小于 25 MiB 的私有静态资源片段，并通过同一域名流式还原为原始文件。

## 特点

- 大文件不受 Pages/Workers 静态资源单文件大小影响；
- 分片按需流式读取，不在 Worker 内缓冲完整文件；
- 支持 HTTP Range 与断点续传；
- 只允许访问固定白名单中的四个发行文件；
- 提供 SHA-256 与安装安全说明；
- 百度网盘备用入口由 `BAIDU_SHARE_URL` 和 `BAIDU_EXTRACT_CODE` 控制，链接为空时不显示。
