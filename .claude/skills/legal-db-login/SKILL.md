---
name: legal-db-login
description: 维护和恢复法律数据库（威科先行 / 北大法宝 / 中国知网）在天财 CARSI 下的登录态。当检索前发现未登录、登录态过期（约 7 天）、法宝自动登成个人账号、或需要导出/恢复登录态备份时使用。也用于"三库登录不上""密钥过期了""重新登录一下"这类请求。不用于检索本身（那是研究检索三库流程），不用于知网→Zotero 导入（那是 cnki-to-zotero）。
---

# legal-db-login — 法律库登录态的维护与恢复

> 登录细节的权威来源是 `memory/topics/legal-research-infra.md`。本 Skill 是它的**可操作化版本**：把"怎么登"变成能直接跑的步骤。
> 两者冲突时以本 Skill 为准（它有 2026-09-10 的实测更新），并回头修正 memory。

## 一、先判断要做什么

三个入口，先分诊：

| 现象 | 走哪条 |
|---|---|
| 检索时页面显示未登录 / 跳登录页 | **A. 重登** |
| 三库表现正常，只是想做个备份 | **B. 导出** |
| 法宝登成了个人账号 / 想换身份 | **C. 身份诊断** |
| 登录态文件丢了 / 换了浏览器 profile | **D. 恢复** |

## 二、前置检查（每次必做）

1. **确认浏览器底座**：检索走 `playwright-direct` MCP。若 MCP 工具报错或不存在 → 见 `references/state-diagnosis.md` 的"底座故障"，**不要自己修，先报 Arron**（改 MCP 配置要重启应用 + 新建会话才生效）。
2. **读当前登录态**：用 `references/run-code-snippets.md` 的 `CHECK` 片段，一次性拿到三库是否在线。
3. **确认天财 SSO 状态**：看 profile 里有没有 `sso.tjufe.edu.cn` / `idp.tjufe.edu.cn` 的 cookie。有 → CARSI 可能免密一跳；没有 → 需要 Arron 输密码。

### 会话脆弱度：三库不一样（2026-09-10 实测）

浏览器进程回收后 session 级 cookie 全丢，但三库受影响程度不同：

| 库 | 抗掉线 | 说明 |
|---|---|---|
| 威科先行 | 🟢 好 | 会话 cookie 多为持久型 |
| 中国知网 | 🟢 好 | 同上 |
| **北大法宝** | 🔴 **差** | 依赖 Keycloak **session cookie**，进程一回收就掉线 |

**实操含义**：
- **法宝掉线概率显著高于另两库**。CHECK 发现"只有法宝掉线"是常态，**不必重登三库**，单独走 `LOGIN_PKULAW` 即可。
- **登录成功后立刻 EXPORT** —— 拖久了 session cookie 没了，导出下来的就是残缺备份。
- EXPORT 前**必须先 CHECK**，别把"已经掉线"的状态存成备份。

## 三、主流程

### A. 重登

**关键认知：天财 CARSI 需要凭证，我不碰账号密码。** 我的职责是把浏览器**开到登录表单前**，然后交给 Arron；他输完我接着收尾。

1. 按 `references/login-flows.md` 的对应库步骤，驱动到"下一步需要输入天财账号密码"的位置。
2. **停下来告诉 Arron**：现在需要他输密码，卡在哪一页。
3. 他登完 → 跑 `CHECK` 验证三库在线 + 身份正确。
4. 跑 `EXPORT` 覆盖 `workspace/legal-dbs-login.json`。

> 顺序技巧：**先登威科**（它是纯 CARSI，最干净），成功后留下天财 SSO 会话，**法宝和知网往往免密一跳即过**。反过来先登法宝容易踩它的 Keycloak 坑。

### B. 导出登录态备份

跑 `EXPORT` 片段，把 storageState 写进 `workspace/legal-dbs-login.json`。

⚠️ `workspace/` 已 gitignore，**该文件含天财账号会话凭证，不外传、不进 Issue**。

`Cookies` 文件本身被运行中的浏览器锁住，直接 cp 会失败 —— 用 `EXPORT` 走 `storageState()`，别去抄 profile 目录里的 sqlite。

### C. 身份诊断（法宝登成个人账号）

**症状**：右上显示手机号 `15081808629`，账号页标注"个人账号"，部分案例看不了。

**机制（2026-09-10 实测）**：
- 法宝的「退出登录」**只清应用层会话，不清 Keycloak 单点**（`cas.pkulaw.com/KEYCLOAK_REMEMBER_ME`，有效期长达一年）。结果就是退登后重走校园登录，天财 CAS 页**出现了却不索要密码**，直接顶回原账号 → 表现为"总是自动登个人号"。
- 要逼出真正的天财登录表单，必须**把 pkulaw 域下的 cookie 全清掉**再走。清法见 `references/run-code-snippets.md` 的 `PURGE_PKULAW`（只清法宝，不碰威科/知网）。

**结论与边界（重要）**：
- 即使完整走通 CARSI（`loginType=carsi`、天财 IdP + CARSI SAML cookie 齐备），法宝**仍会落到你手机号绑定的那个账号**上，UI 依旧标"个人账号"。
- 即：**法宝把 CARSI 的天财身份映射到了手机号账号。换号这条路走不通。**
- 想要真正的"学校号"，只能找**法宝客服**把机构身份与个人号拆开。本 Skill 不承诺能解决这一条。

### D. 从备份恢复

1. 跑 `RESTORE` 片段：读 `workspace/legal-dbs-login.json`，`addCookies` + 重放各 origin 的 localStorage。
2. 跑 `CHECK` 验证。
3. 若已过期（备份超过 ~7 天，天财 SSO 是 session 级）→ 走 A 重登。

## 四、硬约束

- **不碰账号密码**。天财账号密码永远由 Arron 亲输。我不索取、不代填、不记录。
- **不做破坏性清理**。清 cookie 必须**限定域**（`/pkulaw/` 或 `/wkinfo/` 等），**绝不整库清空** —— 否则会把另外两库一起打死。每次清完立即验证另两库 cookie 数量未变。
- **遇到验证码就停**。威科会弹**点击式安全验证**（"请依次点击【决,接,忽】"）。当前 Runtime 无视觉，**我解不了，也不尝试破解**。停下来告诉 Arron，他点完我再继续。
- **改登录态前先备份**。至少把现状导出到 `workspace/legal-dbs-backup-<日期>/`。法宝个人号本身不会丢（能重输密码找回），但会话丢了要重走一遍。
- **不把登录态内容打进对话**。诊断只看 cookie 的 **name / domain / expires**，**不读 value**。`loginType` 这类非凭证的小标志位可读（判断登录方式用），其余一律不取。

## 五、验证与交付

登录成功的判据（缺一不可）：

| 库 | 页面标志 | cookie 标志 |
|---|---|---|
| 威科先行 | 顶部显示 `tjufe_CarSi` | `law.wkinfo.com.cn` 域下有会话 |
| 北大法宝 | 右上显示账号（手机号或 `wx…` 用户名） | `.pkulaw.com/loginType` 有值 |
| 中国知网 | 顶部"天津财经大学图书馆"横幅 | `kns.cnki.net` 域下有会话 |

给 Arron 的交付话术：**说结论 + 说边界**。例如"三库都在线，法宝是 CARSI 身份；但平台把机构权益挂在你的手机号账号上，UI 仍标个人账号 —— 想要独立学校号得找客服"。**不要把"登录成功"说成"问题解决"。**

## 六、文件

```
SKILL.md
references/login-flows.md      # 三库逐步操作 + 状态标志 + CARSI 公共段
references/state-diagnosis.md  # cookie 机制、坑、故障排查、底座故障
references/run-code-snippets.md# CHECK / LOGIN_WK / LOGIN_PKULAW / PURGE_PKULAW / EXPORT / RESTORE 可直接粘贴
scripts/inspect-state.mjs      # 离线体检导出的登录态（域、cookie 数、过期时间）
```
