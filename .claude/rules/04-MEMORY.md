# MEMORY.md - Long-Term Memory

*Your curated memories. The distilled essence, not raw logs.*

## About This File & Memory System

- **Be mindful in shared contexts** — this file contains personal context about your human. In group chats or shared sessions, don't leak private preferences, decisions, or project details

### Three-Layer Memory

Your memory has three layers, each with different responsibilities and access patterns:

**Core memory (this file, 04-MEMORY.md)** — Auto-loaded every session
- What goes here: cross-project lessons, key decisions, user preferences, technical knowledge, one-line project summaries + pointers
- What doesn't: detailed project experience (that's what topic files are for)
- **Add a timestamp `(YYYY-MM-DD)` to each entry** — helps trace back, judge recency, clean up

**Topic memory (`memory/topics/<name>.md`)** — Read before working on a project
- What goes here: full accumulated experience for one project/topic — status, key facts, what you did, what worked, what didn't, decisions and rationale, next steps
- More detailed than core memory (which only has pointers), more synthesized than daily logs (which are raw chronological notes)
- Update during memory maintenance or when a project enters a new phase

**Daily journal (`memory/YYYY-MM-DD.md`)** — Read today + yesterday at session start
- What goes here: what happened that day, raw chronological record
- This is the source of all memory, but searching it for specific project info is inefficient (multiple projects mixed in one day)

### Information Flow

```
Daily logs (raw material) → topic files (synthesized per-project) → 04-MEMORY (cross-project essence)
```

- During work: just write the daily log
- During maintenance: sync from logs to topics, distill new cross-project lessons to this file
- **Information lives in one place only** — don't duplicate between topic files and 04-MEMORY

### When to Read What

- Just woke up → this file is already loaded + read today/yesterday's logs
- About to work on a project → read its `memory/topics/<name>.md`
- Memory maintenance → read all recent logs + all active topic files

---

## Lessons Learned

Organize by topic as your lessons grow. A flat list becomes unreadable fast.

### Working Style

*(How you and your human work best together.)*

- **(2026-07-19) 坦诚对比，不粉饰** — Arron 要求客观、不隐瞒地评估工具优劣，包括承认自己的不足。被直接告知"Claude 更好"时没有不适，反而认可坦诚。不要过度推销自己或 MyAgents。
- **(2026-08-03) 低频工作区靠定时任务维持记忆鲜活** — 当工作区 14 天仅一次会话时，"下次顺手更新记忆"不可行。molt（14d）、gardener（3d）、日志更新（1d）的定时触发是记忆系统存活的唯一机制。没有 cron 就没有自主维护。
- **(2026-08-03) Arron 偏好分析工具而非现成答案** — 明确要求"保持思维独立性"、不给选题或写作思路时，提供分析框架、材料版图、方法论工具和风险评估，让他自己做判断。他看重的是能帮他"想得更清楚"的信息，不是替他做结论。对可行性追问层层递进（选题→材料→方法→框架→比较法→案例→风险），每层确认后才进入下一层。

### Communication

*(Lessons about tone, format, language, audience.)*

- **(2026-08-03) 中文为主，直接不废话，允许适当幽默** — 法律工作沟通保持专业但不僵硬。该用英文术语时不强行翻译。

### Technical

- **(2026-07-19) Git 通过 Clash 代理访问 GitHub** — 代理地址 `http://127.0.0.1:7890`，仅 git 操作需要。配置方式：`git config http.proxy http://127.0.0.1:7890`。Clash 默认端口 7890。(unverified 2026-08-03 — 当前环境无法确认 Clash 状态)
- **(2026-07-19, verified 2026-08-03) 此环境限制** — 无 Python、pandoc、zip CLI。可用：Node.js v24.14.0、unzip、PowerShell Compress-Archive。docx 操作用 unzip 解压 + PowerShell 打包。XML 批量替换从后往前处理避免索引偏移。
- **(2026-08-03) AI 模型选型判断衰减周期约 2-4 周** — 模型市场变化极快（例如 7 月 19 日到 8 月 3 日之间 Opus 5 和 DeepSeek V4-Flash 相继发布，完全改变了选型格局）。MEMORY 中不应写"X 模型最好"的静态排名，应写按场景的决策指南并标注判断日期。每次 molt 必须核验模型相关判断。

## Important Decisions

- **(2026-07-19) 桌面端为主，微信为辅** — 精细法律文书操作用 MyAgents 桌面端（可见工具过程、widget、权限审批）；碎片场景（开庭间隙、通勤路上、快速提问）用微信。核心能力一致，互补不替代。
- **(2026-08-03) 硕士论文选题：跨境用工合规方向** — Arron 选定跨境用工中的劳动法问题作为硕士论文方向（2027夏开题，2028答辩）。比较后放弃平台经济方向（撞贡献风险高、论文结构同质化导致"提不出问题"）。跨境用工的代价是前期材料体系分散、需要跨领域知识（劳动法+国际私法+对外投资法+比较法），但时间充裕可以消化。已在 workspace/thesis-materials/ 建立完整资料包。详见 `memory/topics/cross-border-employment-thesis.md`。
- **(2026-08-03, replacing 2026-07-19 conclusion) AI 选型结论** — 模型市场 2026 年 7 月底剧变：Claude Opus 5（7/24）追平 Fable 5 半价但幻觉率上升；DeepSeek V4-Flash（7/31）Agent 能力暴涨 6 倍、价格为 Claude 1/90。结论不能再是简单排名，应按场景：(a) 最高质量法律推理 → Claude Opus 5，但需交叉验证（幻觉率比 Opus 4.8 高 14pp）；(b) 大批量法律文书初稿 → DeepSeek V4-Flash，性价比极高；(c) 代码相关法律工具构建 → Claude Opus 5。V4-Pro 预计 8 月初上线，下次 molt 重新评估。Codex 仍不适合法律工作。

## User Preferences

- **(2026-07-19)** 中文沟通，直接不废话。愿意为效率接受新技术工具。
- **(2026-07-19) Arron 的日常核心需求**：合同起草审核、法律检索、证据整理、文书格式规范化。优先级：省时间 > 炫技。
- **(2026-08-13) 法律公众号获客文案写法** — 目的是获客（让读者产生疑惑来咨询），不是普法/案例总结。写法：白话老板口吻（不用法言法语、案号、"法院认为"、一审二审判决）；问题导向（每个"情形"描述"遇到什么问题"、开放式提问，不下结论）；留悬念但不直白挑逗（避免"打问号""睡不着觉"）；短篇幅约300字；固定结构：问句标题→误判开头（"这个问题的答案，可能和很多人想的不太一样"）→情形一/二/三→风险提示→💡中银律师温馨提示（简化为风险提示，不写服务菜单）。Arron 已确认模板"以后就做成这样的就行"。

## Technical Knowledge

- **(2026-07-19) Git repo** `~/.myagents/projects/mino/` → GitHub `Arron-yan/mino`。User email `yyqdewyyx@163.com`。
- **(2026-07-19) Agent** ID `72fe51c5-f862-4d10-9dda-0485988c0c28`，微信 Channel 已配。
- **(2026-07-19) 学术论文检索工具链** — OpenAlex API（api.openalex.org）免费无认证，适合查期刊目录和论文元数据。Semantic Scholar API 有 rate limit（HTTP 429）。知网（CNKI）域名被安全策略拦截，Sci-Hub 语料冻结 ~2022，2023 年后中文论文需其他渠道。Wiley Online Library 全站 Cloudflare 保护，curl 无法穿透。
- **(2026-08-13) 扫描版 PDF OCR 工具链** — 扫描件（CamScanner 等）无文本层，必须 OCR。可复用脚本 `workspace/pdf-to-text.mjs`：pdf-parse 渲染 → sharp 预处理（灰度+归一化+锐化）→ tesseract.js（chi_sim），~3秒/页、置信度 68%。用法 `node workspace/pdf-to-text.mjs <pdf> -o out.txt [--pages 1-3]`。本机无 Python/pandoc/poppler/原生 tesseract（无包管理器无管理员权限），全链路只能走 Node.js；tesseract-wasm 浏览器向、Node 下 fetch 失败，弃用。
- **(2026-08-13) 中文卡片图生成** — 微信公号卡片图标准 1080×1350。本机无 Python，node-canvas 需 gyp 编译（无 Python 装不上），Jimp 不能渲染中文。可靠方案：内联 CSS 的 HTML（body 固定 1080×1350）→ Chrome headless 截图 `"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --screenshot=out.png --window-size=1080,1350 --force-device-scale-factor=1 "file:///...html"`。参考图分析：Jimp 像素采样定配色布局 + tesseract.js chi_sim OCR 提文字。

## Project Pointers

- [[emergency-management-qa]] — 应急管理部咨询答复汇编搜索工具（2026-07-19）。659 条 Q&A，自包含 HTML 搜索+浏览，10 条专家注释，33 省应急管理厅官网链接。详见 `memory/topics/emergency-management-qa.md`。
- [[contract-review]] — 中银（天津）律所合同审核工作（2026-08-02）。已审 IT 运维和光伏 EMC 两类合同。固定使用中银法律审核建议书格式。详见 `memory/topics/contract-review.md`。
- [[cross-border-employment-thesis]] — 跨境用工合规硕士论文（2026-08-03）。选题已定，前期准备阶段。资料包已建立（workspace/thesis-materials/），待补基础+检索判决书。详见 `memory/topics/cross-border-employment-thesis.md`。
- [[quiz-answer]] — 创业研究知识赛截图查答案工具（2026-08-07）。225 题结构化题库 + 本地 OCR 匹配 + 可分享 HTML，三入口（桌面/宠物/微信）收图查答案。详见 `memory/topics/quiz-answer.md`。
- [[chengjiu-weilai-vs-ruize]] — 成就未来诉瑞泽文化合同纠纷诉讼案（2026-08-13）。代理原告，诉请解除合同+退款24000元。策略：仲裁条款无效走诉讼 + 每日派人缺席=根本违约。起诉状已起草，待补日期。详见 `memory/topics/chengjiu-weilai-vs-ruize.md`。
- [[wechat-marketing]] — 中银（天津）律所公众号宣传文案+卡片图（2026-08-13）。获客导向，白话问题导向留悬念写法已定模板。卡片图用 HTML+Chrome headless 生成。详见 `memory/topics/wechat-marketing.md`。

## Ongoing Context

- **(2026-07-19)** 应急管理部答复汇编工具已交付。Arron 已开始修改正文标题，后续需要时重新运行 fix_toc.js 同步目录。可继续补充专家注释。

---

*Update this file as you learn. It's how you persist.*
