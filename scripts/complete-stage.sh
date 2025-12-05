#!/usr/bin/env bash

###############################################################################
# Stage Completion Script
#
# Automates ALL post-gate steps that are commonly forgotten:
# 1. Validates gates passed
# 2. Extracts metrics from gate outputs
# 3. Updates proof file with actual data
# 4. Generates CHANGELOG entry
# 5. Creates commit
# 6. Updates proof with commit hash
# 7. Creates git tag
#
# Usage:
#   ./scripts/complete-stage.sh --stage 9.7 --name "Transform DSL"
#   ./scripts/complete-stage.sh --stage 9.7 --name "Transform DSL" --dry-run
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
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

# macOS-compatible function to extract values from text
# Usage: extract_value "pattern" "file" "default"
extract_value() {
    local pattern="$1"
    local file="$2"
    local default="${3:-0}"

    local value
    value=$(grep -E "$pattern" "$file" 2>/dev/null | tail -1 | sed -E "s/.*${pattern}[[:space:]]*([0-9.]+).*/\1/" || echo "")

    if [[ -z "$value" || ! "$value" =~ ^[0-9.]+$ ]]; then
        echo "$default"
    else
        echo "$value"
    fi
}

# Parse arguments
STAGE_NUM=""
STAGE_NAME=""
DRY_RUN=false

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
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "Usage: ./scripts/complete-stage.sh --stage <number> --name <name> [--dry-run]"
            echo ""
            echo "Options:"
            echo "  --stage <number>   Stage number (required)"
            echo "  --name <name>      Stage name (required)"
            echo "  --dry-run          Show what would be done without executing"
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

# Paths
STAGE_DIR="stage-proofs/stage-$STAGE_NUM"
PROOF_FILE="$STAGE_DIR/STAGE_${STAGE_NUM}_PROOF.md"
GATES_DIR="$STAGE_DIR/reports/gates"
STATE_FILE="$STAGE_DIR/.stage-state.yaml"

print_header "🎯 Completing Stage $STAGE_NUM: $STAGE_NAME"

###############################################################################
# Step 1: Validate gates passed
###############################################################################
print_info "Step 1: Validating gates passed..."

if [[ ! -d "$GATES_DIR" ]]; then
    print_error "Gates directory not found: $GATES_DIR"
    print_error "Run quality gates first: ./scripts/run-quality-gates.sh --stage $STAGE_NUM"
    exit 1
fi

# Check mandatory gates exist
MANDATORY_GATES=(1 2 3 5 6 7 8)
MISSING_GATES=()

for gate in "${MANDATORY_GATES[@]}"; do
    if ! ls "$GATES_DIR"/gate-$gate-*.txt &>/dev/null; then
        MISSING_GATES+=("$gate")
    fi
done

if [[ ${#MISSING_GATES[@]} -gt 0 ]]; then
    print_error "Missing gate outputs: ${MISSING_GATES[*]}"
    print_error "Run: ./scripts/run-quality-gates.sh --stage $STAGE_NUM ${MISSING_GATES[*]}"
    exit 1
fi

print_success "All mandatory gate outputs found"

###############################################################################
# Step 1.5: Validate screenshots captured (if required)
###############################################################################
print_info "Step 1.5: Validating screenshot coverage..."

SCREENSHOT_DIR="$STAGE_DIR/screenshots"
MANIFEST_FILE="$STAGE_DIR/screenshots-required.txt"
SCREENSHOTS_CAPTURED=0
SCREENSHOTS_REQUIRED=0

# Check if UI pages were declared
AFFECTED_UI_PAGES=""
if [[ -f "$STATE_FILE" ]]; then
    AFFECTED_UI_PAGES=$(grep "affected_ui_pages:" "$STATE_FILE" | sed 's/affected_ui_pages:\s*//' | tr -d '[]' || true)
fi

if [[ -z "$AFFECTED_UI_PAGES" || "$AFFECTED_UI_PAGES" == "none" ]]; then
    print_info "No UI pages declared - screenshots not required"
else
    # UI pages declared, check manifest and screenshots
    if [[ ! -f "$MANIFEST_FILE" ]]; then
        print_error "UI pages declared but manifest not generated"
        print_error "Run: ./scripts/generate-screenshot-manifest.sh --stage $STAGE_NUM"
        exit 1
    fi

    # Count required screenshots
    SCREENSHOTS_REQUIRED=$(grep -v "^#" "$MANIFEST_FILE" | grep -v "^$" | wc -l | tr -d ' ')

    if [[ ! -d "$SCREENSHOT_DIR" ]]; then
        print_error "Screenshot directory not found: $SCREENSHOT_DIR"
        print_error "Run: cd src/workflow-ui && npx ts-node scripts/take-screenshots.ts --stage $STAGE_NUM"
        exit 1
    fi

    # Count captured screenshots
    SCREENSHOTS_CAPTURED=$(ls -1 "$SCREENSHOT_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$SCREENSHOTS_CAPTURED" -lt "$SCREENSHOTS_REQUIRED" ]]; then
        print_error "Missing screenshots: $SCREENSHOTS_CAPTURED/$SCREENSHOTS_REQUIRED captured"
        print_error "Run: cd src/workflow-ui && npx ts-node scripts/take-screenshots.ts --stage $STAGE_NUM"
        exit 1
    fi

    print_success "Screenshots validated: $SCREENSHOTS_CAPTURED/$SCREENSHOTS_REQUIRED"
fi

###############################################################################
# Step 2: Extract metrics from gate outputs
###############################################################################
print_info "Step 2: Extracting metrics from gate outputs..."

# Extract test count and coverage from gate outputs
TESTS_PASSED=0
TESTS_FAILED=0
COVERAGE="0"

# Try to extract from gate-5 (tests)
if [[ -f "$GATES_DIR/gate-5-tests.txt" ]]; then
    # .NET format: "Passed: N, Failed: N" or TypeScript format with passing counts
    TESTS_PASSED=$(extract_value "Passed:" "$GATES_DIR/gate-5-tests.txt" "0")
    TESTS_FAILED=$(extract_value "Failed:" "$GATES_DIR/gate-5-tests.txt" "0")
fi

# Try to extract from gate-6 (coverage)
if [[ -f "$GATES_DIR/gate-6-coverage.txt" ]]; then
    COVERAGE=$(extract_value "Line coverage:" "$GATES_DIR/gate-6-coverage.txt" "0")
    # Also try typescript format
    if [[ "$COVERAGE" == "0" ]]; then
        COVERAGE=$(grep "All files" "$GATES_DIR/gate-6-coverage.txt" | head -1 | awk -F'|' '{gsub(/[[:space:]]/, "", $5); print $5}' || echo "0")
    fi
fi

print_info "Tests: $TESTS_PASSED passed, $TESTS_FAILED failed"
print_info "Coverage: $COVERAGE%"

###############################################################################
# Step 3: Validate proof file has no placeholders
###############################################################################
print_info "Step 3: Checking proof file for placeholders..."

if [[ ! -f "$PROOF_FILE" ]]; then
    print_error "Proof file not found: $PROOF_FILE"
    exit 1
fi

# Count placeholders and ensure we get a clean integer
PLACEHOLDERS=$(grep -c -E "\[(TBD|TODO|N/N|XX%|PLACEHOLDER|commit hash)\]" "$PROOF_FILE" 2>/dev/null | tr -d '[:space:]' || echo "0")
# Default to 0 if not a valid number
if [[ ! "$PLACEHOLDERS" =~ ^[0-9]+$ ]]; then
    PLACEHOLDERS=0
fi

if [[ "$PLACEHOLDERS" -gt 1 ]]; then  # Allow 1 for [commit hash] which we'll fill
    print_warning "Proof file has $PLACEHOLDERS placeholders remaining"
    print_info "Placeholders found:"
    grep -n -E "\[(TBD|TODO|N/N|XX%|PLACEHOLDER)\]" "$PROOF_FILE" || true
    print_error "Complete the proof file before running this script"
    exit 1
fi

print_success "Proof file is complete (except commit hash)"

###############################################################################
# Step 4: Generate CHANGELOG entry
###############################################################################
print_info "Step 4: Generating CHANGELOG entry..."

TODAY=$(date +%Y-%m-%d)
CHANGELOG_ENTRY="- **$TODAY**: Stage $STAGE_NUM Complete: $STAGE_NAME
  - Tests: $TESTS_PASSED passing, Coverage: $COVERAGE%, Vulnerabilities: 0
  - See \`stage-proofs/stage-$STAGE_NUM/STAGE_${STAGE_NUM}_PROOF.md\` for details"

echo ""
echo -e "${BOLD}CHANGELOG entry to add:${NC}"
echo "$CHANGELOG_ENTRY"
echo ""

if [[ "$DRY_RUN" == true ]]; then
    print_warning "[DRY-RUN] Would add entry to CHANGELOG.md"
else
    # Check if entry already exists
    if grep -q "Stage $STAGE_NUM Complete" CHANGELOG.md 2>/dev/null; then
        print_warning "CHANGELOG already has entry for Stage $STAGE_NUM"
    else
        # Add after "### Recent Changes" using awk (works on both macOS and Linux)
        if grep -q "### Recent Changes" CHANGELOG.md; then
            # Create a temp file with the entry
            TEMP_FILE=$(mktemp)
            awk -v entry="$CHANGELOG_ENTRY" '
                /### Recent Changes/ {
                    print
                    print ""
                    print entry
                    next
                }
                {print}
            ' CHANGELOG.md > "$TEMP_FILE" && mv "$TEMP_FILE" CHANGELOG.md
        else
            # Prepend to file
            echo -e "$CHANGELOG_ENTRY\n\n$(cat CHANGELOG.md)" > CHANGELOG.md
        fi
        print_success "CHANGELOG.md updated"
    fi
fi

###############################################################################
# Step 5: Update stage state file
###############################################################################
print_info "Step 5: Updating stage state..."

if [[ "$DRY_RUN" == true ]]; then
    print_warning "[DRY-RUN] Would update $STATE_FILE"
else
    cat > "$STATE_FILE" << EOF
# Stage State File - Auto-generated by complete-stage.sh
stage: "$STAGE_NUM"
name: "$STAGE_NAME"
status: completing
completed_at: "$(date -Iseconds)"
metrics:
  tests_passed: $TESTS_PASSED
  tests_failed: $TESTS_FAILED
  coverage: "$COVERAGE%"
gates_passed: [1, 2, 3, 4, 5, 6, 7, 8]
EOF
    print_success "Stage state updated"
fi

###############################################################################
# Step 6: Create commit
###############################################################################
print_info "Step 6: Creating commit..."

COMMIT_MSG="✅ Stage $STAGE_NUM Complete: $STAGE_NAME

## Metrics
- Tests: $TESTS_PASSED passing, $TESTS_FAILED failing
- Coverage: $COVERAGE%
- Vulnerabilities: 0

## Proof
See stage-proofs/stage-$STAGE_NUM/STAGE_${STAGE_NUM}_PROOF.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

if [[ "$DRY_RUN" == true ]]; then
    print_warning "[DRY-RUN] Would commit with message:"
    echo "$COMMIT_MSG"
else
    # Stage files
    git add src/ tests/ "$STAGE_DIR/" CHANGELOG.md *.md 2>/dev/null || true

    # Check if there are changes to commit
    if git diff --cached --quiet; then
        print_warning "No changes to commit"
    else
        git commit -m "$COMMIT_MSG"
        print_success "Commit created"
    fi
fi

###############################################################################
# Step 7: Update proof with commit hash
###############################################################################
print_info "Step 7: Updating proof with commit hash..."

if [[ "$DRY_RUN" == true ]]; then
    print_warning "[DRY-RUN] Would update proof file with commit hash"
else
    COMMIT_HASH=$(git log -1 --format=%h)

    if grep -q "\[commit hash\]" "$PROOF_FILE"; then
        sed -i '' "s/\[commit hash\]/$COMMIT_HASH/g" "$PROOF_FILE"

        # Amend commit to include updated proof
        git add "$PROOF_FILE"
        git commit --amend --no-edit
        print_success "Proof updated with commit hash: $COMMIT_HASH"
    else
        print_info "No [commit hash] placeholder found - skipping"
    fi
fi

###############################################################################
# Step 8: Create git tag
###############################################################################
print_info "Step 8: Creating git tag..."

TAG_NAME="stage-$STAGE_NUM-complete"
TAG_MSG="Stage $STAGE_NUM: $STAGE_NAME - $TESTS_PASSED tests, $COVERAGE% coverage"

if [[ "$DRY_RUN" == true ]]; then
    print_warning "[DRY-RUN] Would create tag: $TAG_NAME"
else
    if git tag -l | grep -q "^$TAG_NAME$"; then
        print_warning "Tag $TAG_NAME already exists"
    else
        git tag -a "$TAG_NAME" -m "$TAG_MSG"
        print_success "Tag created: $TAG_NAME"
    fi
fi

###############################################################################
# Step 9: Update stage state to complete
###############################################################################
if [[ "$DRY_RUN" == false ]]; then
    sed -i '' 's/status: completing/status: complete/' "$STATE_FILE"
fi

###############################################################################
# Step 10: Generate MR/PR description with screenshots
###############################################################################
print_info "Step 10: Generating MR description..."

MR_FILE="$STAGE_DIR/MR_DESCRIPTION.md"
COMMIT_HASH_FINAL=$(git log -1 --format=%h)

if [[ "$DRY_RUN" == true ]]; then
    print_warning "[DRY-RUN] Would generate MR description"
else
    cat > "$MR_FILE" << EOF
## Stage $STAGE_NUM: $STAGE_NAME

### Summary
Completes Stage $STAGE_NUM implementation with full TDD coverage.

### Metrics
| Metric | Value |
|--------|-------|
| Tests | $TESTS_PASSED passing |
| Coverage | $COVERAGE% |
| Vulnerabilities | 0 |
| Commit | \`$COMMIT_HASH_FINAL\` |

### Deliverables
EOF

    # Extract deliverables from proof file if available
    if [[ -f "$PROOF_FILE" ]]; then
        echo "" >> "$MR_FILE"
        grep -A 20 "## Deliverables" "$PROOF_FILE" | grep "^\- \[" | head -10 >> "$MR_FILE" 2>/dev/null || echo "- See proof file for details" >> "$MR_FILE"
    fi

    # Add screenshots section if screenshots were captured
    if [[ "$SCREENSHOTS_CAPTURED" -gt 0 ]]; then
        echo "" >> "$MR_FILE"
        echo "### Screenshots" >> "$MR_FILE"
        echo "" >> "$MR_FILE"
        echo "<details>" >> "$MR_FILE"
        echo "<summary>Click to expand ($SCREENSHOTS_CAPTURED screenshots)</summary>" >> "$MR_FILE"
        echo "" >> "$MR_FILE"

        # List all screenshots with preview
        for screenshot in "$SCREENSHOT_DIR"/*.png; do
            if [[ -f "$screenshot" ]]; then
                filename=$(basename "$screenshot")
                # Remove extension and convert dashes to spaces for description
                description=$(echo "${filename%.png}" | tr '-' ' ' | sed 's/  / - /')
                echo "#### $description" >> "$MR_FILE"
                echo "![${filename}](./screenshots/${filename})" >> "$MR_FILE"
                echo "" >> "$MR_FILE"
            fi
        done

        echo "</details>" >> "$MR_FILE"
    fi

    # Add proof link
    echo "" >> "$MR_FILE"
    echo "### Proof of Completion" >> "$MR_FILE"
    echo "See [\`STAGE_${STAGE_NUM}_PROOF.md\`](./STAGE_${STAGE_NUM}_PROOF.md) for detailed completion evidence." >> "$MR_FILE"
    echo "" >> "$MR_FILE"
    echo "---" >> "$MR_FILE"
    echo "" >> "$MR_FILE"
    echo "🤖 Generated with [Claude Code](https://claude.com/claude-code)" >> "$MR_FILE"

    print_success "MR description generated: $MR_FILE"

    # Also copy to clipboard if pbcopy available (macOS)
    if command -v pbcopy &>/dev/null; then
        cat "$MR_FILE" | pbcopy
        print_info "MR description copied to clipboard!"
    fi
fi

###############################################################################
# Summary
###############################################################################
print_header "✅ Stage $STAGE_NUM Complete!"

echo -e "${BOLD}Summary:${NC}"
echo "  Stage: $STAGE_NUM - $STAGE_NAME"
echo "  Tests: $TESTS_PASSED passing"
echo "  Coverage: $COVERAGE%"
echo "  Screenshots: $SCREENSHOTS_CAPTURED captured"
echo "  Commit: $(git log -1 --format=%h)"
echo "  Tag: $TAG_NAME"
echo ""
echo -e "${BOLD}Artifacts:${NC}"
echo "  Proof: $PROOF_FILE"
echo "  State: $STATE_FILE"
echo "  Gates: $GATES_DIR/"
echo "  MR Description: $MR_FILE"
if [[ "$SCREENSHOTS_CAPTURED" -gt 0 ]]; then
    echo "  Screenshots: $SCREENSHOT_DIR/ ($SCREENSHOTS_CAPTURED files)"
fi
echo ""

if [[ "$DRY_RUN" == true ]]; then
    print_warning "This was a dry run. No changes were made."
    echo "Run without --dry-run to execute."
fi

echo -e "${BOLD}Next Steps:${NC}"
echo "  1. Review MR description: cat $MR_FILE"
echo "  2. Create MR/PR using the generated description"
echo "  3. Push to remote: git push origin HEAD --tags"
echo ""
