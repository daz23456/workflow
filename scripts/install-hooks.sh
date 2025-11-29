#!/usr/bin/env bash

###############################################################################
# Git Hooks Installer
#
# Purpose: Install pre-commit hook automatically
#
# Usage:
#   ./scripts/install-hooks.sh
#
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

echo -e "\n${BOLD}${CYAN}Installing Git Hooks...${NC}\n"

# Check if in git repository
if [[ ! -d ".git" ]]; then
    echo "❌ Error: Not in a git repository"
    echo "Run this from the repository root"
    exit 1
fi

# Install pre-commit hook
HOOK_SOURCE="$(pwd)/scripts/pre-commit-hook.sh"
HOOK_TARGET=".git/hooks/pre-commit"

if [[ ! -f "$HOOK_SOURCE" ]]; then
    echo "❌ Error: Pre-commit hook not found at $HOOK_SOURCE"
    exit 1
fi

# Backup existing hook if present
if [[ -f "$HOOK_TARGET" ]]; then
    print_warning "Existing pre-commit hook found"
    cp "$HOOK_TARGET" "${HOOK_TARGET}.backup"
    print_info "Backed up to ${HOOK_TARGET}.backup"
fi

# Create symlink
ln -sf "$HOOK_SOURCE" "$HOOK_TARGET"
chmod +x "$HOOK_TARGET"

print_success "Pre-commit hook installed"

# Test hook
print_info "Testing hook..."
if "$HOOK_TARGET" > /dev/null 2>&1; then
    print_success "Hook is working!"
else
    print_warning "Hook test returned non-zero (this may be expected if tests are failing)"
fi

echo -e "\n${BOLD}Installation Complete!${NC}\n"

echo "The pre-commit hook will now run automatically before every commit."
echo ""
echo "What it checks:"
echo "  ✅ Build succeeds"
echo "  ✅ Tests pass (unit tests only)"
echo "  ✅ Linting (warning only, not blocking)"
echo ""
echo "To bypass (use sparingly!):"
echo "  git commit --no-verify"
echo ""
echo "Environment variables:"
echo "  SKIP_LINT=1 git commit       # Skip linting"
echo "  PRE_COMMIT_FAST=1 git commit # Skip tests (build only)"
echo ""
