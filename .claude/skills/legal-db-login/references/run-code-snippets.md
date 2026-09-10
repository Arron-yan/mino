# 可直接粘贴的 browser_run_code 片段

全部通过 `playwright-direct` MCP 的 **`browser_run_code`** 执行（参数名 `code`，内容是一个 `async (page) => {…}`）。

**两条硬性写法约束（踩过）**：
1. **DOM 操作必须包在 `page.evaluate()` 里** —— 在 Node 作用域直接写 `document` 会 `ReferenceError: document is not defined`。
2. **run_code 里没有 `require` / `fs`** —— 不能自己写文件。要落盘的数据必须**作为返回值吐出来**，由 Agent 用 Write 工具写。

---

## CHECK — 三库登录态体检

```js
async (page) => {
  const ctx = page.context();
  const all = await ctx.cookies();
  const has = (re) => all.filter(c => re.test(c.domain));
  const out = {};

  // 天财 SSO / CARSI 公共段
  out.carsi = {
    tjufeIdp: has(/idp\.tjufe/i).map(c => c.name),
    tjufeSso: has(/sso\.tjufe/i).map(c => c.name),
    carsipkulawShib: has(/sp-pkulaw\.carsi/i).map(c => c.name).length
  };

  // 各库 cookie 数
  out.counts = {
    wkinfo: has(/wkinfo/i).length,
    pkulaw: has(/pkulaw/i).length,
    cnki: has(/cnki/i).length
  };

  // 法宝身份（只看非凭证小标志位）
  const pick = (d, n) => (all.find(c => c.domain === d && c.name === n) || {}).value;
  out.pkulawIdentity = {
    loginType: pick('.pkulaw.com', 'loginType'),          // "carsi" = 学校通道
    preferredUsername: pick('.pkulaw.com', 'preferred_username'),
    loginAccount: pick('www.pkulaw.com', 'LoginAccount')
  };

  // 逐库访问页面读机构标识
  const probe = async (url, re) => {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(7000);
      return await page.evaluate((src) => {
        const t = document.body.innerText.replace(/\s+/g, ' ');
        return { marker: (t.match(new RegExp(src)) || [])[0] || null,
                 hasLoginBtn: /登录\/注册|^登录/.test(t.slice(0, 260)),
                 title: document.title };
      }, re);
    } catch (e) { return { err: String(e).slice(0, 80) }; }
  };
  out.wkinfo = await probe('https://law.wkinfo.com.cn/', 'tjufe_CarSi|申请试用');
  out.pk = await probe('https://www.pkulaw.com/', '15081808629|wx\\d{10,}|登录/注册');
  out.cnki = await probe('https://kns.cnki.net/', '天津财经大学图书馆');

  return JSON.stringify(out, null, 1);
}
```

**读法**：`marker` 命中机构标识 = 已登录；`hasLoginBtn: true` = 未登录。

---

## PURGE_DOMAIN — 按域清 cookie（**限定域，绝不清全库**）

```js
async (page) => {
  const ctx = page.context();
  const RE = /pkulaw/i;                    // ← 改这里：/wkinfo/i 或 /cnki/i
  const before = await ctx.cookies();
  const target = before.filter(c => RE.test(c.domain));
  const other = { wkinfo: before.filter(c => /wkinfo/i.test(c.domain)).length,
                  pkulaw: before.filter(c => /pkulaw/i.test(c.domain)).length,
                  cnki:   before.filter(c => /cnki/i.test(c.domain)).length };
  const errs = [];
  for (const c of target) {
    try { await ctx.clearCookies({ domain: c.domain, name: c.name }); }
    catch (e) { errs.push(c.domain + '/' + c.name); }
  }
  const after = await ctx.cookies();
  return JSON.stringify({
    cleared: target.length, errs,
    afterTarget: after.filter(c => RE.test(c.domain)).length,   // 应为 0
    afterCounts: { wkinfo: after.filter(c => /wkinfo/i.test(c.domain)).length,
                   pkulaw: after.filter(c => /pkulaw/i.test(c.domain)).length,
                   cnki:   after.filter(c => /cnki/i.test(c.domain)).length },
    beforeCounts: other
  }, null, 1);
}
```

**必查**：`afterTarget == 0`，且**另外两库的 after 数 == before 数**（说明没误伤）。不等就停手报告。

`PURGE_PKULAW` = 上面把 `RE` 换成 `/pkulaw/i`。

---

## LOGIN_PKULAW — 驱动到天财 CAS 登录表单

**只负责开到表单前，然后停手交 Arron。**

```js
async (page) => {
  const log = [];
  await page.goto('https://www.pkulaw.com/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  log.push({ step: 'keycloak', url: page.url().slice(0, 90) });

  // 1. 校园登录
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('a,span,div,button,p'))
      .filter(e => /^校园登录$/.test((e.textContent || '').trim()) && e.children.length === 0);
    if (el[0]) el[0].click();
  });
  await page.waitForTimeout(8000);
  log.push({ step: 'carsi', url: page.url().slice(0, 90) });

  // 2. 选天津财经大学（必须走键盘，直接 .click() 下拉项无效）
  await page.fill('#show', '天津财经大学');
  await page.waitForTimeout(2500);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const hid = await page.evaluate(() => (document.querySelector('#hid-inp') || {}).value);
  log.push({ step: 'entityID', hid, ok: hid === 'https://idp.tjufe.edu.cn/idp/shibboleth' });
  if (hid !== 'https://idp.tjufe.edu.cn/idp/shibboleth') return JSON.stringify({ log, STOP: 'entityID 选择失败，重试' }, null, 1);

  // 3. 提交（会触发导航，evaluate 抛 "Execution context was destroyed" 属正常）
  try {
    await page.click('#idpSkipButton');
  } catch (e) { log.push({ step: 'submit', note: String(e).slice(0, 60) }); }
  await page.waitForTimeout(12000);

  const state = await page.evaluate(() => {
    const t = document.body.innerText.replace(/\s+/g, ' ').trim();
    return { url: location.href, title: document.title,
             needsPassword: /密码|登录|用户名|学号/.test(t.slice(0, 500)),
             excerpt: t.slice(0, 300) };
  });
  return JSON.stringify({ log, state, ACTION: '若 needsPassword=true → 交给 Arron 输天财账号密码' }, null, 1);
}
```

**判据**：`state.url` 含 `sso.tjufe.edu.cn` 且 `needsPassword: true` → **交 Arron**。
若直接落回 `www.pkulaw.com` → CARSI 没真生效，先 `PURGE_PKULAW` 再来。

---

## LOGIN_WKINFO — 威科

⚠️ **本路径尚未完全实测**（见 `login-flows.md` 一节的说明）。骨架如下，**第一次实跑时请把真实路径补回 `login-flows.md`**：

```js
async (page) => {
  await page.goto('https://law.wkinfo.com.cn/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  // 点右上「登录」打开弹窗
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button,a,span,div'))
      .filter(e => /^登录$/.test((e.textContent || '').trim()) && e.children.length === 0);
    if (el[0]) el[0].click();
  });
  await page.waitForTimeout(9000);
  // 在弹窗里找 CARSI / 机构登录 入口（选择器待实测确认）
  const opts = await page.evaluate(() => {
    const m = document.querySelector('.login-modal');
    const t = m ? (m.innerText || '').replace(/\s+/g, ' ').trim() : '';
    const links = m ? Array.from(m.querySelectorAll('a,button,span,div'))
      .filter(e => /CARSI|校园|机构/.test((e.textContent || '').trim()) && e.children.length === 0)
      .map(e => ({ tag: e.tagName, txt: (e.textContent || '').trim().slice(0, 24),
                   cls: (e.className || '').toString().slice(0, 45),
                   href: (e.getAttribute && e.getAttribute('href')) || '' })) : [];
    return { modalFound: !!m, modalText: t.slice(0, 300), links };
  });
  return JSON.stringify(opts, null, 1);
}
```

**若出现点击式安全验证 → 立即停手，交 Arron。**

---

## EXPORT — 导出登录态

**用 `storageState({ path })`，Playwright 自己会写盘** —— run_code 里没有 `fs`，但不需要（这条路 2026-09-10 实测可用）：

```js
async (page) => {
  const p = 'C:\\Users\\ARRON\\.myagents\\projects\\mino\\workspace\\legal-dbs-login.json';
  await page.context().storageState({ path: p });
  const s = await page.context().storageState();
  return JSON.stringify({ written: p, cookies: s.cookies.length, origins: s.origins.length });
}
```

**Agent 侧收尾**：
1. **先备份旧的**：把现有 `legal-dbs-login.json` 拷到 `workspace/legal-dbs-backup-<日期>/legal-dbs-login.<旧日期>.json`
2. 再跑上面的 EXPORT 覆盖
3. 跑 `scripts/inspect-state.mjs` 确认三个库都在
4. 提醒：**该文件含会话凭证，不外传**

⚠️ **导出前务必先跑 CHECK**。若某库已经掉线，导出下来的就是"缺一个库"的残缺备份 —— 会让人以后误以为有得恢复。**最好在刚登录成功后立刻导出。**

---

## RESTORE — 从备份恢复

Agent 先 Read `workspace/legal-dbs-login.json`，把内容内联进下面的 `STATE`：

```js
async (page) => {
  const STATE = /* ← 把 legal-dbs-login.json 的内容整体粘进来 */;
  const ctx = page.context();
  await ctx.addCookies(STATE.cookies);
  for (const o of (STATE.origins || [])) {
    const origin = o.origin.replace(/\/$/, '');
    await page.goto(origin, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.evaluate((items) => {
      for (const it of items) { try { localStorage.setItem(it.name, it.value); } catch (e) {} }
    }, o.localStorage || []);
  }
  const now = await ctx.cookies();
  return JSON.stringify({
    restoredCookies: STATE.cookies.length,
    wkinfo: now.filter(c => /wkinfo/i.test(c.domain)).length,
    pkulaw: now.filter(c => /pkulaw/i.test(c.domain)).length,
    cnki: now.filter(c => /cnki/i.test(c.domain)).length,
    NOTE: '接着跑 CHECK 验证三库是否在线'
  }, null, 1);
}
```

⚠️ **恢复不保证成功**：session 级 cookie（天财 SSO、法宝 Keycloak）恢复后往往仍失效。**恢复完必须跑 CHECK 逐库确认**，别假定恢复了就是好了。

---

## 会话脆弱度（2026-09-10 实测）

浏览器进程回收后，**session 级 cookie 全丢**，三库表现不同：

| 库 | 抗掉线 | 原因 |
|---|---|---|
| 威科先行 | 🟢 好 | 会话 cookie 多为持久型（有 expiry） |
| 中国知网 | 🟢 好 | 同上 |
| **北大法宝** | 🔴 **差** | 依赖 Keycloak session cookie，**进程一回收就掉线** |

**实操含义**：**法宝掉线的概率明显高于另外两库**。检索前跑 CHECK，若只有法宝掉线，直接走 A. 重登的 LOGIN_PKULAW 即可，不用重登三库。

