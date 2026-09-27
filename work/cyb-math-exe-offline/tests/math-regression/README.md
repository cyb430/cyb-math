# 数学正确性回归题库

这套题库直接在 Chromium/Electron 中打开当前 `sites/` 页面并操作真实界面，不复制网页内部算法。

- 12 个数学工具均至少包含 1 道典型题、1 道边界题和 1 个错误输入。
- 题目与期望值位于 `cases.json`，运行逻辑位于 `runner.cjs`。
- 完整运行：`npm run test:math`。
- 单站运行：`npm run test:math -- --site=math-linear`。
- 机器可读结果写入仓库根目录 `test-results/math-regression.json`。

修改算法、界面、翻译、离线应用封装或发布文件前后，都应运行完整题库。新增功能时，应同时补充上述三类测试。
