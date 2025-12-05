#!/usr/bin/env bash

###############################################################################
# Stage Initialization Script
#
# Creates all required files and directories for a new stage:
# 1. Stage directory structure
# 2. Proof file from template
# 3. Stage state file (for context recovery)
# 4. Stage brief (single-file reference)
#
# Usage:
#   ./scripts/init-stage.sh --stage 9.7 --name "Transform DSL" --profile BACKEND_DOTNET
#   ./scripts/init-stage.sh --stage 9.7 --name "Transform DSL" --profile FRONTEND_TS --worktree
#
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

# Parse arguments
STAGE_NUM=""
STAGE_NAME=""
PROFILE="BACKEND_DOTNET"
USE_WORKTREE=false
PROJECT_NAME=$(basename "$(pwd)")

while [[ $# -gt 0 ]]; do
    case $1 in
        --stage)
            STAGE_NUM="$2"
            shift 2
            ;;
        --name)
            STAGE_NAME="$2"
            shift 2
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --worktree)
            USE_WORKTREE=true
            shift
            ;;
        --help)
            echo "Usage: ./scripts/init-stage.sh --stage <number> --name <name> [options]"
            echo ""
            echo "Options:"
            echo "  --stage <number>     Stage number (required)"
            echo "  --name <name>        Stage name (required)"
            echo "  --profile <profile>  Gate profile: BACKEND_DOTNET, FRONTEND_TS, MINIMAL"
            echo "                       (default: BACKEND_DOTNET)"
            echo "  --worktree           Create a git worktree for this stage"
            echo ""
            echo "Gate Profiles:"
            echo "  BACKEND_DOTNET  Gates 1-8           (.NET API/service)"
            echo "  FRONTEND_TS     Gates 1-8, 14, 15   (TypeScript UI)"
            echo "  MINIMAL         Gates 1-8           (POC, small fixes)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 2
            ;;
    esac
done

# Validate required arguments
if [[ -z "$STAGE_NUM" ]]; then
    print_error "--stage is required"
    exit 2
fi

if [[ -z "$STAGE_NAME" ]]; then
    print_error "--name is required"
    exit 2
fi

# Validate profile
case $PROFILE in
    BACKEND_DOTNET|FRONTEND_TS|MINIMAL)
        ;;
    *)
        print_error "Invalid profile: $PROFILE"
        print_error "Valid profiles: BACKEND_DOTNET, FRONTEND_TS, MINIMAL"
        exit 2
        ;;
esac

# Determine gates based on profile
case $PROFILE in
    BACKEND_DOTNET)
        GATES="1 2 3 4 5 6 7 8"
        TECH_STACK=".NET"
        ;;
    FRONTEND_TS)
        GATES="1 2 3 4 5 6 7 8 14 15"
        TECH_STACK="TypeScript"
        ;;
    MINIMAL)
        GATES="1 2 3 5 6 7 8"
        TECH_STACK="Any"
        ;;
esac

print_header "🚀 Initializing Stage $STAGE_NUM: $STAGE_NAME"

###############################################################################
# Step 1: Create worktree (if requested)
###############################################################################
# Initialize variables to empty strings (fixes unbound variable with set -u)
WORKTREE_PATH=""
BRANCH_NAME=""

if [[ "$USE_WORKTREE" == true ]]; then
    print_info "Step 1: Creating git worktree..."

    WORKTREE_PATH="../${PROJECT_NAME}-stage-$STAGE_NUM"
    BRANCH_NAME="stage-$STAGE_NUM"

    if [[ -d "$WORKTREE_PATH" ]]; then
        print_error "Worktree already exists: $WORKTREE_PATH"
        exit 1
    fi

    git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"
    print_success "Worktree created: $WORKTREE_PATH"
    print_info "Switch to worktree: cd $WORKTREE_PATH"

    # Continue in worktree
    cd "$WORKTREE_PATH"
fi

###############################################################################
# Step 2: Create directory structure
###############################################################################
print_info "Step 2: Creating directory structure..."

STAGE_DIR="stage-proofs/stage-$STAGE_NUM"

mkdir -p "$STAGE_DIR/reports"/{gates,coverage,test-results,mutation,benchmarks}

print_success "Created: $STAGE_DIR/"
print_success "Created: $STAGE_DIR/reports/{gates,coverage,test-results,mutation,benchmarks}"

###############################################################################
# Step 3: Create proof file from template
###############################################################################
print_info "Step 3: Creating proof file..."

PROOF_FILE="$STAGE_DIR/STAGE_${STAGE_NUM}_PROOF.md"
TODAY=$(date +%Y-%m-%d)

if [[ -f "STAGE_PROOF_TEMPLATE.md" ]]; then
    cp STAGE_PROOF_TEMPLATE.md "$PROOF_FILE"

    # Fill in known values
    sed -i '' "s/\[X\]/$STAGE_NUM/g" "$PROOF_FILE"
    sed -i '' "s/\[Stage Name\]/$STAGE_NAME/g" "$PROOF_FILE"
    sed -i '' "s/\[YYYY-MM-DD\]/$TODAY/g" "$PROOF_FILE"
    sed -i '' "s/\[.NET \/ TypeScript \/ Both\]/$TECH_STACK/g" "$PROOF_FILE"
    sed -i '' "s/\[BACKEND_DOTNET \/ FRONTEND_TS \/ MINIMAL\]/$PROFILE/g" "$PROOF_FILE"

    print_success "Created: $PROOF_FILE"
else
    print_error "Template not found: STAGE_PROOF_TEMPLATE.md"
    exit 1
fi

###############################################################################
# Step 4: Create stage state file
###############################################################################
print_info "Step 4: Creating stage state file..."

STATE_FILE="$STAGE_DIR/.stage-state.yaml"

cat > "$STATE_FILE" << EOF
# Stage State File
# Used for context recovery when conversation is lost
# Auto-generated by init-stage.sh

stage: "$STAGE_NUM"
name: "$STAGE_NAME"
profile: "$PROFILE"
tech_stack: "$TECH_STACK"
gates: [$GATES]

status: before  # before | during | after | complete
started_at: "$TODAY"
completed_at: null

# Update these as you progress
current_phase: "BEFORE"  # BEFORE | DURING | AFTER
current_task: "Review objectives and create todo list"

# Track deliverables (update as you implement)
deliverables: []
#  - name: "Deliverable 1"
#    status: pending  # pending | in_progress | complete
#  - name: "Deliverable 2"
#    status: pending

# Track gate execution
gates_executed: []
# Add gate numbers as they pass: [1, 2, 3, ...]

# Worktree info (if applicable)
worktree: $USE_WORKTREE
worktree_path: "${USE_WORKTREE:+$WORKTREE_PATH}"
branch: "${USE_WORKTREE:+$BRANCH_NAME}"
EOF

print_success "Created: $STATE_FILE"

###############################################################################
# Step 4.5: Prompt for affected UI pages (for screenshot tracking)
###############################################################################
print_info "Step 4.5: Screenshot tracking setup..."

# Get available UI routes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_ROUTES=$("$SCRIPT_DIR/get-ui-routes.sh" --routes 2>/dev/null || echo "")

if [[ -n "$UI_ROUTES" ]]; then
    echo ""
    echo -e "${YELLOW}Which UI pages does this stage affect? (for screenshot coverage)${NC}"
    echo -e "Available routes:"
    echo "$UI_ROUTES" | while read route; do
        echo "  $route"
    done
    echo ""
    echo "Enter comma-separated routes (e.g., /dashboard, /workflows/new)"
    echo "Or press Enter for 'none' (backend-only stages):"
    read -p "> " AFFECTED_PAGES

    # Clean up input
    AFFECTED_PAGES=$(echo "$AFFECTED_PAGES" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Default to none if empty
    if [[ -z "$AFFECTED_PAGES" ]]; then
        AFFECTED_PAGES="none"
    fi

    # Append to state file
    echo "" >> "$STATE_FILE"
    echo "# Screenshot tracking" >> "$STATE_FILE"
    echo "affected_ui_pages: [$AFFECTED_PAGES]" >> "$STATE_FILE"
    echo "screenshots_required: 0  # Updated by generate-screenshot-manifest.sh" >> "$STATE_FILE"
    echo "screenshots_captured: 0" >> "$STATE_FILE"

    if [[ "$AFFECTED_PAGES" != "none" ]]; then
        print_success "UI pages tracked: $AFFECTED_PAGES"
        print_info "Run './scripts/generate-screenshot-manifest.sh --stage $STAGE_NUM' before completing"
    else
        print_success "No UI pages declared (backend-only stage)"
    fi
else
    echo "" >> "$STATE_FILE"
    echo "# Screenshot tracking (no UI routes found)" >> "$STATE_FILE"
    echo "affected_ui_pages: [none]" >> "$STATE_FILE"
    print_info "No UI routes found in project"
fi

###############################################################################
# Step 5: Create stage brief (single-file reference)
###############################################################################
print_info "Step 5: Creating stage brief..."

BRIEF_FILE="$STAGE_DIR/STAGE_BRIEF.md"

cat > "$BRIEF_FILE" << EOF
# Stage $STAGE_NUM: $STAGE_NAME

**Profile:** $PROFILE | **Tech Stack:** $TECH_STACK | **Started:** $TODAY

---

## Quick Commands

\`\`\`bash
# Run quality gates
./scripts/run-quality-gates.sh --stage $STAGE_NUM $GATES

# Generate screenshot manifest (if UI changes)
./scripts/generate-screenshot-manifest.sh --stage $STAGE_NUM

# Capture screenshots
cd src/workflow-ui && npx ts-node scripts/take-screenshots.ts --stage $STAGE_NUM

# Complete stage (after gates pass)
./scripts/complete-stage.sh --stage $STAGE_NUM --name "$STAGE_NAME"

# Check stage status
cat $STATE_FILE
\`\`\`

---

## Checklist

### BEFORE (do first)
- [x] Directory created: \`$STAGE_DIR/\`
- [x] Proof file created: \`$PROOF_FILE\`
- [x] State file created: \`$STATE_FILE\`
- [ ] Review stage objectives in CLAUDE.md
- [ ] Create todo list for deliverables

### DURING (implementation)
- [ ] TDD: RED → GREEN → REFACTOR
- [ ] Tests passing continuously
- [ ] Coverage ≥90%

### AFTER (completion)
- [ ] Generate screenshot manifest: \`./scripts/generate-screenshot-manifest.sh --stage $STAGE_NUM\`
- [ ] Capture screenshots (if UI affected): \`cd src/workflow-ui && npx ts-node scripts/take-screenshots.ts --stage $STAGE_NUM\`
- [ ] Run: \`./scripts/run-quality-gates.sh --stage $STAGE_NUM $GATES\`
- [ ] All gates pass
- [ ] Run: \`./scripts/complete-stage.sh --stage $STAGE_NUM --name "$STAGE_NAME"\`
- [ ] Verify tag created: \`git tag -l | grep stage-$STAGE_NUM\`

---

## Gate Reference

| Gate | Name | Pass Criteria |
|------|------|---------------|
| 1 | No Templates | No Class1.cs, UnitTest1.cs |
| 2 | Linting | 0 errors |
| 3 | Build | 0 errors, 0 warnings |
| 4 | Type Safety | 0 type errors (TS only) |
| 5 | Tests | 0 failures, 0 skipped |
| 6 | Coverage | ≥90% |
| 7 | Security | 0 vulnerabilities |
| 8 | Proof | No placeholders |
$(if [[ "$PROFILE" == "FRONTEND_TS" ]]; then echo "| 14 | Accessibility | ≥90 Lighthouse |"; fi)
$(if [[ "$PROFILE" == "FRONTEND_TS" ]]; then echo "| 15 | E2E Tests | All passing |"; fi)

---

## Files

- **Proof:** [\`$PROOF_FILE\`](./$PROOF_FILE)
- **State:** [\`.stage-state.yaml\`](./.stage-state.yaml)
- **Gates:** [\`reports/gates/\`](./reports/gates/)
- **Coverage:** [\`reports/coverage/\`](./reports/coverage/)
EOF

print_success "Created: $BRIEF_FILE"

###############################################################################
# Summary
###############################################################################
print_header "✅ Stage $STAGE_NUM Initialized!"

echo -e "${BOLD}Files created:${NC}"
echo "  $STAGE_DIR/"
echo "  ├── STAGE_${STAGE_NUM}_PROOF.md  (fill after implementation)"
echo "  ├── STAGE_BRIEF.md               (quick reference)"
echo "  ├── .stage-state.yaml            (context recovery)"
echo "  └── reports/"
echo "      ├── gates/"
echo "      ├── coverage/"
echo "      ├── test-results/"
echo "      ├── mutation/"
echo "      └── benchmarks/"
echo ""

echo -e "${BOLD}Next steps:${NC}"
echo "  1. Review stage objectives in CLAUDE.md"
echo "  2. Create todo list for deliverables"
echo "  3. Start TDD implementation"
echo ""

echo -e "${BOLD}Commands:${NC}"
echo "  Run gates:     ./scripts/run-quality-gates.sh --stage $STAGE_NUM $GATES"
echo "  Complete:      ./scripts/complete-stage.sh --stage $STAGE_NUM --name \"$STAGE_NAME\""
echo ""

if [[ "$USE_WORKTREE" == true ]]; then
    echo -e "${BOLD}Worktree:${NC}"
    echo "  Path:   $WORKTREE_PATH"
    echo "  Branch: $BRANCH_NAME"
    echo "  Switch: cd $WORKTREE_PATH"
    echo ""
fi

echo -e "${GREEN}Ready to start Stage $STAGE_NUM!${NC}"
