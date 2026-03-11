#!/usr/bin/env bash
# Regenerate pnpm patch for Research-Claw branding
#
# This script modifies the installed openclaw package in node_modules
# and generates a pnpm patch file.
#
# Full logic defined in docs/06-install-startup-design.md
set -euo pipefail

echo "=== Generating Research-Claw branding patch ==="

VERSION=$(node -e "console.log(require('./node_modules/openclaw/package.json').version)")
PATCH_FILE="patches/openclaw@${VERSION}.patch"

echo "OpenClaw version: $VERSION"
echo "Patch file: $PATCH_FILE"

# TODO: Apply branding changes to node_modules/openclaw/ then run:
# pnpm patch-commit node_modules/openclaw --patch-dir patches

echo "Patch generation not yet implemented."
echo "See docs/02-engineering-architecture.md Section 14 for patch scope."
