#!/usr/bin/env node
/**
 * answer-matcher.js — 创业研究专题知识赛题库匹配引擎
 *
 * 用法：
 *   node answer-matcher.js "<题目文本>"            # 匹配单题
 *   node answer-matcher.js --json "<题目文本>"     # JSON 输出
 *   node answer-matcher.js --top 5 "<题目文本>"    # 输出 top-5 候选
 *   echo "<多行题目>" | node answer-matcher.js     # 从 stdin 读，每行匹配一题
 *
 * 匹配原理：归一化（去标点/空白/题号/选项字母/答案空格）后，
 *   1. 题干包含关系（题干 ⊂ 输入 或 输入 ⊂ 题干）→ 最高分
 *   2. 字符 bigram Jaccard 相似度
 *   3. 最长公共子串比率
 * 返回 top-N 候选 + 置信度；未命中明确提示。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const BANK_PATH = path.join(__dirname, 'question-bank.json');
const bank = JSON.parse(fs.readFileSync(BANK_PATH, 'utf8'));

// ---------- normalization ----------
function normalize(s) {
  return s
    .replace(/^\s*\d+\s*[、.．]\s*/, '')   // 去掉题号前缀
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]/g, '') // 只保留汉字 + 字母数字
    .trim();
}

for (const it of bank) it._n = normalize(it.question);

// ---------- similarity ----------
function bigrams(s) {
  const g = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const k = s.slice(i, i + 2);
    g.set(k, (g.get(k) || 0) + 1);
  }
  return g;
}
function jaccard(a, b) {
  const ga = bigrams(a), gb = bigrams(b);
  if (!ga.size || !gb.size) return 0;
  let inter = 0, union = new Set();
  for (const k of ga.keys()) union.add(k);
  for (const k of gb.keys()) union.add(k);
  for (const k of ga.keys()) if (gb.has(k)) inter += Math.min(ga.get(k), gb.get(k));
  let tot = 0;
  for (const k of union) tot += Math.max(ga.get(k) || 0, gb.get(k) || 0);
  return tot ? inter / tot : 0;
}
function lcsRatio(a, b) {
  if (!a.length || !b.length) return 0;
  const n = a.length, m = b.length;
  const dp = new Uint16Array(m + 1);
  let best = 0;
  for (let i = 1; i <= n; i++) {
    let prev = 0;
    for (let j = 1; j <= m; j++) {
      const cur = dp[j];
      if (a[i - 1] === b[j - 1]) { dp[j] = prev + 1; if (dp[j] > best) best = dp[j]; }
      else dp[j] = 0;
      prev = cur;
    }
  }
  return best / Math.max(n, m);
}
function score(input, item) {
  const a = input, b = item._n;
  if (!a.length) return 0;
  if (b && a.includes(b)) return 1.0;   // 题干完全包含于输入（输入可能带选项/案例描述）
  if (b && b.includes(a)) return 0.95;  // 输入是题干子串
  const j = jaccard(a, b);
  const l = lcsRatio(a, b);
  return Math.max(j * 0.6 + l * 0.4, j, l);
}

// ---------- matching ----------
const THRESHOLD = 0.55;

// 答案字母 → 对应选项内容。选项可能被打乱，靠内容核对，不能只看字母。
function answerWithOptions(it) {
  const ans = String(it.answer || '').trim();
  if (!it.options || !it.options.length) return ans; // 判断题无选项
  const letters = ans.toUpperCase().split('').filter(c => /^[A-F]$/.test(c));
  if (!letters.length) return ans;
  const parts = letters.map(l => {
    const idx = l.charCodeAt(0) - 65;
    const opt = it.options[idx];
    return opt != null ? `${l}. ${opt}` : l;
  });
  return parts.join('；');
}

function matchOne(text, topN) {
  const q = normalize(text);
  if (!q) return { input: text, normalized: '', hit: false, matched: null, candidates: [] };
  const scored = bank.map(it => ({ it, s: score(q, it) }));
  scored.sort((x, y) => y.s - x.s);
  const top = scored.slice(0, topN);
  const results = top.map(x => ({
    set: x.it.set, type: x.it.type, section: x.it.section,
    question: x.it.question, answer: x.it.answer,
    answerText: answerWithOptions(x.it),
    options: x.it.options.slice(),
    confidence: Number(x.s.toFixed(3)),
  }));
  const best = scored[0];
  const hit = best && best.s >= THRESHOLD;
  return {
    input: text,
    normalized: q,
    hit,
    matched: hit ? results[0] : null,
    candidates: results,
  };
}

function formatText(r) {
  if (r.hit) {
    const m = r.matched;
    let out = `✅ 命中 题库-${m.set}【${m.section}】\n题目：${m.question}\n【答案】${m.answerText}\n置信度：${m.confidence}`;
    if (m.options && m.options.length) {
      out += `\n选项：${m.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('  ')}`;
    }
    return out;
  }
  let out = `⚠️ 未命中题库（置信度 < ${THRESHOLD}）。输入：${r.input}\n最接近的候选：`;
  for (const c of r.candidates) {
    out += `\n  [${c.confidence}] 题库-${c.set} 答案 ${c.answerText} —— ${c.question.slice(0, 36)}`;
  }
  return out;
}

// ---------- CLI ----------
const args = process.argv.slice(2);
const isJson = args.includes('--json');
const topIdx = args.indexOf('--top');
const topN = topIdx >= 0 ? Math.max(1, Number(args[topIdx + 1]) || 3) : 3;
const textArgs = args.filter(a => !a.startsWith('--'));

function run(text) {
  if (text.includes('\n')) {
    // 多行输入：每行一个题目
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map(line => matchOne(line, topN));
  }
  return [matchOne(text, topN)];
}

function main() {
  let text;
  if (textArgs.length) {
    text = textArgs.join(' ');
  } else {
    text = fs.readFileSync(0, 'utf8');
  }
  const results = run(text);
  if (isJson) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  } else {
    console.log(results.map(formatText).join('\n\n'));
  }
}

if (require.main === module) main();

module.exports = { matchOne, normalize, formatText, THRESHOLD, bank };
