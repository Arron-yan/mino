# 知网检索与筛选

全部用 Playwright MCP 的 `browser_*` 工具或在页面里 `evaluate`。知网是 SPA，操作后要等 AJAX —— 用 `browser_wait_for` 等 2.5 秒左右再取结果。

## 入口

直接走 URL 最省事（`korder=SU` = 主题检索）：

```
https://kns.cnki.net/kns8s/defaultresult/index?kw=<URL编码的关键词>&korder=SU&crossids=
```

想换关键词重新检索时重新导航这个 URL 即可。

## 切「学术期刊」标签

页面上那些「学术期刊 7191」的标签有两套，别点错——**带 `target="_blank"` 的那个是跳"出版来源"页，不是筛选**。真正的筛选器：

```js
document.querySelector('a[name="classify"][classid="YSTT4HG0"]').click()   // 学术期刊
```

其他 classid（按需）：`YSTT4HG0` 学术期刊。学位论文等可先切总库再找 `name="classify"` 的元素读 `classid`。

## 限定 CSSCI / 北大核心

「来源类别」默认是折叠的，要先展开再点：

```js
// 1) 展开「来源类别」（groupid=LYBSM）
document.querySelector('dt.tit[groupid="LYBSM"]').click();
// 2) 点 CSSCI（也可以点 北大核心）
[...document.querySelectorAll('a')].find(a => a.innerText.trim() === 'CSSCI' && a.getAttribute('href') === 'javascript:void(0)').click();
```

点完等 AJAX，再读总数确认生效：

```js
(document.body.innerText.match(/共找到\s*[\d,]+\s*条结果/) || [])[0]
```

> 实测基线（2026-09-10）：`劳务派遣` 主题 → 总库 13,129；学术期刊 7,191；再限 CSSCI → **515**。

## 改排序

默认「相关度」——**它的前 20 条多是报纸和普通刊，直接抓会拿到一堆《××日报》《中国税务报》**，正是要避开的东西。改成按被引拿经典文献：

```js
document.querySelector('li#CF[data-sort="CF"]').click();   // 被引
```
（`li#CF` 的 title 提示"只在800万条记录以内有效"。时间排序是别的 id，按需在排序栏读。）

## 取结果清单

```js
[...document.querySelectorAll('.result-table-list tbody tr')].map((tr, i) => {
  const a = tr.querySelector('td.name a');
  const tds = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
  return { i: i + 1, title: a ? a.innerText.trim() : '', tds: tds.slice(1, 7), href: a ? a.getAttribute('href') : null };
});
```
`tds` 大致是 `[题名, 作者, 刊名, 发表日期, 被引, 下载]`。

翻页/换页时 `href` 里的 `v=` 参数是随会话变的，**不要缓存旧 href 跨会话复用**——每次现取。

## 交付给用户

把候选清单（题名 / 作者 / 刊名 / 年期 / 被引 / 链接）列出来让用户挑，**不要自己替他决定选题方向**——Arron 明确要求保持思维独立性，只提供材料不替他下结论。

## 一个坑

知网详情页里有**多个隐藏的登录浮层 `<h1>`（内容"自动登录"）**。检索结果页没有这问题，但 `/kcms2/article/abstract` 详情页有 —— 详见 `detail-and-push.md` 的选择器表。
