#!/usr/bin/env bash

###############################################################################
# Migrate Existing Proof Files to New Structure
#
# Purpose: One-time migration of existing STAGE_X_PROOF.md files from root
#          to the new stage-proofs/stage-X/ directory structure
#
# Usage:
#   ./scripts/migrate-existing-proofs.sh [--dry-run]
#
# Options:
#   --dry-run    Show what would be moved without actually moving files
#
# What this does:
#   1. Finds all STAGE_*_PROOF.md files in root directory
#   2. Creates stage-proofs/stage-X/ directories
#   3. Moves proof files to new locations
#   4. Adds migration note to each proof file
#
# Note: This is a ONE-TIME operation. After migration, new stages should
#       create proof files directly in stage-proofs/stage-X/
#
###############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dry-run]"
            exit 1
            ;;
    esac
done

echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}  Migrating Existing Proof Files${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN MODE - No files will be moved${NC}\n"
fi

# Find all STAGE_*_PROOF.md files in root
PROOF_FILES=$(find . -maxdepth 1 -name "STAGE_*_PROOF.md" -type f 2>/dev/null || true)

if [ -z "$PROOF_FILES" ]; then
    echo -e "${YELLOW}No proof files found in root directory.${NC}"
    echo -e "${GREEN}✅ Already migrated or no stages completed yet.${NC}\n"
    exit 0
fi

MIGRATED_COUNT=0

# Process each proof file
while IFS= read -r proof_file; do
    # Skip if empty
    [ -z "$proof_file" ] && continue

    # Extract stage number from filename
    # Handle formats: STAGE_1_PROOF.md, STAGE_7.5_PROOF.md, STAGE_7.9_PROOF.md
    stage_num=$(echo "$proof_file" | sed -n 's/.*STAGE_\([0-9.]*\)_PROOF\.md/\1/p')

    if [ -z "$stage_num" ]; then
        echo -e "${YELLOW}⚠️  Skipping: $proof_file (couldn't extract stage number)${NC}"
        continue
    fi

    # Create destination directory
    dest_dir="stage-proofs/stage-$stage_num"
    dest_file="$dest_dir/STAGE_${stage_num}_PROOF.md"

    echo -e "${CYAN}Found: $proof_file → Stage $stage_num${NC}"

    if [ "$DRY_RUN" = false ]; then
        # Create directory structure
        mkdir -p "$dest_dir/reports"/{coverage,test-results,mutation,gates,benchmarks}

        # Move proof file
        mv "$proof_file" "$dest_file"

        # Add migration note to proof file
        cat >> "$dest_file" << 'EOF'

---

**Migration Note:** This proof file was migrated from root directory to the new
stage-proofs/ structure. Original artifacts (coverage reports, test results) were
not preserved as they were overwritten by subsequent stages. Metrics above reflect
the state at stage completion time (verified via git commit).

Future stages will preserve all artifacts in `./reports/` for verification.
EOF

        echo -e "${GREEN}  ✅ Migrated to: $dest_dir/${NC}"
        ((MIGRATED_COUNT++))
    else
        echo -e "${YELLOW}  [DRY RUN] Would create: $dest_dir/${NC}"
        echo -e "${YELLOW}  [DRY RUN] Would move: $proof_file → $dest_file${NC}"
    fi

    echo ""
done <<< "$PROOF_FILES"

# Summary
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$DRY_RUN" = false ]; then
    echo -e "${GREEN}${BOLD}✅ Migrated $MIGRATED_COUNT proof file(s)${NC}\n"

    if [ $MIGRATED_COUNT -gt 0 ]; then
        echo -e "${BOLD}Next steps:${NC}"
        echo -e "  1. Review migrated files in stage-proofs/"
        echo -e "  2. Commit the migration:"
        echo -e "     ${CYAN}git add stage-proofs/${NC}"
        echo -e "     ${CYAN}git commit -m \"chore: Migrate proof files to stage-proofs/ structure\"${NC}"
        echo -e "  3. Remove this migration script (one-time use):"
        echo -e "     ${CYAN}rm scripts/migrate-existing-proofs.sh${NC}"
        echo ""
    fi
else
    echo -e "${YELLOW}${BOLD}DRY RUN: Would migrate $MIGRATED_COUNT proof file(s)${NC}"
    echo -e "${YELLOW}Run without --dry-run to perform actual migration${NC}\n"
fi
