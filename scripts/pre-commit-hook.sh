#!/usr/bin/env bash

###############################################################################
# Pre-Commit Hook
#
# Purpose: Prevent commits with failing tests or build errors
#
# Installation:
#   ln -s ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Usage:
#   This hook runs automatically before every commit
#   To bypass: git commit --no-verify (use sparingly!)
#
# What it checks:
#   1. Build succeeds (fast check)
#   2. Tests pass (unit tests only, not integration/E2E)
#   3. No obvious linting errors (optional, can disable with SKIP_LINT=1)
#
# Environment Variables:
#   SKIP_LINT=1        Skip linting checks
#   SKIP_TESTS=1       Skip test checks (NOT RECOMMENDED)
#   PRE_COMMIT_FAST=1  Only check build, skip tests (for quick WIP commits)
#
# Exit Codes:
#   0 - All checks passed, commit allowed
#   1 - Checks failed, commit blocked
#
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Detect tech stack
detect_tech_stack() {
    if [[ -f "package.json" ]]; then
        echo "typescript"
    elif ls *.sln &>/dev/null || ls src/**/*.csproj &>/dev/null; then
        echo "dotnet"
    else
        echo "unknown"
    fi
}

# Check build
check_build() {
    local tech_stack=$(detect_tech_stack)

    print_info "Checking build..."

    if [[ "$tech_stack" == "dotnet" ]]; then
        if dotnet build --no-restore --nologo --verbosity quiet > /dev/null 2>&1; then
            print_success "Build passed"
            return 0
        else
            print_error "Build failed"
            echo ""
            echo "Run this to see errors:"
            echo "  dotnet build"
            return 1
        fi
    elif [[ "$tech_stack" == "typescript" ]]; then
        if npm run build --silent > /dev/null 2>&1; then
            print_success "Build passed"
            return 0
        else
            print_error "Build failed"
            echo ""
            echo "Run this to see errors:"
            echo "  npm run build"
            return 1
        fi
    else
        print_warning "Could not detect tech stack, skipping build check"
        return 0
    fi
}

# Check tests
check_tests() {
    local tech_stack=$(detect_tech_stack)

    if [[ -n "$SKIP_TESTS" ]]; then
        print_warning "Tests skipped (SKIP_TESTS=1)"
        return 0
    fi

    if [[ -n "$PRE_COMMIT_FAST" ]]; then
        print_warning "Tests skipped (PRE_COMMIT_FAST=1)"
        return 0
    fi

    print_info "Running tests..."

    if [[ "$tech_stack" == "dotnet" ]]; then
        # Only run unit tests, skip integration/E2E
        if dotnet test --no-build --no-restore --filter "Category!=Integration&Category!=E2E" --nologo --verbosity quiet > /dev/null 2>&1; then
            print_success "Tests passed"
            return 0
        else
            print_error "Tests failed"
            echo ""
            echo "Run this to see failures:"
            echo "  dotnet test"
            return 1
        fi
    elif [[ "$tech_stack" == "typescript" ]]; then
        # Run unit tests only
        if npm test --silent -- --run > /dev/null 2>&1; then
            print_success "Tests passed"
            return 0
        else
            print_error "Tests failed"
            echo ""
            echo "Run this to see failures:"
            echo "  npm test"
            return 1
        fi
    else
        print_warning "Could not detect tech stack, skipping test check"
        return 0
    fi
}

# Check linting (optional)
check_linting() {
    local tech_stack=$(detect_tech_stack)

    if [[ -n "$SKIP_LINT" ]]; then
        print_info "Linting skipped (SKIP_LINT=1)"
        return 0
    fi

    print_info "Checking code style..."

    if [[ "$tech_stack" == "dotnet" ]]; then
        if dotnet format --verify-no-changes --no-restore --verbosity quiet > /dev/null 2>&1; then
            print_success "Linting passed"
            return 0
        else
            print_warning "Code style issues found (not blocking)"
            echo ""
            echo "Run this to fix:"
            echo "  dotnet format"
            # Not blocking for linting
            return 0
        fi
    elif [[ "$tech_stack" == "typescript" ]]; then
        if npm run lint --silent > /dev/null 2>&1; then
            print_success "Linting passed"
            return 0
        else
            print_warning "Linting issues found (not blocking)"
            echo ""
            echo "Run this to see issues:"
            echo "  npm run lint"
            # Not blocking for linting
            return 0
        fi
    else
        print_info "Linting skipped (no tech stack detected)"
        return 0
    fi
}

# Main execution
main() {
    print_header "🔍 Pre-Commit Checks"

    local failed=0

    # Run checks
    if ! check_build; then
        failed=1
    fi

    if ! check_tests; then
        failed=1
    fi

    check_linting  # Non-blocking

    # Summary
    echo ""
    if [[ $failed -eq 0 ]]; then
        print_header "✅ All Checks Passed - Commit Allowed"
        print_info "Time saved: Caught issues before committing!"
        echo ""
        exit 0
    else
        print_header "❌ Checks Failed - Commit Blocked"
        echo ""
        print_error "Your commit was blocked because checks failed."
        echo ""
        echo "Options:"
        echo "  1. Fix the issues and try committing again (RECOMMENDED)"
        echo "  2. Bypass with: git commit --no-verify (use sparingly!)"
        echo ""
        print_info "Why we block commits:"
        print_info "  - Failing tests = broken code in history"
        print_info "  - Build errors = can't deploy"
        print_info "  - Fixing now takes 2 min, debugging later takes 2 hours"
        echo ""
        exit 1
    fi
}

# Run main
main
