#!/usr/bin/env node
/**
 * inspect-state.mjs — 离线体检导出的登录态（不启动浏览器）
 *
 * 用途：登录态"过期了吗 / 覆盖了哪些库 / 快到期了没"，以及导出文件是否损坏。
 * 只读 cookie 的 name/domain/expires，不打印任何 value。
 *
 * 用法：
 *   node .claude/skills/legal-db-login/scripts/inspect-state.mjs [state.json]
 * 默认读取 workspace/legal-dbs-login.json（相对仓库根）。
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT = 'workspace/legal-dbs-login.json';
const path = resolve(process.argv[2] || DEFAULT);

if (!existsSync(path)) {
  console.error(`✗ 找不到登录态文件：${path}`);
  console.error('  （workspace/ 已 gitignore，文件不会进版本库；确认路径或先跑 EXPORT）');
  process.exit(1);
}

let state;
try {
  state = JSON.parse(readFileSync(path, 'utf8'));
} catch (e) {
  console.error(`✗ 解析失败：${e.message}`);
  process.exit(1);
}

const cookies = Array.isArray(state.cookies) ? state.cookies : [];
const origins = Array.isArray(state.origins) ? state.origins : [];

const DAY = 86400;
const now = Math.floor(Date.now() / 1000);
const fmt = (t) => (t > 0 ? new Date(t * 1000).toISOString().slice(0, 10) : 'session');

/**
 * 短命 / 埋点类 cookie —— 生命周期极短，且**每次访问都会自动续期**。
 * 不排除掉的话，"3 天内到期"会天天报警，真正的到期反而看不见了。
 *
 * 2026-09-10 实测确认为"访问即续期"的：
 *   check / connect.sid / acw_tc   （威科的风控与连接门槛）
 *   userislogincookie / LoginAccount（法宝的登录门槛标志）
 * 它们过期 ≠ 掉线，别被吓到。
 */
const SHORT_TTL =
  /^(Hm_lvt|Hm_lpvt|HMACCOUNT|CookieId|cookieUUID|UserAuthAssetAid|route|referer|div_display|xCloseNew|isTip_topSub|authormes|AUTH_SESSION_ID|check|connect\.sid|acw_tc|userislogincookie|LoginAccount|_ga|_gid)/i;
const isShortTtl = (name) => SHORT_TTL.test(name || '');

const DB_SIGNS = [
  { name: '威科先行', re: /wkinfo/i },
  { name: '北大法宝', re: /pkulaw/i },
  { name: '中国知网', re: /cnki/i },
];
const CARSI_SIGNS = [
  { name: '天财 IdP', re: /idp\.tjufe/i },
  { name: '天财 SSO', re: /sso\.tjufe/i },
  { name: 'CARSI SP(法宝)', re: /sp-pkulaw\.carsi/i },
];

console.log(`\n登录态文件：${path}`);
console.log(`cookies ${cookies.length} 条，origins ${origins.length} 个\n`);

console.log('── 各库覆盖 ─────────────────────────');
let anyExpiring = false;
for (const db of DB_SIGNS) {
  const cs = cookies.filter((c) => db.re.test(c.domain || ''));
  if (!cs.length) {
    console.log(`  ✗ ${db.name.padEnd(10)} 无 cookie（未登录 / 未导出）`);
    continue;
  }
  const sessions = cs.filter((c) => !c.expires || c.expires <= 0).length;
  // 只看与登录相关的 cookie，排除埋点
  const real = cs.filter((c) => !isShortTtl(c.name));
  const dated = real.filter((c) => c.expires > 0);
  const gone = dated.filter((c) => c.expires - now <= 0);
  const expiring = dated.filter((c) => c.expires - now > 0 && c.expires - now < 3 * DAY);
  if (expiring.length || gone.length) anyExpiring = true;
  const soonest = dated.slice().sort((a, b) => a.expires - b.expires)[0];
  console.log(
    `  ✓ ${db.name.padEnd(10)} ${String(cs.length).padStart(3)} 条` +
      `  （session 级 ${sessions}）` +
      (soonest ? `  登录项最早到期 ${fmt(soonest.expires)}` : '') +
      (gone.length ? `  ⚠ 已过期 ${gone.length}` : '') +
      (expiring.length ? `  ⚠ 3 天内到期 ${expiring.length}` : '')
  );
  if (gone.length || expiring.length) {
    const names = [...gone, ...expiring]
      .slice(0, 4)
      .map((c) => `${c.name.slice(0, 26)}(${fmt(c.expires)})`)
      .join(', ');
    console.log(`      ↳ ${names}`);
  }
}

console.log('\n── CARSI / 天财 公共段 ──────────────');
for (const s of CARSI_SIGNS) {
  const cs = cookies.filter((c) => s.re.test(c.domain || ''));
  console.log(`  ${cs.length ? '✓' : '✗'} ${s.name.padEnd(14)} ${cs.length} 条`);
}

const idp = cookies.some((c) => /idp\.tjufe/i.test(c.domain || ''));
console.log(
  idp
    ? '\n→ 天财 IdP 会话在：CARSI 各库可能免密一跳。'
    : '\n→ 无天财 IdP 会话：未必需要输密码 —— 天财 SSO 服务端会话可能仍存活（2026-09-10 实测：浏览器侧无 tjufe cookie，重登法宝仍免密通过）。直接试走一遍，别预先假定要输密码。'
);

if (anyExpiring) {
  console.log('⚠ 有 cookie 即将/已经过期 —— 建议走 SKILL.md 的 A. 重登。\n');
} else {
  console.log('');
}
