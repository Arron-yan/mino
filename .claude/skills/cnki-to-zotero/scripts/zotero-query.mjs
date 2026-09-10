#!/usr/bin/env node
/**
 * zotero-query.mjs — 只读查本机 Zotero 库，用于验证导入结果
 *
 * 优先走 Zotero 本地 REST API（实时、返回 JSON）。该 API 是**只读**的，
 * 只能查不能改删。回收站不在 API 覆盖范围内，退回读 sqlite 副本。
 *
 * 用法:
 *   node zotero-query.mjs collections           # 列分类（含 key 和条目数）
 *   node zotero-query.mjs in <分类名|key>        # 列某分类下条目 + 附件状态
 *   node zotero-query.mjs recent [N]            # 最近加入的 N 条
 *   node zotero-query.mjs find <词>             # 按题名/作者/年份搜
 *   node zotero-query.mjs show <词>             # 条目详情：分类 + 附件
 *   node zotero-query.mjs trash                 # 回收站（走 sqlite）
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API = 'http://127.0.0.1:23119/api/users/0';
const H = { 'Zotero-API-Version': '3' };

async function api(p) {
  const r = await fetch(API + p, { headers: H, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`API ${r.status} ${p}`);
  return r.json();
}

// ---------- Zotero 数据目录（仅在需要 sqlite 兜底时用） ----------
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

/** Zotero 运行时会独占 zotero.sqlite，拷副本再读 */
function openSnapshot() {
  const dir = findDataDir();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zq-'));
  for (const s of ['', '-wal', '-shm']) {
    const src = path.join(dir, 'zotero.sqlite' + s);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(tmp, 'zotero.sqlite' + s));
  }
  return { dbPath: path.join(tmp, 'zotero.sqlite'), dir };
}

const who = (it) => (it.data.creators || []).map(c => c.name || [c.firstName, c.lastName].filter(Boolean).join(' ')).join('; ');
const dateOf = (it) => (it.data.date || '').slice(0, 4);

async function itemLine(it, withChildren) {
  const kids = withChildren ? await api(`/items/${it.key}/children`) : [];
  const pdfs = kids.filter(k => k.data.itemType === 'attachment');
  const cols = (it.data.collections || []).length;
  return `  ${pdfs.length ? '📎' : '  '} ${it.data.title} | ${who(it)} | ${dateOf(it)} | key=${it.key}` +
         (withChildren ? ` | 附件${pdfs.length} | 分类${cols}` : '');
}

const [, , cmd, ...rest] = process.argv;
const arg = rest.join(' ');

try {
  if (cmd === 'collections') {
    const cols = await api('/collections?limit=100');
    for (const c of cols) {
      const items = await api(`/collections/${c.key}/items/top?limit=100`);
      console.log(String(items.length).padStart(5), c.data.name, `(key=${c.key})`);
    }
  } else if (cmd === 'in') {
    const cols = await api('/collections?limit=100');
    const c = cols.find(x => x.key === arg || x.data.name === arg || x.data.name.includes(arg));
    if (!c) { console.log('未找到分类:', arg); process.exit(1); }
    const items = await api(`/collections/${c.key}/items/top?limit=100`);
    console.log(`分类「${c.data.name}」(key=${c.key}) 共 ${items.length} 条:`);
    for (const it of items) console.log(await itemLine(it, true));
  } else if (cmd === 'recent') {
    const n = parseInt(arg || '15', 10);
    const items = await api(`/items/top?limit=${n}&sort=dateAdded&direction=desc`);
    for (const it of items) console.log(await itemLine(it, false));
  } else if (cmd === 'find') {
    const items = await api(`/items/top?limit=50&q=${encodeURIComponent(arg)}&qmode=titleCreatorYear`);
    console.log(`匹配 ${items.length} 条:`);
    for (const it of items) console.log(await itemLine(it, false));
  } else if (cmd === 'show') {
    const items = await api(`/items/top?limit=50&q=${encodeURIComponent(arg)}&qmode=titleCreatorYear`);
    const cols = await api('/collections?limit=100');
    const nameOf = Object.fromEntries(cols.map(c => [c.key, c.data.name]));
    for (const it of items) {
      const kids = await api(`/items/${it.key}/children`);
      console.log(`\n■ ${it.data.title}\n  作者: ${who(it) || '-'} | ${it.data.date || '-'} | key=${it.key}`);
      console.log(`  分类: ${(it.data.collections || []).map(k => nameOf[k] || k).join(', ') || '(无)'}`);
      const pdfs = kids.filter(k => k.data.itemType === 'attachment');
      console.log(pdfs.length ? pdfs.map(a => `  附件: ${a.data.title}`).join('\n') : '  附件: 无');
    }
  } else if (cmd === 'trash') {
    const { DatabaseSync } = await import('node:sqlite');
    const { dbPath, dir } = openSnapshot();
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db.prepare(`
      SELECT i.key, i.dateAdded,
             (SELECT idv.value FROM itemData id
                JOIN itemDataValues idv ON idv.valueID = id.valueID
                JOIN fields f ON f.fieldID = id.fieldID
               WHERE id.itemID = i.itemID AND f.fieldName = 'title') AS title
        FROM items i WHERE i.itemID IN (SELECT itemID FROM deletedItems)
       ORDER BY i.dateAdded DESC LIMIT 50`).all();
    console.log(`dataDir = ${dir} | 回收站共 ${rows.length} 条:`);
    for (const r of rows) console.log(`  [${r.dateAdded}] ${r.title} | key=${r.key}`);
    db.close();
  } else {
    console.log('用法: node zotero-query.mjs collections | in <分类名|key> | recent [N] | find <词> | show <词> | trash');
  }
} catch (e) {
  console.error('查询失败:', e.message);
  console.error('（本地 API 是否可用？它是只读的，Zotero 需在运行且已开「允许其他应用程序与本机 Zotero 通信」）');
  process.exit(1);
}
