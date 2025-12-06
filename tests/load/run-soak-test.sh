#!/bin/bash
# Soak Test Runner with Memory Monitoring
# Designed to run for hours and detect memory leaks

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Default test parameters (can be overridden)
DURATION="${DURATION:-10m}"  # Default 10 minutes for quick test
RATE="${RATE:-5}"            # 5 requests/second
MEMORY_INTERVAL="${MEMORY_INTERVAL:-5}"  # Check memory every 5 seconds

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   WORKFLOW ORCHESTRATOR SOAK TEST${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Configuration:"
echo "  Duration: $DURATION"
echo "  Rate: $RATE req/s"
echo "  Results: $RESULTS_DIR"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"
MEMORY_LOG="$RESULTS_DIR/memory_${TIMESTAMP}.csv"
SOAK_RESULTS="$RESULTS_DIR/soak_${TIMESTAMP}.json"

# Function to check if port is in use
check_port() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    echo -n "Waiting for $name..."
    while ! curl -s "$url" >/dev/null 2>&1; do
        if [ $attempt -ge $max_attempts ]; then
            echo -e " ${RED}FAILED${NC}"
            return 1
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done
    echo -e " ${GREEN}OK${NC}"
    return 0
}

# Function to monitor memory
monitor_memory() {
    local gateway_pid=$1
    local testapi_pid=$2
    local log_file=$3

    echo "timestamp,gateway_rss_mb,gateway_vsz_mb,testapi_rss_mb,testapi_vsz_mb" > "$log_file"

    while true; do
        local timestamp=$(date +%s)

        # Get memory for gateway (RSS and VSZ in KB, convert to MB)
        if ps -p $gateway_pid >/dev/null 2>&1; then
            gateway_mem=$(ps -o rss=,vsz= -p $gateway_pid 2>/dev/null | awk '{print $1/1024","$2/1024}')
        else
            gateway_mem="0,0"
        fi

        # Get memory for test API server
        if ps -p $testapi_pid >/dev/null 2>&1; then
            testapi_mem=$(ps -o rss=,vsz= -p $testapi_pid 2>/dev/null | awk '{print $1/1024","$2/1024}')
        else
            testapi_mem="0,0"
        fi

        echo "$timestamp,$gateway_mem,$testapi_mem" >> "$log_file"
        sleep $MEMORY_INTERVAL
    done
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up...${NC}"

    # Stop memory monitor
    if [ -n "$MEMORY_MONITOR_PID" ] && ps -p $MEMORY_MONITOR_PID >/dev/null 2>&1; then
        kill $MEMORY_MONITOR_PID 2>/dev/null || true
    fi

    # Stop servers if we started them
    if [ "$STARTED_GATEWAY" = "true" ]; then
        echo "Stopping WorkflowGateway..."
        pkill -f "dotnet.*WorkflowGateway" 2>/dev/null || true
    fi

    if [ "$STARTED_TESTAPI" = "true" ]; then
        echo "Stopping TestApiServer..."
        pkill -f "dotnet.*TestApiServer" 2>/dev/null || true
    fi

    echo -e "${GREEN}Cleanup complete${NC}"
}

trap cleanup EXIT

# Start Test API Server if not running
STARTED_TESTAPI="false"
if ! check_port 5100; then
    echo -e "${YELLOW}Starting Test API Server...${NC}"
    cd "$PROJECT_ROOT/tests/TestApiServer/TestApiServer"
    dotnet run &
    TESTAPI_PID=$!
    STARTED_TESTAPI="true"
    wait_for_service "http://localhost:5100/health" "Test API Server"
else
    echo -e "${GREEN}Test API Server already running${NC}"
    TESTAPI_PID=$(lsof -ti :5100 | head -1)
fi

# Start WorkflowGateway if not running
STARTED_GATEWAY="false"
if ! check_port 5001; then
    echo -e "${YELLOW}Starting WorkflowGateway...${NC}"
    cd "$PROJECT_ROOT"
    ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/WorkflowGateway/WorkflowGateway.csproj &
    GATEWAY_PID=$!
    STARTED_GATEWAY="true"
    wait_for_service "http://localhost:5001/health" "WorkflowGateway"
    sleep 5  # Extra time for workflow discovery
else
    echo -e "${GREEN}WorkflowGateway already running${NC}"
    GATEWAY_PID=$(lsof -ti :5001 | head -1)
fi

# Verify workflows are available
WORKFLOW_COUNT=$(curl -s http://localhost:5001/api/v1/workflows | jq '.workflows | length')
echo -e "Available workflows: ${GREEN}$WORKFLOW_COUNT${NC}"

if [ "$WORKFLOW_COUNT" -lt 10 ]; then
    echo -e "${RED}Warning: Less than 10 workflows available!${NC}"
fi

# Start memory monitoring in background
echo ""
echo -e "${BLUE}Starting memory monitoring...${NC}"
echo "Memory log: $MEMORY_LOG"
monitor_memory $GATEWAY_PID $TESTAPI_PID "$MEMORY_LOG" &
MEMORY_MONITOR_PID=$!

# Record initial memory
sleep 2
INITIAL_MEM=$(tail -1 "$MEMORY_LOG" | cut -d',' -f2)
echo "Initial Gateway memory: ${INITIAL_MEM}MB"

# Run the soak test
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   STARTING SOAK TEST${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

cd "$SCRIPT_DIR"
GATEWAY_URL=http://localhost:5001 DURATION=$DURATION RATE=$RATE k6 run soak-test.js \
    --out json="$SOAK_RESULTS" \
    2>&1 | tee "$RESULTS_DIR/soak_output_${TIMESTAMP}.txt"

# Analyze memory results
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   MEMORY ANALYSIS${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Get final memory
FINAL_MEM=$(tail -1 "$MEMORY_LOG" | cut -d',' -f2)
echo "Final Gateway memory: ${FINAL_MEM}MB"

# Calculate memory growth
if [ -n "$INITIAL_MEM" ] && [ -n "$FINAL_MEM" ]; then
    GROWTH=$(echo "$FINAL_MEM - $INITIAL_MEM" | bc)
    GROWTH_PCT=$(echo "scale=1; ($GROWTH / $INITIAL_MEM) * 100" | bc)
    echo "Memory growth: ${GROWTH}MB (${GROWTH_PCT}%)"

    # Check for memory leak (>50% growth is suspicious)
    if (( $(echo "$GROWTH_PCT > 50" | bc -l) )); then
        echo -e "${RED}WARNING: Possible memory leak detected!${NC}"
    else
        echo -e "${GREEN}Memory usage stable${NC}"
    fi
fi

# Generate summary
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   RESULTS SUMMARY${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Results saved to:"
echo "  - Memory log: $MEMORY_LOG"
echo "  - Soak results: $SOAK_RESULTS"
echo "  - Test output: $RESULTS_DIR/soak_output_${TIMESTAMP}.txt"
echo ""

# Parse key metrics from k6 output
if [ -f "$RESULTS_DIR/soak_output_${TIMESTAMP}.txt" ]; then
    echo "Key Metrics:"
    grep -E "(http_reqs|http_req_duration|workflow_success_rate|workflow_errors)" "$RESULTS_DIR/soak_output_${TIMESTAMP}.txt" | head -10 || true
fi

echo ""
echo -e "${GREEN}Soak test complete!${NC}"
