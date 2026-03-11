#!/usr/bin/env bash
# Backup Research-Claw workspace, config, sessions, and database
#
# Full logic defined in docs/06-install-startup-design.md
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/research-claw-${TIMESTAMP}"

echo "=== Research-Claw Backup ==="
echo "Backup to: $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

# Workspace (bootstrap files)
[ -d workspace ] && cp -r workspace "$BACKUP_DIR/workspace"

# Config
[ -d config ] && cp -r config "$BACKUP_DIR/config"

# SQLite database
DB_PATH=".research-claw/library.db"
[ -f "$DB_PATH" ] && cp "$DB_PATH" "$BACKUP_DIR/"

# .env (contains API keys)
[ -f .env ] && cp .env "$BACKUP_DIR/.env"

echo "Backup complete: $BACKUP_DIR"
ls -la "$BACKUP_DIR"
