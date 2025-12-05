#!/bin/bash
# Generate required screenshots manifest for a stage
#
# Usage:
#   ./scripts/generate-screenshot-manifest.sh --stage 9.7
#   ./scripts/generate-screenshot-manifest.sh --stage 9.7 --dry-run
#
# This script:
# 1. Detects UI files changed since last tag/commit
# 2. Reads declared affected_ui_pages from .stage-state.yaml
# 3. Generates a manifest of required screenshots (5 states per page)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Screenshot states to capture per page
STATES=("default" "loading" "empty" "error" "feature")

# Parse arguments
STAGE=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --stage)
      STAGE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

if [ -z "$STAGE" ]; then
  echo -e "${RED}Error: --stage is required${NC}"
  echo "Usage: ./scripts/generate-screenshot-manifest.sh --stage 9.7"
  exit 1
fi

STAGE_DIR="$PROJECT_ROOT/stage-proofs/stage-$STAGE"
STATE_FILE="$STAGE_DIR/.stage-state.yaml"

if [ ! -d "$STAGE_DIR" ]; then
  echo -e "${RED}Error: Stage directory not found: $STAGE_DIR${NC}"
  echo "Run ./scripts/init-stage.sh --stage $STAGE first"
  exit 1
fi

echo -e "${BLUE}Generating screenshot manifest for Stage $STAGE${NC}"

# Collect routes that need screenshots
declare -a ROUTES

# 1. Get changed UI files from git (since last tag or stage start)
echo -e "\n${YELLOW}Detecting changed UI files...${NC}"

# Try to find the last tag, fallback to checking recent commits
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "$LAST_TAG" ]; then
  # No tags, use last 100 commits as comparison base
  BASE_REF="HEAD~100"
  echo "  No tags found, comparing against last 100 commits"
else
  BASE_REF="$LAST_TAG"
  echo "  Comparing against tag: $LAST_TAG"
fi

# Find changed page.tsx files
CHANGED_UI_FILES=$(git diff --name-only "$BASE_REF"..HEAD 2>/dev/null | grep "src/workflow-ui/app.*page\.tsx" || true)

if [ -n "$CHANGED_UI_FILES" ]; then
  echo -e "  ${GREEN}Found changed UI pages:${NC}"
  while IFS= read -r file; do
    # Map file to route using get-ui-routes.sh
    route=$("$SCRIPT_DIR/get-ui-routes.sh" | grep "$file" | cut -d'|' -f1 || true)
    if [ -n "$route" ]; then
      echo "    - $route"
      ROUTES+=("$route")
    fi
  done <<< "$CHANGED_UI_FILES"
else
  echo "  No changed UI page files detected"
fi

# 2. Check for declared affected_ui_pages in .stage-state.yaml
echo -e "\n${YELLOW}Checking declared UI pages in stage state...${NC}"

if [ -f "$STATE_FILE" ]; then
  # Extract affected_ui_pages from YAML (handles both array and comma-separated formats)
  DECLARED_PAGES=$(grep -E "^affected_ui_pages:" "$STATE_FILE" | sed 's/affected_ui_pages:\s*//' | tr -d '[]"' | tr ',' '\n' | sed 's/^ *//;s/ *$//' | grep -v '^$' || true)

  if [ -n "$DECLARED_PAGES" ]; then
    echo -e "  ${GREEN}Found declared UI pages:${NC}"
    while IFS= read -r page; do
      if [ -n "$page" ] && [ "$page" != "none" ]; then
        echo "    - $page"
        ROUTES+=("$page")
      fi
    done <<< "$DECLARED_PAGES"
  else
    echo "  No UI pages declared in stage state"
  fi
else
  echo -e "  ${YELLOW}Warning: Stage state file not found${NC}"
fi

# 3. Remove duplicates from ROUTES
echo -e "\n${YELLOW}Consolidating routes...${NC}"
UNIQUE_ROUTES=($(echo "${ROUTES[@]}" | tr ' ' '\n' | sort -u))

if [ ${#UNIQUE_ROUTES[@]} -eq 0 ]; then
  echo -e "${YELLOW}No UI pages require screenshots for this stage.${NC}"
  echo -e "If this stage affects UI, use: ./scripts/init-stage.sh to declare affected pages"

  # Create empty manifest
  if [ "$DRY_RUN" = false ]; then
    echo "# No screenshots required for Stage $STAGE" > "$STAGE_DIR/screenshots-required.txt"
    echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$STAGE_DIR/screenshots-required.txt"
    echo -e "\n${GREEN}Created empty manifest: $STAGE_DIR/screenshots-required.txt${NC}"
  fi
  exit 0
fi

echo -e "  ${GREEN}Total unique routes: ${#UNIQUE_ROUTES[@]}${NC}"
for route in "${UNIQUE_ROUTES[@]}"; do
  echo "    - $route"
done

# 4. Generate screenshot manifest
echo -e "\n${YELLOW}Generating screenshot manifest...${NC}"

MANIFEST_FILE="$STAGE_DIR/screenshots-required.txt"
SCREENSHOT_COUNT=0

if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}[DRY RUN] Would generate:${NC}"
else
  echo "# Screenshot manifest for Stage $STAGE" > "$MANIFEST_FILE"
  echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$MANIFEST_FILE"
  echo "# States per page: ${STATES[*]}" >> "$MANIFEST_FILE"
  echo "#" >> "$MANIFEST_FILE"
fi

for route in "${UNIQUE_ROUTES[@]}"; do
  # Convert route to filename-safe format
  # /dashboard -> dashboard
  # /visualization/galaxy -> visualization-galaxy
  # /workflows/:name -> workflows-name
  # / -> home
  route_name=$(echo "$route" | tr '/' '-' | tr ':' '-' | sed 's/^-//' | sed 's/-$//')
  [ -z "$route_name" ] && route_name="home"

  if [ "$DRY_RUN" = true ]; then
    echo "  Route: $route"
  else
    echo "# Route: $route" >> "$MANIFEST_FILE"
  fi

  for state in "${STATES[@]}"; do
    screenshot="${route_name}--${state}.png"
    SCREENSHOT_COUNT=$((SCREENSHOT_COUNT + 1))

    if [ "$DRY_RUN" = true ]; then
      echo "    - $screenshot"
    else
      echo "$screenshot" >> "$MANIFEST_FILE"
    fi
  done

  if [ "$DRY_RUN" = false ]; then
    echo "" >> "$MANIFEST_FILE"
  fi
done

# 5. Summary
echo -e "\n${GREEN}Summary:${NC}"
echo "  Routes: ${#UNIQUE_ROUTES[@]}"
echo "  States per route: ${#STATES[@]} (${STATES[*]})"
echo "  Total screenshots required: $SCREENSHOT_COUNT"

if [ "$DRY_RUN" = false ]; then
  echo -e "\n${GREEN}Generated: $MANIFEST_FILE${NC}"
  echo -e "\n${BLUE}Next steps:${NC}"
  echo "  1. Start the UI dev server: cd src/workflow-ui && npm run dev"
  echo "  2. Capture screenshots: npx ts-node scripts/take-screenshots.ts --stage $STAGE"
  echo "  3. Verify: ls -la $STAGE_DIR/screenshots/"
fi
