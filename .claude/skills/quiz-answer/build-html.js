#!/usr/bin/env node
/**
 * 生成自包含的"创业知识赛答题助手" HTML。
 * 用法: node build_html.js <question-bank.json> <output.html>
 */
const fs = require('fs');

const src = process.argv[2] || require('path').join(__dirname, 'question-bank.json');
const out = process.argv[3] || require('path').join(__dirname, '..','..','..', 'myagents_files', '创业知识赛答题助手.html');
const bank = JSON.parse(fs.readFileSync(src, 'utf8'));

const template = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>创业知识赛答题助手</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin:0; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
         background: #f0f2f5; color:#1f2328; padding-bottom:40px; }
  header { background: linear-gradient(135deg,#1a73e8,#4a90e2); color:#fff; padding:20px 16px 14px; }
  header h1 { margin:0; font-size:20px; }
  header p { margin:4px 0 0; font-size:12px; opacity:.9; }
  main { padding:14px 16px; max-width:640px; margin:0 auto; }
  .search-wrap { position: sticky; top:0; background:#f0f2f5; padding:10px 0; z-index:5; }
  #q { width:100%; font-size:16px; padding:12px 14px; border:2px solid #d0d5dd; border-radius:12px;
        outline:none; }
  #q:focus { border-color:#1a73e8; }
  .hint { font-size:12px; color:#6b7280; margin:6px 2px; }
  #result { margin-top:10px; }
  .card { background:#fff; border-radius:14px; padding:16px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  .answer-pill { display:inline-block; font-size:28px; font-weight:800; color:#fff; padding:6px 22px;
                 border-radius:30px; letter-spacing:2px; }
  .answer-pill.ok { background:#16a34a; }
  .answer-pill.no { background:#dc2626; }
  .qtext { margin:12px 0 4px; font-size:15px; line-height:1.6; }
  .meta { font-size:12px; color:#6b7280; margin-top:6px; }
  .conf { margin-left:8px; font-size:12px; }
  .cands { margin-top:10px; border-top:1px dashed #e5e7eb; padding-top:10px; }
  .cands .c { font-size:13px; padding:4px 0; color:#374151; }
  .cands .c b { color:#1a73e8; }
  .ocr { margin-top:6px; }
  .drop { border:2px dashed #c4cbd4; border-radius:14px; padding:22px 14px; text-align:center;
          color:#6b7280; font-size:14px; background:#fff; cursor:pointer; }
  .drop.active { border-color:#1a73e8; background:#eef4ff; }
  .drop input { display:none; }
  .status { font-size:12px; color:#1a73e8; margin-top:8px; min-height:18px; }
  .footer { text-align:center; font-size:11px; color:#9ca3af; margin-top:20px; }
</style>
</head>
<body>
<header>
  <h1>创业知识赛 · 答题助手</h1>
  <p>题库 ${bank.length} 题（单选/多选/判断/案例）· 本地搜索免联网 · 截图识别需联网</p>
</header>
<main>
  <div class="search-wrap">
    <input id="q" type="search" autocomplete="off" placeholder="输入/粘贴题目文字，或直接打字搜">
    <div class="hint">提示：输入题干关键词即可，如"熊彼特 核心职能"；答案显示在卡片上方。</div>
  </div>
  <div id="result"></div>
  <div class="ocr">
    <label class="drop" id="drop">
      <span id="dropText">📷 识别截图：点击选择或直接粘贴一张题目截图</span>
      <input type="file" id="img" accept="image/*">
    </label>
    <div class="status" id="ocrStatus"></div>
  </div>
  <div class="footer">数据来自创业研究专题赛道知识赛题库 · 本地运行，不上传图片</div>
</main>

<script>
"use strict";
const BANK = __BANK__;
const BANK_N = BANK.map(it => norm(it.question));

function norm(s){
  return String(s)
    .replace(/^\\s*\\d+\\s*[、.．]\\s*/, '')
    .toLowerCase()
    .replace(/[^a-z0-9\\u4e00-\\u9fff]/g, '');
}
function bigram(s){
  const m = new Map();
  for (let i=0;i<s.length-1;i++){ const k=s.slice(i,i+2); m.set(k,(m.get(k)||0)+1); }
  return m;
}
function jacc(a,b){
  const ga=bigram(a), gb=bigram(b);
  if(!ga.size||!gb.size) return 0;
  const un=new Set([...ga.keys(),...gb.keys()]);
  let inter=0, tot=0;
  for(const k of ga.keys()) if(gb.has(k)) inter+=Math.min(ga.get(k),gb.get(k));
  for(const k of un) tot+=Math.max(ga.get(k)||0,gb.get(k)||0);
  return tot? inter/tot : 0;
}
function lcsRatio(a,b){
  if(!a.length||!b.length) return 0;
  const dp=new Uint16Array(b.length+1); let best=0;
  for(let i=1;i<=a.length;i++){ let prev=0;
    for(let j=1;j<=b.length;j++){ const cur=dp[j];
      if(a[i-1]===b[j-1]){ dp[j]=prev+1; if(dp[j]>best)best=dp[j]; } else dp[j]=0;
      prev=cur;
    }
  }
  return best/Math.max(a.length,b.length);
}
function score(a, bn){
  if(!a.length) return 0;
  if(a.includes(bn)) return 1;
  if(bn.includes(a)) return 0.95;
  const j=jacc(a,bn), l=lcsRatio(a,bn);
  return Math.max(j*0.6+l*0.4, j, l);
}
function match(text){
  const q=norm(text);
  const sc = BANK.map((it,i)=>({ it, s: score(q, BANK_N[i]) }));
  sc.sort((x,y)=>y.s-x.s);
  const top = sc.slice(0,3);
  const hit = top[0].s >= 0.55;
  return { hit, top };
}
function fmtAnswer(it){
  return it.type==='judge' ? it.answer : it.answer;
}
function render(text){
  const box=document.getElementById('result');
  const { hit, top } = match(text);
  if(!text.trim()){ box.innerHTML=''; return; }
  if(!hit){
    let h='<div class="card"><span class="answer-pill no">未命中</span><div class="qtext">题库里没有匹配这道题，可能不在题库中。</div>';
    h+='<div class="cands">';
    for(const t of top) h+='<div class="c"><b>'+t.s.toFixed(2)+'</b> · 题库-'+t.it.set+' · 答案 '+t.it.answer+' — '+t.it.question.slice(0,40)+'</div>';
    h+='</div></div>';
    box.innerHTML=h; return;
  }
  const t=top[0];
  const label = t.it.type==='multi' ? '（多选）' : t.it.type==='judge' ? '（判断）' : '（单选）';
  let h='<div class="card"><span class="answer-pill ok">'+t.it.answer+'</span>';
  h+='<div class="qtext">'+esc(t.it.question)+'</div>';
  h+='<div class="meta">题库-'+t.it.set+' · '+t.it.section+label+' · 置信度 '+t.s.toFixed(2)+'</div>';
  h+='<div class="cands">';
  for(const c of top.slice(1)) if(c.s>=0.4) h+='<div class="c">候选：<b>'+c.it.answer+'</b>（'+c.s.toFixed(2)+'）'+esc(c.it.question.slice(0,36))+'</div>';
  h+='</div></div>';
  box.innerHTML=h;
}
function esc(s){ return s.replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

let deb=null;
document.getElementById('q').addEventListener('input', e=>{
  clearTimeout(deb);
  deb=setTimeout(()=>render(e.target.value), 120);
});

// ---- OCR (懒加载 CDN) ----
let tessLoaded=false;
function loadTesseract(){
  return new Promise((res,rej)=>{
    if(window.Tesseract){ tessLoaded=true; res(); return; }
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js';
    s.onload=()=>{ tessLoaded=true; res(); };
    s.onerror=()=>rej(new Error('CDN 加载失败（需联网）'));
    document.head.appendChild(s);
  });
}
async function ocr(file){
  const st=document.getElementById('ocrStatus');
  st.textContent='加载识别引擎...';
  try{ await loadTesseract(); }catch(e){ st.textContent='✗ '+e.message+'：可改用上方文字搜索。'; return; }
  st.textContent='识别中...（中文识别约需几秒）';
  try{
    const { data } = await Tesseract.recognize(file, 'chi_sim', {
      langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/chi_sim/4.0.0_best_int',
      logger: m=>{ if(m.status==='recognizing text') st.textContent='识别中... '+Math.round(m.progress*100)+'%'; }
    });
    if(!data.text.trim()){ st.textContent='未识别到文字，请换张清晰的截图。'; return; }
    document.getElementById('q').value = data.text;
    render(data.text);
    st.textContent='✓ 识别完成，已自动匹配。';
  }catch(e){
    st.textContent='✗ 识别失败：'+e.message;
  }
}
const drop=document.getElementById('drop'), imgIn=document.getElementById('img');
imgIn.addEventListener('change', e=>{ if(e.target.files[0]) ocr(e.target.files[0]); });
['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('active'); }));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('active'); }));
drop.addEventListener('drop', e=>{ const f=e.dataTransfer.files[0]; if(f && f.type.startsWith('image/')) ocr(f); });
document.addEventListener('paste', e=>{
  const items=e.clipboardData && e.clipboardData.items;
  if(!items) return;
  for(const it of items){ if(it.type && it.type.startsWith('image/')){ const f=it.getAsFile(); if(f){ ocr(f); return; } } }
});
</script>
</body>
</html>`;

const html = template.replace('__BANK__', JSON.stringify(bank));
fs.writeFileSync(out, html, 'utf8');
console.log('Wrote', out, (html.length/1024).toFixed(1) + 'KB');
