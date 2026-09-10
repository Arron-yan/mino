# 登录态机制、坑与故障排查

## 一、身份存在哪里（2026-09-10 实测结论）

排查"为什么又登成这个号"时，按这个顺序找，**别瞎猜**：

| 位置 | 本次实测 | 说明 |
|---|---|---|
| **cookie** | ✅ **身份就在这里** | 真正接管登录态的地方 |
| localStorage | ❌ 只有统计键 | 法宝页面有 `#access_token` 隐藏域，一度怀疑 token 在此 —— **实测 localStorage 只有 `Hm_lvt_*` / `isLoginClick` 等统计项，不是身份来源** |
| IndexedDB | 未排查 | 本次未涉及；若 cookie 全清仍自动登录，下一个该查这里 |
| 服务端 | — | 会话恢复由服务端 + cookie 共同决定 |

**推论**：只要 cookie 在，访问页面就会自动登录，**法宝根本不弹登录框** —— 这就是"校园登录没机会跑"的根因。

## 二、法宝的 Keycloak 坑（核心）

法宝用 Keycloak 做单点（`cas.pkulaw.com`）。它的会话生命周期**长于**应用层：

```
cas.pkulaw.com  KEYCLOAK_REMEMBER_ME   → 本次实测有效期到 2027-09-10（约一年）
cas.pkulaw.com  KEYCLOAK_SESSION       → 较短
.pkulaw.com     loginType / preferred_username / SUB / session_state
```

**关键行为**：点页面上的「退出登录」**只清应用层会话，不动 Keycloak 单点**。

后果链条：
1. 退登 → 右上变回"登录/注册"（看起来成功）
2. 重走校园登录 → Keycloak 发现还有单点会话 → **天财 CAS 页出现但不索要密码**
3. 直接落回原账号 → 表现为"**法宝总是自动登我个人号**"

**正确解法**：退登**不够**，必须按域清 cookie：

```
PURGE_PKULAW → 清掉所有 /pkulaw/i 域的 cookie → 再走校园登录
```

清完**立即验证**：`pkulaw 域 cookie 数 == 0` 且 **另外两库（wkinfo / cnki）cookie 数未变**。

## 三、身份映射问题（换号换不掉）

**已确认（2026-09-10）**：即使完整走通 CARSI（`loginType=carsi`、天财 IdP + CARSI SAML cookie 齐备），法宝**仍落到手机号绑定的那个账号**，UI 依旧标「个人账号」。

→ **法宝把 CARSI 的天财身份映射到了手机号账号上。自己换号换不掉，需要法宝客服拆分机构身份与个人号。**

**不要再花时间重复尝试换号** —— 除非 Arron 说客服处理过了。

**给 Arron 的解释要准确**：不要说"登录成功所以问题解决了"。正确说法是：
> 三库都在线，法宝这次是 CARSI 身份（`loginType=carsi`）；但平台把机构权益挂在你的手机号账号上，UI 仍显示"个人账号"。想要独立学校号得找客服。

**待补的验证**：法宝「我的权限」页（`/cooperative/usercenter/person-property`）能显示订阅范围 —— 但该页 SPA 内容**经常渲染不出来**（只剩页脚）。若要看权限，请 **Arron 自己开浏览器点**，比脚本抓可靠。

## 四、登录态文件与时效

- 文件：`workspace/legal-dbs-login.json`（Playwright storageState 格式：`{cookies, origins}`）
- `workspace/` 已 gitignore，**内含天财账号会话凭证 —— 不外传、不进 Issue、不粘进对话**
- **时效约 7 天**；其中天财 SSO（`sso.tjufe.edu.cn/SESSION` 等）是 **session 级**，浏览器进程关掉即失效，学校 IdP 服务端也会在几小时~几天过期
- 到期表现：某个库突然跳登录页，或页面上机构标识消失

**备份**：改动登录态前把现状导出到 `workspace/legal-dbs-backup-<日期>/`。
**注意**：直接 `cp` profile 目录里的 `Default/Network/Cookies` 会因浏览器占用报 `Device or resource busy` —— **别硬取**，用 `EXPORT` 片段的 `storageState()`；实在要文件级备份就先关浏览器。

## 五、底座故障（playwright-direct MCP）

检索与登录都走 `playwright-direct`。**内置 `playwright` MCP 因 MyAgents 自带 npm 损坏，不可用**（`minipass-flush` 依赖冲突，`npx` 一跑即崩）。

**脆弱点**：`playwright-direct` 的配置指向 **npx 缓存路径** + `--user-data-dir=C:\Users\ARRON\.playwright-mcp-profile2`。

- **清 npm 缓存 / 换 Node 版本 → 立刻失效**，需重装 `@playwright/mcp` 并改配置路径
- **改 MCP 配置后必须完全重启 MyAgents + 新建会话**才生效（MCP 工具在会话创建时绑定）
- 遇到上面这两类问题 → **不自行修，先报 Arron**（涉及应用级配置）

## 六、无视觉限制

当前 Runtime **没有视觉能力** —— `Read` 任何截图返回 `[Unsupported Image]`。

影响：
- **点击式验证码解不了**（威科会弹）→ 停手交 Arron
- 页面验证一律靠**读 DOM 文本**（`document.body.innerText`）与 **cookie 元数据**（name/domain/expires）
- 不要尝试截图"看一眼" —— 看不到

## 七、排查清单（照着走）

```
1. 三库各自在线吗？            → CHECK 片段
2. 天财 SSO cookie 在不在？     → 判断是免密一跳还是要 Arron 输密码
3. 某个库"没要密码就登进去了"？  → CARSI 没真生效，先 PURGE 该库 cookie 再走
4. 法宝登成个人号？             → 见第三节；换号换不掉，别重复尝试
5. cookie 都在但还是未登录？    → 查 IndexedDB / 看是不是 profile 换了
6. MCP 工具报错 / 不存在？      → 底座故障，见第五节，报 Arron
```
