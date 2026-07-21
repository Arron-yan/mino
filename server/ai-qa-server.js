/**
 * 应急管理部咨询答复汇编 — AI 智能问答后端
 *
 * 用法：
 *   1. 设置环境变量 API_KEY（DeepSeek / OpenAI 兼容的 key）
 *      export API_KEY=sk-xxxx
 *   2. 可选设置 API_BASE（默认 DeepSeek）
 *      export API_BASE=https://api.deepseek.com/v1
 *   3. node server/ai-qa-server.js
 *
 * 端点：
 *   POST /api/ask  {"question": "..."}  →  {"answer": "...", "sources": [...]}
 *   GET  /api/health                    →  {"status": "ok"}
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ===== 配置 =====
const PORT = process.env.PORT || 3456;
const API_KEY = process.env.API_KEY || '';
const API_BASE = process.env.API_BASE || 'https://api.deepseek.com/v1';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat';

// ===== 加载数据 =====
const qaData = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'workspace', 'qa_data_v2.json'), 'utf-8'
));
console.log(`Loaded ${qaData.length} Q&A items`);

// ===== 搜索 =====
function tokenize(text) {
  const cleaned = text.replace(/[^一-龥a-zA-Z0-9]/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);
  const tokens = new Set();
  for (const w of words) {
    if (/^[a-zA-Z0-9]+$/.test(w)) {
      tokens.add(w.toLowerCase());
    } else {
      for (let i = 0; i < w.length; i++) {
        tokens.add(w[i]);
        if (i < w.length - 1) tokens.add(w[i] + w[i + 1]);
      }
    }
  }
  return [...tokens];
}

function searchRelevant(query, topK = 8) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored = qaData.map((item, idx) => {
    const title = (item.title || '').toLowerCase();
    const consult = (item.consult || '').toLowerCase();
    const reply = (item.reply || '').toLowerCase();
    const ql = query.toLowerCase();

    let score = 0;
    if (title.includes(ql)) score += 100;
    if (consult.includes(ql)) score += 60;
    if (reply.includes(ql)) score += 50;

    for (const token of queryTokens) {
      if (token.length < 2) continue;
      if (title.includes(token)) score += 20;
      if (consult.includes(token)) score += 10;
      if (reply.includes(token)) score += 8;
    }

    return { item, score, idx };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.item);
}

// ===== AI 合成 =====
function buildPrompt(question, sources) {
  const sourcesText = sources.map((s, i) =>
    `【来源${i + 1}】（编号：${s.id}，章节：${s.chapter}）\n问题：${s.title}\n官方答复：${s.reply}`
  ).join('\n\n');

  return `你是一位中国应急管理法规专家。请根据以下应急管理部官方咨询答复，回答用户的问题。

## 规则
1. 优先使用下方"参考来源"中的官方答复内容来回答问题
2. 如果参考来源没有覆盖问题的全部内容，可以根据你的专业知识补充，但必须明确标注"以下为补充说明："
3. 回答要具体、实用，不要笼统
4. 在正文中引用来源时，使用 [来源X] 标注
5. 如果问题涉及"当地规定"或"地方标准"，提醒用户咨询当地应急管理部门
6. 结尾列出"参考法规/标准"，逐条列出答复中引用的法律、法规、标准名称和条款

## 参考来源
${sourcesText}

## 用户问题
${question}

## 回答`;
}

async function askAI(question) {
  if (!API_KEY) {
    return { error: '未配置 API_KEY。请在启动服务时设置环境变量。' };
  }

  // Step 1: Search
  const sources = searchRelevant(question, 8);
  if (sources.length === 0) {
    return {
      answer: '抱歉，在 653 条答复中未找到与您问题高度相关的内容。建议您：\n\n1. 尝试用更具体的关键词描述\n2. 在搜索模式中直接检索相关条文\n3. 通过各地应急管理厅官网查询地方性规定',
      sources: [],
      mode: 'fallback'
    };
  }

  // Step 2: Build prompt
  const prompt = buildPrompt(question, sources);

  // Step 3: Call AI API
  try {
    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: '你是一位专业的中国应急管理法规专家，回答要准确、具体、有引用来源。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return { error: `AI API 调用失败 (${response.status}): ${err.substring(0, 200)}` };
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || '(AI 返回为空)';

    return {
      answer,
      sources: sources.map(s => ({
        id: s.id,
        title: s.title,
        chapter: s.chapter,
        reply: s.reply.substring(0, 300)
      })),
      mode: 'ai'
    };
  } catch (e) {
    // Fallback: return search results without AI synthesis
    return {
      answer: `（AI 服务暂不可用，以下为搜索匹配的 ${sources.length} 条相关答复供参考）\n\n` +
        sources.map((s, i) => `${i + 1}. [${s.id}] ${s.title}\n   ${s.reply.substring(0, 200)}...`).join('\n\n'),
      sources: sources.map(s => ({ id: s.id, title: s.title, chapter: s.chapter, reply: s.reply.substring(0, 300) })),
      mode: 'search-only'
    };
  }
}

// ===== HTTP Server =====
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      dataCount: qaData.length,
      aiConfigured: !!API_KEY,
      model: AI_MODEL
    }));
    return;
  }

  // Ask endpoint
  if (req.method === 'POST' && req.url === '/api/ask') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { question } = JSON.parse(body);
        if (!question || question.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '请提供问题内容' }));
          return;
        }

        console.log(`Q: ${question.substring(0, 80)}...`);
        const result = await askAI(question.trim());
        console.log(`A: ${result.answer.substring(0, 80)}... (mode: ${result.mode})`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('  AI 智能问答服务已启动');
  console.log('  API: http://localhost:' + PORT + '/api/ask');
  console.log('  AI 配置:', API_KEY ? '✓ 已配置 (' + AI_MODEL + ')' : '✗ 未配置（将使用仅搜索模式）');
  console.log('========================================');
  console.log('');
});
