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
- **(2026-08-03, 2026-09-10 补证) 低频工作区靠定时任务维持记忆鲜活** — 当工作区 14 天仅一次会话时，"下次顺手更新记忆"不可行。molt（14d）、gardener（3d）、日志更新（1d）的定时触发是记忆系统存活的唯一机制。没有 cron 就没有自主维护。**2026-09-10 验证**：08-16→09-08 工作区完全静默（无 commit、无日志），同期 gardener/molt 均未触发，缺跑区间与静默区间精确重合 → **定时任务只在应用运行时才会触发，静默期缺跑是机制而非故障**。故诊断记忆维护缺失时，先核对该窗口有无工作区活动，再怀疑定时任务本身。
- **(2026-08-03) Arron 偏好分析工具而非现成答案** — 明确要求"保持思维独立性"、不给选题或写作思路时，提供分析框架、材料版图、方法论工具和风险评估，让他自己做判断。他看重的是能帮他"想得更清楚"的信息，不是替他做结论。对可行性追问层层递进（选题→材料→方法→框架→比较法→案例→风险），每层确认后才进入下一层。
- **(2026-09-08) 研究检索"双轨协作"约定（Arron 拍板）** — **触发**：Arron 抛研究问题（"帮我找…判例/论文""这个问题的判例怎么判"）。先判走哪条轨：①**材料轨**——我负责把原始材料摆好（判例详情链接 / 全量索引 / 精读笔记），落盘 `drafts/` 或对话给路径，**Arron 亲自读原文判断，我不替他下结论**；②**问答轨**——现场查判例+论文+法规，固定三段输出：**结论 → 证据（案号/出处，可核对）→ 扩展线索**（相似案例、反例、论文线索、未查清项），检索不到或库里没有就明说。**检索粒度**：他要的是"找得到"不是"读得完"——完善关键词 → 站内检索 → 给命中列表（标题+链接），**不主动通读判决全文或长篇总结**。三库分工（判例→威科主+法宝交叉；论文→知网+法宝期刊；法规→法宝）与各库入口见 `memory/topics/legal-research-infra.md`。每轮结果记入当日 daily。
- **(2026-09-08) 有风险先报，再动手** — Arron 明确要求："如果我让你做的事有风险，你记得提醒我，然后我们再做。" 涉登录态/cookie 操作、下载、可能触发站点风控、涉及账号信息的动作，先讲清影响与边界，等他确认。

### Communication

*(Lessons about tone, format, language, audience.)*

- **(2026-08-03) 中文为主，直接不废话，允许适当幽默** — 法律/学术沟通保持专业但不僵硬。该用英文术语时不强行翻译。Arron 愿意为效率接受新技术工具。

### Technical

- **(2026-07-19) Git 通过 Clash 代理访问 GitHub** — 代理地址 `http://127.0.0.1:7890`，仅 git 操作需要。配置方式：`git config http.proxy http://127.0.0.1:7890`。Clash 默认端口 7890。(unverified 2026-08-03 — 当前环境无法确认 Clash 状态)
- **(2026-07-19, verified 2026-09-10) 此环境限制** — **无 Python**（`python3`/`python` 均不存在，连 skill 自带的 `memory_lint.py` 也只能手动按逻辑执行）、无 pandoc、无 zip CLI。可用：Node.js v24.20.0、unzip、PowerShell Compress-Archive。docx 操作用 unzip 解压 + PowerShell 打包。XML 批量替换从后往前处理避免索引偏移。
- **(2026-08-03) AI 模型选型判断衰减周期约 2-4 周** — 模型市场变化极快（例如 7 月 19 日到 8 月 3 日之间 Opus 5 和 DeepSeek V4-Flash 相继发布，完全改变了选型格局）。MEMORY 中不应写"X 模型最好"的静态排名，应写按场景的决策指南并标注判断日期。每次 molt 必须核验模型相关判断。

## Important Decisions

- **(2026-07-19) 桌面端为主，微信为辅** — 精细法律文书操作用 MyAgents 桌面端（可见工具过程、widget、权限审批）；碎片场景（开庭间隙、通勤路上、快速提问）用微信。核心能力一致，互补不替代。
- **(2026-08-03) 硕士论文选题：劳动法方向，跨境用工 vs 劳务派遣待定** — Arron 硕士论文（2027夏开题，2028答辩）选题经历两轮：先定跨境用工合规方向（放弃平台经济，因撞贡献风险高+论文结构同质化），但同日导师倾向国内法律、建议劳务派遣主题，方向转为待定。核心共识：选题应落在"操作化层"而非"应然层"（应然层会被司法解释一纸定论消灭）；可选路径包括纯劳务派遣、或跨境用工×劳务派遣的交叉（对外劳务合作/跨境派遣本质是跨境劳务派遣）。详见 `memory/topics/cross-border-employment-thesis.md`。
- **(2026-09-09) 导师谈话信号：论文疑似转向解释论（效力性/管理性）** — Arron 已与导师聊选题，导师提"**虚假派遣**"与"**有些条款的效力是效力性规定还是管理性规定**"。**我的解读（推断，Arron 未确认）**：两信号合指"劳务派遣强制性规范的效力认定与违反后果展开"这一**解释论/教义学**命题（非立法论），与既有"抗定论"原则同向。**待补**：倾向硬度（倾向 vs 指令）、"虚假派遣"具体所指（逆向派遣？空壳派遣？还是泛指规避形态）、导师是否知道 Arron 的跨境用工构想。详见 `memory/topics/cross-border-employment-thesis.md`。
- **(2026-09-08) 主线切换：律所实习 → 学术研究/论文写作** — Arron 律所实习已基本结束（偶有零星法律活），服务主线转向学术研究：硕士论文（方向见上一条 2026-08-03 决策：跨境用工 vs 劳务派遣待定，2027夏开题/2028答辩）+ 其它学术计划。工作配合方式从"法律文书代工"转为"研究搭档"（文献检索→材料消化→框架→论证→写作）。身份设定不动。
- **(2026-08-03, replacing 2026-07-19 conclusion) AI 选型结论** — 模型市场 2026 年 7 月底剧变：Claude Opus 5（7/24）追平 Fable 5 半价但幻觉率上升；DeepSeek V4-Flash（7/31）Agent 能力暴涨 6 倍、价格为 Claude 1/90。结论不能再是简单排名，应按场景：(a) 最高质量法律推理 → Claude Opus 5，但需交叉验证（幻觉率比 Opus 4.8 高 14pp）；(b) 大批量法律文书初稿 → DeepSeek V4-Flash，性价比极高；(c) 代码相关法律工具构建 → Claude Opus 5。Codex 仍不适合法律工作。**（本条 2026-08-03 作出，已过 2-4 周衰减窗，待 molt 重新核验。）**

## User Preferences

- **(2026-07-19, 2026-09-10 更新) Arron 的日常核心需求**：学术主线——文献检索、材料消化、论文框架与论证、引用与格式；偶发法律活（合同起草审核、证据整理、文书格式规范化）仍在范围内。**优先级：省时间 > 炫技。**
- **(2026-08-13, 2026-09-10 下放) 公众号获客文案写法** — **触发**：让我写律所公众号获客文案。核心：目的是获客（让读者产生疑惑来咨询），不是普法/案例总结；白话老板口吻、问题导向、留悬念不直白挑逗、约 300 字；固定结构（问句标题→误判开头→情形一二三→风险提示）。完整模板 + 已确认示例 + 案例素材库见 `memory/topics/wechat-marketing.md`。**（随实习结束暂停，模板仍有效）**

## Technical Knowledge

- **(2026-07-19) Git repo** `~/.myagents/projects/mino/` → GitHub `Arron-yan/mino`。User email `yyqdewyyx@163.com`。
- **(2026-07-19) Agent** ID `72fe51c5-f862-4d10-9dda-0485988c0c28`，微信 Channel 已配。
- **(2026-07-19) 学术论文检索工具链** — OpenAlex API（api.openalex.org）免费无认证，适合查期刊目录和论文元数据。Semantic Scholar API 有 rate limit（HTTP 429）。知网（CNKI）域名被安全策略拦截，Sci-Hub 语料冻结 ~2022，2023 年后中文论文需其他渠道。Wiley Online Library 全站 Cloudflare 保护，curl 无法穿透。
- **(2026-08-13) 扫描版 PDF OCR 工具链** — 扫描件（CamScanner 等）无文本层，必须 OCR。可复用脚本 `workspace/pdf-to-text.mjs`：pdf-parse 渲染 → sharp 预处理（灰度+归一化+锐化）→ tesseract.js（chi_sim），~3秒/页、置信度 68%。用法 `node workspace/pdf-to-text.mjs <pdf> -o out.txt [--pages 1-3]`。本机无 Python/pandoc/poppler/原生 tesseract（无包管理器无管理员权限），全链路只能走 Node.js；tesseract-wasm 浏览器向、Node 下 fetch 失败，弃用。
- **(2026-09-08) DeepSeek 余额查询链路（已实测）** — Arron 说"看下余额/查余额"时运行 `node workspace/ds-balance.mjs`（读 `workspace/.deepseek-key`，key 已 gitignore，Arron 亲自填），调 `GET api.deepseek.com/user/balance`（Bearer 认证），输出含 totalBalance/currency 的 JSON，然后用 `<generative-ui-widget>` 画余额卡片（数据内联、最新卡片常驻对话）。key 与 MyAgents deepseek Provider / dsh 是同一把。首次实测 2026-09-08 ¥17.24 正常。详见 `workspace/ds-balance-card.md`。
- **(2026-08-13) 中文卡片图生成** — 微信公号卡片图标准 1080×1350。本机无 Python，node-canvas 需 gyp 编译（无 Python 装不上），Jimp 不能渲染中文。可靠方案：内联 CSS 的 HTML（body 固定 1080×1350）→ Chrome headless 截图 `"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --screenshot=out.png --window-size=1080,1350 --force-device-scale-factor=1 "file:///...html"`。参考图分析：Jimp 像素采样定配色布局 + tesseract.js chi_sim OCR 提文字。
- **(2026-09-08) 法律检索本地底座（三库登录态 / playwright-direct / cuse+OCR）** — **动手检索前先读 `memory/topics/legal-research-infra.md`**（登录步骤、入口 URL、选择器、OCR 参数等细节全在那）。三条硬事实：①三库（威科/法宝/知网）走天财 CARSI，**先登任一库留下 SSO 会话，其余库免输号一跳即过**；登录态统一在 `workspace/legal-dbs-login.json`（已 gitignore，**内含会话凭证勿外传**），**时效约 7 天**，过期引导 Arron 重新登录后覆盖导出。②检索走 `playwright-direct` MCP（内置 playwright 因 MyAgents 自带 npm 损坏不可用），其配置指向 npx 缓存路径，**清 npm 缓存即失效**；**改 MCP 配置后必须完全重启应用 + 新建会话才生效**。③**当前 Runtime 无视觉**——Read 截图一律返回 `[Unsupported Image]`，只能靠 cuse `ui snapshot`（UIA 树）或 `workspace/ocr-image.mjs` / `ocr-words.mjs` 离线 OCR 读屏。

- **(2026-09-10) 知网 → Zotero 导入已固化为 Skill `.claude/skills/cnki-to-zotero/`** — 用户说"在知网找几篇 X 存到 Zotero 某分类"时直接加载。SKILL.md 含参数清单（主题/目标分类/数量/筛选/要不要 PDF）+ 前置检查 + 流程；`references/` 存选择器与协议细节，`scripts/` 是查库与备用推送脚本。工作区级环境事实（数据目录 `D:\Dictionary`、分类 key、已入库清单）在 `memory/topics/zotero-cnki-import.md`。
  三条最容易踩的：① **建分类/改条目/删条目全无程序化入口**（连接器只给创建类端点；本地 REST API 是只读的，21 个端点类全是 GET、DELETE 501）→ 分类必须用户先建好，**入库前必须自检元数据**，抓错了只能请用户手动删。② **知网 PDF 必须先在带登录态的浏览器里取字节**（下载链接绑会话 + 查 referer，外部程序请求返回"来源应用不正确"；Zotero 服务端也明写 "All attachments come from the Connector"）。③ 详情页标题必须用 `.wx-tit h1`（裸 `h1` 会命中隐藏登录浮层，存成"自动登录"），作者用 `#authorpart a` 并剥 `<sup>` 机构编号。
  **Arron 定：以后存论文他会直接指定目标分类，不让 Agent 新建。**
- **(2026-09-10) 自动化浏览器 = MyAgents 内置浏览器** — 是 Arron 为我在内置浏览器里装的 Zotero Connector 5.0.212，并带天财 CARSI 知网登录态。它的 profile 落在标准 Chrome 用户数据目录（`AppData\Local\Google\Chrome\User Data\Default`）下，我起初据此误判成"Arron 本人的日常浏览器"，被纠正。**教训：从路径/痕迹推断用户环境归属前先确认，别把巧合当证据。**

## Project Pointers

- [[cross-border-employment-thesis]] — 硕士论文选题。**当前唯一活跃主线**。方向待定：原定跨境用工合规，导师倾向劳务派遣；**2026-09-09 导师谈话再添"虚假派遣 + 条款效力性/管理性"信号，疑似指向解释论命题**。选题原则：落操作化层不落应然层（抗定论）。资料包 `workspace/thesis-materials/`。详见 `memory/topics/cross-border-employment-thesis.md`。
- [[emergency-management-qa]] — 应急管理部咨询答复汇编搜索工具（2026-07-19）。659 条 Q&A，自包含 HTML 搜索+浏览。**已交付，Arron 实习结束此项目大概率休眠**，需要时仍可用。详见 `memory/topics/emergency-management-qa.md`。
- [[contract-review]] — 中银（天津）律所合同审核工作（2026-08-02）。已审 IT 运维和光伏 EMC 两类合同。**实习期项目，随实习结束暂停**。详见 `memory/topics/contract-review.md`。
- [[quiz-answer]] — 创业研究知识赛截图查答案工具（2026-08-07）。225 题结构化题库 + 本地 OCR 匹配 + 可分享 HTML，三入口（桌面/宠物/微信）收图查答案。**一次性活动工具，已交付休眠**。详见 `memory/topics/quiz-answer.md`。
- [[chengjiu-weilai-vs-ruize]] — 成就未来诉瑞泽文化合同纠纷诉讼案（2026-08-13）。代理原告。**实习期代理案件，若当事人关系结束则随实习移交/结案**。详见 `memory/topics/chengjiu-weilai-vs-ruize.md`。
- [[wechat-marketing]] — 中银（天津）律所公众号宣传文案+卡片图（2026-08-13）。获客导向写法模板已定。**实习期项目，随实习结束暂停**。详见 `memory/topics/wechat-marketing.md`。
- [[legal-research-infra]] — 法律库检索的登录态与浏览器底座（2026-09-08）。三库天财 CARSI 登录、登录态文件与恢复、检索入口/选择器、playwright-direct、cuse+OCR 读屏。**做任何判例/论文/法规检索前先读它**。详见 `memory/topics/legal-research-infra.md`。
- [[gcp-exam]] — GCP（药物临床试验质量管理规范）2026 版法规速查 + 结业考试支持（2026-08-16）。考试已交付；速查底稿 `workspace/gcp-exam/gcp-2026-速查.md` 是长期资产，医药合规工作可复用。详见 `memory/topics/gcp-exam.md`。
- [[zotero-cnki-import]] — 知网 → 本机 Zotero 文献导入链路（2026-09-10）。**学术阶段的基础设施，长期复用；流程已固化为 Skill `.claude/skills/cnki-to-zotero/`，接到相关请求直接加载它。** 工作区级环境事实与已入库清单见 `memory/topics/zotero-cnki-import.md`。

## Ongoing Context

- **(2026-09-08)** 主线已切换到学术研究/论文写作（硕士论文，选题跨境用工 vs 劳务派遣待定，见 project pointer）。当前正处于 thesis topic 时间线的"补基础"阶段：法考劳动法+三国法课程 + 通读 Rome I / Brussels I 条文。法律实习的零星活仍可能来，随时可切。

---

*Update this file as you learn. It's how you persist.*
