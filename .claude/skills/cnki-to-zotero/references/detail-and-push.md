# 详情页提取 + 入库（可直接复制的代码）

一次 `browser_run_code` 里串完：**页面 context 提元数据 → service worker 入库**。不要分两次调用——PDF 下载链接是一次性订单链接，拿到就得用。

## 详情页选择器（每个都踩过坑，别改）

| 字段 | 选择器 | 坑 |
|---|---|---|
| 标题 | **`.wx-tit h1`** | 页面里有多个**隐藏的登录浮层 `h1`**（文本"自动登录"）。裸 `querySelector('h1')` 会命中它们 → 入库标题变成"自动登录" |
| 作者 | **`#authorpart a`** | `#author` 那个 `li` 是"作者发文检索"入口，**不是作者区**。作者名里的 `<sup>` 是机构编号，要剥掉，否则变成"林嘉1" |
| 刊名/年/卷/期/页 | `.top-tip` | 形如 `中国人民大学学报 . 2011 ,25 (06) : 71-80 查看该刊数据库收录来源`，正则拆 |
| 摘要/关键词/DOI | 正文正则 | `摘要：… 关键词：… DOI：…`。老文章可能没有 DOI |
| PDF | `a` 中 innerText === `PDF下载` 的 `href` | **一次性订单链接**，解码后形如 `bar.cnki.net/bar/download/order?id=…` |

## 提取 + 校验 + 推送（整段复制）

把 `<详情页URL>`、`target`、以及（可选）追加字段替换掉即可。

```js
async (page) => {
  const detail = '<详情页URL>';
  const TARGET = 'C15';            // ← 目标分类 id，先用 zotero-query.mjs collections 查
  await page.goto(detail, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // ---------- 1) 提元数据 ----------
  const info = await page.evaluate(() => {
    const body = document.body.innerText.replace(/\s+/g, ' ');
    const pdfA = [...document.querySelectorAll('a')].find(x => (x.innerText || '').trim() === 'PDF下载');
    const src = document.querySelector('.top-tip');
    const srcTxt = src ? src.innerText.replace(/\s+/g, ' ').trim() : '';
    const ym = srcTxt.match(/(\d{4})\s*[,，]?\s*(\d+)?\s*\((\d+[-\d]*)\)/);
    const pg = srcTxt.match(/:\s*([\d\-+]+)/);
    const t1 = document.querySelector('.wx-tit h1');
    const authors = [...document.querySelectorAll('#authorpart a')].map(a => {
      const c = a.cloneNode(true);
      c.querySelectorAll('sup').forEach(s => s.remove());   // 剥机构编号
      return c.textContent.trim();
    }).filter(Boolean);
    return {
      title: t1 ? t1.innerText.replace(/\s+/g, ' ').trim() : '',
      authors,
      journal: (srcTxt.split('.')[0] || '').trim(),
      year: ym ? ym[1] : '', volume: ym && ym[2] ? ym[2] : '', issue: ym ? ym[3] : '',
      pages: pg ? pg[1] : '',
      doi: (body.match(/DOI：\s*([^\s]+)/) || [])[1] || '',
      abstract: (body.match(/摘要：\s*([\s\S]{0,900}?)\s*(关键词|DOI|专辑|专题|分类号)/) || [])[1] || '',
      pdfUrl: pdfA ? pdfA.href : null,
    };
  });

  // ---------- 2) 入库前自检（抓错无法补救，必须挡住） ----------
  const problems = [];
  if (!info.title || info.title === '自动登录' || info.title.length < 4) problems.push('标题可疑: ' + JSON.stringify(info.title));
  if (!info.authors.length) problems.push('无作者');
  if (info.authors.some(a => /检索|发文/.test(a) || /\d/.test(a))) problems.push('作者可疑: ' + info.authors.join(','));
  if (!info.journal) problems.push('无刊名');
  if (!info.pages) problems.push('无页码');
  if (!info.pdfUrl) problems.push('无 PDF 链接');
  if (problems.length) return { aborted: true, problems, info };   // ← 不入库，回来修选择器

  const sw = page.context().serviceWorkers().find(s => s.url().includes('background-worker.js'));
  if (!sw) return { aborted: true, problems: ['未找到 Zotero Connector 的 service worker（插件没装或没启用）'], info };

  // ---------- 3) service worker 里入库（不落盘） ----------
  const job = {
    target: TARGET,
    uri: 'https://kns.cnki.net/',
    pageOrigin: 'https://kns.cnki.net',
    items: [{
      meta: {
        itemType: 'journalArticle',
        title: info.title,
        creators: info.authors.map(a => ({ creatorType: 'author', name: a })),   // 中文名单字段 name，不要拆 firstName/lastName
        publicationTitle: info.journal,
        volume: info.volume, issue: info.issue, pages: info.pages, date: info.year,
        DOI: info.doi, abstractNote: info.abstract,
        language: 'zh-CN', libraryCatalog: 'CNKI', url: detail,
      },
      pdfUrl: info.pdfUrl,
    }],
  };

  const res = await sw.evaluate(async (job) => {
    const A = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = (n) => { let s = ''; for (let i = 0; i < n; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
    const sessionID = rand(12);
    const items = job.items.map(it => Object.assign({}, it.meta, { id: rand(8) }));  // 客户端 id：附件靠它认父
    const log = [];

    // 知网标签页：取 cookie 与风控兜底都靠它
    let tab = null;
    try { const tabs = await chrome.tabs.query({ url: '*://kns.cnki.net/*' }); tab = tabs[0] || null; } catch (e) {}
    log.push('tab=' + (tab ? tab.id : 'none'));

    try { await Zotero.Connector.callMethod('saveItems', { items, uri: job.uri, sessionID }); log.push('saveItems ok'); }
    catch (e) { return { err: 'saveItems: ' + (e.message || e), status: e.status }; }

    for (let i = 0; i < job.items.length; i++) {
      const it = job.items[i];
      if (!it.pdfUrl) continue;
      // 必须用插件的 saveAttachmentToZotero：它带 Cookie 头 + referrer（知网查 referer）。
      // 自己写裸 fetch(pdfUrl) 会拿回 5786 字节的 HTML 错误页（"来源应用不正确"）。
      const att = { id: rand(8), url: it.pdfUrl, mimeType: 'application/pdf',
                    parentItem: items[i].id, title: 'Full Text PDF', referrer: job.pageOrigin };
      try { await Zotero.ItemSaver.saveAttachmentToZotero(att, sessionID, tab); log.push('attach[' + i + '] ok'); }
      catch (e) { log.push('attach[' + i + '] FAIL ' + (e.message || e)); }
    }

    // 必须在 saveItems 之后、用同一 sessionID。target 只认已存在分类 id。
    if (job.target) {
      try { await Zotero.Connector.callMethod('updateSession', { sessionID, target: job.target, tags: [], note: '' }); log.push('target -> ' + job.target); }
      catch (e) { log.push('updateSession FAIL ' + (e.message || e)); }
    }
    return { sessionID, log };
  }, job);

  return { extracted: { title: info.title, authors: info.authors, journal: info.journal, date: info.year,
                        vol: info.volume, issue: info.issue, pages: info.pages, doi: info.doi }, res };
}
```

## 批量

`job.items` 是数组，一次塞多篇即可（各篇要各自先去详情页取元数据；PDF 链接是一次性的，建议**每篇一次 goto + 提取，攒成 job 后一次推送**，但链接有效期未知，稳妥做法是逐篇「提取→推送」）。

## 验证（必做）

```bash
node .claude/skills/cnki-to-zotero/scripts/zotero-query.mjs in <分类id>
```
或直接查本地 API：

```bash
curl -s -H "Zotero-API-Version: 3" "http://127.0.0.1:23119/api/users/0/collections/<分类key>/items/top?limit=50"
```

**要点：标题、作者、附件三项都要核。** 只看"条目数 +1"不够——标题存成"自动登录"那种错，数量是对的。
