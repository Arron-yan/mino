#!/usr/bin/env node
/**
 * ocr-answer.js — 本地 OCR 识别截图中的题目并匹配答案
 *
 * 用法：
 *   node ocr-answer.js "<图片路径>"             # 识别图片中的题目并给出答案
 *   node ocr-answer.js "<图片路径>" --json      # JSON 输出
 *   node ocr-answer.js "<图片路径>" --no-scale  # 不放大预处理
 *
 * 原理：tesseract.js（chi_sim 中文）+ 根目录 chi_sim.traineddata 本地识别，
 *      再按行切分题目块，逐块交给 answer-matcher.js 匹配题库。
 * 无需联网、无需「图片理解」视觉模型配置。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..', '..', '..'); // 仓库根目录
const TRAINEDDATA_SRC = path.join(ROOT, 'chi_sim.traineddata');
const LANG_DIR = path.join(__dirname, 'lang');
const LANG_GZ = path.join(LANG_DIR, 'chi_sim.traineddata.gz');

const { matchOne, formatText } = require('./answer-matcher.js');

function ensureLang() {
  if (!fs.existsSync(LANG_GZ)) {
    if (!fs.existsSync(TRAINEDDATA_SRC)) throw new Error(`找不到中文语言包 ${TRAINEDDATA_SRC}`);
    fs.mkdirSync(LANG_DIR, { recursive: true });
    const data = fs.readFileSync(TRAINEDDATA_SRC);
    fs.writeFileSync(LANG_GZ, zlib.gzipSync(data));
    console.error('已生成语言包缓存: ' + LANG_GZ);
  }
}

async function ocrImage(imgPath, preprocess) {
  const { Jimp } = require('jimp');
  const { createWorker } = require('tesseract.js');
  ensureLang();

  let workPath = imgPath;
  let tempPath = null;
  if (preprocess) {
    const img = await Jimp.read(imgPath);
    img.scale(2); // 放大 2 倍，提升小字识别率
    tempPath = path.join(LANG_DIR, '_prep_' + path.basename(imgPath) + '.png');
    await img.write(tempPath);
    workPath = tempPath;
  }

  // cachePath/dataPath 都指向 lang/（已 gitignore），避免 tesseract 把语言包缓存写到运行目录
  const worker = await createWorker('chi_sim', 1, { langPath: LANG_DIR, cachePath: LANG_DIR, dataPath: LANG_DIR });
  const { data } = await worker.recognize(workPath);
  await worker.terminate();
  if (tempPath) { try { fs.unlinkSync(tempPath); } catch (e) {} }
  return data.text;
}

function splitBlocks(ocrText) {
  const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
  const blocks = [];
  let cur = null;
  const isQuestionStart = (line) => (
    /^\d+\s*[、.．]/.test(line) ||                       // 题号开头
    /[（(【〈][\s·.．]*[）)】〉]/.test(line) ||           // 含空括号（答案空格）
    /\?\s*$/.test(line)                                  // 以问号结尾
  );
  for (const line of lines) {
    if (isQuestionStart(line)) {
      if (cur) blocks.push(cur);
      cur = line;
    } else if (cur) {
      cur += ' ' + line;
    } else {
      cur = line;
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const preprocess = !args.includes('--no-scale');
  const img = args.find(a => !a.startsWith('--'));
  if (!img) {
    console.error('用法: node ocr-answer.js "<图片路径>" [--json] [--no-scale]');
    process.exit(1);
  }
  const imgPath = path.resolve(img);
  if (!fs.existsSync(imgPath)) { console.error('图片不存在: ' + imgPath); process.exit(1); }

  ocrImage(imgPath, preprocess).then(ocrText => {
    const blocks = splitBlocks(ocrText);
    const results = blocks.map(b => ({ block: b, ...matchOne(b, 3) }));
    const hits = results.filter(r => r.hit);
    const misses = results.filter(r => !r.hit);

    if (isJson) {
      console.log(JSON.stringify({ image: imgPath, ocrText, blocks: results }, null, 2));
      return;
    }

    console.log('=== 截图中的题目 → 答案 ===');
    if (!hits.length) {
      console.log('未识别到题库中的题目。');
    } else {
      hits.forEach((r, i) => {
        const m = r.matched;
        console.log(`${i + 1}. 【答案】${m.answer}  (题库-${m.set} ${m.section} · 置信度 ${m.confidence})`);
        console.log(`   题目：${m.question}`);
        console.log(`   截图原文：${r.block.slice(0, 60)}`);
      });
    }
    if (misses.length) {
      console.log('\n未命中题库的块（可能是新题/选项行/噪声）：');
      misses.forEach(r => console.log(`  · ${r.block.slice(0, 60)}`));
    }
    console.log('\n（OCR 原文可在 --json 输出的 ocrText 字段查看）');
  }).catch(e => {
    console.error('OCR 失败:', e.message);
    process.exit(1);
  });
}

main();
