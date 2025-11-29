#!/usr/bin/env bash

###############################################################################
# Stage Artifact Verification Script
#
# Purpose: Lightweight verification that stage completion artifacts exist
#          in the correct locations and are ready for commit
#
# Usage:
#   ./scripts/verify-stage-artifacts.sh <stage-number>
#   ./scripts/verify-stage-artifacts.sh 5
#
# Exit Codes:
#   0 - All required artifacts found
#   1 - Missing artifacts or invalid stage
#
# What this script does:
#   - Checks that stage-proofs/stage-X/ directory exists
#   - Verifies required artifacts are present (coverage, test results, etc.)
#   - Lists any missing artifacts
#   - Does NOT run any gates - just verifies files exist
#
###############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Usage: $0 <stage-number>${NC}"
    echo "Example: $0 5"
    exit 1
fi

STAGE_NUM=$1
STAGE_DIR="stage-proofs/stage-$STAGE_NUM"
REPORTS_DIR="$STAGE_DIR/reports"

echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}  Stage $STAGE_NUM Artifact Verification${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check stage directory exists
if [ ! -d "$STAGE_DIR" ]; then
    echo -e "${RED}❌ Stage directory not found: $STAGE_DIR${NC}"
    echo -e "${YELLOW}   Create with: mkdir -p $STAGE_DIR/reports/{coverage,test-results,mutation,gates}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Stage directory exists: $STAGE_DIR${NC}\n"

# Track missing files
MISSING_COUNT=0

# Function to check file exists
check_file() {
    local file_path=$1
    local file_desc=$2
    local required=$3  # "required" or "optional"

    if [ -f "$file_path" ] || [ -d "$file_path" ]; then
        echo -e "${GREEN}✅ $file_desc${NC}"
        echo -e "   Location: $file_path"
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ MISSING: $file_desc${NC}"
            echo -e "   Expected: $file_path"
            ((MISSING_COUNT++))
        else
            echo -e "${YELLOW}⚠️  OPTIONAL: $file_desc (not found)${NC}"
            echo -e "   Expected: $file_path"
        fi
    fi
    echo ""
}

# Check proof file
echo -e "${BOLD}Checking Proof File:${NC}\n"
check_file "$STAGE_DIR/STAGE_${STAGE_NUM}_PROOF.md" "Proof file" "required"

# Check mandatory gate artifacts
echo -e "${BOLD}Checking Mandatory Artifacts (Gates 1-6):${NC}\n"
check_file "$REPORTS_DIR/gates" "Gate outputs directory" "required"
check_file "$REPORTS_DIR/coverage/index.html" "Coverage HTML report" "required"
check_file "$REPORTS_DIR/coverage/Summary.txt" "Coverage summary" "required"
check_file "$REPORTS_DIR/test-results" "Test results directory" "required"

# Check optional artifacts
echo -e "${BOLD}Checking Optional Artifacts:${NC}\n"
check_file "$REPORTS_DIR/mutation/index.html" "Mutation testing report (Gate 9)" "optional"
check_file "$REPORTS_DIR/playwright/index.html" "Playwright E2E report (Gate 15)" "optional"
check_file "$REPORTS_DIR/lighthouse/report.html" "Lighthouse accessibility report (Gate 14)" "optional"
check_file "$REPORTS_DIR/benchmarks" "Performance benchmarks (Gate 12)" "optional"

# Summary
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $MISSING_COUNT -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✅ All required artifacts found!${NC}"
    echo -e "${CYAN}   Stage $STAGE_NUM is ready for commit.${NC}\n"

    echo -e "${BOLD}Next steps:${NC}"
    echo -e "  1. Review proof file: $STAGE_DIR/STAGE_${STAGE_NUM}_PROOF.md"
    echo -e "  2. Extract metrics: ./scripts/extract-stage-metrics.sh $STAGE_NUM"
    echo -e "  3. Commit artifacts: git add $STAGE_DIR/"
    echo ""
    exit 0
else
    echo -e "${RED}${BOLD}❌ Missing $MISSING_COUNT required artifact(s)${NC}"
    echo -e "${YELLOW}   Run the quality gates to generate missing artifacts.${NC}\n"
    exit 1
fi
