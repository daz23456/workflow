#!/bin/bash

# Workflow Orchestration Engine - Load Test Runner
# Usage: ./run-tests.sh [level] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"

# Default values
BASE_URL="${BASE_URL:-http://localhost:5000}"
LEVEL="${1:-help}"

# Create results directory
mkdir -p "${RESULTS_DIR}"

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  WORKFLOW ORCHESTRATION LOAD TESTING${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_level() {
    echo -e "${GREEN}Level: $1${NC}"
    echo -e "Description: $2"
    echo -e "Duration: $3"
    echo -e "Peak Load: $4"
    echo ""
}

show_help() {
    print_header
    echo "Usage: ./run-tests.sh [level] [options]"
    echo ""
    echo "STRESS LEVELS (in order of intensity):"
    echo ""
    echo -e "${GREEN}  smoke${NC}     - Quick validation (30s, 1 VU)"
    echo "              Verifies all endpoints respond correctly"
    echo ""
    echo -e "${GREEN}  baseline${NC}  - Normal production load (5m, 100 req/s)"
    echo "              Establishes performance baseline"
    echo ""
    echo -e "${GREEN}  load${NC}      - Heavy production load (10m, 500 req/s)"
    echo "              Tests sustained high traffic"
    echo ""
    echo -e "${GREEN}  stress${NC}    - Find breaking points (11m, 1000 req/s)"
    echo "              Pushes system limits"
    echo ""
    echo -e "${GREEN}  spike${NC}     - Traffic burst simulation (10m, 5000 req/s spike)"
    echo "              Tests sudden traffic increases"
    echo ""
    echo -e "${GREEN}  soak${NC}      - Long-running stability (30m, 500 req/s)"
    echo "              Tests memory leaks and stability"
    echo ""
    echo -e "${GREEN}  chaos${NC}     - Multi-persona chaos (10m, mixed)"
    echo "              Simulates real production environment"
    echo ""
    echo -e "${GREEN}  db${NC}        - Database contention (10m, heavy writes)"
    echo "              Tests PostgreSQL under load"
    echo ""
    echo -e "${GREEN}  ultimate${NC}  - Maximum stress (8m, 10000 req/s)"
    echo "              Absolute limits test - may crash!"
    echo ""
    echo "OPTIONS:"
    echo "  --url URL     Target URL (default: ${BASE_URL})"
    echo "  --output DIR  Results directory (default: ./results)"
    echo "  --grafana     Output to InfluxDB for Grafana"
    echo ""
    echo "EXAMPLES:"
    echo "  ./run-tests.sh smoke                    # Quick check"
    echo "  ./run-tests.sh baseline                 # Establish baseline"
    echo "  ./run-tests.sh stress --url https://staging.example.com"
    echo "  ./run-tests.sh chaos --grafana          # With Grafana dashboard"
    echo ""
    echo "RECOMMENDED ORDER:"
    echo "  1. smoke     - Verify endpoints work"
    echo "  2. baseline  - Get baseline metrics"
    echo "  3. load      - Confirm capacity"
    echo "  4. stress    - Find limits"
    echo "  5. chaos     - Real-world simulation"
    echo "  6. soak      - Long-term stability"
    echo ""
}

run_test() {
    local script=$1
    local mode=$2
    local description=$3

    echo -e "${YELLOW}Starting: ${description}${NC}"
    echo "Script: ${script}"
    echo "Mode: ${mode:-default}"
    echo "Target: ${BASE_URL}"
    echo ""

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local output_file="${RESULTS_DIR}/${mode:-test}_${timestamp}.json"

    # Build k6 command
    local cmd="k6 run"
    cmd="${cmd} --env BASE_URL=${BASE_URL}"

    if [ -n "${mode}" ]; then
        cmd="${cmd} --env TEST_MODE=${mode}"
    fi

    if [ "${GRAFANA}" = "true" ]; then
        cmd="${cmd} --out influxdb=http://localhost:8086/k6"
    fi

    cmd="${cmd} --summary-export=${output_file}"
    cmd="${cmd} ${SCRIPT_DIR}/scenarios/${script}"

    echo "Command: ${cmd}"
    echo ""

    # Run the test
    eval ${cmd}

    echo ""
    echo -e "${GREEN}Results saved to: ${output_file}${NC}"
    echo ""
}

# Parse options
while [[ $# -gt 1 ]]; do
    case $2 in
        --url)
            BASE_URL="$3"
            shift 2
            ;;
        --output)
            RESULTS_DIR="$3"
            shift 2
            ;;
        --grafana)
            GRAFANA="true"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Run appropriate test
case "${LEVEL}" in
    smoke)
        print_header
        print_level "SMOKE" "Quick endpoint validation" "30 seconds" "1 VU"
        run_test "smoke-test.js" "" "Smoke Test"
        ;;

    baseline)
        print_header
        print_level "BASELINE" "Normal production load" "5 minutes" "100 req/s"
        run_test "execution-stress.js" "baseline" "Baseline Load Test"
        ;;

    load)
        print_header
        print_level "LOAD" "Heavy sustained traffic" "10 minutes" "500 req/s"
        run_test "execution-stress.js" "load" "Load Test"
        ;;

    stress)
        print_header
        print_level "STRESS" "Finding breaking points" "11 minutes" "1000 req/s"
        run_test "execution-stress.js" "stress" "Stress Test"
        ;;

    spike)
        print_header
        print_level "SPIKE" "Sudden traffic burst" "10 minutes" "5000 req/s spike"
        run_test "execution-stress.js" "spike" "Spike Test"
        ;;

    soak)
        print_header
        print_level "SOAK" "Long-running stability" "30 minutes" "500 req/s"
        echo -e "${YELLOW}WARNING: This test runs for 30 minutes!${NC}"
        echo ""
        run_test "execution-stress.js" "soak" "Soak Test"
        ;;

    chaos)
        print_header
        print_level "CHAOS" "Multi-persona simulation" "10 minutes" "Mixed workload"
        run_test "production-chaos.js" "" "Production Chaos Simulation"
        ;;

    db)
        print_header
        print_level "DATABASE" "PostgreSQL contention" "10 minutes" "Heavy writes + reads"
        run_test "db-contention.js" "" "Database Contention Test"
        ;;

    ultimate)
        print_header
        print_level "ULTIMATE" "Maximum stress test" "8 minutes" "10000 req/s"
        echo -e "${RED}WARNING: This may crash your system!${NC}"
        echo -e "${RED}Ensure you have monitoring in place.${NC}"
        echo ""
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_test "execution-stress.js" "ultimate" "Ultimate Stress Test"
        else
            echo "Aborted."
        fi
        ;;

    breakpoint)
        print_header
        print_level "BREAKPOINT" "Ramp until failure" "14 minutes" "Up to 10000 req/s"
        echo -e "${RED}WARNING: This will find your system's breaking point!${NC}"
        echo ""
        run_test "execution-stress.js" "breakpoint" "Breakpoint Test"
        ;;

    all)
        print_header
        echo "Running full test suite..."
        echo ""
        echo "Order: smoke -> baseline -> load -> stress -> chaos"
        echo ""

        ./run-tests.sh smoke --url "${BASE_URL}"
        ./run-tests.sh baseline --url "${BASE_URL}"
        ./run-tests.sh load --url "${BASE_URL}"
        ./run-tests.sh stress --url "${BASE_URL}"
        ./run-tests.sh chaos --url "${BASE_URL}"

        echo ""
        echo -e "${GREEN}Full test suite completed!${NC}"
        echo "Results in: ${RESULTS_DIR}"
        ;;

    help|--help|-h|"")
        show_help
        ;;

    *)
        echo -e "${RED}Unknown level: ${LEVEL}${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
