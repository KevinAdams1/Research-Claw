#!/usr/bin/env bash
# Update OpenClaw dependency and re-apply branding patch
#
# Full logic defined in docs/06-install-startup-design.md
set -euo pipefail

echo "=== Syncing upstream OpenClaw ==="

# 1. Update openclaw to latest
pnpm update openclaw

# 2. Check if patch still applies
echo "Checking patch compatibility..."
NEW_VERSION=$(node -e "console.log(require('./node_modules/openclaw/package.json').version)")
echo "New OpenClaw version: $NEW_VERSION"

# 3. Re-apply branding if version changed
# TODO: Regenerate patch if needed

# 4. Build extensions
echo "Building extensions..."
pnpm build:extensions

# 5. Build dashboard
echo "Building dashboard..."
pnpm build:dashboard

# 6. Run tests
echo "Running tests..."
pnpm test

echo "=== Sync complete ==="
