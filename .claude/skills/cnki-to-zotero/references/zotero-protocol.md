# Zotero 接口协议与全部已知坑

来源：读 Zotero Connector 5.0.212 源码 + 解包 Zotero 9.0.6 的 `omni.ja`（`xpcom/server/server_connector.js`、`saveSession.js`、`server_localAPI.js`）。

## 环境事实

| 项 | 值 |
|---|---|
| Zotero 程序 | `D:\zotero\zotero.exe`（9.0.6） |
| **真实数据目录** | **`D:\Dictionary`**（`C:\Users\ARRON\Zotero` 是 2025-12 的旧库，别用） |
| 怎么确认 dataDir | Zotero profile 的 `prefs.js` 里 `extensions.zotero.useDataDir=true` + `extensions.zotero.dataDir` |
| 连接器服务 | `http://127.0.0.1:23119`，**仅 Zotero 运行时可用** |
| Connector 扩展 | 5.0.212，装在自动化浏览器里；`serviceWorkers()` 里找 `background-worker.js` |

## 两条接口，各管一半

| | 连接器 `/connector/*` | 本地 REST `/api/users/0/*` |
|---|---|---|
| 建条目 | ✅ | ❌ |
| 挂附件 | ✅ | ❌ |
| 指定分类 | ✅ `updateSession` | ❌ |
| 查条目 | ❌ | ✅（只读） |
| 建分类 / 改 / 删 | ❌ | ❌ |

**能写的不给查，能查的不给写。** 建分类、改条目、删条目**全都没有程序化入口** —— 只能让用户在 Zotero 界面里做。

## 连接器端点全表（Zotero 9.0.6）

`getTranslators` `detect` `saveItems` `getRecognizedItem` `saveStandaloneAttachment` `saveAttachment` `saveSingleFile` `saveSnapshot` `hasAttachmentResolvers` `saveAttachmentFromResolver` `updateSession` `delaySync` `import` `installStyle` `getTranslatorCode` `getSelectedCollection` `getClientHostnames` `proxies` `ping`

注意：**没有任何 createCollection / updateItem / deleteItem 类端点。**

## 协议要点

### `POST /connector/saveItems`

```json
{ "items": [ { "id": "<8位客户端id>", "itemType": "journalArticle", "title": "...", ... } ],
  "uri": "<来源页>", "sessionID": "<自生成的会话id>" }
```
- **每个 item 必须自带 `id`**（8 位随机串，客户端生成）。服务端 `saveSession.js` 用 `addItem(data.items[index].id, item)` 建立会话内映射，附件就是靠这个 id 认父。缺了它附件会 500。
- payload 里的 `target` 字段**被忽略**，别指望它指定分类。
- 成功返回 `201`，**响应体为空**（拿不到 item key）。

### `POST /connector/saveAttachment?sessionID=<id>`

- body = PDF 原始字节；`Content-Type: application/pdf`
- 元数据走 **`X-Metadata` 头**（必须是 ASCII，title 用英文），字段：`{ id, url, contentType, parentItemID, title }`
- `parentItemID` = saveItems 时那个客户端 id
- **`url` 不能为空**，否则 `importFromNetworkStream` 抛错 → 500
- 服务端拿 `session.getItemByConnectorKey(parentItemID)` 找父条目；找不到就 `parentItem.id` 报错 → 500
- 会话 GC：通常 10 分钟，会话数 ≥10 时缩到 1 分钟

**推荐不要手搓这个请求**，直接用插件自己的 `Zotero.ItemSaver.saveAttachmentToZotero(attachment, sessionID, tab)`：
- 它用 `Zotero.HTTP.request` + 手动拼 `Cookie` 头 + 设 `referrer`（知网查 referer），失败还能用隐藏 iframe 兜底绕过风控
- `attachment` = `{ id, url, mimeType, parentItem, title, referrer }`
- `tab` = 知网标签页（`chrome.tabs.query({url:'*://kns.cnki.net/*'})`），**必须传**

### `POST /connector/updateSession`

```json
{ "sessionID": "...", "target": "C15", "tags": [], "note": "" }
```
- **必须在 `saveItems` 之后、用同一 sessionID 调用**（saveItems 里的 target 被忽略）
- `target` 只认**已存在分类的 id**（`"C15"`）或 `"L1"`（我的文库）。传分类名 → 500
- ⚠️ 内部是 `item.setCollections(collection ? [collection.id] : [])` —— **整体替换**该条目分类归属，不是追加。只影响当次保存会话的新条目，风险低但要知道

### `GET /connector/ping`
返回 `Zotero is running`，响应头带 `X-Zotero-Version` / `X-Zotero-Connector-API-Version: 3`。

## 本地 REST API

用户已在 Zotero 高级设置里开「允许其他应用程序与本机 Zotero 通信」。**是只读的**：21 个端点类全部 `supportedMethods = ['GET']`，`DELETE` 返回 **501 Not Implemented**。

请求要带 `Zotero-API-Version: 3` 头。常用：

```bash
API=http://127.0.0.1:23119/api/users/0
curl -s -H "Zotero-API-Version: 3" "$API/collections?limit=100"
curl -s -H "Zotero-API-Version: 3" "$API/collections/<key>/items/top?limit=50"
curl -s -H "Zotero-API-Version: 3" "$API/items/<key>/children"
```

用途：**实时查库验证**（比拷 sqlite 副本干净）。但不能改不能删。

## 知网全文为什么必须走浏览器

`bar.cnki.net/bar/download/order?id=…` 是**绑定浏览器会话的一次性订单链接**。实测无 cookie 直接请求：

```
302 → /bar/ErrorMsg.html?ErrMsg=来源应用不正确(01)
```

- Zotero 桌面端没有天财 CARSI 会话 → **下不了**。服务端也把这条路封了：`saveItems` 用 `attachmentMode: Zotero.Translate.ItemSaver.ATTACHMENT_MODE_IGNORE`，注释写着 "All attachments come from the Connector"。
- Connector 插件本身也是「浏览器里取字节 → POST 给 Zotero」，不是把 URL 交给 Zotero。
- **推论**：任何"让外部工具凭 URL 去下知网全文"的方案都不成立。

## 查库脚本的坑

Zotero 运行时会独占 `zotero.sqlite`，直接读报 `database is locked`。`scripts/zotero-query.mjs` 的做法是拷 `sqlite + -wal + -shm` 到临时目录再只读打开——**只有查回收站才需要它**，其他查询优先用本地 API。

## 条目进回收站 ≠ 永久删除

Zotero 界面里可恢复。判断某条是否还在：查 `deletedItems` 表，或看本地 API 的 `items/top` 是否包含它（API 默认排除已删）。
