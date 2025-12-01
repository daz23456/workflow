#!/usr/bin/env bash

###############################################################################
# Stage Status Script
#
# Shows current status of a stage at a glance
#
# Usage:
#   ./scripts/stage-status.sh --stage 9.7
#   ./scripts/stage-status.sh                # Auto-detect from worktree
#
###############################################################################

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Parse arguments
STAGE_NUM=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --stage)
            STAGE_NUM="$2"
            shift 2
            ;;
        --help)
            echo "Usage: ./scripts/stage-status.sh [--stage <number>]"
            echo ""
            echo "Options:"
            echo "  --stage <number>   Stage number (auto-detects if in worktree)"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# Auto-detect stage from branch name if not specified
if [[ -z "$STAGE_NUM" ]]; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "")
    if [[ "$BRANCH" =~ ^stage-(.+)$ ]]; then
        STAGE_NUM="${BASH_REMATCH[1]}"
    fi
fi

if [[ -z "$STAGE_NUM" ]]; then
    echo "❌ Could not determine stage number"
    echo "   Use: ./scripts/stage-status.sh --stage <number>"
    exit 2
fi

# Paths
STAGE_DIR="stage-proofs/stage-$STAGE_NUM"
STATE_FILE="$STAGE_DIR/.stage-state.yaml"
PROOF_FILE="$STAGE_DIR/STAGE_${STAGE_NUM}_PROOF.md"
GATES_DIR="$STAGE_DIR/reports/gates"

# Check if stage exists
if [[ ! -d "$STAGE_DIR" ]]; then
    echo "❌ Stage $STAGE_NUM not initialized"
    echo ""
    echo "Initialize with:"
    echo "  ./scripts/init-stage.sh --stage $STAGE_NUM --name \"...\" --profile BACKEND_DOTNET"
    exit 1
fi

# Read state file
STATUS="unknown"
STAGE_NAME="Unknown"
PROFILE="BACKEND_DOTNET"

if [[ -f "$STATE_FILE" ]]; then
    STATUS=$(grep "^status:" "$STATE_FILE" 2>/dev/null | sed 's/status: *//' | tr -d '"' || echo "unknown")
    STAGE_NAME=$(grep "^name:" "$STATE_FILE" 2>/dev/null | sed 's/name: *//' | tr -d '"' || echo "Unknown")
    PROFILE=$(grep "^profile:" "$STATE_FILE" 2>/dev/null | sed 's/profile: *//' | tr -d '"' || echo "BACKEND_DOTNET")
fi

# Determine phase
PHASE="BEFORE"
case $STATUS in
    before) PHASE="BEFORE" ;;
    during) PHASE="DURING" ;;
    after|completing) PHASE="AFTER" ;;
    complete) PHASE="COMPLETE" ;;
esac

# Count gates
GATES_PASSED_LIST=""
GATES_PENDING_LIST="1 2 3 4 5 6 7 8"

if [[ -d "$GATES_DIR" ]]; then
    for gate in 1 2 3 4 5 6 7 8; do
        if ls "$GATES_DIR"/gate-$gate-*.txt &>/dev/null 2>&1; then
            GATES_PASSED_LIST="$GATES_PASSED_LIST $gate"
        fi
    done
fi

# Extract metrics
TESTS_PASSED="?"
COVERAGE="?"

if [[ -f "$GATES_DIR/gate-5-tests.txt" ]]; then
    TESTS_PASSED=$(grep -oP "Passed:\s*\K\d+" "$GATES_DIR/gate-5-tests.txt" 2>/dev/null | tail -1 || echo "?")
fi

if [[ -f "$GATES_DIR/gate-6-coverage.txt" ]]; then
    COVERAGE=$(grep -oP "Line coverage:\s*\K[\d.]+" "$GATES_DIR/gate-6-coverage.txt" 2>/dev/null || echo "?")
fi

# Count proof placeholders
PLACEHOLDERS="?"
if [[ -f "$PROOF_FILE" ]]; then
    PLACEHOLDERS=$(grep -c -E "\[(TBD|TODO|N/N|XX%|PLACEHOLDER)\]" "$PROOF_FILE" 2>/dev/null || echo "0")
fi

# Check for git tag
HAS_TAG="No"
if git tag -l 2>/dev/null | grep -q "^stage-$STAGE_NUM-complete$"; then
    HAS_TAG="Yes"
fi

# Print status box
echo ""
echo -e "${BOLD}${CYAN}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${BOLD}${CYAN}│${NC} ${BOLD}Stage $STAGE_NUM: $STAGE_NAME${NC}"
echo -e "${BOLD}${CYAN}├─────────────────────────────────────────────────────────┤${NC}"

# Status line
case $PHASE in
    BEFORE)  echo -e "${BOLD}${CYAN}│${NC} Status: ${YELLOW}$PHASE${NC} (not started)" ;;
    DURING)  echo -e "${BOLD}${CYAN}│${NC} Status: ${YELLOW}$PHASE${NC} (implementation)" ;;
    AFTER)   echo -e "${BOLD}${CYAN}│${NC} Status: ${YELLOW}$PHASE${NC} (completing)" ;;
    COMPLETE) echo -e "${BOLD}${CYAN}│${NC} Status: ${GREEN}$PHASE${NC}" ;;
esac

echo -e "${BOLD}${CYAN}│${NC} Profile: $PROFILE"
echo -e "${BOLD}${CYAN}│${NC}"

# Gates status
echo -n -e "${BOLD}${CYAN}│${NC} Gates: "
for gate in 1 2 3 4 5 6 7 8; do
    if [[ " $GATES_PASSED_LIST " == *" $gate "* ]]; then
        echo -n -e "${GREEN}✅$gate${NC} "
    else
        echo -n -e "${DIM}⏳$gate${NC} "
    fi
done
echo ""

echo -e "${BOLD}${CYAN}│${NC}"
echo -e "${BOLD}${CYAN}│${NC} Tests: $TESTS_PASSED passing"
echo -e "${BOLD}${CYAN}│${NC} Coverage: $COVERAGE%"
echo -e "${BOLD}${CYAN}│${NC} Proof placeholders: $PLACEHOLDERS"
echo -e "${BOLD}${CYAN}│${NC} Tagged: $HAS_TAG"

echo -e "${BOLD}${CYAN}├─────────────────────────────────────────────────────────┤${NC}"

# Next action
GATES_PASSED_COUNT=$(echo "$GATES_PASSED_LIST" | wc -w | tr -d ' ')

case $PHASE in
    BEFORE)
        echo -e "${BOLD}${CYAN}│${NC} ${BOLD}NEXT:${NC} Start implementation (TDD)"
        ;;
    DURING)
        if [[ "$GATES_PASSED_COUNT" -lt 8 ]]; then
            echo -e "${BOLD}${CYAN}│${NC} ${BOLD}NEXT:${NC} Run remaining gates"
            echo -e "${BOLD}${CYAN}│${NC}       ./scripts/run-quality-gates.sh --stage $STAGE_NUM"
        else
            echo -e "${BOLD}${CYAN}│${NC} ${BOLD}NEXT:${NC} Complete proof file"
        fi
        ;;
    AFTER)
        if [[ "$PLACEHOLDERS" != "0" ]] && [[ "$PLACEHOLDERS" != "?" ]]; then
            echo -e "${BOLD}${CYAN}│${NC} ${BOLD}NEXT:${NC} Fill proof placeholders ($PLACEHOLDERS remaining)"
        else
            echo -e "${BOLD}${CYAN}│${NC} ${BOLD}NEXT:${NC} Run complete-stage.sh"
            echo -e "${BOLD}${CYAN}│${NC}       ./scripts/complete-stage.sh --stage $STAGE_NUM --name \"$STAGE_NAME\""
        fi
        ;;
    COMPLETE)
        echo -e "${BOLD}${CYAN}│${NC} ${GREEN}Stage complete! Ready for next stage.${NC}"
        ;;
esac

echo -e "${BOLD}${CYAN}└─────────────────────────────────────────────────────────┘${NC}"
echo ""
