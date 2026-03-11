#!/usr/bin/env bash
# Research-Claw One-Click Install (macOS/Linux)
# Usage: curl -fsSL https://wentor.ai/install-claw.sh | bash
#
# Full logic defined in docs/06-install-startup-design.md
set -euo pipefail

echo "=== Research-Claw Installer ==="

# 1. Detect OS/arch
OS="$(uname -s)"
ARCH="$(uname -m)"
echo "Platform: $OS/$ARCH"

# 2. Check Node.js >= 22.12
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install Node.js >= 22.12 first."
  exit 1
fi
NODE_VERSION="$(node -v | sed 's/^v//')"
echo "Node.js: $NODE_VERSION"
# TODO: Version comparison check

# 3. Check pnpm
if ! command -v pnpm &>/dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm@latest
fi
echo "pnpm: $(pnpm -v)"

# 4. Clone repo
# TODO: git clone https://github.com/wentorai/research-claw.git

# 5. Install dependencies
# pnpm install

# 6. Install research-plugins
# pnpm add @wentorai/research-plugins

# 7. Copy config template
# cp config/openclaw.example.json config/openclaw.json

echo "=== Installation complete ==="
echo "Run 'pnpm setup' to configure your API key."
