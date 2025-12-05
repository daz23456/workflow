#!/bin/bash
# init-stage.sh - Initialize a new stage for spec-driven development
# Usage: ./scripts/init-stage.sh --stage 1.0 --name "Feature Name" --profile BACKEND

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
STAGE=""
NAME=""
PROFILE="BACKEND"

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
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$STAGE" ]; then
    echo -e "${RED}Error: --stage is required${NC}"
    echo "Usage: ./scripts/init-stage.sh --stage 1.0 --name \"Feature Name\" --profile BACKEND"
    exit 1
fi

if [ -z "$NAME" ]; then
    echo -e "${RED}Error: --name is required${NC}"
    echo "Usage: ./scripts/init-stage.sh --stage 1.0 --name \"Feature Name\" --profile BACKEND"
    exit 1
fi

echo -e "${BLUE}Initializing Stage ${STAGE}: ${NAME}${NC}"
echo "Profile: ${PROFILE}"
echo ""

# Create stage directory
STAGE_DIR="stage-proofs/stage-${STAGE}"
mkdir -p "${STAGE_DIR}"

# Create state file
STATE_FILE="${STAGE_DIR}/.stage-state.yaml"
cat > "${STATE_FILE}" << EOF
stage: "${STAGE}"
name: "${NAME}"
profile: "${PROFILE}"
phase: "BEFORE"
started_at: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
current_task: ""
deliverables: []
gates_passed: []
EOF

echo -e "${GREEN}✓ Created state file: ${STATE_FILE}${NC}"

# Create proof file from template
PROOF_FILE="${STAGE_DIR}/STAGE_${STAGE}_PROOF.md"
cat > "${PROOF_FILE}" << EOF
# Stage ${STAGE} Completion Proof

## TL;DR
> [One-sentence summary of what was accomplished]

## Stage Overview
- **Stage:** ${STAGE}
- **Name:** ${NAME}
- **Profile:** ${PROFILE}
- **Started:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- **Completed:** [TODO]

## Deliverables
- [ ] [Deliverable 1]
- [ ] [Deliverable 2]
- [ ] [Deliverable 3]

## Key Metrics
| Metric | Target | Actual |
|--------|--------|--------|
| Tests Passing | 100% | [TODO] |
| Code Coverage | ≥90% | [TODO] |
| Build Warnings | 0 | [TODO] |
| Vulnerabilities | 0 | [TODO] |

## Quality Gates
| Gate | Name | Result |
|------|------|--------|
| 1 | No Template Files | [TODO] |
| 2 | Linting Passes | [TODO] |
| 3 | Build Succeeds | [TODO] |
| 4 | Type Safety | [TODO] |
| 5 | All Tests Pass | [TODO] |
| 6 | Coverage ≥90% | [TODO] |
| 7 | Security Scan | [TODO] |
| 8 | Proof Complete | [TODO] |

## Implementation Notes
[Technical notes about the implementation]

## Files Changed
\`\`\`
[List of files added/modified]
\`\`\`

## Test Summary
\`\`\`
[Test output summary]
\`\`\`

## Lessons Learned
- [What went well]
- [What could be improved]

---

**Status:** 🔴 IN PROGRESS
EOF

echo -e "${GREEN}✓ Created proof file: ${PROOF_FILE}${NC}"

# Update state to DURING phase
sed -i '' 's/phase: "BEFORE"/phase: "DURING"/' "${STATE_FILE}" 2>/dev/null || \
sed -i 's/phase: "BEFORE"/phase: "DURING"/' "${STATE_FILE}"

echo ""
echo -e "${GREEN}Stage ${STAGE} initialized successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Open Claude Code"
echo "2. Say: \"We're starting Stage ${STAGE}, read CLAUDE.md for context\""
echo "3. Start implementing with TDD (RED → GREEN → REFACTOR)"
echo ""
echo "When done:"
echo "  ./scripts/run-quality-gates.sh --stage ${STAGE} 1 2 3 4 5 6 7 8"
echo "  ./scripts/complete-stage.sh --stage ${STAGE} --name \"${NAME}\""
