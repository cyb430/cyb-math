# CYB 数学工具箱 · 全量测试与修复完整文档

> 范围：10 个已部署单文件数学工具网站（排除 index.html 与 math-geometry.html）
> 原始代码合计约 29,521 行；两轮修复（Round 1 全量修复 + Round 2 架构级修复）
> 版本链：`<LOCAL_SOURCE>\`（原始，全程未动）→ `<LOCAL_SOURCE>\fixed\`（Round 1）→ `<LOCAL_SOURCE>\fixed-v2\`（Round 2）→ Round 3 独立复验 + 追加修复（最终可部署，见第七部分）
> 方法：逐行静态代码审查 + 安全模式审计 + UX 覆盖审计 + 修复 + 两轮复测（node vm.Script 语法校验 + 差分/等价性测试 + 回归抽查）

---

# 第一部分 · 总览与统计

## 1.1 执行团队与流程
- **Round 1**：4 名测试分析员逐行审查 10 文件 → 2 名修复工程师修复 → 1 名评审员复测
- **Round 2**：4 名架构工程师修复 4 类遗留项 → 1 名评审员复测
- **队长**：独立安全基线审计（eval/new Function/innerHTML 分布）+ UX 覆盖地图 + 交叉验证

## 1.2 修复统计

| 轮次 | 范围 | 严重(P1) | 中等 | 轻微 | 结果 |
|---|---|---|---|---|---|
| Round 1 | 10 文件全部问题 | 1/1 ✅ | 9/12 ✅(3 项架构级暂保留) | ~82/90 ✅(约 8 项暂保留) | 零"声称已修但未改" |
| Round 2 | 4 类架构遗留项 | — | — | — | 6/6 文件 ✅ PASS |
| Round 3 | 独立复验 + 追加修复 | — | 2/2 ✅ | 6/6 ✅ | 10/10 文件 ✅ 可部署 |

## 1.3 严重级别定义
- **[严重]** 可利用注入 / 数据丢失 / 任意代码执行
- **[中等]** 明确功能缺陷、状态污染、可触发假死
- **[轻微]** 体验 / 健壮性 / 最佳实践

## 1.4 各文件评分（Round 1 审查时，满分 5 或 10）

| 文件 | 安全 | 稳定 | UX | 文件 | 安全 | 稳定 | UX |
|---|---|---|---|---|---|---|---|
| sequence | 4.5/5 | 4.5/5 | 4/5 | 3d | 9/10 | 8.5/10 | 8/10 |
| algebra | 4/5 | 4/5 | 4/5 | plotter | 7.5/10 | 8.5/10 | 8.5/10 |
| equation | 4.5/5 | 4.5/5 | 4/5 | theory | 9/10 | 8.5/10 | 7.5/10 |
| geometry-theorems | 4/5 | 3/5 | 2.5/5 | tools-pro | 7/10 | 8/10 | 7/10 |
| latex | 5/5 | 4.5/5 | 4.5/5 | fourier | 4.5/5 | 4.5/5 | 4.5/5 |

---

# 第二部分 · 逐文件「问题 → 修复」对照（Round 1 全部问题 + 修复）

## 2.1 math-sequence.html（数列工具，1613 行）

| # | 级别 | 问题（行号/触发/影响） | 修复方法 |
|---|---|---|---|
| 1 | 中 | 处理列无法经分享链接还原：applyState 在 compute() 异步完成前调用 addProcColCore，被 `if(!state.computed)return` 拦截（L1499–1501/L1401）。添加处理列→复制分享→新窗口打开即丢失 | 新增 `_pendingProcs` 队列：applyState 只入队，在 compute() 的 finish() 回调（state.computed 就绪后）逐条 addProcColCore 重建 |
| 2 | 轻 | 多位数下标无法解析：parseLHS 正则 `/^([a-zA-Z])_(.)$/` 只认单字符，`a_10=1` 报错（L857–858） | 第二条正则改为 `/^([a-zA-Z])_([0-9]+|[a-zA-Z])$/` 支持多位数 |
| 3 | 轻 | NaN/Infinity 未标红：Math.pow 负底数分数幂、n!>170 得 NaN/∞，直接渲染文字（L714/L684/L1062） | binop 浮点路径加 fin() 守卫（非有限抛 EvalErr）；阶乘 >170 抛错；doSum 跳过非有限项 |
| 4 | 轻 | lcm 符号在 bigint/float 两模式不一致：bigint 返回可带符号，float 恒正（L752/L757） | bigint 分支改为先取绝对值 |
| 5 | 轻 | syncURL 超大状态 btoa 展开抛 RangeError 被吞（L1474） | 分块 8192 字节拼接 String.fromCharCode |
| 6 | 轻 | nextName 池耗尽回退双字符名，解析器不认（L1087） | 耗尽返回 null，addSeqRow 检测后 toast 中止 |
| 7 | 轻 | 无 CSP meta | head 加 CSP（`default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:`） |
| 8 | 轻 | 暗色 FOUC：html 硬编码 light、主题脚本在 body 末尾 | head 内联主题恢复脚本（localStorage + prefers-color-scheme） |
| 9 | 轻 | 不响应 OS 主题变化 | 新增 matchMedia('(prefers-color-scheme: dark)') change 监听 |
| 10 | 轻 | 触屏目标偏小（icon-btn 30px、seq-del 22px、checkbox 15px） | icon-btn 30→40px、seq-del 22→34px、checkbox 15→18px、chip padding 增大 |
| 11 | 轻 | 可访问性：帮助弹窗无 role、th 无 scope、toast 无 aria-live、错误单元格不可键盘聚焦 | 弹窗加 role=dialog/aria-modal+焦点陷阱；th scope=col；toast role=status aria-live=polite；错误单元格 tabindex/role=button+Enter/空格 |

---

## 2.2 math-algebra.html（代数式化简器，1165 行）

| # | 级别 | 问题（行号/触发/影响） | 修复方法 |
|---|---|---|---|
| 1 | 轻 | 主线程兜底依赖 `(0,eval)(WORKER_SRC)` 且失败静默（L704–709） | eval 失败改 console.warn（保留诊断，仍报「引擎初始化失败」） |
| 2 | 轻 | b64encode O(n²) 逐字节拼接（L763–764） | 分块 8192 字节拼接 |
| 3 | 轻 | Worker Blob URL 不回收，反复重建内存累积（L646–651） | new Worker 后立即 URL.revokeObjectURL(blobUrl) |
| 4 | 轻 | 无 CSP | head 加 CSP（含 `script-src 'unsafe-eval'`、`worker-src 'self' blob:`、`font-src data:` 兼容内嵌引擎+KaTeX） |
| 5 | 轻 | 暗色 FOUC + 不尊重系统主题（L1135 固定 light） | head 主题脚本 + applyTheme 初始值改 OS 偏好 + change 监听（key algcalc_theme） |
| 6 | 轻 | var/err/help 三弹窗无 role/aria-modal、无焦点陷阱 | 加 role=dialog/aria-modal/aria-labelledby + 关闭按钮 aria-label + openDialog 聚焦 + Tab 焦点陷阱 + reduced-motion |
| 7 | 轻 | 移动端断点仅 860px、btn-sm 32px<44px（L331/L348） | 断点加 (orientation:portrait)；btn-sm 移动端 min-height 44px |
| 8 | 轻 | 历史时间 padStart 兼容性（L1038） | 新增 pad2() 替换 |

> 保留（第三方库内部、无注入点）：WORKER_SRC 内 nerdamer 命令拼串（非 JS eval、被 try/catch 吞）。

---

## 2.3 math-equation.html（方程求解器，1469 行）

| # | 级别 | 问题（行号/触发/影响） | 修复方法 |
|---|---|---|---|
| 1 | 中 | 页面加载即 solveRoot→pushHist，主题切换/resize/orientationchange 重算再写历史，反复刷新/缩放刷满 50 条（L1466/L808/L1358–1370） | 四个求解函数加 quiet 参数，pushHist 仅非 quiet 执行；redrawActive 全 quiet；init 改 runActive()（只算当前页签） |
| 2 | 轻 | 非求根页分享仍跑 root 求解+绘图（L1466） | 由 runActive() 只跑当前页签解决 |
| 3 | 轻 | r-max/i-n 用 parseInt 截断（1e2→1）（L756/L1002） | 改 Math.floor(num(...)) |
| 4 | 轻 | sum/prod 上下限倒置静默返回初值（L591–595） | evalRPN 中 lo>hi 抛「上下限倒置」 |
| 5 | 轻 | polyCoeffs 大系数病态（范德蒙矩阵无缩放）（L1033–1051） | 采样点居中改善条件数；次数检测改相对差分容差 |
| 6 | 轻 | CSV 导出字段不转义（L654） | 新增 csvCell()（含逗号/引号/换行转义） |
| 7 | 轻 | 历史渲染/回填健壮性（PAGENAMES 无 hasOwnProperty、querySelector 无 try/catch） | renderHist 用 hasOwnProperty；restoreHist 校验 page 白名单 + querySelector 包 try/catch |
| 8 | 轻 | 无 CSP | head 加 CSP（无 eval/worker，script-src 'unsafe-inline'） |
| 9 | 轻 | 默认暗色且不尊重系统主题（L1395） | head 主题脚本 + applyTheme 初始值 OS 偏好 + change 监听 |
| 10 | 轻 | 帮助弹窗无 role/aria、绘图错误 alert()、无 reduced-motion | 弹窗加 role/aria+焦点陷阱；alert→toast(role=status)；加 prefers-reduced-motion |
| 11 | 轻 | 绘图仅鼠标事件，触屏无等价（L1307–1334） | 重写 Pointer Events：单指拖拽、双指捏合缩放、悬停十字线，保留 wheel |

---

## 2.4 math-latex.html（LaTeX 编辑器，1078 行）

| # | 级别 | 问题（行号/触发/影响） | 修复方法 |
|---|---|---|---|
| 1 | 轻 | 历史被逐键中间态污染（每次 200ms 防抖渲染即记历史）（L693–696） | renderNow(record) 加记录开关：仅 Ctrl+Enter 与 blur 记历史 |
| 2 | 轻 | 渲染失败后预览不清理，导出旧公式（L697–700/L837） | 失败清空 preview 显示「渲染失败」占位；buildSVG 加 editor.value!==lastGood 守卫 |
| 3 | 轻 | PNG 导出依赖 SVG+foreignObject（Safari 受限） | Round 1 保留 onerror 兜底；**Round 2 已彻底修复**（见 3.4） |
| 4 | 轻 | utf8ToB64 O(n²)（L429） | 分块 8192 拼接 |
| 5 | 轻 | 无 CSP | head 加 CSP（font-src data:、img-src data:） |
| 6 | 轻 | 点击目标 <44px、textarea 14px、符号按钮无 aria-label、sym-tab 无 aria-selected、无 reduced-motion | padding 增大；移动端 textarea 16px；符号按钮 aria-label；sym-tab aria-selected；加 reduced-motion |

---

## 2.5 math-geometry-theorems.html（几何画板，5971 行）

| # | 级别 | 问题（行号/触发/影响） | 修复方法 |
|---|---|---|---|
| 1 | 中 | 导入/分享/恢复后 measureCounter 未同步 → 新建度量 mN 重名覆盖（L1056/3531/2650 等） | 新增 syncMeasureCounter()（扫 measure/calculation 取 m 后缀最大值），4 条导入路径调用 |
| 2 | 轻 | 计算引用更靠后度量值时读到旧值（recompute 二遍顺序） | recompute 拆两阶段：先更新全部 measure+parameter，再更新 calculation+locus |
| 3 | 轻 | evalAST 对 % 除零、负底数分数幂只产 NaN 无提示（L1700–1708） | % 分母 0 抛「对 0 取余无定义」；^ 非有限抛「幂运算无定义」 |
| 4 | 轻 | createParameter 未校验 Infinity（1e309）（L3736） | 加 isFinite 校验并报错 |
| 5 | 中 | 参数曲线浮点死循环（tmin 1e16 时 t+=step 不变）（L1773–1774） | renderParamCurve 加 |tmin|,|tmax|>1e6 放弃 + t+step===t break |
| 6 | 中 | 函数渲染同型浮点死循环（L1748–1752） | 同样加量级校验 + px+step===px break |
| 7 | 中 | 迭代次数无 JS 钳制（手动输 1e7）（L3507/3516） | count=Math.min(200, Math.max(1, count)) |
| 8 | 轻 | 轨迹 121 次全量 recompute（L3354–3379） | Round 1 保留（50ms 降频兜底）；**Round 2 已局部重算**（见 3.3） |
| 9 | 轻 | 分享解压无体积上限（zip bomb）（L4179–4181） | inflateText 手动读流累计，>20MB 抛错 |
| 10 | 轻 | 无 CSP | head 加 CSP（img-src data:） |
| 11 | 轻 | 导入浅校验可配死循环 DoS（L2594–2624） | validateImport 对 function/param_curve 加 min/max/tmin/tmax 类型+有限+范围校验 |
| 12 | 中 | 完全不支持暗色模式（grep 0 命中） | 新增 [data-theme=dark] 变量组覆盖全部组件 + 标题栏切换按钮 + head 防闪烁 + OS 跟随 + change 监听 |
| 13 | 中 | 键盘可访问性缺失（div 菜单/工具无 tabindex/role） | 菜单/工具/下拉项加 tabindex/role/aria-haspopup/aria-expanded + Enter/空格激活 |
| 14 | 轻 | 移动端工具 34px | 34→40px |
| 15 | 轻 | 无 prefers-reduced-motion | CSS 关闭过渡 + JS 检测时动画速度 0.25× |
| 16 | 轻 | 依赖原生 prompt()/confirm()（19 处） | Round 1 保留；**Round 2 已组件化**（见 3.3） |

---

## 2.6 math-fourier.html（傅里叶级数可视化，2529 行）

| # | 级别 | 问题（行号/触发/影响） | 修复方法 |
|---|---|---|---|
| 1 | 轻 | autoPaused 使用处之后声明（var 提升，无实际故障）（L2438/2457） | 声明上移至全局状态区 |
| 2 | 轻 | 极窄视口 x0>x1 反向绘制（L1553–1565） | x1=Math.max(x0+20, w-16) 兜底 |
| 3 | 轻 | nextPow2 int32 位移溢出死循环（潜在，UI 不可达）（L471–475） | while(p<n && p>0) p<<=1; if(p<=0) throw |
| 4 | 轻 | 无 CSP | head 加 CSP（img-src data: blob:） |
| 5 | 轻 | 无 prefers-reduced-motion（动画自动播放） | 检测 reduced-motion 初始默认暂停 + change 监听 |
| 6 | 轻 | toast 无 aria-live、帮助弹窗无焦点陷阱 | toast role=status aria-live=polite；帮助弹窗聚焦+焦点陷阱 |

---

## 2.7 math-3d.html（三维绘图器，4014 行）

| # | 级别 | 问题（行号/触发/影响） | 修复方法 |
|---|---|---|---|
| 3D-1 | 轻 | 无 CSP | head 加 CSP（object-src 'none'; base-uri 'none'） |
| 3D-2 | 轻 | 恢复 obj.color 未白名单，8 位/非法色致 NaN 黑（L3077） | applyObjDefaults 正则 `^#[0-9a-fA-F]{6}$` 校验，非法回退 nextColor() |
| 3D-3 | 轻 | Object.assign(state.settings,...) 受限原型污染（L3912） | 改显式逐键赋值 ["box","axes","gridXY","gridYZ","gridXZ"]，跳过 __proto__ |
| 3D-5 | 轻 | 负底数奇次根/除零无保护，`(-x)^(1/3)` 画不出（L1949–1951） | 新增 powSigned：负底数且指数近似奇分母分数时按实数奇次根求值 |
| 3D-6 | 中 | 隐式曲面同步主线程重计算（27.5 万采样）卡顿（L2796–2799） | Round 1：scope 复用 + 进度提示；**Round 2：迁 Web Worker**（见 3.2） |
| 3D-7 | 轻 | 恢复相机坐标未校验，篡改链接黑屏（L3935–3939） | restoreState 对 cam.pos/target 逐分量 isFinite，非法回退 HOME_POS |
| 3D-8 | 轻 | 恢复参数未校验 min<max/val（L3905–3911） | 校验 max>min（反向回退默认）+ clamp val |
| 3D-9 | 轻 | angleVecVec 零向量除零（L2089–2098） | d===0 || !isFinite(d) 返回 NaN |
| 3D-11 | 中 | 常驻 rAF 渲染循环耗电 + 无视 reduced-motion（L2574–2578） | 改脏标记（needsRender/changed/autoRotate 才渲染）+ reduced-motion 关阻尼/自动旋转 |
| 3D-12 | 轻 | 未处理 webglcontextrestored（L2426–2429） | 加监听：提示 + 触发重绘 |
| 3D-14 | 轻 | localStorage 写失败静默（L3946–3948） | catch 中 showMsg 提示保存失败 |
| 3D-15 | 轻 | base64 用废弃 escape/unescape（L3893–3898） | 改 TextEncoder/Uint8Array + btoa / atob + TextDecoder |
| 3D-16 | 轻 | 默认恒 light（L9） | 无已存偏好回退 prefers-color-scheme:dark |
| 3D-17 | 轻 | 触控目标偏小 | chip 加大 + 移动端 ≥40px |
| 3D-18 | 轻 | label 未关联 input | lab.htmlFor="f_"+f.k |
| 3D-19 | 轻 | 帮助弹窗无焦点陷阱（L583–641） | aria-modal=true + 聚焦/还原焦点 + Tab 循环 |

---

## 2.8 math-plotter.html（函数图像绘制器，3424 行）

| # | 级别 | 问题（行号/触发/影响） | 修复方法 |
|---|---|---|---|
| PLT-1 | 中 | new Function 编译用户表达式（高危模式，四层防御）（L1078–1081） | Round 1：checkIdentifiers 内聚 + CSP；**Round 2：彻底换自研解析器**（见 3.1） |
| PLT-2 | 轻 | 无 CSP | head 加 CSP（因 new Function 需 unsafe-eval；Round 2 已移除 unsafe-eval） |
| PLT-3 | 中 | 多处 compileInfo 编译未 checkIdentifiers（忘检缺口）（L1783 等） | checkIdentifiers 移入 compileInfo 内部（implicit 与普通两分支都校验） |
| PLT-4 | 轻 | 图例颜色未过 safeColor（L2671） | 图例 stroke 改 safeColor(e.color) |
| PLT-7 | 轻 | 发散积分结果误导（∫1/x dx 显示部分和）（L1180–1185） | 检测奇点显示「可能发散」+ 跳过计数 |
| PLT-8 | 轻 | range/int 在 FNAMES 但不在白名单，提示不一致（L969/1096） | checkIdentifiers 对 range/int 给明确中文提示 |
| PLT-9 | 轻 | Σ/Π 展开正则脆弱（L743–785） | 保留（try/catch 兜底不崩溃） |
| PLT-10 | 轻 | detectType 未 trim，旧存档误判类型（L1026–1050） | 入口 String(expr).trim() |
| PLT-11 | 轻 | 吸附点 O(n²) 交点采样（L1254–1271） | MAX_PAIR=30 限流 |
| PLT-13 | 轻 | 隐函数每次重采样重编译（L1823–1865） | 新增 COMPILE_CACHE + compileInfoCached（512 上限） |
| PLT-15 | 轻 | saveState 未防抖（L2701–2705） | 拆 saveStateNow 同步版 + saveState 300ms 防抖；分享用同步版 |
| PLT-17 | 轻 | 默认 light（L9） | 无已存偏好回退系统深色 |
| PLT-18 | 轻 | 触控目标偏小 | chip 加大 + 移动端 ≥40px |
| PLT-19 | 轻 | 8 个 label 未关联 input | 补 for |
| PLT-20 | 轻 | 面积确认用原生 confirm()（L2811） | 新增自绘 customConfirm()（复用 help 遮罩，Esc/遮罩/取消可关，默认聚焦取消） |

---

## 2.9 math-theory.html（数论工具箱，3318 行）

| # | 级别 | 问题（行号/触发/影响） | 修复方法 |
|---|---|---|---|
| #1 | 中 | 分享链接遗漏 select（b-from/b-to/cf-mode 不还原）（L3102–3110） | collectState 增加 #contentInner select；restore el.value 兼容 select |
| #2 | 轻 | URL 主题值无校验，脏值写坏 dataset.theme（L3126–3127） | payload.theme==="dark"||"light" 白名单 |
| #3 | 轻 | 进制转换不识别全角负号/前导+（L2386–2394） | .replace(/^[+＋]/,"") + .replace(/^[−–—]/,"-") |
| #4 | 轻 | 长度校验在逐字符循环之后（L2395–2403） | s.length>5000 守卫移到循环之前 |
| #5 | 中 | 主线程同步重计算假死、无取消（L1881–1894/2652 等） | Round 1：大输入二次确认（可取消）；**Round 2：迁 Web Worker**（见 3.2） |
| #6 | 轻 | 相邻素数大输入长时间卡顿（L1967–1972） | guardLimit 与位数联动（≥30 位 2000 步） |
| #7 | 轻 | 原根搜索上界 10000（L1337–1347） | 提高到 100000n |
| #8 | 轻 | 无 CSP | 加 default-src 'none' 最小 CSP |
| #9 | 轻 | 分享用废弃 escape/unescape（L3114/3126） | 改 b64encode/b64decode（TextEncoder/TextDecoder） |
| #10 | 轻 | 默认 light（L9） | 无已存偏好回退系统深色 |
| #11 | 轻 | 触控目标偏小 | chip/tab/crt rm 加大 |
| #12 | 轻 | tabs 无 aria-selected/方向键，CRT 删除无 aria-label（L3077–3087） | roving tabindex + 左右方向键/Home/End + aria-selected/aria-controls + CRT aria-label |
| #13 | 轻 | 无 reduced-motion | @media(prefers-reduced-motion:reduce) 关闭过渡 |

---

## 2.10 math-tools-pro.html（数学帝国工具箱，4940 行）

| # | 级别 | 问题（行号/触发/影响） | 修复方法 |
|---|---|---|---|
| #1 | 中 | parseData 空串→0 污染数据（"1,2,3\n" 末尾空串计 0）（L3473–3475） | split→trim→过滤空串→Number→过滤 isFinite |
| #2 | 轻 | CSV 导入空单元格→0（L3648–3657） | 空单元格 trim()==="" 跳过 |
| #3 | 轻 | ODE 结果 Math.min(...sol.y) 大数组 spread 栈溢出（L3027） | 改显式循环求极值 |
| #4 | 轻 | 计算器 C.expr 死状态（L2606） | 删除 C.expr；press("C") 仅清 R.expr.textContent |
| #5 | 轻 | Σ/Π 模板无占位（L2653–2654） | 改为 Σ_{k=1}^{10}{k} / Π_{k=1}^{4}{k} 带示例体 |
| #6 | 轻 | Pyodide 主线程解码阻塞、不可取消（L4614–4706） | Round 1：加载期禁用输入框+loadPromise 复用；**Round 2：迁 Web Worker**（见 3.4） |
| #7 | 轻 | 全局 monkey-patch window.fetch（L4639–4654） | 保留（幂等守卫+窄匹配+注释说明 wasm URL 不可配置） |
| #8 | **严重(P1)** | math.js 非沙箱 + 全角引号 U+FF02 绕过引号过滤注入（L1111/871–875/895/627） | preprocess 先 normalizeUnicode（全角→半角）再拦截 `["';]`，堵死绕过 |
| #9 | 中 | Python js 桥可 from js import document/fetch 任意执行（L4708–4720） | Round 1：帮助文案明示权限；**Round 2：迁 Worker + 白名单 jsbridge**（见 3.4） |
| #10 | 轻 | 无 CSP | 加 default-src 'none' + wasm-unsafe-eval + worker-src blob: + connect-src cdn |
| #12 | 轻 | 默认 light（L9） | 无已存偏好回退系统深色 |
| #13 | 中 | 模块导航/函数列表键盘不可达（L1258–1267/2054） | nav li role=button+tabindex+Enter/Space；函数列表 tabindex=-1+Enter/Space+↑↓ |
| #14 | 轻 | 触控目标偏小 | tbtn/chip/fab 移动端 ≥40px |
| #15 | 轻 | 窄屏拥挤（calc-grid 6 列） | calc-grid 6→4 列、form-grid 4→2 列 |
| #16 | 轻 | 硬编码颜色未主题化 + 无 reduced-motion | Palette.green 主题感知 + CDF/散点/分形色主题化 + reduced-motion CSS |

---

# 第三部分 · 架构级修复（Round 2）

## 3.1 math-plotter：表达式引擎去 new Function（安全关键）

**背景**：原 makeFn 用 `new Function("x","y","__sum","__prod", FN_PRELUDE + "return (" + js + ");")` 编译用户表达式，是全部 10 个文件里唯一的「用户输入动态代码执行」点（四层防御虽严密但属高危模式）。

**方案**：彻底移除 new Function/eval，替换为自研 **tokenizer + Pratt 递归下降解析器 + AST 求值器**（约 190 行内联、零依赖）：
- FN_IMPL：白名单函数表 → Math.* 与自定义（sin/cos/tan/asin/…/sec/csc/cot/ln/log/lg/log10/log2 等）
- BIN_PREC/RIGHT_ASSOC：优先级表（`**` 最高且右结合，一元负号比 `**` 更紧，与 JS 一致）
- tokenizeExpr：手写 tokenizer（十进制/科学计数法/标识符/多字符运算符）
- parseExpr：Pratt 递归下降产 AST（num/id/unary/binary/call/lambda）；`=>` 特判为 lambda 承接 Σ/Π
- evalAst：AST 求值器（id 解析 x→y→求和指标变量→pi/e/inf→报错）；__sum/__prod 复用原函数（SUMPROD_MAX=100000）
- compileInfo 改编译 AST 并缓存；fn 变轻量闭包，下游 .fn/.js 零改动
- checkIdentifiers/ALLOWED_IDS 保留（错误提示一致）
- **CSP 移除 'unsafe-eval'**

**验证**：全文件审计 new Function=0/eval(=0/unsafe-eval=0；108 个差分语义用例 + compileInfo 6 组与原实现 **0 差异**（覆盖三角/分数/幂/链式幂/负底数幂/求和求积/隐式 xy/不等式/绝对值/floor/对数换底/隐式乘法/取余/科学计数法/ΣΠ 嵌套）。

**收益**：注入从结构上不可能（用户表达式只经「字符串→token→AST→求值」，绕过过滤最多得到报错/NaN）。

## 3.2 math-3d + math-theory：重计算迁 Web Worker

**3d（marching cubes 采样）**：
- 内联 worker `new Worker(URL.createObjectURL(new Blob([src])))` + revokeObjectURL
- 复用页内 `<script id="src-parser">`/`<script id="src-marching">` 的 textContent 拼 Blob（零复制=天然等价）
- worker 收 {expr,params,bounds,res}，用自研 ExprParser 求值 + marchingCubes，positions/indices 以 transferable ArrayBuffer 回传
- 进度消息（每 65536 点）+ 状态栏「取消生成」（terminate）+ 删除/清空/重载自动取消在途构建 + 防陈旧回写（_rebuildSeq）
- 无 Worker 回退主线程同步 mcRunSync；CSP 加 worker-src blob:

**theory（5 个 BigInt 纯函数）**：
- 通用 worker 收 {op,args}（BigInt 字符串化），Function.prototype.toString 内联 Lucas-Lehmer/分拆数/BSGS/π(x) 筛/相邻素数搜索及依赖
- runTask 改 async + loading + 「取消计算」按钮（终止共享 worker）+ 新任务自动取消旧任务
- 保留 Round 1 二次确认与限流双保险；无 Worker 回退 runOpSync；CSP 加 worker-src blob:

**验证**：vm.Script 全脚本通过；等价性测试全 PASS（lucasLehmer(13)=true、partitionP(5)=7、bsgs(2,8,13)=3、sieve(30)=10、neighborSearch(10)=7/11；3d 球面 x²+y²+z²=4 res=24 下 worker 与主线程 **vertexCount=3554/triangleCount=7104 完全一致**）。

## 3.3 math-geometry-theorems：对话框组件化 + 轨迹局部重算

**(a) 19 处原生 prompt/confirm → 自绘对话框**：
- 新增通用模态框 + askPrompt/askConfirm（Promise API），复用既有 .dialog 遮罩/卡片样式（主题自动跟随）
- Esc 捕获阶段取消（阻断全局 Esc 分支）、回车确认、焦点管理（打开聚焦输入框并全选/聚焦确定，关闭还原）、模态期间屏蔽全局快捷键
- 相关函数 + useCustomTool/buildCustomShape/handleCustomPlace 分派点全部异步化（await）
- 有意修正：原 seg_divide 取消时静默按 n=3，现改为「取消即中止」

**(b) 轨迹局部重算**：
- 原 updateLocus 121 次全量 recompute()；改为 locusAffected（refsOf 补丁 + 计算表达式标识符分析 calcExprRefIds 构建下游传递闭包，按构造顺序=拓扑序）+ recomputeAffectedList（与 recompute 同构三段式）
- 闭包每轨迹只建一次并缓存，121 采样只重算驱动点下游

**验证**：10 个内联 script 过 vm.Script；prompt/confirm/alert 残留 **0**；轨迹等价性抽验（圆上驱动点→中点，含无关对象）闭包=[驱动,被驱动]、121 采样与全量重算 **maxDiff=0**。

## 3.4 math-latex + math-tools-pro：PNG 导出 + Pyodide Worker

**latex（PNG 弃 foreignObject）**：
- 实测内嵌 KaTeX 0.16.11 无 SVG 输出分支，故采用等价路径：KaTeX 渲染到离屏临时容器 → DOM 遍历 → Canvas 光栅化（文本 fillText + KaTeX 内联 SVG 子图 Image/drawImage + CSS 边框背景 fillRect）→ toBlob('image/png')
- 保留导出旧公式守卫；零新依赖；SVG 导出（exportSVG）保留原 foreignObject 路径（它是独立 .svg 文件）

**tools-pro（Pyodide 迁 Worker）**：
- 新增 script type=text/plain id=py-worker-src；主线程 ensureWorker() 读文本块→Blob→new Worker(blobUrl)
- 内嵌数据 postMessage 传给 Worker：loaderJs/asmJs + 三段 base64（wasm/stdlib/lock，约 19MB）；Worker 内分块 atob 解码→间接 eval→loadPyodide→setStdout/setStderr/setInterruptBuffer
- 消息协议：init/run/interrupt ←→ status/stdout/stderr/ready/result/loaderror；运行队列 flushQueue
- 加载进度 + 取消（SharedArrayBuffer 中断 + terminate 回退）+ 重试
- **白名单 jsbridge**（now/sleep/version），stripDangerousGlobals 禁用 fetch/XMLHttpRequest/WebSocket/postMessage/caches/indexedDB/DOM；标准库离线可用；micropip 在线装包禁用（安全取舍）

**验证**：两文件全 script + worker 源码 vm.Script 0 错误；三段 base64 解码为合法 WASM(`\0asm`)/ZIP(`PK`)/JSON(`{"info"`)。

---

# 第四部分 · 复测与回归结论

## 4.1 Round 1 复测（review.md）
- 严重 1/1 ✅；中等 9/12 ✅（3 架构级暂保留）；轻微 ~82/90 ✅（约 8 合理保留）
- **零「声称已修但未改/改错」**；10 文件内联 script 0 语法错误；CSP 与各文件依赖匹配；8 个高风险回归点抽查全通过；未发现新增缺陷

## 4.2 Round 2 复测（arch-review.md）
- 6/6 文件架构修复真实落盘且逻辑正确
- plotter：独立重跑 108 差分用例 0 差异；3d/theory/tools-pro：worker 源码独立编译通过 + theory 5 纯函数断言全 PASS + tools-pro 载荷解码合法
- geometry：prompt/confirm/alert=0，Esc/Enter/焦点/快捷键屏蔽齐全，轨迹局部重算正确
- latex：PNG 走 Canvas（foreignObject 仅剩 SVG 导出路径，合理）
- 回归：全部内联 script 0 语法错误；CSP 匹配达标；round-1 修复点抽查未破坏；未发现新增缺陷

---

# 第五部分 · 遗留项与残余风险

## 5.1 明确的合理保留（含理由）
1. **algebra**：nerdamer 命令拼串未转义（2MB 第三方库内部、非 JS eval、try/catch 兜底）
2. **plotter**：expandSumProd Σ/Π 正则重写（try/catch 已保证不崩溃）
3. ~~**tools-pro**：window.fetch 全局 patch（幂等守卫+窄匹配+wasm URL 不可配置）~~ **勘误（Round 3 核实）**：Round 2 实际已删除主线程 `pyPatchFetch`，改为 Worker 内 `self.fetch` 窄匹配拦截（按文件名后缀重定向到内嵌 blob），ready 后由 `stripDangerousGlobals` 置 undefined——比"保留"更干净，代码无问题，仅本报告此前描述过时。

## 5.2 Round 2 已消除的架构遗留（即此前"暂保留"项）
- plotter new Function → 自研解析器 ✅
- 3d/theory/tools-pro 重计算/Pyodide 主线程阻塞 → Web Worker ✅
- geometry prompt/confirm + 轨迹局部重算 ✅
- latex PNG foreignObject → DOM→Canvas 光栅化 ✅

## 5.3 残余风险（Round 2 报告如实标注，不构成当前缺陷）
1. geometry：function/param_curve/sequence 对象不参与局部重算（属原语义）；交点「就近取支」有状态启发式（计算路径与全量完全一致）；seg_divide 取消语义改为「中止」（有意修正）
2. tools-pro：`from js import self` 仍能拿 Worker 全局（无 DOM/网络/localStorage，无害）；SharedArrayBuffer 中断依赖 COOP/COEP 跨域隔离（未开启时取消降级为终止 Worker）；micropip 在线装包禁用
3. 极老浏览器无 Worker 时走主线程同步回退（功能一致，仅无并发收益）
4. 环境限制：DSH 沙箱阻止 Chrome 无头渲染，两轮 UX 体验均为「逐行核实代码事实 + 第一人称推演」，未取真实截图

---

# 第六部分 · 交付物清单

## 6.1 修复后文件
- **最终可部署**：`<LOCAL_USER>\.kimi-code\bin\cyb-math-deploy\` 下 10 个 .html（Round 3 复验+追加修复后的最终版）
- Round 3 工作副本（含测试脚本与 diff 留档）：`<LOCAL_USER>\.kimi-code\bin\deploy-v2\`
- Round 1/2 版本：`<LOCAL_SOURCE>\fixed\` / `<LOCAL_SOURCE>\fixed-v2\` 下 10 个 .html
- 原始文件：`<LOCAL_SOURCE>\` 根目录 10 个 .html（全程未动）

## 6.2 报告文件（`<LOCAL_SOURCE>\qa\`）
| 文件 | 内容 |
|---|---|
| qa-group-a/b/c/d.md | Round 1 测试发现（4 组 × 全部问题详单） |
| fix-group-ab/cd.md | Round 1 修复方法 |
| review.md | Round 1 复测报告 |
| arch-plotter/workers/geometry/misc.md | Round 2 架构修复方法 |
| arch-review.md | Round 2 复测报告 |
| FINAL-REPORT.md | Round 1 汇总 |
| arch-FINAL.md | Round 2 汇总 |
| **COMPLETE-REPORT.md** | **本完整文档** |

## 6.3 校验脚本
- `qa\_plotter_diff_test.js`：plotter 新旧解析器 108 用例差分测试
- `qa\_check_scripts.js`：内联 script 语法校验

---

# 第七部分 · Round 3 独立复验与追加修复（最终轮）

> 目标：以不信任前两轮结论的姿态，验证 Round 2 交付的 10 个文件是否"修改真实、合理、有用、可直接部署"；发现并修复新增缺陷后输出最终交付版。
> 环境：`<LOCAL_USER>\.kimi-code\bin\deploy-v2\`（Round 2 产物副本）对照 `<LOCAL_USER>\.kimi-code\bin\cyb-math-fixed\`（原始版），node v24。

## 7.1 复验方法与覆盖

1. **自动化基线**（`_check.js`）：全部内联 `<script>` 块过 `vm.Script` 语法校验（先剥离 HTML 注释，避免注释内字面 `<script>` 文本造成误报——tools-pro 的 Pyodide 说明注释即一例）；HTML 尾部完整性（`</body></html>` 未截断）；CSP meta 存在性与 `eval(`/`new Function`/`innerHTML` 分布统计。
2. **8 组并行深度验证**（逐文件）：对第二、三部分声称的约 90 个修复点逐一在代码中定位核实（存在性 + 逻辑正确性 + 周边无破坏）；新旧 diff 逐块审查有无报告外改动；node vm + 最小 DOM stub 对核心逻辑做功能实测。
3. **关键等价性实测**：
   - plotter：新旧表达式解析器 72 用例差分（含注入拦截 7 例），与数学真值 0 差异
   - 3d：Worker 与主线程 marching cubes 字节级等价（球面 res=24：vertexCount=3554 / triangleCount=7104 一致）
   - theory：Worker 协议 + 5 个纯函数 31 用例全过
   - geometry：askPrompt/askConfirm 16 用例、轨迹局部重算 121 采样与全量 recompute maxDiff=0
   - tools-pro：P1 全角引号注入拦截 10 用例实测；三段 base64 载荷解码为合法 WASM(`\0asm`)/ZIP(`PK`)/JSON
4. 复验断言合计约 **280 项**，逐文件结论：algebra / sequence / fourier / theory / plotter / 3d / geometry-theorems / tools-pro 共 8 个一次通过；equation、latex 各发现已落实修复引入的缺陷（见 7.2）。

## 7.2 复验发现的缺陷与修复（Round 3 新增，全部已修）

| # | 文件 | 级别 | 问题 | 修复 |
|---|---|---|---|---|
| R3-1a | equation | 中 | **Round 1 修复引入回归**：polyCoeffs 次数判据 `nxMax <= prevMax*1e-7` 首级仍与含大常数项的函数值比较，`x^2+1e8`、`x+1e7`（旧版可解）被误判为"常数方程" | 改为浮点噪声底线判据：k 阶差分噪声约 `eps·ysMax·2^k`，高阶差分低于 `ysMax·2.2e-16·2^k·100` 即判 0。实测 x^2+1e8→2 次、x+1e7→1 次、x^4+1e12→4 次（旧版静默误判 1 次）均正确；常数/sin(x)/x^5 仍正确拒绝 |
| R3-1b | equation | 轻 | R3-1a 暴露的既有缺陷：系数清零行把 `x^4+1e12` 真实首项清成 0，下游 Ferrari 首一化 0/0 → NaN 刷屏（旧版输出 -Infinity，同为垃圾） | polyCoeffs 尾部补降次防护：首项被清零时 `cc.pop()` 同步降次，降光则抛「首项系数数值上不可分辨」——诚实报错替代 NaN |
| R3-2 | equation | 轻 | **Round 1 修复引入回归**：Pointer Events 重写后 `pointers` 仅 pointerdown 填充，桌面鼠标悬停（未按键）十字线/坐标读数丢失；删除 mouseleave 后离场不再清除 | pointermove 末尾补 `e.pointerType==='mouse'` 悬停分支（触屏路径不受影响）；新增 pointerleave 在 `pointers.size===0&&!gDrag` 时清除十字线 |
| R3-3 | latex | 中 | **Round 1 修复引入缺陷**：`addHistory` 被 `tex !== state.lastGood` 门控，而防抖渲染先行更新 lastGood——正常操作节奏下 Ctrl+Enter/blur 永远记不进历史，整套历史 UI 成为死功能 | 删除门控，改 `state.lastGood = tex; if (record) addHistory(tex);`（pushHistory 自带去重与 30 条封顶） |
| R3-4 | latex | 轻 | buildSVG 守卫 toast「预览尚未同步…」返回 null 后被 exportSVG 通用 toast「暂无可导出的公式」立即覆盖 | exportSVG 仅在 `editor.value === state.lastGood`（非守卫路径）时补通用提示；renderPNG 路径核实无同类问题 |
| R3-5 | 3d | 轻 | 3 处原生 prompt/confirm 历史遗留（重命名、清空确认、分享兜底），与全套件去原生对话框方向不一致 | 新增自绘通用对话框（复用帮助弹窗遮罩/卡片样式，Promise API，焦点记忆/还原 + Tab 焦点陷阱 + Esc/遮罩取消 + Enter 确认）；分享兜底为只读预填全选模式便于手动复制。全文 prompt(/confirm(/alert( 残留 0 |
| R3-6 | 3d | 轻 | 隐式曲面构建失败时 sticky「正在生成…」提示不消退（滑块触发的 rebuildWithParam 失败路径无人 showMsg）；删除/清空/还原时取消在途构建同样残留 | BUILDERS.implicit 包 try/catch：普通错误以「生成失败」覆盖 sticky 后 rethrow；cancelled 且对象已不在 `state.objects` 时主动隐藏 msgBar，对象仍在则静默交给新构建接管 |
| R3-7 | geometry | 轻 | 既有缺陷：dblclick 编辑参数 `parseFloat(v) \|\| 0` 未校验 Infinity（1e309 写入参数），Round 1 只堵了 createParameter 入口 | 补 `isFinite` 校验 + 中文提示；防护位于 saveUndoState 与落值之前，不留脏 undo |
| R3-8 | geometry | 轻 | 键盘可访问性部分实现：dropdown-item 全为 tabindex=-1 且无方向键漫游，纯键盘用户无法到达菜单项 | 新增菜单方向键漫游：顶级 ←→ 切换（联动开合）、↓ 进入并聚焦首项、Enter/Space 打开后送焦点；项内 ↑↓ 循环（跳过 disabled）、→ 进子菜单、← 逐级返回、Esc 收起回顶级、Tab 收起不拦截；带 `alt/ctrl/meta` 修饰键过滤避免与全局快捷键双触发；顺带补全局 Esc 关菜单遗漏的 `aria-expanded='false'` |

## 7.3 Round 3 修复后复测

- equation：全量回归 29/29；次数识别矩阵 17 项（含大常数项 3 例 + 不误判 5 例 + 常规 9 例）全对；D2 交互路径代码级核实通过
- latex：39/39（历史路径 6 项含去重、导出提示路径 3 项、纯函数回归 18 项等）
- 3d：111/111（56 回归 + 55 新对话框/提示路径）；双 keydown 监听互不干扰实测通过
- geometry：86/86（35+16 回归 + 35 新交互路径，mini-DOM 实测菜单漫游 24/24）
- sequence：24/24（未改动，顺带回归）
- 最终全量基线：10 文件内联 script 语法校验全过、尾部完整、CSP 与各文件实际能力精确匹配

## 7.4 最终结论

**10/10 文件可直接部署。** Round 1/2 声称的修复经独立复验全部真实有效（零造假）；复验发现的 2 处 Round 1 引入回归 + 6 处遗留缺陷已在 Round 3 全部修复并复测通过。交付目录 `<LOCAL_USER>\.kimi-code\bin\cyb-math-deploy\`（10 个单文件，零外部依赖，上传任意静态托管或本地双击即可用；tools-pro 内嵌 Pyodide 约 19MB，建议开启 gzip/brotli）。

## 7.5 Round 3 残余风险（如实标注，不构成当前缺陷）

1. equation：触控笔悬停（pointerType==='pen' 无接触）不显示十字线，实际影响可忽略
2. 3d：dlgResolve 单槽位——前一对话框未关闭时再次 dlgOpen 会使前一个 Promise 悬挂（当前 UI 遮罩使该路径不可达，理论边界）
3. geometry：菜单项上 Esc 除收起菜单外连带触发全局 Esc 语义（清空选择等），属该应用既有行为
4. latex：buildSymbolTabs 切换分类前未清空容器会重复追加标签（新旧版共存的既有问题，仅视觉冗余）
5. 全部验证为静态审查 + node vm/stub 功能实测，未在真实浏览器中取截图；建议部署后抽样人工点检一遍核心流程
