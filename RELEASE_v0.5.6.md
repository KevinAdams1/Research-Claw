# Research-Claw v0.5.6

> Release date: 2026-03-20

## Features

### Zotero 3-Tier Bridge
- **SQLite direct** — read `~/Zotero/zotero.sqlite` offline, fastest
- **Local API** — `localhost:23119`, requires Zotero running
- **Web API v3** — `api.zotero.org`, full CRUD (write requires approval_card)
- 8 new tools: `library_zotero_local_*`, `library_zotero_web_*`

### Chat Collect-Mode Persistence
- User messages queued behind active runs no longer vanish on F5
- WS reconnection preserves pending run state (was unconditionally cleared)
- SessionStorage with 3-min auto-expiry

### New Skills
- **md2pdf-export** — Puppeteer Markdown → PDF, 3 academic themes
- **claude-code / codex-cli / opencode-cli** — Professional tool delegation (AGENTS.md §4)

### Prompt v3.4
- 47 tools (was 39), Layer 0 reference manager import chain
- §4 Professional Tool Delegation protocol
- research-sop: Zotero/EndNote fallback chains + Docker guidance

## Fixes

- **install.sh** — `ln -sf` symlink → wrapper script; fixes Linux `MODULE_NOT_FOUND` on `openclaw channels add` (#19)
- **README uninstall** — `pnpm stop` (不存在) → `pkill -f`; 修正目录大小写; 补全 `rc-state` volume 清理
- **Settings panel** — model edits no longer silently reverted on WS reconnect (PR #18 by @KevinAdams1)
- **ApprovalCard** — text-based approval fallback for non-exec scenarios

## Stats
- Dashboard: 1071 tests (57 files), +25 new
- Plugin: 47 tools, 81 RPC, 8 hooks
- Prompt: AGENTS.md v3.4 (19,412/20,000 chars), TOOLS.md v3.3

## Contributors
- @KevinAdams1 — Settings panel model revert fix (PR #18)

## Upgrade
```bash
# Native
curl -fsSL https://wentor.ai/install.sh | bash

# Docker
docker pull ghcr.io/wentorai/research-claw:0.5.6
# or re-run:
curl -fsSL https://wentor.ai/docker-install.sh | bash

# Windows (PowerShell)
irm https://wentor.ai/docker-install.ps1 | iex
```
