---
name: cnki-to-zotero
description: >-
  在知网（CNKI）检索中文文献，把题录 + PDF 全文导入本机 Zotero 的指定分类。
  当用户说「在知网找几篇 X 的论文」「帮我把论文存到 Zotero 的 Y 分类」「下载知网论文并整理进 Zotero」
  「检索某主题的 CSSCI / 北大核心论文并入库」「再存一篇」等时使用。
  也适用于只检索知网文献、或只查证 / 核对 Zotero 库内容的场景。
  不用于外文数据库与判例检索（那走研究检索三库流程），不用于生成 GB/T 7714 引用格式。
metadata:
  author: mino
  verified: 2026-09-10
---

# 知网 → Zotero 导入

把「在知网找论文、按条件筛、连 PDF 一起存进 Zotero 某个分类」这件事做成可复用的流程。

## 0. 先问清楚五件事（用户没说的才有默认值）

用户往往只说「帮我存几篇 X 的论文」。开始前把下面这份清单对齐——**这几项直接决定检索式和入库结果，猜错要返工**：

| 参数 | 说明 | 默认 |
|---|---|---|
| **主题 / 关键词** | 检索词。有多个角度时要问清是「都要」还是「只要某个」 | 必问 |
| **目标分类** | 存进 Zotero 哪个分类。**必须是已存在的分类**（见下方硬约束） | 必问；也可给分类名让我查 |
| **数量** | 存几篇 | 必问（用户说「测试」时给 1–2 篇） |
| **筛选条件** | 要不要限定 CSSCI / 北大核心 / 仅学术期刊 / 含学位论文 / 年份范围 | 学术期刊 + CSSCI/北大核心，避报纸与普通刊 |
| **要不要 PDF** | 全文附件 vs 只要题录 | 要 PDF |

存量提醒：**知网「劳务派遣」这一主题的 CSSCI 只有 ~515 篇**，加上作者重合，用户库里可能已有若干篇。导入前先查一遍目标分类，避免重复。

## 1. 前置检查（三项都过才动手）

```bash
# 1) Zotero 在跑 + 连接器可用
node .claude/skills/cnki-to-zotero/scripts/zotero-push.mjs ping
```
- 期望：`Zotero is running`，带 `X-Zotero-Version`。
- 不通 → 让用户打开 Zotero。

```
# 2) 浏览器（Playwright）能到知网，且带天财机构登录态
```
导航 `https://kns.cnki.net/kns8s/defaultresult/index?kw=测试&korder=SU`，看页面顶部是否出现「天津财经大学图书馆」。
- 没有 → 登录态过期，让用户重新走 CARSI（见 `memory/topics/legal-dbs-login` 相关记录）。

```bash
# 3) 目标分类存在 + 拿到它的 key/id
node .claude/skills/cnki-to-zotero/scripts/zotero-query.mjs collections
```

## 2. 硬约束（做不到的事，别承诺）

| 想做的事 | 能否 | 说明 |
|---|---|---|
| 建新分类 | ❌ | 连接器无此端点；本地 API 也只读。**必须用户先在 Zotero 里建好** |
| 改 / 删条目 | ❌ | 全无程序化入口。所以**抓错了只能请用户手动删** → 入库前自检是硬要求 |
| 让 Zotero 自己下知网 PDF | ❌ | 知网全文链接绑浏览器会话 + 查 referer。必须在带登录态的浏览器里取字节 |
| 指定已有分类 | ✅ | `updateSession`（注意是**整体替换**，不是追加） |
| 挂 PDF 附件 | ✅ | 走插件的 `saveAttachmentToZotero` |

**结论：流程必须是「先验证、再入库」。** 参见 `references/detail-and-push.md` 的校验段。

## 3. 主流程

1. **检索** → `references/cnki-search.md`
   切「学术期刊」→ 开「来源类别」facet → 勾 CSSCI/北大核心 → 按需改「被引」排序。
   把前 N 条（题名 / 作者 / 刊名 / 年期 / 被引 / href）拉成清单给用户过目或自行挑选。

2. **逐篇抓取 + 入库** → `references/detail-and-push.md`
   进详情页 → 提取元数据（**必须用规定选择器**）→ **校验** → service worker 里 saveItems + 挂 PDF + updateSession。
   一次性订单链接，拿到就要立刻用，不要缓存。

3. **验证** → `scripts/zotero-query.mjs in <分类>`
   确认条目数、标题、作者、附件都在。**没验证不算完成。**

4. **记录**
   检索式与结果记入当日 `memory/YYYY-MM-DD.md`（Arron 的检索双轨约定要求可追溯）。

## 4. 交付话术

- 报「哪几篇 + 出处 + 附件状态」即可，别复述检索过程。
- 有失败项要明说；有需要用户手动收尾的（删错条目）单独列出来并给出 key。
- 不要为了好看而隐去「这批里有一篇没拿到 PDF」这类事实。

## 参考

| 文件 | 内容 |
|---|---|
| `references/cnki-search.md` | 知网检索与筛选的 DOM 操作细节、URL 形式 |
| `references/detail-and-push.md` | 详情页选择器、校验规则、service worker 推送代码（可直接复制） |
| `references/zotero-protocol.md` | 连接器协议 / 本地 API / 全部已知坑 |
| `scripts/zotero-query.mjs` | 只读查库验证 |
| `scripts/zotero-push.mjs` | 备用 Node 版（PDF 落盘中转，仅在 SW 方案不可用时用） |

同源经验在 `memory/topics/zotero-cnki-import.md`。
