#!/bin/sh
set -e

# If config dir is an empty volume on first run, seed from the baked-in template
if [ ! -f /app/config/openclaw.json ]; then
  mkdir -p /app/config
  cp /defaults/openclaw.example.json /app/config/openclaw.json
  echo "[research-claw] Config initialized from template — open http://127.0.0.1:28789 to complete setup"
fi

exec env OPENCLAW_CONFIG_PATH=/app/config/openclaw.json \
  node /app/node_modules/openclaw/dist/entry.js \
  gateway run --allow-unconfigured --auth none --port 28789 --force
