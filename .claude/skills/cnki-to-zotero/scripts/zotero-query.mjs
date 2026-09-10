#!/usr/bin/env node
/**
 * zotero-query.mjs — 只读查本机 Zotero 库，用于验证导入结果
 *
 * 两条通道自动选择：
 *   1) Zotero 本地 REST API（Zotero 在跑 + 已开「允许其他应用程序与本机 Zotero 通信」）
 *      —— 实时、返回 JSON。**只读**，不能改删。
 *   2) 读 zotero.sqlite 副本 —— Zotero 没开也能用；运行时会锁库，所以先拷
 *      sqlite + -wal + -shm 到临时目录再只读打开。回收站只有这条路能看。
 *
 * 用法:
 *   node zotero-query.mjs collections           # 列分类（含 key / id / 条目数）
 *   node zotero-query.mjs in <分类名|key|id>     # 列某分类下条目 + 附件状态
 *   node zotero-query.mjs recent [N]            # 最近加入的 N 条
 *   node zotero-query.mjs find <词>             # 按题名搜
 *   node zotero-query.mjs show <词>             # 条目详情：分类 + 附件
 *   node zotero-query.mjs trash                 # 回收站（仅 sqlite 通道）
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const API = 'http://127.0.0.1:23119/api/users/0';
const H = { 'Zotero-API-Version': '3' };

async function api(p) {
  const r = await fetch(API + p, { headers: H, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

async function apiUp() {
  try { await api('/collections?limit=1'); return true; } catch { return false; }
}

// ---------- sqlite 通道 ----------
function findDataDir() {
  const root = path.join(os.homedir(), 'AppData', 'Roaming', 'Zotero', 'Zotero', 'Profiles');
  if (fs.existsSync(root)) {
    for (const d of fs.readdirSync(root)) {
      const prefs = path.join(root, d, 'prefs.js');
      if (!fs.existsSync(prefs)) continue;
      const txt = fs.readFileSync(prefs, 'utf8');
      if (!/extensions\.zotero\.useDataDir",\s*true/.test(txt)) continue;
      const m = txt.match(/extensions\.zotero\.dataDir",\s*"([^"]+)"/);
      if (m) return m[1].replace(/\\\\/g, '\\');
    }
  }
  return path.join(os.homedir(), 'Zotero');
}

function openDb() {
  const dir = findDataDir();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zq-'));
  for (const s of ['', '-wal', '-shm']) {
    const src = path.join(dir, 'zotero.sqlite' + s);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(tmp, 'zotero.sqlite' + s));
  }
  return { db: new DatabaseSync(path.join(tmp, 'zotero.sqlite'), { readOnly: true }), dir };
}

const TITLE = `(SELECT idv.value FROM itemData id JOIN itemDataValues idv ON idv.valueID = id.valueID
                 JOIN fields f ON f.fieldID = id.fieldID WHERE id.itemID = i.itemID AND f.fieldName = 'title')`;
const AUTHORS = `(SELECT GROUP_CONCAT(cr.lastName, '; ') FROM itemCreators ic JOIN creators cr ON cr.creatorID = ic.creatorID WHERE ic.itemID = i.itemID)`;
const DATE = `(SELECT idv.value FROM itemData id JOIN itemDataValues idv ON idv.valueID = id.valueID
                 JOIN fields f ON f.fieldID = id.fieldID WHERE id.itemID = i.itemID AND f.fieldName = 'date')`;
const BASE = `SELECT i.itemID, i.key, i.dateAdded, ${TITLE} AS title, ${AUTHORS} AS authors, ${DATE} AS date
              FROM items i
              WHERE i.itemID NOT IN (SELECT itemID FROM deletedItems)
                AND i.itemTypeID NOT IN (SELECT itemTypeID FROM itemTypes WHERE typeName IN ('attachment','note'))`;

function sqlCollections(db) {
  // 只数顶层条目（排除附件/笔记），与 API 通道的 items/top 口径一致
  return db.prepare(`SELECT c.collectionID AS id, c.collectionName AS name,
      (SELECT COUNT(*) FROM collectionItems ci JOIN items i2 ON i2.itemID = ci.itemID
        WHERE ci.collectionID = c.collectionID
          AND i2.itemID NOT IN (SELECT itemID FROM deletedItems)
          AND i2.itemTypeID NOT IN (SELECT itemTypeID FROM itemTypes WHERE typeName IN ('attachment','note'))) AS n
    FROM collections c ORDER BY c.collectionName`).all();
}
function sqlItemRows(db, extra, params = []) {
  return db.prepare(BASE + ' ' + extra).all(...params);
}
function sqlDetail(db, r, nameById) {
  const cols = db.prepare(`SELECT c.collectionName FROM collectionItems ci JOIN collections c ON c.collectionID = ci.collectionID WHERE ci.itemID = ?`)
    .all(r.itemID).map(x => x.collectionName);
  const atts = db.prepare(`SELECT (SELECT idv.value FROM itemData id JOIN itemDataValues idv ON idv.valueID = id.valueID
      JOIN fields f ON f.fieldID = id.fieldID WHERE id.itemID = ia.itemID AND f.fieldName = 'title') AS title
    FROM itemAttachments ia WHERE ia.parentItemID = ?`).all(r.itemID);
  const nAtt = atts.length;
  return `  ${nAtt ? '📎' : '  '} ${r.title} | ${r.authors || '-'} | ${(r.date || '').slice(0, 4)} | key=${r.key} | 附件${nAtt} | 分类${cols.length}`;
}

// ---------- 命令 ----------
const [, , cmd, ...rest] = process.argv;
const arg = rest.join(' ');
const useApi = await apiUp();

try {
  if (cmd === 'collections') {
    if (useApi) {
      for (const c of await api('/collections?limit=100')) {
        const items = await api(`/collections/${c.key}/items/top?limit=100`);
        console.log(String(items.length).padStart(5), c.data.name, `(key=${c.key})`);
      }
    } else {
      const { db } = openDb();
      for (const c of sqlCollections(db)) console.log(String(c.n).padStart(5), c.name, `(id=${c.id})`);
      db.close();
    }
  } else if (cmd === 'in') {
    if (useApi) {
      const cols = await api('/collections?limit=100');
      const c = cols.find(x => x.key === arg || x.data.name === arg || x.data.name.includes(arg));
      if (!c) throw new Error('未找到分类: ' + arg);
      const items = await api(`/collections/${c.key}/items/top?limit=100`);
      console.log(`分类「${c.data.name}」(key=${c.key}) 共 ${items.length} 条  [通道:API]`);
      for (const it of items) {
        const kids = await api(`/items/${it.key}/children`);
        const n = kids.filter(k => k.data.itemType === 'attachment').length;
        console.log(`  ${n ? '📎' : '  '} ${it.data.title} | ${(it.data.creators || []).map(c2 => c2.name || c2.lastName).join('; ')} | ${(it.data.date || '').slice(0, 4)} | key=${it.key} | 附件${n} | 分类${(it.data.collections || []).length}`);
      }
    } else {
      const { db } = openDb();
      const cols = sqlCollections(db);
      const c = cols.find(x => String(x.id) === arg || x.name === arg || x.name.includes(arg));
      if (!c) throw new Error('未找到分类: ' + arg);
      const rows = sqlItemRows(db, 'AND i.itemID IN (SELECT itemID FROM collectionItems WHERE collectionID = ?) ORDER BY i.dateAdded', [c.id]);
      console.log(`分类「${c.name}」(id=${c.id}) 共 ${rows.length} 条  [通道:sqlite]`);
      for (const r of rows) console.log(sqlDetail(db, r));
      db.close();
    }
  } else if (cmd === 'recent' || cmd === 'find' || cmd === 'show') {
    const n = cmd === 'recent' ? parseInt(arg || '15', 10) : 50;
    let rows;
    if (useApi) {
      const q = cmd === 'find' || cmd === 'show' ? `&q=${encodeURIComponent(arg)}&qmode=titleCreatorYear` : '';
      const sort = cmd === 'recent' ? '&sort=dateAdded&direction=desc' : '';
      const items = await api(`/items/top?limit=${n}${q}${sort}`);
      rows = items.map(it => ({ key: it.key, title: it.data.title, authors: (it.data.creators || []).map(c => c.name || c.lastName).join('; '), date: it.data.date, collections: it.data.collections || [] }));
    } else {
      const { db } = openDb();
      const where = cmd === 'find' || cmd === 'show' ? `AND ${TITLE} LIKE ? ORDER BY i.dateAdded DESC LIMIT ${n}`
                                                      : `ORDER BY i.dateAdded DESC LIMIT ${n}`;
      const args = cmd === 'find' || cmd === 'show' ? ['%' + arg + '%'] : [];
      rows = sqlItemRows(db, where, args).map(r => ({ key: r.key, title: r.title, authors: r.authors, date: r.date, itemID: r.itemID }));
      if (cmd === 'show') {
        for (const r of rows) {
          const cols = db.prepare(`SELECT c.collectionName FROM collectionItems ci JOIN collections c ON c.collectionID = ci.collectionID WHERE ci.itemID = ?`).all(r.itemID).map(x => x.collectionName);
          const atts = db.prepare(`SELECT (SELECT idv.value FROM itemData id JOIN itemDataValues idv ON idv.valueID = id.valueID
            JOIN fields f ON f.fieldID = id.fieldID WHERE id.itemID = ia.itemID AND f.fieldName = 'title') AS title
            FROM itemAttachments ia WHERE ia.parentItemID = ?`).all(r.itemID);
          console.log(`\n■ ${r.title}\n  作者: ${r.authors || '-'} | ${r.date || '-'} | key=${r.key}`);
          console.log(`  分类: ${cols.join(', ') || '(无)'}`);
          console.log(atts.length ? atts.map(a => `  附件: ${a.title}`).join('\n') : '  附件: 无');
        }
        db.close();
        process.exit(0);
      }
      db.close();
    }
    console.log(`[通道:${useApi ? 'API' : 'sqlite'}] ${rows.length} 条:`);
    for (const r of rows) console.log(`  ${r.title} | ${r.authors || '-'} | ${(r.date || '').slice(0, 4)} | key=${r.key}`);
  } else if (cmd === 'trash') {
    const { db, dir } = openDb();
    const rows = db.prepare(`SELECT i.key, i.dateAdded, ${TITLE} AS title FROM items i
      WHERE i.itemID IN (SELECT itemID FROM deletedItems) ORDER BY i.dateAdded DESC LIMIT 50`).all();
    console.log(`dataDir = ${dir} | 回收站共 ${rows.length} 条:`);
    for (const r of rows) console.log(`  [${r.dateAdded}] ${r.title} | key=${r.key}`);
    db.close();
  } else {
    console.log('用法: node zotero-query.mjs collections | in <分类名|key|id> | recent [N] | find <词> | show <词> | trash');
  }
} catch (e) {
  console.error('查询失败:', e.message);
  process.exit(1);
}
