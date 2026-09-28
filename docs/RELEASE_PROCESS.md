# 发布流程

`release/release.json` 是版本号、发布日期、文件名、文件大小、SHA-256、Cloudflare 项目与域名的唯一来源。

## 日常检查

```powershell
npm run release:verify
npm run test:math
npm run test:ux
npm run test:platform
node scripts/ux/test-download.mjs
```

先在仓库根目录和各应用目录运行 `npm ci`。数学题库覆盖 12 个工具的 44 个典型题、边界题和错误输入；体验测试使用本机 Chrome 执行 82 项三语旅程。GitHub 的 `Quality checks` 工作流会在每次推送和 Pull Request 自动执行题库、使用旅程、桌面壳、Android 网页包与下载中心检查。

公共体验代码在 `scripts/ux/common.js` / `common.css`；最小二乘使用 `ml-matrix` 的 SVD。编辑后运行 `npm run ux:sync`，将代码、依赖和许可内嵌到独立 HTML 并同步桌面页面，再运行测试。Android 构建会同步网页。不要只修改生成后的桌面副本。

## 准备新版本

1. 更新 `release/release.json` 的日期、标签、Windows/Android 版本和文件名。
2. 运行 `npm run release:sync`，把版本同步到应用、下载中心与公开清单。
3. 提交源码和同步后的版本配置，保证源码压缩包与已测试的提交一致。
4. 运行 `npm run release:prepare`。脚本会执行测试、构建 Windows/Android、生成源码包、重新计算 SHA-256，并再次检查一致性。任何测试或构建失败立即停止。
5. 提交更新后的发行文件校验清单并推送。

Android 正式构建必须使用原发行版签名，才能直接升级已有安装。设置 `CYB_ANDROID_KEYSTORE`、`CYB_ANDROID_KEYSTORE_PASSWORD`，可选设置别名与密钥密码；缺失时停止，绝不自动换签名。便携工具链可通过 `CYB_TOOLCHAIN_ROOT` 指向已有 `.toolchain`。

已有完整 Gradle 缓存时，Android 构建脚本支持 `-Offline`。网页端模拟保存结果和 APK 签名检查不能替代真机系统文件选择器验收。

本地准备与发布默认都使用仓库根目录 `outputs/`。GitHub 新发行版先作为草稿上传，所有附件核对并上传成功后才公开。已公开附件不会被不同内容覆盖，应使用新版本标签。

本地已有构建产物，只需重新校验和生成源码包时可运行：

```powershell
./scripts/release/prepare-release.ps1 -SkipBuild -ReleaseRoot D:\path\to\outputs
```

## 发布

GitHub 仓库的 `Publish release` 工作流会完成构建、回归测试、Cloudflare 发布、下载中心更新和 GitHub Release 附件上传。需要在仓库 Secrets 中设置：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CYB_ANDROID_KEYSTORE_BASE64`
- `CYB_ANDROID_KEYSTORE_PASSWORD`
- `CYB_ANDROID_KEY_ALIAS`
- `CYB_ANDROID_KEY_PASSWORD`

本地发布可运行 `npm run release:publish`。脚本会优先使用 `GITHUB_TOKEN`；未设置时会尝试使用 Git Credential Manager 中现有的 GitHub 登录。

仅发布 GitHub，不改线上网站：

```powershell
./scripts/release/publish.ps1 -SkipCloudflare
```

网盘与 Cloudflare 更新须单独验证，不应因 GitHub 发布成功就把旧网盘文案改为新日期。源码 ZIP 来自第一阶段源码提交；第二阶段只提交校验清单和发布证据，避免把源码包本身的哈希递归写入其内容。

HarmonyOS NEXT 源码可按 `work/cyb-math-harmony/README.md` 构建。没有开发者签名材料和设备时，产生的 `-unsigned.hap` 仅用于工程验证，不列入正式可安装附件或下载中心。

任何一步失败都会停止发布，不会继续上传不一致的版本。
