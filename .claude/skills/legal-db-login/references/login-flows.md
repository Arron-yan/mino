# 三库登录逐步操作

> 标注 **[实测]** = 2026-09-10 实际操作验证过；**[记录]** = 来自 `memory/topics/legal-research-infra.md` 的 09-08 记录，未在 09-10 复查。

---

## 公共段：天财 CARSI

三库的校园登录最终都汇到同一个地方：

```
各库登录入口 → ds.carsi.edu.cn（CARSI 学校发现页）
             → 选「天津财经大学」→ IdP: https://idp.tjufe.edu.cn/idp/shibboleth
             → sso.tjufe.edu.cn CAS 登录页  ← 这里需要 Arron 输账号密码
             → 回各库
```

**判断 CARSI 是否真的走完**：看 profile 里有没有这几组 cookie ——

- `idp.tjufe.edu.cn/__Host-shib_idp_session`、`idp.tjufe.edu.cn/JSESSIONID`
- `sso.tjufe.edu.cn/SOURCEID_TGC`、`sso.tjufe.edu.cn/SESSION`
- 各库 SP 侧：`sp-pkulaw.carsi.edu.cn/_shibsession_*`

**全都有 → CARSI 走通了。一个都没有 → 只是点开了页面，没真登录。**

⚠️ **踩过的坑**：如果某库已有单点会话（法宝的 Keycloak 尤其），CARSI 流程会"走个过场"——天财 CAS 页一闪而过、**不索要密码**，然后落回旧账号。**看到"没要密码就登进去了"，就说明 CARSI 没真正生效**，要先把该库的 cookie 清干净（见 `run-code-snippets.md` 的 `PURGE_*`）。

---

## 一、威科先行（law.wkinfo.com.cn）

**登录入口**：**[记录]** 顶部 CARSI 入口，走 sso.tjufe.edu.cn 单点。
**[实测更正 2026-09-10]** 用干净上下文复查，**未登录时导航栏只有"登录 申请试用 帮助 产品菜单 手机版 新版 EN"，看不到 CARSI 入口**。CARSI 应在点击「登录」后弹出的 `.login-modal` 里（该弹窗内容异步渲染，本次未走通验证）。

→ **结论：威科这条步骤不完全确定。实际操作时以"点登录 → 找弹窗里的 CARSI/机构登录 选项"为准，并顺手把真实路径补回本文件。**

**登录后标志**：顶部显示 `tjufe_CarSi` **[实测]**

**检索入口**：`https://law.wkinfo.com.cn/judgment-documents/list?simple=<URL编码关键词>` **[实测可用]**；空格 = AND。

**注意**：
- 站点已升级为"威科先行AI+"，首页落地 `/ai/ai-search-home`。经典判例列表直链仍可用。
- 首次直连检索 URL 可能弹**点击式安全验证** → **停手交给 Arron**。
- 结果卡片容器 `b-list-item-judgment-documents`；详情链接 `a[href*="/detail"]`；案例评析走 `case-analysis/detail/<ID>`。

---

## 二、北大法宝（pkulaw.com）

**[实测] 完整路径**：

1. 开 `https://www.pkulaw.com/login` → 自动跳到 Keycloak：
   `cas.pkulaw.com/auth/realms/fabao/protocol/openid-connect/auth?...`
2. 页面出现登录方式：扫码 / 验证码 / 密码 / 邮箱 + **「更多登录方式」→「校园登录」**
3. 点 **`校园登录`**（精确匹配文本的 span）→ 跳 `ds.carsi.edu.cn/login/index.html?entityID=…sp-pkulaw.carsi.edu.cn…`
4. 在 CARSI 发现页填 **`#show`** = `天津财经大学`
   等待下拉出现后：**键盘 `ArrowDown` → `Enter`**
   （⚠️ 直接 `element.click()` 点 `a.dropdown-item` **不生效**，必须走键盘或真实点击）
5. **验证** `#hid-inp` 的值 == `https://idp.tjufe.edu.cn/idp/shibboleth` ← 不对就重选
6. 点 **`#idpSkipButton`**（`.btn1`）提交
   （⚠️ 会触发导航，`page.evaluate` 抛 `Execution context was destroyed` 是**正常现象**，不是错误）
7. 落到 `sso.tjufe.edu.cn/public/cas-login-new/`（页面含 "版权所有 ©天津财经大学"）
   → **停手，交 Arron 输账号密码**
8. 登完自动回 `https://www.pkulaw.com/`

**登录后标志**：右上显示账号 **[实测]**
- 手机号账号 → 显示 `15081808629`（**这通常是个人号**）
- CARSI 账号 → `LoginAccount` cookie 形如 `wx20250318165626749600`

**身份诊断**（判断这次是哪种登录）：
```
.pkulaw.com/loginType          → "carsi" = 走的是学校通道
.pkulaw.com/preferred_username → 手机号 = 个人号；wx… = 另一个账号
```

**检索入口**：`https://www.pkulaw.com/case?way=topGuid`，输入框 `#txtSearch`，回车执行。
- 空格 = AND
- **只有 `案由:` 前缀有效**（`案由:劳务派遣合同纠纷`）；`标题:` / `全文:` **无效**，会静默回落默认全库列表（别误读成"命中 1.7 亿"）
- **案号检索最准**：`(2026)苏05民终10463号` → 精确 1 篇。**交叉验证一律走案号，别走关键词**
- 详情页 URL：`https://www.pkulaw.com/pfnl/<id>.html`

⚠️ 搜索框是 SPA，`location.href` 不变，靠页面文本读结果数（`共 N 篇`）。

---

## 三、中国知网（kns.cnki.net）

**[记录] 路径**：右上「机构登录」→ 面板点 **「校外访问 >」** → 新标签 `fsso.cnki.net` → 机构搜索框填「天津财经大学」→ 选 href 带 **`entityID=idp.tjufe.edu.cn`** 的建议项。

**登录后标志**：顶部显示「天津财经大学图书馆」横幅。

**⚠️ 注意**：知网有独立的会话粘性 —— 若已存在旧会话，也可能不索要密码。判据同上：看有没有 `idp.tjufe.edu.cn` 的 cookie。

**检索细节**（切库、筛选、抽取）不在这里，见 `.claude/skills/cnki-to-zotero/references/cnki-search.md`。
