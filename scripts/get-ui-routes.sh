#!/bin/bash
# Maps page.tsx files to their routes
# Output format: /route|src/workflow-ui/app/route/page.tsx
#
# Usage:
#   ./scripts/get-ui-routes.sh              # List all routes
#   ./scripts/get-ui-routes.sh --routes     # List routes only (no file paths)
#   ./scripts/get-ui-routes.sh --json       # Output as JSON array

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UI_APP_DIR="$PROJECT_ROOT/src/workflow-ui/app"

# Parse arguments
OUTPUT_FORMAT="full"
while [[ $# -gt 0 ]]; do
  case $1 in
    --routes)
      OUTPUT_FORMAT="routes"
      shift
      ;;
    --json)
      OUTPUT_FORMAT="json"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Find all page.tsx files and map to routes
routes=()
while IFS= read -r file; do
  # Remove the base path to get relative path
  rel_path="${file#$UI_APP_DIR}"

  # Remove /page.tsx from the end
  route="${rel_path%/page.tsx}"

  # Handle root route
  [ -z "$route" ] && route="/"

  # Convert dynamic segments [param] to :param for display
  display_route=$(echo "$route" | sed 's/\[/:/g' | sed 's/\]//g')

  case $OUTPUT_FORMAT in
    routes)
      echo "$display_route"
      ;;
    json)
      routes+=("{\"route\": \"$display_route\", \"file\": \"${file#$PROJECT_ROOT/}\"}")
      ;;
    *)
      echo "$display_route|${file#$PROJECT_ROOT/}"
      ;;
  esac
done < <(find "$UI_APP_DIR" -name "page.tsx" -type f | sort)

# Output JSON if requested
if [ "$OUTPUT_FORMAT" = "json" ]; then
  echo "["
  for i in "${!routes[@]}"; do
    if [ $i -lt $((${#routes[@]} - 1)) ]; then
      echo "  ${routes[$i]},"
    else
      echo "  ${routes[$i]}"
    fi
  done
  echo "]"
fi
