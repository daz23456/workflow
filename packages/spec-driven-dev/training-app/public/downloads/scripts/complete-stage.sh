#!/bin/bash
# complete-stage.sh - Complete a stage and create git tag
# Usage: ./scripts/complete-stage.sh --stage 1.0 --name "Feature Name"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
STAGE=""
NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --stage)
            STAGE="$2"
            shift 2
            ;;
        --name)
            NAME="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

if [ -z "$STAGE" ]; then
    echo -e "${RED}Error: --stage is required${NC}"
    echo "Usage: ./scripts/complete-stage.sh --stage 1.0 --name \"Feature Name\""
    exit 1
fi

if [ -z "$NAME" ]; then
    echo -e "${RED}Error: --name is required${NC}"
    echo "Usage: ./scripts/complete-stage.sh --stage 1.0 --name \"Feature Name\""
    exit 1
fi

STAGE_DIR="stage-proofs/stage-${STAGE}"
STATE_FILE="${STAGE_DIR}/.stage-state.yaml"
PROOF_FILE="${STAGE_DIR}/STAGE_${STAGE}_PROOF.md"

echo -e "${BLUE}Completing Stage ${STAGE}: ${NAME}${NC}"
echo ""

# Verify stage was initialized
if [ ! -f "$STATE_FILE" ]; then
    echo -e "${RED}Error: Stage ${STAGE} was not initialized${NC}"
    echo "Run: ./scripts/init-stage.sh --stage ${STAGE} --name \"${NAME}\""
    exit 1
fi

# Verify proof file exists and has no TODOs
if [ ! -f "$PROOF_FILE" ]; then
    echo -e "${RED}Error: Proof file not found: ${PROOF_FILE}${NC}"
    exit 1
fi

TODOS=$(grep -c "\[TODO\]" "$PROOF_FILE" 2>/dev/null || echo "0")
if [ "$TODOS" -gt 0 ]; then
    echo -e "${RED}Error: Proof file has ${TODOS} TODO placeholders${NC}"
    echo "Please complete all sections in: ${PROOF_FILE}"
    exit 1
fi

# Update state file
COMPLETED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sed -i '' "s/phase: \"DURING\"/phase: \"AFTER\"/" "${STATE_FILE}" 2>/dev/null || \
sed -i "s/phase: \"DURING\"/phase: \"AFTER\"/" "${STATE_FILE}"

echo "completed_at: \"${COMPLETED_AT}\"" >> "${STATE_FILE}"

echo -e "${GREEN}✓ Updated state file${NC}"

# Update proof file status
sed -i '' "s/🔴 IN PROGRESS/✅ COMPLETE/" "${PROOF_FILE}" 2>/dev/null || \
sed -i "s/🔴 IN PROGRESS/✅ COMPLETE/" "${PROOF_FILE}"
sed -i '' "s/\[TODO\] # Completed date/${COMPLETED_AT}/" "${PROOF_FILE}" 2>/dev/null || \
sed -i "s/\[TODO\] # Completed date/${COMPLETED_AT}/" "${PROOF_FILE}"

echo -e "${GREEN}✓ Updated proof file${NC}"

# Create git tag if in a git repo
if git rev-parse --git-dir > /dev/null 2>&1; then
    TAG_NAME="stage-${STAGE}"
    TAG_MESSAGE="Stage ${STAGE} Complete: ${NAME}"

    # Check if tag already exists
    if git tag -l | grep -q "^${TAG_NAME}$"; then
        echo -e "${YELLOW}⚠ Tag ${TAG_NAME} already exists, skipping${NC}"
    else
        git tag -a "${TAG_NAME}" -m "${TAG_MESSAGE}"
        echo -e "${GREEN}✓ Created git tag: ${TAG_NAME}${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Not a git repository, skipping tag creation${NC}"
fi

# Update CHANGELOG.md if it exists
if [ -f "CHANGELOG.md" ]; then
    # Prepend new entry
    CHANGELOG_ENTRY="## Stage ${STAGE}: ${NAME}\n\n**Completed:** ${COMPLETED_AT}\n\nSee [proof file](${PROOF_FILE}) for details.\n\n---\n\n"

    # Create temp file with new content
    echo -e "$CHANGELOG_ENTRY$(cat CHANGELOG.md)" > CHANGELOG.md.tmp
    mv CHANGELOG.md.tmp CHANGELOG.md

    echo -e "${GREEN}✓ Updated CHANGELOG.md${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Stage ${STAGE} completed successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Artifacts:"
echo "  - Proof file: ${PROOF_FILE}"
echo "  - State file: ${STATE_FILE}"
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "  - Git tag: stage-${STAGE}"
fi
echo ""
echo "Next steps:"
echo "  1. Commit all changes"
echo "  2. Push to remote (including tags: git push --tags)"
echo "  3. Start next stage: ./scripts/init-stage.sh --stage [next] --name \"...\""
