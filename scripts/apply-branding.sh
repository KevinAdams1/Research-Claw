#!/usr/bin/env bash
# Regenerate pnpm patch for Research-Claw (branding + .ResearchClaw bootstrap)
#
# This script creates a pnpm patch that:
#   1. Branding: process title, version output, error prefixes, daemon CLI
#   2. Bootstrap: .ResearchClaw/ directory override for workspace bootstrap files
#
# Usage:
#   ./scripts/apply-branding.sh
#
# Prerequisites:
#   - pnpm install must have been run first (without patch)
#   - openclaw must be in node_modules/
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Generating Research-Claw patch (branding + bootstrap) ==="

# 1. Check openclaw is installed
if [ ! -d "node_modules/openclaw" ]; then
  echo "ERROR: node_modules/openclaw not found. Run 'pnpm install' first."
  exit 1
fi

VERSION=$(node -e "console.log(require('./node_modules/openclaw/package.json').version)")
PATCH_DIR="patches"
PATCH_FILE="${PATCH_DIR}/openclaw@${VERSION}.patch"

echo "OpenClaw version: $VERSION"
echo "Patch target: $PATCH_FILE"

# 2. Check if patch already exists
if [ -f "$PATCH_FILE" ]; then
  echo "Patch file already exists: $PATCH_FILE"
  echo "To regenerate, delete it first, then re-run this script."
  exit 0
fi

# 3. Create pnpm patch edit directory
mkdir -p "$PATCH_DIR"
EDIT_DIR="/tmp/oc-patch-$$"
rm -rf "$EDIT_DIR"
pnpm patch "openclaw@${VERSION}" --edit-dir "$EDIT_DIR"

echo ""

# ── 4. Branding: entry.js ─────────────────────────────────────────
ENTRY_FILE="$EDIT_DIR/dist/entry.js"
if [ ! -f "$ENTRY_FILE" ]; then
  echo "ERROR: $ENTRY_FILE not found. OpenClaw package structure may have changed."
  rm -rf "$EDIT_DIR"
  exit 1
fi

echo "Applying branding to entry.js ..."
sed -i '' 's/process\$1\.title = "openclaw"/process$1.title = "research-claw"/' "$ENTRY_FILE"
sed -i '' 's/`OpenClaw /`Research-Claw /g' "$ENTRY_FILE"
sed -i '' 's/\[openclaw\]/[research-claw]/g' "$ENTRY_FILE"

# ── 5. Branding: daemon-cli.js ────────────────────────────────────
DAEMON_FILE="$EDIT_DIR/dist/cli/daemon-cli.js"
if [ -f "$DAEMON_FILE" ]; then
  echo "Applying branding to daemon-cli.js ..."
  sed -i '' 's/Please upgrade OpenClaw/Please upgrade Research-Claw/g' "$DAEMON_FILE"
fi

# ── 6. Bootstrap: .ResearchClaw directory override ─────────────────
# Inject resolveBootstrapFilePath() into each agent-scope chunk and
# redirect all 7 bootstrap file paths through it.
echo "Applying .ResearchClaw bootstrap override ..."

CHUNK_COUNT=0
for CHUNK in "$EDIT_DIR"/dist/agent-scope-*.js; do
  [ -f "$CHUNK" ] || continue
  CHUNK_COUNT=$((CHUNK_COUNT + 1))
  BASENAME=$(basename "$CHUNK")

  # 6a. Insert resolveBootstrapFilePath function before loadWorkspaceBootstrapFiles
  sed -i '' '/^async function loadWorkspaceBootstrapFiles(dir) {/i\
function resolveBootstrapFilePath(resolvedDir, name) {\
	const rcPath = path.join(resolvedDir, ".ResearchClaw", name);\
	try { fs.accessSync(rcPath, fs.constants.F_OK); return rcPath; } catch { return path.join(resolvedDir, name); }\
}\
' "$CHUNK"

  # 6b. Replace all 7 filePath: path.join(...) with resolveBootstrapFilePath(...)
  for CONST in DEFAULT_AGENTS_FILENAME DEFAULT_SOUL_FILENAME DEFAULT_TOOLS_FILENAME \
               DEFAULT_IDENTITY_FILENAME DEFAULT_USER_FILENAME DEFAULT_HEARTBEAT_FILENAME \
               DEFAULT_BOOTSTRAP_FILENAME; do
    sed -i '' "s/filePath: path\.join(resolvedDir, ${CONST})/filePath: resolveBootstrapFilePath(resolvedDir, ${CONST})/g" "$CHUNK"
  done

  # 6c. Verify
  COUNT=$(grep -c "resolveBootstrapFilePath" "$CHUNK")
  echo "  $BASENAME: $COUNT occurrences (expect 8 = 1 def + 7 calls)"
  if [ "$COUNT" -ne 8 ]; then
    echo "  WARNING: unexpected count in $BASENAME! Manual review needed."
  fi
done

if [ "$CHUNK_COUNT" -eq 0 ]; then
  echo "ERROR: No agent-scope-*.js chunks found! OC build structure may have changed."
  rm -rf "$EDIT_DIR"
  exit 1
fi
echo "  Patched $CHUNK_COUNT agent-scope chunks."

# ── 7. Commit patch ───────────────────────────────────────────────
echo ""
echo "Committing patch..."
pnpm patch-commit "$EDIT_DIR" --patches-dir "$PATCH_DIR"

# ── 8. Verify ─────────────────────────────────────────────────────
echo ""
echo "=== Verification ==="
BRAND_COUNT=$(grep -c "research-claw" "node_modules/openclaw/dist/entry.js" 2>/dev/null || echo 0)
echo "  Branding in entry.js: $BRAND_COUNT (expect >=6)"

for f in node_modules/openclaw/dist/agent-scope-*.js; do
  [ -f "$f" ] || continue
  BC=$(grep -c "resolveBootstrapFilePath" "$f" 2>/dev/null || echo 0)
  echo "  Bootstrap in $(basename $f): $BC (expect 8)"
done

echo ""
echo "=== Patch generated: $PATCH_FILE ==="
echo "The patch will be auto-applied on 'pnpm install'."
echo "Commit the patch file to version control."
