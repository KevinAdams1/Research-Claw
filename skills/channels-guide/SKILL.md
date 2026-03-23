---
name: Channels Guide
description: >-
  Configuration and behavior guide for Research-Claw IM channels
  (Telegram, Discord, WeChat). Covers bot token setup, commands.native
  suppression, approval_card degradation, cron delivery, media paths,
  and diagnostic steps for channel connectivity issues.
---

<!-- MAINTENANCE NOTES:
     Source: AGENTS.md §3 Channels (extracted during prompt redesign).
     Update here when adding channel types or protocols.
     commands.native=false enforced by sync-global-config.cjs.
     WeChat creds: ~/.openclaw/openclaw-weixin/accounts/
-->

# IM Channel Configuration

RC can receive/reply via Telegram, Discord, WeChat (微信), Feishu (飞书),
QQ, Slack, WhatsApp. Channels are OC infrastructure — RC reuses them fully.

## Connection Protocols

### Bot-Token Type (Telegram / Discord / Feishu / QQ / Slack)

1. Guide user to create a bot on the platform and obtain a token.
2. Write config via `config.patch`:
   - Telegram: `{ channels: { telegram: { botToken: "...", enabled: true } } }`
   - Discord: `{ channels: { discord: { token: "...", enabled: true } } }`
   - Others: see platform OC docs for field names.
3. Telegram: user must send "/start" in the bot chat to receive replies.
4. `commands.native` must be `false` (530+ tools exceed IM menu limits).
   `sync-global-config.cjs` auto-fixes this on startup.

### WeChat (微信) — QR Scan

**Prerequisite**: `openclaw-weixin` plugin installed and in `plugins.allow`.

Use the `weixin_login` agent tool (two-step flow):

1. Call `weixin_login { action: "start" }`.
   - Returns QR code URL in markdown: `![weixin-qr](https://...)`.
   - Display the image to the user and prompt them to scan with WeChat.
2. Call `weixin_login { action: "wait", timeoutMs: 120000 }`.
   - Blocks until the user scans or timeout.
   - On success, plugin auto-saves credentials; gateway auto-starts channel.
3. WeChat cannot send proactive messages — replies only (contextToken mechanism).

### WhatsApp — QR Scan

Use the `whatsapp_login` agent tool (two-step flow):

1. Call `whatsapp_login { action: "start" }`.
   - Returns QR code as base64 data URL in markdown: `![qr](data:image/png;base64,...)`.
2. Call `whatsapp_login { action: "wait", timeoutMs: 120000 }`.
   - Blocks until the user scans or timeout.

## In-Channel Behavior

- All RC tools (library, tasks, workspace, monitor) are **fully available**.
- Keep replies under 2000 characters (IM message limit).
- Do not use Markdown tables (most IM clients do not render them).
- `approval_card` degrades to text: "需要审批: xxx. 回复 yes/no".
- Media requires absolute paths via the media parameter.
- Peer ID formats differ: WeChat `xxx@im.wechat`, Telegram numeric IDs.

## Diagnostics

If a channel shows "not configured" or "Error":

1. **plugins.allow** — is the channel plugin listed?
2. **Credential path** — correct location? WeChat: `~/.openclaw/openclaw-weixin/accounts/`. Telegram/Discord: OC config.
3. **Gateway restart** — restarted after credentials placed? Runtime caches state at startup.
4. **better-sqlite3 ABI** — native module must match gateway's Node version.

## Related Research-Plugins Skills

No RP skills directly apply to IM channel configuration. Channels are OC infrastructure.
