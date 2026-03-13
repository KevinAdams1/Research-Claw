#!/usr/bin/env bash
# Update OpenClaw dependency and re-apply branding patch
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Syncing upstream OpenClaw ==="

OLD_VERSION=$(node -e "console.log(require('./node_modules/openclaw/package.json').version)")
echo "Current OpenClaw version: $OLD_VERSION"

# 1. Update openclaw to latest
pnpm update openclaw

NEW_VERSION=$(node -e "console.log(require('./node_modules/openclaw/package.json').version)")
echo "New OpenClaw version: $NEW_VERSION"

# 2. Check if patch still applies
if [ "$OLD_VERSION" != "$NEW_VERSION" ]; then
  echo "Version changed — checking if branding patch needs regeneration..."
  PATCH_FILE="patches/openclaw@${OLD_VERSION}.patch"
  if [ -f "$PATCH_FILE" ]; then
    echo "WARNING: Old patch exists at $PATCH_FILE"
    echo "  Run: ./scripts/apply-branding.sh to regenerate for v$NEW_VERSION"
  fi
fi

# 3. Build
echo "Building extensions..."
pnpm run build:extensions

echo "Building dashboard..."
pnpm run build:dashboard

# 4. Run tests
echo "Running tests..."
pnpm test

echo "=== Sync complete (OpenClaw v$NEW_VERSION) ==="
