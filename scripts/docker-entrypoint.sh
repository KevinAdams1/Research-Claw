#!/bin/sh
# Research-Claw Docker entrypoint with auto-restart.
# Gateway exits on SIGUSR1 after config save — this loop restarts it.

CONFIG_DIR=/app/config
CONFIG_FILE=$CONFIG_DIR/openclaw.json
CONFIG_VERSION_FILE=$CONFIG_DIR/.config-version
IMAGE_VERSION="0.5.2"

# Seed or refresh config when image version changes
mkdir -p "$CONFIG_DIR"
CURRENT_VERSION=""
if [ -f "$CONFIG_VERSION_FILE" ]; then
  CURRENT_VERSION=$(cat "$CONFIG_VERSION_FILE")
fi

if [ ! -f "$CONFIG_FILE" ] || [ "$CURRENT_VERSION" != "$IMAGE_VERSION" ]; then
  cp /defaults/openclaw.example.json "$CONFIG_FILE"
  echo "$IMAGE_VERSION" > "$CONFIG_VERSION_FILE"
  echo "[research-claw] Config initialized/updated for v$IMAGE_VERSION"
fi

# --- Docker-specific config overrides ---
# The config template is designed for native (loopback) use. Docker requires:
#   - bind: "lan" (container must be reachable from host via port mapping)
#   - dangerouslyAllowHostHeaderOriginFallback: true (OC v2026.2.26+ requires
#     explicit allowedOrigins for non-loopback; Host-header fallback is safe
#     because Docker Desktop only exposes the mapped port to localhost)
#   - dangerouslyDisableDeviceAuth: true (no device pairing in Docker)
# Also clean stale entries that cause warnings on every boot.
node -e "
  const fs = require('fs');
  const f = '$CONFIG_FILE';
  const c = JSON.parse(fs.readFileSync(f, 'utf8'));
  let changed = false;

  // Gateway: ensure Docker-compatible settings
  if (!c.gateway) c.gateway = {};
  if (c.gateway.bind !== 'lan') { c.gateway.bind = 'lan'; changed = true; }
  if (!c.gateway.controlUi) c.gateway.controlUi = {};
  if (!c.gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback) {
    c.gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback = true;
    changed = true;
  }
  if (!c.gateway.controlUi.dangerouslyDisableDeviceAuth) {
    c.gateway.controlUi.dangerouslyDisableDeviceAuth = true;
    changed = true;
  }

  // Clean stale plugin entries (wentor-connect is a placeholder, never functional)
  if (c.plugins?.entries?.['wentor-connect']) {
    delete c.plugins.entries['wentor-connect'];
    changed = true;
  }
  // v0.5.2+: auto-discover replaces plugins.allow whitelist
  if (c.plugins?.allow) {
    delete c.plugins.allow;
    changed = true;
  }

  // Clean stale tool names from alsoAllow
  const STALE_TOOLS = ['search_papers', 'get_paper', 'get_citations',
    'radar_configure', 'radar_get_config', 'radar_scan'];
  if (c.tools?.alsoAllow) {
    const before = c.tools.alsoAllow.length;
    c.tools.alsoAllow = c.tools.alsoAllow.filter(t => !STALE_TOOLS.includes(t));
    if (c.tools.alsoAllow.length !== before) changed = true;
  }

  if (changed) fs.writeFileSync(f, JSON.stringify(c, null, 2) + '\n');
"

# --- Sync bootstrap prompt files from image → volume ---
# L1 system prompts: always force-update from image (safe — no user data).
RC_DIR=/app/workspace/.ResearchClaw
BP=/defaults/bootstrap-prompts
mkdir -p "$RC_DIR"
for f in AGENTS.md SOUL.md TOOLS.md IDENTITY.md HEARTBEAT.md; do
  [ -f "$BP/$f" ] && cp "$BP/$f" "$RC_DIR/$f"
done
# L2 onboarding: only create if not yet completed (.done absent)
if [ ! -f "$RC_DIR/BOOTSTRAP.md" ] && [ ! -f "$RC_DIR/BOOTSTRAP.md.done" ] && [ -f "$BP/BOOTSTRAP.md.example" ]; then
  cp "$BP/BOOTSTRAP.md.example" "$RC_DIR/BOOTSTRAP.md"
fi
# L3 user data: only initialize if missing (never overwrite)
[ ! -f "$RC_DIR/USER.md" ] && [ -f "$BP/USER.md.example" ] && cp "$BP/USER.md.example" "$RC_DIR/USER.md"
[ ! -f /app/workspace/MEMORY.md ] && [ -f "$BP/MEMORY.md.example" ] && cp "$BP/MEMORY.md.example" /app/workspace/MEMORY.md
[ ! -f /app/workspace/USER.md ] && [ -f "$BP/ws-USER.md.example" ] && cp "$BP/ws-USER.md.example" /app/workspace/USER.md

# Default gateway token matches dashboard's DEFAULT_TOKEN for seamless access.
# Override via env: docker run -e OPENCLAW_GATEWAY_TOKEN=your-secret ...
if [ -z "$OPENCLAW_GATEWAY_TOKEN" ]; then
  OPENCLAW_GATEWAY_TOKEN="research-claw"
  export OPENCLAW_GATEWAY_TOKEN
fi

echo "[research-claw] Starting gateway on port 28789..."
echo "[research-claw] Open dashboard: http://127.0.0.1:28789/?token=$OPENCLAW_GATEWAY_TOKEN"
echo "[research-claw] Gateway token: $OPENCLAW_GATEWAY_TOKEN"
echo "[research-claw] (Tip: set OPENCLAW_GATEWAY_TOKEN env var for a fixed token)"

STOP=false
trap 'STOP=true' INT TERM

while true; do
  OPENCLAW_CONFIG_PATH=$CONFIG_FILE \
    node /app/node_modules/openclaw/dist/entry.js \
    gateway run --allow-unconfigured --auth token --port 28789 --bind lan --force
  CODE=$?

  if [ "$STOP" = "true" ]; then
    exit 0
  fi

  echo "[research-claw] Gateway exited (code $CODE) — restarting in 3s..."
  sleep 3
done
