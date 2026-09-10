# legal-research-infra — 法律库检索的登录态与浏览器底座

> 来源：`memory/2026-09-08.md`（搭建全过程）、`memory/2026-09-10.md`（Zotero 链路）。
> 自动装载层（04-MEMORY）只留规则与指针，操作细节在这里。
> 相关：[[zotero-cnki-import]]、[[cross-border-employment-thesis]]

## 一、三库访问：天财 CARSI 机构登录

三库（威科先行 / 北大法宝 / 中国知网）都已配天津财经大学机构登录。

**登录顺序技巧（省事关键）**：先登任一库留下天财 SSO 会话，其余库全部免输号、CARSI 一跳即过。2026-09-08 实测威科→法宝→知网连续三库，后两个静默通过。

| 库 | 登录路径 | 登录后的标志 |
|---|---|---|
| 威科先行 | 顶部 CARSI 入口，走 sso.tjufe.edu.cn 单点 | 顶部显示 `tjufe_CarSi` |
| 北大法宝 | 右上"登录/注册" → 登录框 iframe（cas.pkulaw.com，Keycloak）"更多登录方式" → **校园登录** → ds.carsi.edu.cn 学校发现页 → 搜"天津财经大学" | 右上显示账号手机号 15081808629 |
| 中国知网 | 右上"机构登录" → 面板点 **"校外访问 >"** → 新标签 fsso.cnki.net → 机构搜索框填"天津财经大学" → 选 href 带 `entityID=idp.tjufe.edu.cn` 的建议项 | 顶部显示"天津财经大学图书馆"横幅 |

- 知网检索页是 https://kns.cnki.net/ 。
- **登录态**：统一导出 `workspace/legal-dbs-login.json`（Playwright storageState，约 78 cookie + 6 origins ≈ 45KB；`workspace/` 已 gitignore，**内含天财账号会话凭证，不外传**）。覆盖三库 cookie + 天财 SSO（sso.tjufe/idp）+ 各库 CARSI SP（sp-wkinfo / sp-pkulaw / fsso.cnki.net）。
- **时效**：各库 cookie 数小时~7 天（威科 userInfo ≈ 7 天）；天财 SSO 是 session（关浏览器即失效，学校 IdP 服务端也在几小时~几天过期）。**没有永久登录，撑死约 7 天**。
- **恢复**：新浏览器实例 → playwright `page.context().addCookies(json.cookies)` 逐条注入 + 对每个 `storageState.origins` 重放 localStorage。2026-09-08 晚实测：playwright 新会话直连 kns.cnki.net 即显示"天津财经大学图书馆"横幅，**无需手动注入**，恢复机制有效。过期则引导 Arron 重新 CARSI 登录后**重新导出覆盖**（删除旧文件再全量导出）。

## 二、检索入口与取数选择器

**威科先行**
- 经典判例列表直链：`law.wkinfo.com.cn/judgment-documents/list?simple=<URL编码关键词>`
- 结果卡片容器 `.wkb-doc-main-container`；详情页正文取 `.details-mian` 的 innerText（需等加载完）
- ⚠️ 2026-09-08 晚间起 **law.wkinfo.com.cn 已升级为"威科先行AI+"**：默认落地 `/ai/ai-search-home`，检索走 AI 综合分析/语义综述而非判例清单；左侧 tab：综合分析 / 相关法规 / 相关案例 / 专业解读 / 官网信息。首页有检索AI / 合同AI / 诉讼AI / 问答AI 四张卡。经典判例直链应仍可用（早间已验证）。

**中国知网**
- 切学术期刊库：`dbcode=CFLS` 经 URL 传参**无效**，必须点左侧"学术期刊"标签用 JS 切库
- 列表抽取：`#gridTable tr` / `.result-table-list tr` 逐行 innerText → 篇名/作者/刊名/时间/被引
- 默认相关度排序前 20 混入大量财税/人力资源/医学杂流，**真法学论文需再筛**（来源类别 CSSCI/北大核心 + 学科）
- 详见 [[zotero-cnki-import]] 与 `.claude/skills/cnki-to-zotero/references/cnki-search.md`

## 三、浏览器底座：playwright-direct MCP

内置 `playwright` MCP 因 MyAgents 自带 npm 损坏而不可用：`minipass-flush` 内嵌 `minipass@3.3.6`（其声明需 `^7.1.3`），`class extends Minipass` 拿到 undefined，`npx` 一跑即崩（`Class extends value undefined`）。

**绕过**（不动 MyAgents 内置 node，改它风险高）：新增 MCP `playwright-direct`，command = `D:\软件\MyAgents\nodejs\node.exe`，args = `AppData\Local\npm-cache\_npx\84539a01c0e4c364\node_modules\@playwright\mcp\cli.js` + `--user-data-dir=...\.playwright-mcp-profile2`。Playwright 0.0.68，`mcp test` 握手通过。Chromium 内核在 `AppData\Local\ms-playwright`（chromium-1212 + headless shell + winldd，~111MB）。

**脆弱点**：配置指向 npx 缓存路径，**清 npm 缓存/换版本即失效**，届时需重装 @playwright/mcp 并改路径。

## 四、桌面自动化与"无视觉"读屏

`.claude/skills/cuse/`（Windows CLI `scripts/cuse.exe`）可用：`window list/focus`、`screenshot --display N`、`click/key/type/scroll`、`ui snapshot`（读 Windows UIA 树）。能开 Edge、切标签、点进检索框、输入回车（示例：Edge 打开 example.com，UIA 树读到文档节点 name="Example Domain"）。

**关键限制：当前 Runtime（deepseek-v4-flash）无视觉** —— `Read` 任何 jpg/png 截图都返回 `[Unsupported Image]`（原图/缩放图均试过）。看不了图，只有两条路：

- (a) **UIA 树** —— 网页 SPA 内容常不进树，只能拿到浏览器外壳
- (b) **OCR 读屏** —— `workspace/ocr-image.mjs`（全文）/ `workspace/ocr-words.mjs`（词 + bbox 坐标）。要点：tesseract.js v7 须 `recognize(img, {}, { text:true, blocks:true })` 才出 blocks；traineddata 放项目根（chi_sim/eng）并配 `gzip:false`；整屏 1430×804 OCR 质量差（误读多、置信度 ~52），小字区先裁剪放大再识别。**点击坐标空间 = 最新截图 JPEG 输出像素**（非显示器逻辑像素），OCR 与 click 用同一张图即可对齐。

2026-09-08 晚 Arron 知情后仍接受了自动化检索方案（浏览器内天财 CARSI 登录态可用）。

## 五、机制坑（反复踩）

**MCP 工具在会话创建时绑定** —— 中途启用不进当前会话；增删改 MCP 配置后必须**完全重启 MyAgents + 新建会话**才生效。内置浏览器 `myagents-browser`（`__browser_host__`，截图路线、需读图模型）同此理，留作备选。

## 六、检索协作方式（规则在 04-MEMORY）

三库分工：判例 → 威科先行（主）+ 北大法宝司法案例（交叉验证）；论文 → 知网（学术期刊库，筛法学类/CSSCI）+ 法宝法学期刊；法规条文 → 法宝（引证码/沿革）。

每轮检索结果记入当日 daily 供追溯。第一批材料轨交付：`drafts/假外包真派遣-判例检索-2026-09-08.md`（4 篇精读带威科链接 + 9 候选带链接 + 重庆高院 9 案索引 + 规则提炼 + 下一轮待办）。
