# legal-research-infra — 法律库检索的登录态与浏览器底座

> **⚙️ 要动手登录/恢复登录态 → 直接加载 Skill `.claude/skills/legal-db-login/`**（2026-09-10 建）。
> 它把本文的"怎么登"变成了可执行步骤 + 可直接粘贴的 `browser_run_code` 片段；两者冲突时以 Skill 为准。
> 本文件保留为**背景与机制**说明。
>
> 来源：`memory/2026-09-08.md`（搭建全过程）、`memory/2026-09-10.md`（Zotero 链路 + 法宝换号排查）。
> 自动装载层（04-MEMORY）只留规则与指针，操作细节在这里。
> 相关：[[zotero-cnki-import]]、[[cross-border-employment-thesis]]

## 〇、北大法宝"总是自动登个人号"——2026-09-10 已重走 CARSI，结果待 Arron 确认

**现象**：Arron 想用**天财学校账号**，但法宝**老是自动登录他的个人账号** 15081808629，导致部分案例看不了。

**原诊断**：自动化浏览器 profile 里有个**长驻"记住我"会话**（`cas.pkulaw.com/KEYCLOAK_REMEMBER_ME` → 2027-09-10），且 profile 内**无任何 tjufe/carsi cookie** → 法宝从不弹登录框，校园登录没机会跑。

**2026-09-10 实际操作（Arron 授权"我来操作，你只输密码"）**：
1. 备份：`workspace/legal-dbs-backup-2026-09-10/`（Local Storage leveldb + 09-08 登录态导出）。`Cookies` 文件被运行中的浏览器锁住未取到——**不影响**，个人号丢不了，重输密码即可。
2. 点 UI「退出登录」——成功（右上变回"登录/注册"）。**但 `cas.pkulaw.com/KEYCLOAK_REMEMBER_ME` 未被清掉**。
3. 第一次走 `登录 → 校园登录 → ds.carsi.edu.cn → 选天津财经大学 → #idpSkipButton`：**天财 CAS 页出现了却没要密码**，直接落回 15081808629 → 判定为 Keycloak SSO 顶回，CARSI 未真正完成。
4. 清掉**全部 34 个 pkulaw cookie**（威科/知网 58 个未动，已确认）。
5. 第二次重走 → CARSI 落地，`loginType=carsi`，天财侧 cookie 齐备（`idp.tjufe.edu.cn/__Host-shib_idp_session`、`sso.tjufe.edu.cn/SOURCEID_TGC`、`sp-pkulaw.carsi.edu.cn/_shibsession_*`）。
6. 检索功能正常（`案由:劳务派遣合同纠纷` → 27 篇，与改前一致）。

**⚠️ 未确认的关键点**：改后 `preferred_username` / `LoginAccount` = **`wx20250318165626749600`**（微信关联名，2025-03-18 建），而顶部仍显示手机号 15081808629。
- 若 `wx20250318...` = 学校号 → 换号成功。
- 若它本来就是个人号的登录名 → 没变（`loginType` 改前未读，**无法比对**）。
- 法宝账号页曾明确标注**"个人账号"**（改前观察到），改后该页文本渲染不出来，**未能复查**。

**Arron 的判断（2026-09-10）**：确认就是"**法宝把 CARSI 的天财身份映射到了手机号绑定的个人账号上**"。→ **换号这条路走不通**，想要独立学校号须找法宝客服拆分。**不要再重复尝试换号。**

**另一个重要事实：法宝会话很脆。** 上述 CARSI 会话建立后不久，浏览器进程回收 → **session 级 cookie 全丢 → 法宝掉线**（而威科、知网因持持久 cookie 仍在线）。三库抗掉线能力：威科 🟢、知网 🟢、**法宝 🔴**。
→ 实操：CHECK 发现"只有法宝掉线"是常态，单独重登法宝即可；**登录成功后立刻导出登录态**。

**认知修正**：法宝的身份还可能在 **localStorage/IndexedDB**（页面有 `#access_token` 隐藏域）——本次实测 localStorage 只有统计键，**不是**身份来源（IndexedDB 未排查）。真正的接管点在 **Keycloak SSO cookie**，**仅退登不足以清干净**，必须按域清 cookie。

**导出正确姿势**：`await context.storageState({ path })` —— Playwright 自己写盘，**run_code 里没有 `fs` 也能落盘**（2026-09-10 实测）。

---

## 一、三库访问：登录方式**三库不同**

> ⚠️ **别把三库当成同一套机构登录**。

| 库 | 本应使用 | 当前实际 |
|---|---|---|
| 威科先行 | **天财 CARSI**（顶部 CARSI 入口，走 sso.tjufe.edu.cn 单点） | ✅ 已生效，顶部显示 `tjufe_CarSi` |
| 北大法宝 | **天财 CARSI 校园登录** | ⚠️ **实际是个人号** 15081808629——见上方〇节 |
| 中国知网 | **天财 CARSI** | ✅ 已生效，顶部显示"天津财经大学图书馆"横幅 |

**法宝个人号实测**：司法案例库 1.74 亿篇可见，`(2026)苏05民终10463号` 详情页全文 16k 字、无付费墙（2026-09-10）。但**这不代表权限等同机构号**——部分子库/案例仍可能缺。

**登录顺序技巧（省事关键）**：先登任一库留下天财 SSO 会话，其余库全部免输号、CARSI 一跳即过。2026-09-08 实测威科→法宝→知网连续三库，后两个静默通过。**但若法宝已有长驻个人会话，它不吃天财 SSO**（见〇节）。

**法宝登录路径（若需重登）**：右上"登录/注册" → 登录框 iframe（cas.pkulaw.com，Keycloak）"更多登录方式" → **校园登录** → ds.carsi.edu.cn 学校发现页 → 搜"天津财经大学"。

**知网登录路径**：右上"机构登录" → 面板点 **"校外访问 >"** → 新标签 fsso.cnki.net → 机构搜索框填"天津财经大学" → 选 href 带 `entityID=idp.tjufe.edu.cn` 的建议项。

- 知网检索页是 https://kns.cnki.net/ 。
- **登录态**：统一导出 `workspace/legal-dbs-login.json`（Playwright storageState；**2026-09-10 最新一份 = 83 cookie / 7 origins**，三库 + 天财 SSO + CARSI SP 全含，是第一份真正完整的导出）。`workspace/` 已 gitignore，**内含天财账号会话凭证，不外传**。导出用 `context.storageState({ path })` —— Playwright 自己写盘，**run_code 里没有 `fs` 也能落盘**。
- **时效**：各库 cookie 数小时~7 天（威科 userInfo ≈ 7 天）。**没有永久登录**。
  ⚠️ **但"浏览器 cookie 没了" ≠ "要重新输密码"**：2026-09-10 实测，tjufe cookie 为 0 时重登法宝，CARSI 仍**全程免密通过** —— **天财 SSO 的服务端会话比浏览器 cookie 活得久**。所以不要预先假定要输密码，**直接试走一遍**。
- **恢复**：新浏览器实例 → playwright `page.context().addCookies(json.cookies)` 逐条注入 + 对每个 `storageState.origins` 重放 localStorage。**恢复后必须跑 CHECK 逐库确认**——session 级 cookie 恢复后往往仍失效，别假定恢复了就好。浏览器进程回收后：威科/知网（持久 cookie）通常还活着，**法宝（Keycloak session cookie）大概率掉线**，单独重登它即可。

## 二、检索入口与取数选择器

**威科先行**
- 经典判例列表直链：`law.wkinfo.com.cn/judgment-documents/list?simple=<URL编码关键词>`，**空格 = AND**（2026-09-10 实测）。
- 结果项容器 **`b-list-item-judgment-documents`**，条目链接 `a[href*="/detail"]`；案例评析（官方典型案例）走 `/case-analysis/detail/<ID>`，判决书走 `/judgment-documents/detail/<ID>`。详情页正文取 `.details-mian` 的 innerText（需等加载完）。
- ⚠️ **首次直连检索 URL 可能弹点击式安全验证**（"请依次点击【决,接,忽】"）。**当前 Runtime 无视觉，解不了也不尝试破解 → 停手告诉 Arron，他点完再继续**（Arron 2026-09-10 明确认可此边界）。刷新/二次导航后通常恢复正常。
- ⚠️ 2026-09-08 晚间起 **law.wkinfo.com.cn 已升级为"威科先行AI+"**：默认落地 `/ai/ai-search-home`；经典判例直链仍可用（2026-09-10 实测）。

**北大法宝**
- 检索入口 `https://www.pkulaw.com/case?way=topGuid`，输入框 `#txtSearch`，回车执行。页面是 SPA，`location.href` 不变，靠页面文本 `共 N 篇` 读结果数。
- **快搜框语法（2026-09-10 实测）**：空格 = AND；**只有 `案由:` 字段前缀有效**（`案由:劳务派遣合同纠纷` → 27 篇）；**`标题:` / `全文:` 前缀无效**，会静默回落到默认全库列表，容易误读成"命中 1.7 亿"。
- **案号检索极准**：`(2026)苏05民终10463号` → 精确命中 1 篇。**交叉验证一律走案号，别走关键词。**
- 详情页 URL：`https://www.pkulaw.com/pfnl/<id>.html`。结果项链接形如 `a[href*="/pfnl/"]`。

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
