# Research-Claw Global Operation Log

> Unified changelog across all development tracks.
> Per-track details: see individual SOP files (S1-S4).

---

## Format

```
[YYYY-MM-DD] [Track] [Agent/Author] — Description
```

Tracks: `Dashboard` (S1), `Modules` (S2), `Plugins` (S3), `Prompt` (S4), `Infra` (general)

---

## Log

### 2026-03-11 — Project Initialization

- [2026-03-11] [Infra] [Claude] Created satellite workspace: 105 files, own git, initial commit
- [2026-03-11] [Infra] [Claude] 12 design documents (~17,534 lines): 00-06 + modules/03a-03f
- [2026-03-11] [Prompt] [Claude] 8 bootstrap files (24.5K chars): SOUL, AGENTS, HEARTBEAT, BOOTSTRAP, IDENTITY, USER, TOOLS, MEMORY
- [2026-03-11] [Dashboard] [Claude] Dashboard scaffold: 22 TSX/TS stub files, Vite + React + Ant Design
- [2026-03-11] [Modules] [Claude] Plugin scaffold: research-claw-core (16 TS stubs), wentor-connect (placeholder)
- [2026-03-11] [Infra] [Claude] 7 script stubs: setup, install, build-dashboard, apply-branding, health, backup, sync-upstream
- [2026-03-11] [Infra] [Claude] Config files: openclaw.json, openclaw.example.json, .env.example, .gitignore
- [2026-03-11] [Plugins] [Claude] research-plugins v1.0.0 published (NPM + PyPI + GitHub)

### 2026-03-11 — Plan 2 Consistency Audit & Fixes

- [2026-03-11] [Modules] [Claude] 03a: Added rc_paper_notes table (§2.10), 8 new RPC methods (rc.lit.batch_add through rc.lit.notes.delete). Total lit methods: 18→26
- [2026-03-11] [Modules] [Claude] 03b: Added 2 new RPC methods (rc.task.link, rc.task.notes.add). Total task methods: 8→10
- [2026-03-11] [Modules] [Claude] 03c: Added rc.ws.save method, clarified rc.ws.upload as HTTP-only. Total ws methods: 6→7
- [2026-03-11] [Modules] [Claude] 03f: Rewrote §6 RPC registry with canonical names, fixed priority enum critical→urgent. Total: 35→46 methods
- [2026-03-11] [Infra] [Claude] 00: Updated reference map (tables 10→12, RPC 35→46, tools 18→24)
- [2026-03-11] [Infra] [Claude] Config: Added 6 tools to alsoAllow (both openclaw.json and .example.json)
- [2026-03-11] [Prompt] [Claude] MEMORY.md: Restructured to v1.1 (Global + Current Focus + Projects)

### 2026-03-11 — SOP Framework

- [2026-03-11] [Infra] [Claude] Created docs/sop/ directory with 5 files:
  - S1: Dashboard Dev SOP (layout, components, gateway contract, standards)
  - S2: Modules Dev SOP (plugin structure, DB schema, RPC, tools, standards)
  - S3: Plugin Integration SOP (research-plugins, wentor-connect, SDK patterns)
  - S4: Prompt & Behavior SOP (bootstrap files, red lines, workflow, modification guide)
  - CHANGELOG.md: This file (global operation log)
- [2026-03-11] [Infra] [Claude] Updated 00-reference-map.md with SOP document entries (S1-S5)

### 2026-03-11 — External Cleanup

- [2026-03-11] [Infra] [Claude] Archived 4 obsolete openclaw docs from wentor/docs/ to docs/archive/:
  - openclaw-architecture-analysis.md (superseded by research-claw/docs/02)
  - openclaw-docs-and-skills-guide.md (superseded by research-claw/docs/05)
  - openclaw-commands-and-tools-reference.md (superseded by research-claw/docs/02 + RPC ref)
  - openclaw_setup_and_config.plan.md (superseded by research-claw/docs/06)
- [2026-03-11] [Infra] [Claude] Pulled openclaw to latest (5 new commits: agent tool policy, plugin subagent runtime, device token rotate)

### 2026-03-11 — Audit Pass 2 (version refs + deep consistency)

- [2026-03-11] [Infra] [User+Claude] Updated OpenClaw commit hash 144c1b80→62d5df28d in 00, 02, 03e (4 occurrences)
- [2026-03-11] [Infra] [User+Claude] Updated 02 tool count "18 tools"→"24 tools, 46 RPC methods"
- [2026-03-11] [Infra] [User+Claude] Updated 00 MEMORY.md char count 516→964
- [2026-03-11] [Infra] [User+Claude] Added OpenClaw plugin HTTP scope enforcement note to S3 SOP
- [2026-03-11] [Infra] [Claude] Fixed 04 bootstrap budget table: all 8 file sizes updated to actual values (14,841→24,951 total chars)
- [2026-03-11] [Infra] [Claude] Fixed 03f cross-reference counts: lit RPC 18→26, task RPC 8→10, ws RPC 6→7

### 2026-03-12 — Status Assessment (P0 + P1-S1 + P1-S2)

Comprehensive review of implementation progress across Infrastructure, Dashboard, and Module tracks.

- [2026-03-12] [Infra] [User+Claude] P0 Infrastructure assessed at **92% complete**: pnpm patch (openclaw@2026.3.8.patch, 78 lines), brand replacement (11 occurrences), package.json patchedDependencies, INFRA_REPORT.md, config files, setup.sh + install.sh all done. Only apply-branding.sh remains a stub.
- [2026-03-12] [Dashboard] [User+Claude] P1-S1 Dashboard Shell assessed at **95% complete**: GatewayClient (267 lines, full WS RPC v3), gateway types/hooks/reconnect, TopBar/LeftNav/StatusBar, ChatView/MessageBubble/MessageInput, SetupWizard (217 lines), App.tsx responsive grid, 7 Zustand stores (4 complete + 3 skeleton), theme system, i18n (131 keys each), global.css (188 lines). Remaining: 5 panel stubs + 6 card stubs (Phase 2) and tests (Phase 4).
- [2026-03-12] [Modules] [User+Claude] P1-S2 Module Builder assessed at **97% complete**: db/schema.ts (12 tables + FTS5), db/connection.ts (WAL mode), db/migrations.ts (v1), LiteratureService (27 methods), TaskService (13 methods incl. cron), WorkspaceService (6+ methods + init/destroy), GitTracker, Cards protocol (6 custom types; code_block handled by markdown renderer) + serializer, Literature tools (12) + RPC (26), Task tools (6) + RPC (10 + 3 cron), Workspace tools (6) + RPC (7) + HTTP upload, plugin entry index.ts (416 lines). 24 tools total confirmed accurate. Remaining: unit tests (Phase 4).
- [2026-03-12] [Infra] [Claude] Updated CHANGELOG pending work section to reflect actual completion status.

### 2026-03-12 — Design System Alignment Audit & i18n Completeness

Comprehensive consistency audit of Dashboard against `docs/FRONTEND_DESIGN_SYSTEM.md`.

- [2026-03-12] [Dashboard] [Claude] **Design token fixes in `theme.ts`:**
  - Added missing tokens: `bg.code` (#161618/#F5F0EA), `accent.redHover` (#DC2626/#B91C1C), `accent.blueHover` (#2563EB/#1D4ED8)
  - Updated `ThemeTokens` type to include new fields
  - Fixed Button `borderRadius`: 4 -> 8 (per design system section 5.1)
  - Fixed Input `borderRadius`: 4 -> 8 (per design system section 5.1)
- [2026-03-12] [Dashboard] [Claude] **CSS variable fixes in `global.css`:**
  - Added `--code-bg` to dark (#161618) and light (#F5F0EA) themes
  - Added `--accent-primary-hover` and `--accent-secondary-hover` to both themes
  - Fixed body `font-size`: 14px -> 15px (per design system section 3.2)
  - Fixed body `line-height`: 1.5 -> 1.7 (per design system section 3.2)
  - Fixed scrollbar thumb `border-radius`: 3px -> 9999px (per design system section 12)
- [2026-03-12] [Dashboard] [Claude] **i18n fixes:**
  - Added 5 missing keys: `chat.dismiss`, `status.versionFallback`, `status.modelDefault`, `status.modelNA`, `panel.awaitingPlugin`
  - Added matching zh-CN translations for all 5 keys
  - Fixed hardcoded strings in StatusBar (model default, N/A, version fallback)
  - Fixed hardcoded "x" dismiss button in ChatView -> HTML entity + aria-label
  - Fixed 5 panel stubs: hardcoded English -> i18n key `panel.awaitingPlugin`
  - Total: en.json 100 keys, zh-CN.json 100 keys, all matched
- [2026-03-12] [Dashboard] [Claude] **Doc sync:**
  - Updated 03e section 9.1: replaced outdated color values with actual implementation (aligned with FRONTEND_DESIGN_SYSTEM.md)
  - Updated 03e section 9.2: replaced outdated Ant Design token example with actual `getAntdThemeConfig()` implementation
  - Verified 00-reference-map.md counts still accurate (24 tools, 46 RPC, 12 tables)

---

## Completed Work

### Infrastructure (P0) — 92%

- [x] Generate pnpm patch (openclaw@2026.3.8.patch, 78 lines)
- [x] Brand replacement (11 occurrences across codebase)
- [x] package.json patchedDependencies config
- [x] INFRA_REPORT.md
- [x] Config files: openclaw.json + openclaw.example.json
- [x] scripts/install.sh (real implementation)
- [x] scripts/setup.sh (real implementation)

### Dashboard Shell (P1-S1) — 95%

- [x] GatewayClient (267 lines, full WS RPC v3 protocol)
- [x] gateway/types.ts, hooks.ts, reconnect.ts
- [x] TopBar, LeftNav, StatusBar (all complete)
- [x] ChatView, MessageBubble, MessageInput (all complete)
- [x] SetupWizard (217 lines, 1-step flow)
- [x] App.tsx with responsive grid layout
- [x] 7 Zustand stores (4 fully implemented + 3 skeleton for Phase 2)
- [x] Theme system (dark + light, HashMind aligned)
- [x] i18n: en.json + zh-CN.json (131 keys each)
- [x] global.css (188 lines)

### Module Builder (P1-S2) — 97%

- [x] db/schema.ts (12 tables + FTS5)
- [x] db/connection.ts (better-sqlite3 manager, WAL mode)
- [x] db/migrations.ts (v1)
- [x] LiteratureService (27 methods -- originally planned 26, 1 added)
- [x] TaskService (13 methods including cron -- originally planned 10, 3 added)
- [x] WorkspaceService (6+ methods + init/destroy)
- [x] GitTracker
- [x] Cards protocol (6 custom types; code_block handled by markdown renderer) + serializer
- [x] Literature tools (12) + RPC (26)
- [x] Task tools (6) + RPC (10 + 3 cron)
- [x] Workspace tools (6) + RPC (7) + HTTP upload
- [x] Plugin entry index.ts (416 lines, all registrations)
- [x] 6 hooks registered

---

## Pending Work

### Infrastructure (P0) — Remaining

- [ ] scripts/apply-branding.sh (currently a stub)
- [ ] End-to-end: install -> setup -> start -> chat test

### Dashboard (P1-S1) — Remaining (Phase 2+)

- [ ] 5 right panel tab components (Phase 2 scope)
- [ ] 6 message card components (Phase 2 scope)
- [ ] Tests: vitest + happy-dom for all components (Phase 4 scope)

### Modules (P1-S2) — Remaining (Phase 4)

- [ ] Unit tests: vitest with in-memory SQLite (Phase 4 scope)

### Plugins (S3)
- [ ] Verify research-plugins skill loading end-to-end
- [ ] Implement wentor-connect OAuth flow (post-MVP)
- [ ] Integration test: gateway + plugin + dashboard round-trip

### Prompt (S4)
- [ ] Behavioral testing with live agent
- [ ] Refine AGENTS.md workflow steps based on testing
- [ ] Tune HEARTBEAT.md thresholds based on user feedback

---

*Document: CHANGELOG | Created: 2026-03-11 | Last updated: 2026-03-12*
