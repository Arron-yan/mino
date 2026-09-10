# 知网 → Zotero 导入

**建立** 2026-09-10。**流程已固化成 Skill：`.claude/skills/cnki-to-zotero/`** —— 那是权威载体（步骤、选择器、协议、脚本都在里面）。本文件只保留工作区级的环境事实与状态，不重复流程细节。

## 环境事实

| 项 | 值 |
|---|---|
| Zotero 程序 | `D:\zotero\zotero.exe`（9.0.6） |
| **真实数据目录** | **`D:\Dictionary`**（`C:\Users\ARRON\Zotero` 是 2025-12 的旧库，别用） |
| 判定 dataDir | Zotero profile 的 `prefs.js` 里 `extensions.zotero.useDataDir` + `dataDir` |
| 连接器服务 | `http://127.0.0.1:23119`（Zotero 运行时才有），浏览器插件用的就是它 |
| 本地 REST API | 同上端口 `/api/users/0/*`，Arron 2026-09-10 已开。**只读** |
| Connector 扩展 | 5.0.212，装在自动化浏览器里，Arron 为这个用途装的 |

## 能力边界（一句话）

**能建条目、能挂附件、能放进已有分类；不能建分类、不能改、不能删。** 所以流程必须是「先校验、再入库」，抓错了只能请 Arron 手动删。

## Zotero 分类 key / id

| 分类 | key | id |
|---|---|---|
| 劳务派遣 | `2W93PXB4` | 15 |

（其余用 `node .claude/skills/cnki-to-zotero/scripts/zotero-query.mjs collections` 查）

## 已入库

「劳务派遣」下 4 篇（均带 PDF，2026-09-10）：

| 论文 | 作者 | 出处 |
|---|---|---|
| 劳动派遣关系中的雇主替代责任研究 | 曹艳春 | 法律科学·西北政法学院学报 2006(03): 116-121 |
| 我国劳务派遣的法律规制分析 | 林嘉; 范围 | 中国人民大学学报 2011, 25(06): 71-80 |
| 劳务派遣的法学思考 | 董保华 | 2005 |
| 试论劳务派遣中的同工同酬——兼评2012年《劳动合同法修正案》 | 王全兴; 杨浩楠 | 苏州大学学报(哲社版) 2013, 34(03): 61-69 |

## 约定

- **Arron 定：存论文时他直接指定目标分类，不让 Agent 新建。** 分类必须先在 Zotero 里建好。
- 检索结果记入当日 daily，供追溯（检索双轨约定要求）。

## 相关

- [[cross-border-employment-thesis]] — 本链路服务的选题
- Skill：`.claude/skills/cnki-to-zotero/`（SKILL.md + references/ + scripts/）
