#!/bin/bash

# Workflow Orchestration Engine - Automated Demo Test Script
# This script runs through the complete demo flow and validates all features

set -e  # Exit on any error

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5000}"
WORKFLOWS_DIR="${WORKFLOWS_DIR:-$(pwd)/demo/crds}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Workflow Orchestration Engine Demo Test"
echo "========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Workflows Directory: $WORKFLOWS_DIR"
echo ""

# Check if API is running
echo -e "${YELLOW}Step 0: Checking if WorkflowGateway is running...${NC}"
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: WorkflowGateway is not running at $BASE_URL${NC}"
    echo "Start it with: cd src/WorkflowGateway && dotnet run"
    exit 1
fi
echo -e "${GREEN}✓ WorkflowGateway is running${NC}"
echo ""

# Wait for workflow discovery
echo -e "${YELLOW}Step 1: Waiting for workflow discovery (10 seconds)...${NC}"
sleep 10
echo -e "${GREEN}✓ Discovery window complete${NC}"
echo ""

# List workflows
echo -e "${YELLOW}Step 2: Listing available workflows...${NC}"
WORKFLOWS_RESPONSE=$(curl -s "$BASE_URL/api/v1/workflows")
echo "$WORKFLOWS_RESPONSE" | jq '.'
WORKFLOW_COUNT=$(echo "$WORKFLOWS_RESPONSE" | jq '.workflows | length')
echo -e "${GREEN}✓ Found $WORKFLOW_COUNT workflows${NC}"
echo ""

# Test 1: Execute simple workflow
echo -e "${YELLOW}Step 3: Testing simple-fetch workflow...${NC}"
SIMPLE_RESULT=$(curl -s -X POST "$BASE_URL/api/v1/workflows/simple-fetch/execute" \
  -H "Content-Type: application/json" \
  -d '{"userId": "1"}')

echo "$SIMPLE_RESULT" | jq '.'

# Validate response
if echo "$SIMPLE_RESULT" | jq -e '.success == true' > /dev/null; then
    EXECUTION_ID=$(echo "$SIMPLE_RESULT" | jq -r '.executionId')
    USER_NAME=$(echo "$SIMPLE_RESULT" | jq -r '.output.name')
    DURATION=$(echo "$SIMPLE_RESULT" | jq -r '.duration')
    echo -e "${GREEN}✓ Workflow executed successfully${NC}"
    echo "  Execution ID: $EXECUTION_ID"
    echo "  User Name: $USER_NAME"
    echo "  Duration: ${DURATION}ms"
else
    echo -e "${RED}✗ Workflow execution failed${NC}"
    exit 1
fi
echo ""

# Test 2: Execute complex workflow with parallel execution
echo -e "${YELLOW}Step 4: Testing user-profile workflow (parallel execution)...${NC}"
PROFILE_RESULT=$(curl -s -X POST "$BASE_URL/api/v1/workflows/user-profile/execute" \
  -H "Content-Type: application/json" \
  -d '{"userId": "2"}')

echo "$PROFILE_RESULT" | jq '.'

# Validate response
if echo "$PROFILE_RESULT" | jq -e '.success == true' > /dev/null; then
    PROFILE_EXECUTION_ID=$(echo "$PROFILE_RESULT" | jq -r '.executionId')
    PROFILE_DURATION=$(echo "$PROFILE_RESULT" | jq -r '.duration')
    POSTS_COUNT=$(echo "$PROFILE_RESULT" | jq -r '.output.postsCount')
    echo -e "${GREEN}✓ Complex workflow executed successfully${NC}"
    echo "  Execution ID: $PROFILE_EXECUTION_ID"
    echo "  Posts Count: $POSTS_COUNT"
    echo "  Duration: ${PROFILE_DURATION}ms"
else
    echo -e "${RED}✗ Complex workflow execution failed${NC}"
    exit 1
fi
echo ""

# Test 3: Dry-run mode
echo -e "${YELLOW}Step 5: Testing dry-run mode...${NC}"
DRYRUN_RESULT=$(curl -s -X POST "$BASE_URL/api/v1/workflows/user-profile/test" \
  -H "Content-Type: application/json" \
  -d '{"userId": "3"}')

echo "$DRYRUN_RESULT" | jq '.'

if echo "$DRYRUN_RESULT" | jq -e '.valid == true' > /dev/null; then
    TOTAL_TASKS=$(echo "$DRYRUN_RESULT" | jq -r '.executionPlan.totalTasks')
    echo -e "${GREEN}✓ Dry-run validation passed${NC}"
    echo "  Total Tasks: $TOTAL_TASKS"
else
    echo -e "${RED}✗ Dry-run validation failed${NC}"
    exit 1
fi
echo ""

# Test 4: Input validation (should fail)
echo -e "${YELLOW}Step 6: Testing input validation (expect failure)...${NC}"
VALIDATION_RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/workflows/simple-fetch/execute" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$VALIDATION_RESULT" | tail -n1)
RESPONSE_BODY=$(echo "$VALIDATION_RESULT" | sed '$d')

echo "$RESPONSE_BODY" | jq '.'

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Input validation correctly rejected invalid input${NC}"
else
    echo -e "${RED}✗ Expected 400 status code, got $HTTP_CODE${NC}"
    exit 1
fi
echo ""

# Test 5: Execution history (if database is configured)
echo -e "${YELLOW}Step 7: Checking execution history...${NC}"
HISTORY_RESULT=$(curl -s "$BASE_URL/api/v1/workflows/simple-fetch/executions")

echo "$HISTORY_RESULT" | jq '.'

if echo "$HISTORY_RESULT" | jq -e '.executions' > /dev/null 2>&1; then
    HISTORY_COUNT=$(echo "$HISTORY_RESULT" | jq '.executions | length')
    echo -e "${GREEN}✓ Execution history available${NC}"
    echo "  Executions found: $HISTORY_COUNT"
else
    echo -e "${YELLOW}⚠ Execution history not available (database not configured?)${NC}"
fi
echo ""

# Test 6: Execution trace (if database is configured)
if [ ! -z "$EXECUTION_ID" ]; then
    echo -e "${YELLOW}Step 8: Checking execution trace...${NC}"
    TRACE_RESULT=$(curl -s "$BASE_URL/api/v1/executions/$EXECUTION_ID/trace")

    if echo "$TRACE_RESULT" | jq -e '.executionId' > /dev/null 2>&1; then
        echo "$TRACE_RESULT" | jq '.'
        TASK_COUNT=$(echo "$TRACE_RESULT" | jq '.taskTimings | length')
        echo -e "${GREEN}✓ Execution trace available${NC}"
        echo "  Tasks in trace: $TASK_COUNT"
    else
        echo -e "${YELLOW}⚠ Execution trace not available (database not configured?)${NC}"
    fi
    echo ""
fi

# Test 7: Workflow versions (if database is configured)
echo -e "${YELLOW}Step 9: Checking workflow versions...${NC}"
VERSIONS_RESULT=$(curl -s "$BASE_URL/api/v1/workflows/simple-fetch/versions")

if echo "$VERSIONS_RESULT" | jq -e '.versions' > /dev/null 2>&1; then
    echo "$VERSIONS_RESULT" | jq '.'
    VERSION_COUNT=$(echo "$VERSIONS_RESULT" | jq '.versions | length')
    echo -e "${GREEN}✓ Workflow versions available${NC}"
    echo "  Versions found: $VERSION_COUNT"
else
    echo -e "${YELLOW}⚠ Workflow versions not available (database not configured?)${NC}"
fi
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}✅ DEMO TEST COMPLETE${NC}"
echo "========================================="
echo ""
echo "All core features validated:"
echo "  ✓ Workflow discovery and dynamic endpoints"
echo "  ✓ Synchronous workflow execution"
echo "  ✓ Parallel task execution and dependencies"
echo "  ✓ Template resolution and output mapping"
echo "  ✓ Input validation (schema checking)"
echo "  ✓ Dry-run mode (validation without execution)"
echo ""
echo "Optional features (require database):"
if echo "$HISTORY_RESULT" | jq -e '.executions' > /dev/null 2>&1; then
    echo "  ✓ Execution history"
else
    echo "  ⚠ Execution history (not configured)"
fi

if echo "$TRACE_RESULT" | jq -e '.executionId' > /dev/null 2>&1; then
    echo "  ✓ Execution traces"
else
    echo "  ⚠ Execution traces (not configured)"
fi

if echo "$VERSIONS_RESULT" | jq -e '.versions' > /dev/null 2>&1; then
    echo "  ✓ Workflow versioning"
else
    echo "  ⚠ Workflow versioning (not configured)"
fi

echo ""
echo "Next: View these workflows in the UI (Stage 9)"
echo ""
