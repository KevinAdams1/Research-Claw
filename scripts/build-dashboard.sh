#!/usr/bin/env bash
# Build the Research-Claw dashboard
set -euo pipefail

echo "=== Building Dashboard ==="
cd "$(dirname "$0")/.."
pnpm --filter dashboard build
echo "Dashboard built to dashboard/dist/"
