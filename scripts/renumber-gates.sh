#!/bin/bash
# Gate Renumbering Script
# Two-pass replacement to avoid conflicts

set -e

FILE="$1"

if [ -z "$FILE" ]; then
    echo "Usage: $0 <file-to-update>"
    exit 1
fi

if [ ! -f "$FILE" ]; then
    echo "Error: File not found: $FILE"
    exit 1
fi

echo "🔄 Renumbering gates in: $FILE"

# PASS 1: Replace with temporary placeholders to avoid conflicts
echo "  Pass 1: Temporary placeholders..."

sed -i.bak \
    -e 's/Gate 20/GATE_TEMP_20/g' \
    -e 's/Gate 19/GATE_TEMP_19/g' \
    -e 's/Gate 18/GATE_TEMP_18/g' \
    -e 's/Gate 17/GATE_TEMP_17/g' \
    -e 's/Gate 16/GATE_TEMP_16/g' \
    -e 's/Gate 15/GATE_TEMP_15/g' \
    -e 's/Gate 14/GATE_TEMP_14/g' \
    -e 's/Gate 13/GATE_TEMP_10/g' \
    -e 's/Gate 12/GATE_TEMP_13/g' \
    -e 's/Gate 11/GATE_TEMP_12/g' \
    -e 's/Gate 10/GATE_TEMP_11/g' \
    -e 's/Gate 9/GATE_TEMP_4/g' \
    -e 's/Gate 8/GATE_TEMP_2/g' \
    -e 's/Gate 7/GATE_TEMP_9/g' \
    -e 's/Gate 6/GATE_TEMP_8/g' \
    -e 's/Gate 5/GATE_TEMP_1/g' \
    -e 's/Gate 4/GATE_TEMP_7/g' \
    -e 's/Gate 3/GATE_TEMP_6/g' \
    -e 's/Gate 2/GATE_TEMP_5/g' \
    -e 's/Gate 1/GATE_TEMP_3/g' \
    "$FILE"

# PASS 2: Replace placeholders with final gate numbers
echo "  Pass 2: Final gate numbers..."

sed -i.bak2 \
    -e 's/GATE_TEMP_20/Gate 20/g' \
    -e 's/GATE_TEMP_19/Gate 19/g' \
    -e 's/GATE_TEMP_18/Gate 18/g' \
    -e 's/GATE_TEMP_17/Gate 17/g' \
    -e 's/GATE_TEMP_16/Gate 16/g' \
    -e 's/GATE_TEMP_15/Gate 15/g' \
    -e 's/GATE_TEMP_14/Gate 14/g' \
    -e 's/GATE_TEMP_13/Gate 13/g' \
    -e 's/GATE_TEMP_12/Gate 12/g' \
    -e 's/GATE_TEMP_11/Gate 11/g' \
    -e 's/GATE_TEMP_10/Gate 10/g' \
    -e 's/GATE_TEMP_9/Gate 9/g' \
    -e 's/GATE_TEMP_8/Gate 8/g' \
    -e 's/GATE_TEMP_7/Gate 7/g' \
    -e 's/GATE_TEMP_6/Gate 6/g' \
    -e 's/GATE_TEMP_5/Gate 5/g' \
    -e 's/GATE_TEMP_4/Gate 4/g' \
    -e 's/GATE_TEMP_3/Gate 3/g' \
    -e 's/GATE_TEMP_2/Gate 2/g' \
    -e 's/GATE_TEMP_1/Gate 1/g' \
    "$FILE"

# PASS 3: Update gate filename patterns (gate-X-*.txt)
echo "  Pass 3: Gate filenames..."

sed -i.bak3 \
    -e 's/gate-20-/GATE_FILE_20-/g' \
    -e 's/gate-19-/GATE_FILE_19-/g' \
    -e 's/gate-18-/GATE_FILE_18-/g' \
    -e 's/gate-17-/GATE_FILE_17-/g' \
    -e 's/gate-16-/GATE_FILE_16-/g' \
    -e 's/gate-15-/GATE_FILE_15-/g' \
    -e 's/gate-14-/GATE_FILE_14-/g' \
    -e 's/gate-13-/GATE_FILE_10-/g' \
    -e 's/gate-12-/GATE_FILE_13-/g' \
    -e 's/gate-11-/GATE_FILE_12-/g' \
    -e 's/gate-10-/GATE_FILE_11-/g' \
    -e 's/gate-9-/GATE_FILE_4-/g' \
    -e 's/gate-8-/GATE_FILE_2-/g' \
    -e 's/gate-7-/GATE_FILE_9-/g' \
    -e 's/gate-6-/GATE_FILE_8-/g' \
    -e 's/gate-5-/GATE_FILE_1-/g' \
    -e 's/gate-4-/GATE_FILE_7-/g' \
    -e 's/gate-3-/GATE_FILE_6-/g' \
    -e 's/gate-2-/GATE_FILE_5-/g' \
    -e 's/gate-1-/GATE_FILE_3-/g' \
    "$FILE"

sed -i.bak4 \
    -e 's/GATE_FILE_/gate-/g' \
    "$FILE"

# Cleanup backup files
rm -f "$FILE.bak" "$FILE.bak2" "$FILE.bak3" "$FILE.bak4"

echo "✅ Gate renumbering complete for: $FILE"
echo ""
echo "  Old → New mappings applied:"
echo "    Gate 5 → Gate 1 (No Templates)"
echo "    Gate 8 → Gate 2 (Linting)"
echo "    Gate 1 → Gate 3 (Build)"
echo "    Gate 9 → Gate 4 (Type Safety)"
echo "    Gate 2 → Gate 5 (Tests)"
echo "    Gate 3 → Gate 6 (Coverage)"
echo "    Gate 4 → Gate 7 (Security)"
echo "    Gate 6 → Gate 8 (Proof)"
echo "    Gate 7 → Gate 9 (Mutation)"
echo "    Gate 13 → Gate 10 (Documentation)"
echo "    Gate 10 → Gate 11 (Integration)"
echo "    Gate 11 → Gate 12 (Performance)"
echo "    Gate 12 → Gate 13 (API Contract)"
echo "    Gates 14-20 → Unchanged"
echo ""
