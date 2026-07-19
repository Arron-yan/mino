# MEMORY.md - Long-Term Memory

*Your curated memories. The distilled essence, not raw logs.*

## About This File & Memory System

- **Be mindful in shared contexts** — this file contains personal context about your human. In group chats or shared sessions, don't leak private preferences, decisions, or project details

### Three-Layer Memory

Your memory has three layers, each with different responsibilities and access patterns:

**Core memory (this file, 04-MEMORY.md)** — Auto-loaded every session
- What goes here: cross-project lessons, key decisions, user preferences, technical knowledge, one-line project summaries + pointers
- What doesn't: detailed project experience (that's what topic files are for)
- **Add a timestamp `(YYYY-MM-DD)` to each entry** — helps trace back, judge recency, clean up

**Topic memory (`memory/topics/<name>.md`)** — Read before working on a project
- What goes here: full accumulated experience for one project/topic — status, key facts, what you did, what worked, what didn't, decisions and rationale, next steps
- More detailed than core memory (which only has pointers), more synthesized than daily logs (which are raw chronological notes)
- Update during memory maintenance or when a project enters a new phase

**Daily journal (`memory/YYYY-MM-DD.md`)** — Read today + yesterday at session start
- What goes here: what happened that day, raw chronological record
- This is the source of all memory, but searching it for specific project info is inefficient (multiple projects mixed in one day)

### Information Flow

```
Daily logs (raw material) → topic files (synthesized per-project) → 04-MEMORY (cross-project essence)
```

- During work: just write the daily log
- During maintenance: sync from logs to topics, distill new cross-project lessons to this file
- **Information lives in one place only** — don't duplicate between topic files and 04-MEMORY

### When to Read What

- Just woke up → this file is already loaded + read today/yesterday's logs
- About to work on a project → read its `memory/topics/<name>.md`
- Memory maintenance → read all recent logs + all active topic files

---

## Lessons Learned

Organize by topic as your lessons grow. A flat list becomes unreadable fast.

### Working Style

*(How you and your human work best together.)*

### Communication

*(Lessons about tone, format, language, audience.)*

### Technical

- **(2026-07-19) Git 通过 Clash 代理访问 GitHub** — 代理地址 `http://127.0.0.1:7890`，仅 git 操作需要。配置方式：`git config http.proxy http://127.0.0.1:7890`。Clash 默认端口 7890。

## Important Decisions

- **(2026-07-19) 桌面端为主，微信为辅** — 精细法律文书操作用 MyAgents 桌面端（可见工具过程、widget、权限审批）；碎片场景（开庭间隙、通勤路上、快速提问）用微信。核心能力一致，互补不替代。

## User Preferences

- **(2026-07-19)** 中文沟通，直接不废话。愿意为效率接受新技术工具。
- **(2026-07-19) Arron 的日常核心需求**：合同起草审核、法律检索、证据整理、文书格式规范化。优先级：省时间 > 炫技。

## Technical Knowledge

- **(2026-07-19) Git repo** `~/.myagents/projects/mino/` → GitHub `Arron-yan/mino`。User email `yyqdewyyx@163.com`。
- **(2026-07-19) Agent** ID `72fe51c5-f862-4d10-9dda-0485988c0c28`，微信 Channel 已配。

## Ongoing Context

- **(2026-07-19)** 基础建设阶段：身份确立、Git 仓库就绪、技能盘点完成。等待律所实际工作材料进入。下一步：引导 Arron 投喂第一份法律文件，建立工作节奏。

---

*Update this file as you learn. It's how you persist.*
