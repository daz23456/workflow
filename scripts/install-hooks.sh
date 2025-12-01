#!/usr/bin/env bash

###############################################################################
# Git Hooks Installation Script
#
# Installs framework enforcement hooks:
# - pre-commit: Validates stage-proofs commits
#
# Usage:
#   ./scripts/install-hooks.sh
#
###############################################################################

set -euo pipefail

echo "🔧 Installing git hooks..."

HOOKS_SRC="scripts/hooks"
HOOKS_DEST=".git/hooks"

# Check if we're in a git repo
if [[ ! -d ".git" ]]; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Create hooks directory if needed
mkdir -p "$HOOKS_DEST"

# Install pre-commit hook
if [[ -f "$HOOKS_SRC/pre-commit" ]]; then
    cp "$HOOKS_SRC/pre-commit" "$HOOKS_DEST/pre-commit"
    chmod +x "$HOOKS_DEST/pre-commit"
    echo "✅ Installed: pre-commit"
else
    echo "⚠️  Not found: $HOOKS_SRC/pre-commit"
fi

echo ""
echo "✅ Git hooks installed!"
echo ""
echo "Hooks will now enforce:"
echo "  • Proof files have no placeholders before commit"
echo "  • CHANGELOG.md is updated when committing stage-proofs"
echo "  • Warning if gate outputs are missing"
echo ""
echo "To uninstall: rm .git/hooks/pre-commit"
