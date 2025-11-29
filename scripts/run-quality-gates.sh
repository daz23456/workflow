#!/usr/bin/env bash

###############################################################################
# Quality Gate Runner Script
#
# Purpose: Automate running quality gates with parallel execution and
#          tech stack auto-detection
#
# Usage:
#   ./scripts/run-quality-gates.sh               # Run all mandatory gates (1-6)
#   ./scripts/run-quality-gates.sh 1 2 3 4 5 6 7 # Run specific gates
#   ./scripts/run-quality-gates.sh --dotnet 1-8  # Force .NET, run gates 1-8
#   ./scripts/run-quality-gates.sh --typescript 1-9 # Force TypeScript, run gates 1-9
#   ./scripts/run-quality-gates.sh --help        # Show help
#
# Gate Numbers:
#   1 - Clean Build
#   2 - All Tests Passing
#   3 - Code Coverage ≥90%
#   4 - Zero Security Vulnerabilities
#   5 - No Template Files
#   6 - Proof File Completeness
#   7 - Mutation Testing ≥80%
#   8 - Linting & Code Style
#   9 - Type Safety Validation (TypeScript only)
#   10 - Integration Tests
#   11 - Performance Regression Detection
#   12 - API Contract Validation
#   13 - Documentation Completeness
#   14 - Accessibility Testing
#   15 - E2E Testing
#   16 - SAST (Static Application Security Testing)
#
# Exit Codes:
#   0 - All gates passed
#   1 - One or more gates failed
#   2 - Invalid usage
#
# Output:
#   - Colorized terminal output with ✅/❌ indicators
#   - Gate outputs saved to .gate-outputs/ directory
#   - Summary report at end
#
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Output directory for gate results
OUTPUT_DIR=".gate-outputs"
mkdir -p "$OUTPUT_DIR"

# Track gate results
GATES_PASSED=()
GATES_FAILED=()
GATES_SKIPPED=()

# Tech stack detection
TECH_STACK=""

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_gate_header() {
    local gate_num=$1
    local gate_name=$2
    echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  Gate $gate_num: $gate_name${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

detect_tech_stack() {
    if [[ -n "$TECH_STACK" ]]; then
        # Already set via command line
        return
    fi

    # Auto-detect based on project files
    if [[ -f "package.json" ]]; then
        TECH_STACK="typescript"
        print_info "Tech stack detected: TypeScript/Node.js"
    elif ls *.sln &>/dev/null || ls src/**/*.csproj &>/dev/null; then
        TECH_STACK="dotnet"
        print_info "Tech stack detected: .NET"
    else
        print_error "Could not detect tech stack. Use --dotnet or --typescript flag."
        exit 2
    fi
}

show_help() {
    cat <<EOF
Quality Gate Runner Script

USAGE:
    ./scripts/run-quality-gates.sh [OPTIONS] [GATES...]

OPTIONS:
    --dotnet           Force .NET tech stack
    --typescript       Force TypeScript tech stack
    --help             Show this help message

GATES:
    1-6                Mandatory gates (default if no gates specified)
    1-8                Typical for .NET backend
    1-9                Typical for TypeScript backend
    1-6,8,9,13,14      Typical for TypeScript UI

    Individual gates:
      1  - Clean Build
      2  - All Tests Passing
      3  - Code Coverage ≥90%
      4  - Zero Security Vulnerabilities
      5  - No Template Files
      6  - Proof File Completeness
      7  - Mutation Testing ≥80% (recommended, not blocking)
      8  - Linting & Code Style
      9  - Type Safety Validation (TypeScript only)
      10 - Integration Tests
      11 - Performance Regression Detection
      12 - API Contract Validation
      13 - Documentation Completeness
      14 - Accessibility Testing
      15 - E2E Testing
      16 - SAST (Static Application Security Testing)

EXAMPLES:
    ./scripts/run-quality-gates.sh                    # Run gates 1-6
    ./scripts/run-quality-gates.sh 1 2 3 4 5 6 7      # Run gates 1-7
    ./scripts/run-quality-gates.sh --dotnet 1 2 3 8   # .NET with linting
    ./scripts/run-quality-gates.sh --typescript 1-9   # TypeScript gates 1-9

OUTPUT:
    Gate results saved to: .gate-outputs/gate-N-*.txt

EXIT CODES:
    0 - All gates passed
    1 - One or more gates failed
    2 - Invalid usage

EOF
}

###############################################################################
# Gate Implementations
###############################################################################

run_gate_1() {
    print_gate_header 1 "Clean Build"
    local output_file="$OUTPUT_DIR/gate-3-build.txt"

    if [[ "$TECH_STACK" == "dotnet" ]]; then
        print_info "Running: dotnet clean && dotnet build --configuration Release"
        if dotnet clean &>"$output_file.tmp" && \
           dotnet build --configuration Release &>"$output_file"; then

            local warnings=$(grep -c "Warning(s)" "$output_file" || echo "0")
            local errors=$(grep -c "Error(s)" "$output_file" || echo "0")

            if grep -q "0 Warning(s)" "$output_file" && grep -q "0 Error(s)" "$output_file"; then
                print_success "Build succeeded: 0 warnings, 0 errors"
                GATES_PASSED+=("1")
                return 0
            else
                print_error "Build has warnings or errors"
                cat "$output_file"
                GATES_FAILED+=("1")
                return 1
            fi
        else
            print_error "Build failed"
            cat "$output_file"
            GATES_FAILED+=("1")
            return 1
        fi
    else
        print_info "Running: npm run clean && npm run build && npm run type-check"
        if npm run clean &>"$output_file.tmp" && \
           npm run build &>"$output_file" && \
           npm run type-check >> "$output_file" 2>&1; then
            print_success "Build succeeded"
            GATES_PASSED+=("1")
            return 0
        else
            print_error "Build failed"
            cat "$output_file"
            GATES_FAILED+=("1")
            return 1
        fi
    fi
}

run_gate_2() {
    print_gate_header 2 "All Tests Passing"
    local output_file="$OUTPUT_DIR/gate-5-tests.txt"

    if [[ "$TECH_STACK" == "dotnet" ]]; then
        print_info "Running: dotnet test --configuration Release"
        if dotnet test --configuration Release &>"$output_file"; then
            # Extract counts from output: "Passed! - Failed: 0, Passed: 235, Skipped: 0, Total: 235"
            local failed=$(grep -oP "Failed:\s+\K\d+" "$output_file" || echo "1")
            local skipped=$(grep -oP "Skipped:\s+\K\d+" "$output_file" || echo "1")
            local passed=$(grep -oP "Passed:\s+\K\d+" "$output_file" || echo "0")
            local total=$(grep -oP "Total:\s+\K\d+" "$output_file" || echo "0")

            # Enforce BOTH zero failures AND zero skipped
            if [[ "$failed" -eq 0 ]] && [[ "$skipped" -eq 0 ]]; then
                print_success "All tests passed: $passed/$total tests (0 failures, 0 skipped)"
                GATES_PASSED+=("2")
                return 0
            else
                # Specific error messages for each condition
                if [[ "$failed" -gt 0 ]]; then
                    print_error "Test failures: $failed failed tests"
                fi
                if [[ "$skipped" -gt 0 ]]; then
                    print_error "Skipped tests: $skipped skipped tests"
                    print_error "TDD requires all tests to run. Remove [Fact(Skip=\"...\")] or implement the tests."
                    print_info "Find skipped tests: grep -r \"\\[Fact(Skip\" tests/"
                fi
                cat "$output_file"
                GATES_FAILED+=("2")
                return 1
            fi
        else
            print_error "Test execution failed"
            cat "$output_file"
            GATES_FAILED+=("2")
            return 1
        fi
    else
        print_info "Running: npm test"
        if npm test &>"$output_file"; then
            # Universal skip detection (works with Vitest, Jest, Mocha)
            # Output formats: "5 skipped", "Tests: 5 skipped, 230 passed", "230 passed | 5 skipped"
            if grep -qE "[0-9]+\s+skipped" "$output_file"; then
                local skipped_count=$(grep -oE "[0-9]+\s+skipped" "$output_file" | grep -oE "^[0-9]+" | head -1)
                print_error "Skipped tests: $skipped_count skipped tests"
                print_error "TDD requires all tests to run. Remove .skip() / it.skip() / test.skip() or implement the tests."
                print_info "Find skipped tests: grep -r \"test.skip\\|it.skip\\|describe.skip\" src/"
                cat "$output_file"
                GATES_FAILED+=("2")
                return 1
            else
                print_success "All tests passed (0 failures, 0 skipped)"
                GATES_PASSED+=("2")
                return 0
            fi
        else
            # npm test exited non-zero (test failures)
            print_error "Test execution failed"
            cat "$output_file"
            GATES_FAILED+=("2")
            return 1
        fi
    fi
}

run_gate_3() {
    print_gate_header 3 "Code Coverage ≥90%"
    local output_file="$OUTPUT_DIR/gate-6-coverage.txt"

    if [[ "$TECH_STACK" == "dotnet" ]]; then
        print_info "Running: dotnet test --collect:\"XPlat Code Coverage\""
        if dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage &>"$output_file"; then
            print_info "Generating coverage report..."
            if reportgenerator -reports:./coverage/**/coverage.cobertura.xml \
                              -targetdir:./coverage/report \
                              -reporttypes:"Html;TextSummary" >> "$output_file" 2>&1; then

                local coverage=$(grep -oP "Line coverage:\s+\K[\d.]+" ./coverage/report/Summary.txt || echo "0")
                echo "Line coverage: $coverage%" >> "$output_file" 2>&1

                if (( $(echo "$coverage >= 90" | bc -l) )); then
                    print_success "Coverage: $coverage% (≥90% ✅)"
                    GATES_PASSED+=("3")
                    return 0
                else
                    print_error "Coverage: $coverage% (< 90% ❌)"
                    GATES_FAILED+=("3")
                    return 1
                fi
            else
                print_error "Failed to generate coverage report"
                GATES_FAILED+=("3")
                return 1
            fi
        else
            print_error "Coverage test failed"
            cat "$output_file"
            GATES_FAILED+=("3")
            return 1
        fi
    else
        print_info "Running: npm run test:coverage"
        if npm run test:coverage &>"$output_file"; then
            # Extract coverage percentage (varies by tool)
            local coverage=$(grep -oP "All files.*?\|\s+\K[\d.]+" "$output_file" | head -1 || echo "0")

            if (( $(echo "$coverage >= 90" | bc -l) )); then
                print_success "Coverage: $coverage% (≥90% ✅)"
                GATES_PASSED+=("3")
                return 0
            else
                print_error "Coverage: $coverage% (< 90% ❌)"
                GATES_FAILED+=("3")
                return 1
            fi
        else
            print_error "Coverage test failed"
            cat "$output_file"
            GATES_FAILED+=("3")
            return 1
        fi
    fi
}

run_gate_4() {
    print_gate_header 4 "Zero Security Vulnerabilities"
    local output_file="$OUTPUT_DIR/gate-7-security.txt"

    if [[ "$TECH_STACK" == "dotnet" ]]; then
        print_info "Running: dotnet list package --vulnerable --include-transitive"
        dotnet list package --vulnerable --include-transitive &>"$output_file"

        if grep -q "no vulnerable packages" "$output_file"; then
            print_success "No vulnerabilities found"
            GATES_PASSED+=("4")
            return 0
        else
            print_error "Vulnerabilities detected"
            cat "$output_file"
            GATES_FAILED+=("4")
            return 1
        fi
    else
        print_info "Running: npm audit --audit-level=moderate"
        if npm audit --audit-level=moderate &>"$output_file"; then
            print_success "No vulnerabilities found"
            GATES_PASSED+=("4")
            return 0
        else
            if grep -q "0 vulnerabilities" "$output_file"; then
                print_success "No vulnerabilities found"
                GATES_PASSED+=("4")
                return 0
            else
                print_error "Vulnerabilities detected"
                cat "$output_file"
                GATES_FAILED+=("4")
                return 1
            fi
        fi
    fi
}

run_gate_5() {
    print_gate_header 5 "No Template Files"
    local output_file="$OUTPUT_DIR/gate-1-templates.txt"

    if [[ "$TECH_STACK" == "dotnet" ]]; then
        print_info "Checking for: Class1.cs, UnitTest1.cs, WeatherForecast.cs"
        find . -name "Class1.cs" -o -name "UnitTest1.cs" -o -name "WeatherForecast.cs" > "$output_file" 2>&1
    else
        print_info "Checking for: App.test.tsx, setupTests.ts, logo.svg"
        find . -name "App.test.tsx" -o -name "setupTests.ts" -o -name "logo.svg" > "$output_file" 2>&1
    fi

    if [[ ! -s "$output_file" ]]; then
        print_success "No template files found"
        GATES_PASSED+=("5")
        return 0
    else
        print_error "Template files found:"
        cat "$output_file"
        GATES_FAILED+=("5")
        return 1
    fi
}

run_gate_6() {
    print_gate_header 6 "Proof File Completeness"
    local output_file="$OUTPUT_DIR/gate-8-proof.txt"

    print_info "Checking for placeholders in STAGE_*_PROOF.md"
    grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_*_PROOF.md > "$output_file" 2>&1 || true

    if [[ ! -s "$output_file" ]]; then
        print_success "Proof file complete (no placeholders)"
        GATES_PASSED+=("6")
        return 0
    else
        print_error "Placeholders found in proof file:"
        cat "$output_file"
        GATES_FAILED+=("6")
        return 1
    fi
}

run_gate_7() {
    print_gate_header 7 "Mutation Testing ≥80% (Recommended)"
    local output_file="$OUTPUT_DIR/gate-9-mutation.txt"

    print_warning "Mutation testing is RECOMMENDED but not blocking"

    if [[ "$TECH_STACK" == "dotnet" ]]; then
        print_info "Running: dotnet stryker --config-file stryker-config.json"
        if dotnet stryker --config-file stryker-config.json &>"$output_file"; then
            local score=$(grep -oP "Mutation score:\s+\K[\d.]+" "$output_file" || echo "0")

            if (( $(echo "$score >= 80" | bc -l) )); then
                print_success "Mutation score: $score% (≥80% ✅)"
                GATES_PASSED+=("7")
            else
                print_warning "Mutation score: $score% (< 80%, consider improving)"
                GATES_PASSED+=("7")  # Not blocking
            fi
            return 0
        else
            print_warning "Mutation testing failed (not blocking)"
            GATES_SKIPPED+=("7")
            return 0
        fi
    else
        print_info "Running: npx stryker run"
        if npx stryker run &>"$output_file"; then
            local score=$(grep -oP "Mutation score:\s+\K[\d.]+" "$output_file" || echo "0")

            if (( $(echo "$score >= 80" | bc -l) )); then
                print_success "Mutation score: $score% (≥80% ✅)"
                GATES_PASSED+=("7")
            else
                print_warning "Mutation score: $score% (< 80%, consider improving)"
                GATES_PASSED+=("7")  # Not blocking
            fi
            return 0
        else
            print_warning "Mutation testing failed (not blocking)"
            GATES_SKIPPED+=("7")
            return 0
        fi
    fi
}

run_gate_8() {
    print_gate_header 8 "Linting & Code Style"
    local output_file="$OUTPUT_DIR/gate-2-linting.txt"

    if [[ "$TECH_STACK" == "dotnet" ]]; then
        print_info "Running: dotnet format --verify-no-changes"
        if dotnet format --verify-no-changes &>"$output_file"; then
            print_success "Code style compliant"
            GATES_PASSED+=("8")
            return 0
        else
            print_error "Code style violations found"
            cat "$output_file"
            GATES_FAILED+=("8")
            return 1
        fi
    else
        print_info "Running: npx oxlint src/ && npm run lint"
        if npx oxlint src/ &>"$output_file" && npm run lint >> "$output_file" 2>&1; then
            print_success "Linting passed"
            GATES_PASSED+=("8")
            return 0
        else
            print_error "Linting errors found"
            cat "$output_file"
            GATES_FAILED+=("8")
            return 1
        fi
    fi
}

run_gate_9() {
    print_gate_header 9 "Type Safety Validation (TypeScript Only)"
    local output_file="$OUTPUT_DIR/gate-4-typecheck.txt"

    if [[ "$TECH_STACK" != "typescript" ]]; then
        print_info "Skipping (N/A for .NET - covered in Gate 3)"
        GATES_SKIPPED+=("9")
        return 0
    fi

    print_info "Running: npm run type-check"
    if npm run type-check &>"$output_file"; then
        print_success "Type check passed"
        GATES_PASSED+=("9")
        return 0
    else
        print_error "Type errors found"
        cat "$output_file"
        GATES_FAILED+=("9")
        return 1
    fi
}

###############################################################################
# Main Execution
###############################################################################

main() {
    print_header "🚀 Quality Gate Runner"

    # Parse arguments
    local gates_to_run=()

    while [[ $# -gt 0 ]]; do
        case $1 in
            --dotnet)
                TECH_STACK="dotnet"
                shift
                ;;
            --typescript)
                TECH_STACK="typescript"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                gates_to_run+=("$1")
                shift
                ;;
        esac
    done

    # Detect tech stack
    detect_tech_stack

    # Default to mandatory gates if none specified
    if [[ ${#gates_to_run[@]} -eq 0 ]]; then
        gates_to_run=(1 2 3 4 5 6)
        print_info "No gates specified, running mandatory gates: 1-6"
    fi

    print_info "Tech stack: $TECH_STACK"
    print_info "Gates to run: ${gates_to_run[*]}"
    print_info "Output directory: $OUTPUT_DIR"

    # Run gates
    local failed=0
    for gate in "${gates_to_run[@]}"; do
        if ! run_gate_$gate; then
            failed=1
            # Fail fast for mandatory gates (1-6)
            if [[ $gate -le 6 ]]; then
                print_error "BLOCKING FAILURE: Gate $gate failed (mandatory gate)"
                print_error "Fix the issue and re-run all gates from Gate 3"
                break
            fi
        fi
    done

    # Summary
    print_header "📊 Summary Report"

    echo -e "${BOLD}Gates Passed (${#GATES_PASSED[@]}):${NC}"
    for gate in "${GATES_PASSED[@]}"; do
        print_success "Gate $gate"
    done

    if [[ ${#GATES_FAILED[@]} -gt 0 ]]; then
        echo -e "\n${BOLD}Gates Failed (${#GATES_FAILED[@]}):${NC}"
        for gate in "${GATES_FAILED[@]}"; do
            print_error "Gate $gate"
        done
    fi

    if [[ ${#GATES_SKIPPED[@]} -gt 0 ]]; then
        echo -e "\n${BOLD}Gates Skipped (${#GATES_SKIPPED[@]}):${NC}"
        for gate in "${GATES_SKIPPED[@]}"; do
            print_info "Gate $gate"
        done
    fi

    echo -e "\n${BOLD}Output Files:${NC}"
    ls -lh "$OUTPUT_DIR"/*.txt 2>/dev/null || echo "No output files generated"

    # Final result
    if [[ $failed -eq 0 ]]; then
        print_header "✅ ALL GATES PASSED"
        exit 0
    else
        print_header "❌ SOME GATES FAILED"
        exit 1
    fi
}

# Run main function
main "$@"
