#!/usr/bin/env node
/**
 * zotero-push.mjs — 备用入库通道（PDF 落盘中转）
 *
 * ⚠️ 首选方案不是这个。首选是在 Zotero Connector 扩展的 service worker 里跑
 *    「取字节 → POST 给 Zotero」，全程不落盘，见 references/detail-and-push.md。
 *    本脚本只在两种情况下用：
 *      1) 只想推题录、不要 PDF；
 *      2) 需要在 Node 侧做批量/脚本化编排，且 PDF 已经落在磁盘上。
 *
 * 协议要点（读 Zotero Connector 5.0.212 + Zotero 9 源码得出）：
 *   - saveItems 的每个 item 要带 8 位客户端 id，附件靠它通过 parentItemID 认父；
 *   - saveAttachment 走原始字节作 body，元数据放 X-Metadata 头（必须 ASCII，title 用英文），
 *     会话走 query string 的 sessionID；url 不能为空，否则 500；
 *   - 指定分类要另调 updateSession，且必须在 saveItems 之后、用同一 sessionID。
 *     target 只认已存在分类 id（如 "C15"）或 "L1"。传分类名会 500。
 *
 * 用法:
 *   node zotero-push.mjs ping
 *   node zotero-push.mjs push   <items.json>    # 只推题录
 *   node zotero-push.mjs attach <items.json>    # 题录 + 挂本地 PDF
 *
 * items.json:
 *   { "target": "C15", "uri": "https://kns.cnki.net/",
 *     "items": [ { "meta": {...zotero item...}, "pdf": "C:/path/a.pdf" } ] }
 */

import fs from 'node:fs';

const BASE = 'http://127.0.0.1:23119';
const API_VERSION = '3';
const jheaders = { 'Content-Type': 'application/json', 'X-Zotero-Connector-API-Version': API_VERSION };

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const rand = (n = 8) => Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

async function ping() {
  const r = await fetch(`${BASE}/connector/ping`);
  return { ok: r.ok, zoteroVersion: r.headers.get('x-zotero-version'),
           apiVersion: r.headers.get('x-zotero-connector-api-version'), body: (await r.text()).trim() };
}

async function saveItems(items, uri) {
  const sessionID = rand(12);
  for (const it of items) it.id = it.id || rand(8);
  const r = await fetch(`${BASE}/connector/saveItems`, {
    method: 'POST', headers: jheaders,
    body: JSON.stringify({ items, uri: uri || 'https://kns.cnki.net/', sessionID }),
  });
  return { status: r.status, sessionID, ids: items.map(i => i.id), body: await r.text() };
}

async function updateSession(sessionID, target, tags, note) {
  const r = await fetch(`${BASE}/connector/updateSession`, {
    method: 'POST', headers: jheaders,
    body: JSON.stringify({ sessionID, target, tags: tags || [], note: note || '' }),
  });
  return { status: r.status, body: await r.text() };
}

async function saveAttachment(pdfPath, parentItemID, sessionID, itemUrl) {
  const buf = fs.readFileSync(pdfPath);
  const meta = JSON.stringify({ id: rand(8), url: itemUrl || '', contentType: 'application/pdf',
                                parentItemID, title: 'Full Text PDF' });
  const r = await fetch(`${BASE}/connector/saveAttachment?sessionID=${encodeURIComponent(sessionID)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf', 'X-Zotero-Connector-API-Version': API_VERSION, 'X-Metadata': meta },
    body: buf,
  });
  return { status: r.status, body: await r.text() };
}

const [, , cmd, arg] = process.argv;

if (cmd === 'ping') {
  console.log(JSON.stringify(await ping(), null, 2));
} else if (cmd === 'push' || cmd === 'attach') {
  const payload = JSON.parse(fs.readFileSync(arg, 'utf8'));
  const entries = payload.items || [];
  const res = await saveItems(entries.map(e => e.meta), payload.uri);
  console.log('saveItems ->', res.status, res.body.slice(0, 300) || '(空)');

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (cmd !== 'attach' || !e.pdf || !fs.existsSync(e.pdf)) continue;
    const a = await saveAttachment(e.pdf, res.ids[i], res.sessionID, e.meta.url);
    console.log(`  [${i}] ${e.meta.title} -> attach ${a.status} ${a.body.slice(0, 120)}`);
  }

  if (payload.target) {
    const u = await updateSession(res.sessionID, payload.target, payload.tags, payload.note);
    console.log('updateSession ->', u.status, u.body.slice(0, 200), '| target =', payload.target);
  }
} else {
  console.log('用法: node zotero-push.mjs ping | push <items.json> | attach <items.json>');
  console.log('（首选方案见 references/detail-and-push.md，不落盘）');
}
