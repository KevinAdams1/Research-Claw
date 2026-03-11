# Research-Claw 科研龙虾

AI-powered local academic research assistant — an [OpenClaw](https://openclaw.ai) satellite.

## Quick Start

### Prerequisites

- Node.js ≥ 22.12
- pnpm ≥ 9.0

### Install

```bash
git clone https://github.com/wentorai/research-claw.git
cd research-claw
pnpm install
```

### Setup

```bash
pnpm setup
# Follow prompts to configure your API key and preferences
```

### Start

```bash
pnpm start
# Dashboard: http://127.0.0.1:18789
```

### Development

```bash
pnpm dev
# Dashboard dev server: http://localhost:5174
# Gateway: http://127.0.0.1:18789
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Research-Claw                     │
│                                                  │
│  ┌──────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ Bootstrap │  │  Dashboard   │  │  Plugin    │ │
│  │  Files    │  │  React+Vite  │  │  research- │ │
│  │ (L0)      │  │  (L2)        │  │  claw-core │ │
│  └─────┬─────┘  └──────┬──────┘  │  (L1)      │ │
│        │               │         └──────┬─────┘ │
│        ▼               ▼                ▼       │
│  ┌──────────────────────────────────────────┐   │
│  │           OpenClaw (npm dep)             │   │
│  │     Gateway WS RPC v3 · Port 18789      │   │
│  └──────────────────────────────────────────┘   │
│        │                                         │
│  ┌─────┴─────┐                                  │
│  │ pnpm patch │  ~20 lines, 7 files (L3)       │
│  └───────────┘                                   │
└─────────────────────────────────────────────────┘
```

**Coupling Tiers:**
- **L0** — Filesystem: bootstrap files, skills, config overlay
- **L1** — Plugin SDK: tools, RPC methods, hooks, services
- **L2** — WS RPC: Dashboard communicates via gateway WebSocket
- **L3** — pnpm patch: minimal branding changes (~20 lines)

## Documentation

See [`docs/00-reference-map.md`](docs/00-reference-map.md) for the complete documentation index.

## License

MIT — see [LICENSE](LICENSE)
