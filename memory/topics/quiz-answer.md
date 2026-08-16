# quiz-answer — 创业研究知识赛截图查答案工具

> 状态：已交付，可用。单次 session 建成（2026-08-07），无后续进行中工作。
> 来源：`memory/2026-08-07.md`

## 是什么

Arron 做创业研究专题赛道知识赛时，需要"截屏题目 → 快速得答案"。建成 `.claude/skills/quiz-answer/` 技能，三入口（桌面宠物 / 桌面主窗口 / 微信）都能收图 → 本地 OCR → 匹配 → 答案。

## 核心资产（都在 skill 目录内，自文档化）

- `question-bank.json` — 225 题结构化题库（单选30×3 + 多选15×3 + 判断20×3 + 案例10×3），从合并 docx 解析而来。
- `answer-matcher.js` — 纯 Node 文字匹配引擎（归一化 + bigram/LCS 模糊匹配），无依赖、可移植。
- `ocr-answer.js` — 本地 OCR（tesseract.js + 根目录 chi_sim.traineddata + 2 倍放大预处理）。
- `build-html.js` — 从题库一键生成自包含 HTML 答题助手（可微信分享）。

## 关键决策

- **本地 OCR 为主，不依赖"图片理解"视觉模型**。视觉模型（`myagents vision analyze`）需用户在聊天工具栏开启图片理解 + 配读图模型，Arron 找不到开关，改用本地 OCR。
- 实测：OCR 噪声（字符空格、"熊"→"能"）经归一化 + bigram/LCS 模糊匹配后全部命中，置信度 1.0 / 0.93 / 1.0。

## 技术坑（可复用教训）

1. **tesseract.js 语言包缓存写到 CWD**（运行目录），会污染技能目录（莫名多 2.4MB chi_sim.traineddata）。正解：`process.chdir(lang/)` 再建 worker，让缓存走默认 CWD 机制落到 gitignore 的 `lang/`。注意 `cachePath/dataPath` 传 Windows 绝对路径会让 WASM 文件系统找不到语言包（`Failed loading language`），不可用。
2. **base64 内嵌语言包进 HTML 失败**：tesseract.js v7 的 `[{code,data}]` 内嵌数据通道有 bug（字节被当文件名），放弃，改用 CDN 懒加载 + 页面打开即后台预载引擎预热。

## 产物

- `myagents_files/创业研究专题赛道知识赛题目与参考答案.docx`（225 题，每题后紧跟答案）
- `myagents_files/创业知识赛答题助手.html`（56KB 自包含，微信直发；截图识别需联网加载 tesseract CDN，文字搜索离线可用）

## 已知限制

- 浏览器端 OCR 手机仍需 2-5s；最快路径仍是发截图给 MyAgents（PC 端缓存引擎）。
