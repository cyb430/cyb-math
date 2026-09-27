# 发布流程

`release/release.json` 是版本号、发布日期、文件名、文件大小、SHA-256、Cloudflare 项目与域名的唯一来源。

## 日常检查

```powershell
npm run release:verify
npm run test:math
```

数学题库覆盖 12 个工具的典型题、边界题和错误输入。GitHub 的 `Quality checks` 工作流会在每次推送和 Pull Request 自动执行题库、桌面壳、Android 网页包与下载中心类型检查。

## 准备新版本

1. 更新 `release/release.json` 的日期、标签、Windows/Android 版本和文件名。
2. 运行 `npm run release:sync`，把版本同步到应用、下载中心与公开清单。
3. 运行 `npm run release:prepare`。脚本会执行测试、构建 Windows/Android、生成源码包、重新计算 SHA-256，并再次检查一致性。
4. 提交并推送同步后的源码和清单。

本地已有构建产物，只需重新校验和生成源码包时可运行：

```powershell
./scripts/release/prepare-release.ps1 -SkipBuild -ReleaseRoot C:\path\to\outputs
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

任何一步失败都会停止发布，不会继续上传不一致的版本。
