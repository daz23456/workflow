#!/usr/bin/env python3

"""
Proof File Generator Script

Purpose: Automatically generate STAGE_X_PROOF.md from quality gate outputs

Usage:
    ./scripts/generate-proof.py <stage_number> [--tech dotnet|typescript]
    ./scripts/generate-proof.py 7 --tech dotnet
    ./scripts/generate-proof.py 9 --tech typescript

Requirements:
    - Gate outputs must be in .gate-outputs/ directory
    - STAGE_PROOF_TEMPLATE.md must exist
    - Python 3.7+

Output:
    - STAGE_X_PROOF.md file with all placeholders filled
    - Verification report showing what was filled

Exit Codes:
    0 - Proof file generated successfully
    1 - Error during generation
    2 - Missing requirements or invalid usage
"""

import sys
import os
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, List

# ANSI color codes
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    BOLD = '\033[1m'
    NC = '\033[0m'  # No Color

def print_header(text: str) -> None:
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.NC}")
    print(f"{Colors.BOLD}{Colors.CYAN}  {text}{Colors.NC}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.NC}\n")

def print_success(text: str) -> None:
    print(f"{Colors.GREEN}✅ {text}{Colors.NC}")

def print_error(text: str) -> None:
    print(f"{Colors.RED}❌ {text}{Colors.NC}")

def print_warning(text: str) -> None:
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.NC}")

def print_info(text: str) -> None:
    print(f"{Colors.CYAN}ℹ️  {text}{Colors.NC}")

class ProofGenerator:
    def __init__(self, stage_number: int, tech_stack: str):
        self.stage_number = stage_number
        self.tech_stack = tech_stack
        self.gate_outputs_dir = Path(".gate-outputs")
        self.template_file = Path("STAGE_PROOF_TEMPLATE.md")
        self.output_file = Path(f"STAGE_{stage_number}_PROOF.md")
        self.data: Dict[str, str] = {}

    def check_requirements(self) -> bool:
        """Verify all requirements are met"""
        print_info("Checking requirements...")

        if not self.gate_outputs_dir.exists():
            print_error(f"Gate outputs directory not found: {self.gate_outputs_dir}")
            print_info("Run ./scripts/run-quality-gates.sh first")
            return False

        if not self.template_file.exists():
            print_error(f"Template file not found: {self.template_file}")
            return False

        gate_files = list(self.gate_outputs_dir.glob("gate-*.txt"))
        if not gate_files:
            print_error("No gate output files found")
            print_info("Run ./scripts/run-quality-gates.sh first")
            return False

        print_success(f"Found {len(gate_files)} gate output files")
        return True

    def extract_test_results(self) -> Optional[Dict[str, str]]:
        """Extract test results from Gate 5 output"""
        gate_file = self.gate_outputs_dir / "gate-5-tests.txt"
        if not gate_file.exists():
            return None

        content = gate_file.read_text()

        if self.tech_stack == "dotnet":
            # Parse .NET test output
            # Example: "Passed!  - Failed:     0, Passed:    42, Skipped:     0, Total:    42"
            match = re.search(r'Passed:\s+(\d+)', content)
            total_match = re.search(r'Total:\s+(\d+)', content)
            failed_match = re.search(r'Failed:\s+(\d+)', content)

            if match and total_match:
                passed = match.group(1)
                total = total_match.group(1)
                failed = failed_match.group(1) if failed_match else "0"

                return {
                    "passed": passed,
                    "total": total,
                    "failed": failed,
                    "status": "✅ PASS" if failed == "0" else "❌ FAIL"
                }
        else:
            # Parse TypeScript/Node.js test output
            # Try to extract test counts (varies by test runner)
            match = re.search(r'Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total', content)
            if match:
                passed = match.group(1)
                total = match.group(2)
                return {
                    "passed": passed,
                    "total": total,
                    "failed": "0",
                    "status": "✅ PASS"
                }

        return None

    def extract_coverage(self) -> Optional[str]:
        """Extract coverage percentage from Gate 6 output"""
        gate_file = self.gate_outputs_dir / "gate-6-coverage.txt"
        if not gate_file.exists():
            return None

        content = gate_file.read_text()

        # Look for coverage percentage
        match = re.search(r'Line coverage:\s+([\d.]+)%', content)
        if match:
            return match.group(1)

        # Alternative pattern for TypeScript
        match = re.search(r'All files.*?\|\s+([\d.]+)', content)
        if match:
            return match.group(1)

        return None

    def extract_build_info(self) -> Optional[Dict[str, str]]:
        """Extract build information from Gate 3 output"""
        gate_file = self.gate_outputs_dir / "gate-3-build.txt"
        if not gate_file.exists():
            return None

        content = gate_file.read_text()

        if self.tech_stack == "dotnet":
            # Parse .NET build output
            warnings_match = re.search(r'(\d+) Warning\(s\)', content)
            errors_match = re.search(r'(\d+) Error\(s\)', content)

            if warnings_match and errors_match:
                return {
                    "warnings": warnings_match.group(1),
                    "errors": errors_match.group(1),
                    "status": "✅ PASS" if warnings_match.group(1) == "0" else "❌ FAIL"
                }
        else:
            # TypeScript build - check for success
            if "error" in content.lower() and "0 errors" not in content.lower():
                return {"status": "❌ FAIL"}
            else:
                return {"status": "✅ PASS"}

        return None

    def extract_vulnerabilities(self) -> Optional[str]:
        """Extract vulnerability count from Gate 7 output"""
        gate_file = self.gate_outputs_dir / "gate-7-security.txt"
        if not gate_file.exists():
            return None

        content = gate_file.read_text()

        if "no vulnerable packages" in content.lower() or "0 vulnerabilities" in content:
            return "0"

        # Count vulnerabilities
        vuln_count = len(re.findall(r'(HIGH|MODERATE|CRITICAL)', content, re.IGNORECASE))
        return str(vuln_count)

    def generate_stage_summary(self) -> str:
        """Generate the stage summary table"""
        tests = self.extract_test_results()
        coverage = self.extract_coverage()
        build = self.extract_build_info()
        vulnerabilities = self.extract_vulnerabilities()

        test_str = f"{tests['passed']}/{tests['total']}" if tests else "[N/N]"
        test_status = tests['status'] if tests else "[STATUS]"

        coverage_str = f"{coverage}%" if coverage else "[XX%]"
        coverage_status = "✅ PASS" if coverage and float(coverage) >= 90 else "❌ FAIL" if coverage else "[STATUS]"

        build_str = build['status'] if build else "[STATUS]"

        vuln_str = vulnerabilities if vulnerabilities else "[N]"
        vuln_status = "✅ PASS" if vulnerabilities == "0" else "❌ FAIL" if vulnerabilities else "[STATUS]"

        return f"""| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Tests Passing | 100% | {test_str} | {test_status} |
| Test Failures | 0 | {tests['failed'] if tests else '0'} | {test_status} |
| Code Coverage | ≥90% | {coverage_str} | {coverage_status} |
| Build Warnings | 0 | {build['warnings'] if build and 'warnings' in build else '0'} | {build_str} |
| Vulnerabilities | 0 | {vuln_str} | {vuln_status} |
| Deliverables | [N/N] | [N/N] | [✅/❌] |"""

    def generate_test_output(self) -> str:
        """Generate test results section"""
        gate_file = self.gate_outputs_dir / "gate-5-tests.txt"
        if not gate_file.exists():
            return "[Paste test output here]"

        content = gate_file.read_text()
        # Return last 50 lines to keep it concise
        lines = content.split('\n')
        return '\n'.join(lines[-50:])

    def generate_coverage_output(self) -> str:
        """Generate coverage section"""
        gate_file = self.gate_outputs_dir / "gate-6-coverage.txt"
        if not gate_file.exists():
            return "[Paste coverage output here]"

        content = gate_file.read_text()

        coverage = self.extract_coverage()
        if coverage:
            return f"""```
Line coverage: {coverage}%

{content[:500]}
```"""
        else:
            return content[:500]

    def generate_build_output(self) -> str:
        """Generate build section"""
        gate_file = self.gate_outputs_dir / "gate-3-build.txt"
        if not gate_file.exists():
            return "[Paste build output here]"

        content = gate_file.read_text()
        # Return last 30 lines
        lines = content.split('\n')
        return '\n'.join(lines[-30:])

    def generate_engineer_review_prompts(self) -> str:
        """Generate intelligent prompts for Principal Engineer Review"""
        tests = self.extract_test_results()
        coverage = self.extract_coverage()

        # Build metrics summary
        test_count = tests['total'] if tests else '?'
        coverage_pct = f"{coverage}%" if coverage else '?%'

        # Generate stage-specific guidance
        stage_guidance = self._get_stage_specific_guidance()

        review = f"""## 👔 Principal Engineer Review

### What's Going Well ✅

**Review the following and identify 3-5 strengths:**

- **Test Coverage**: {test_count} tests, {coverage_pct} coverage {'✅ Exceeds 90% target' if coverage and float(coverage) >= 90 else '⚠️ Below 90% target'}
- **Architecture**: [Review separation of concerns, SOLID principles, extensibility]
- **Error Handling**: [Review error messages, validation, user experience]
- **Performance**: [Review execution speed, scalability, resource usage]
- **Code Quality**: [Review naming, documentation, maintainability]

**Strengths identified:**
1. [Specific observation about what's working well]
2. [Another strength with concrete example]
3. [Third strength]

### Potential Risks & Concerns ⚠️

**Consider these common risks and add stage-specific concerns:**

{stage_guidance['risks']}

**Risks identified:**
1. [Specific risk with potential impact]
2. [Another concern to address]
3. [Optional: Third concern if applicable]

### Pre-Next-Stage Considerations 🤔

**Before proceeding to Stage {self.stage_number + 1}, consider:**

{stage_guidance['next_stage']}

**Action items for next stage:**
1. [Specific preparation needed]
2. [Dependency or integration concern]
3. [Architecture or design consideration]

**Recommendation:** [PROCEED / PROCEED WITH CAUTION / REVISIT BEFORE NEXT STAGE]

**Rationale:**
[1-2 sentences explaining why this stage is ready (or not) for the next stage. Consider: quality gates status, architecture stability, test coverage, known risks, tech debt level]

**Example rationale:**
> PROCEED - All mandatory gates passed, architecture is solid with clean separation of concerns, and code coverage exceeds targets. Address the [specific concern] during Stage {self.stage_number + 1} implementation. Monitor [specific metric] as complexity grows.
"""
        return review

    def _get_stage_specific_guidance(self) -> dict:
        """Return stage-specific review guidance"""
        # Early stages (1-4): Foundation and architecture
        if self.stage_number <= 4:
            return {
                'risks': """- **Architecture Debt**: Are abstractions too early or too late? Over-engineering vs under-engineering?
- **Interface Stability**: Will these models/interfaces change in later stages? Breaking changes cascade.
- **Type Safety**: Are domain models strongly typed? Primitive obsession (strings everywhere) causes bugs.
- **Missing Validation**: Are inputs validated at boundaries? Trust but verify all external data.
- **Naming Clarity**: Do names reveal intent? Future developers will curse unclear naming.""",
                'next_stage': """- **Integration Points**: Next stage will depend on these interfaces. Any changes will cascade.
- **Data Model Assumptions**: Document assumptions about data shapes, nullability, cardinality.
- **Error Handling Strategy**: Establish patterns now (exceptions vs result types, error codes).
- **Testing Strategy**: Are tests brittle or resilient? Will they break on refactoring?"""
            }

        # Mid stages (5-7): Execution and orchestration
        elif self.stage_number <= 7:
            return {
                'risks': """- **Concurrency Issues**: Race conditions? Deadlocks? Thread safety verified?
- **Resource Leaks**: Are connections/handles properly disposed? Using statements? Try-finally?
- **Retry Logic**: Exponential backoff implemented? Retry storms prevented?
- **Timeout Handling**: All network calls have timeouts? Graceful degradation on timeout?
- **Error Recovery**: Partial failures handled? What happens when 1 of 10 tasks fails?""",
                'next_stage': """- **Performance Baseline**: Benchmark current performance. Next stages add complexity - track regressions.
- **Observability Gaps**: Can you debug production issues? Add logging/metrics before scaling.
- **Configuration Management**: Hard-coded values? Extract to config for different environments.
- **Load Testing**: Current code handles 1 workflow. Will it handle 100 concurrent? 1000?"""
            }

        # Later stages (8-12): APIs, UI, production hardening
        else:
            return {
                'risks': """- **API Breaking Changes**: Versioning strategy? Can old clients still work?
- **Security Gaps**: Input sanitization? SQL injection? XSS? CSRF protection?
- **Performance at Scale**: Load tested? Memory leaks? Connection pool exhaustion?
- **Data Migration**: Schema changes backward compatible? Migration strategy documented?
- **User Experience**: Error messages helpful? Loading states? Accessibility?""",
                'next_stage': """- **Production Readiness**: Logging, monitoring, alerting in place? On-call runbook exists?
- **Rollback Strategy**: Can you roll back if this fails in prod? Feature flags? Blue-green deploy?
- **Documentation**: API docs updated? Architecture diagrams current? Onboarding guide written?
- **Technical Debt**: List debt accumulated. Plan to pay it down before it compounds."""
            }

        # Default fallback
        return {
            'risks': """- [Review stage-specific risks based on what was built]
- [Consider: error handling, performance, security, scalability]
- [Think: what could go wrong in production?]""",
            'next_stage': """- [What does the next stage need from this stage?]
- [Are there any assumptions that need documenting?]
- [What technical debt was introduced?]"""
        }

    def generate_proof_file(self) -> bool:
        """Generate the proof file from template"""
        print_header(f"📝 Generating STAGE_{self.stage_number}_PROOF.md")

        # Read template
        template = self.template_file.read_text()

        # Replace placeholders
        replacements = {
            "[X]": str(self.stage_number),
            "[YYYY-MM-DD]": datetime.now().strftime("%Y-%m-%d"),
            "[Stage Name]": f"Stage {self.stage_number}",
            ".NET / TypeScript / Both": self.tech_stack.upper(),
        }

        # Apply simple replacements
        for old, new in replacements.items():
            template = template.replace(old, new)

        # Generate and insert stage summary table
        summary_table = self.generate_stage_summary()
        # Find the summary table section and replace it
        template = re.sub(
            r'\|\s*Metric\s*\|.*?\|\s*Deliverables\s*\|.*?\n',
            summary_table + '\n',
            template,
            flags=re.DOTALL
        )

        # Generate and insert Principal Engineer Review section
        engineer_review = self.generate_engineer_review_prompts()
        # Replace the placeholder review section in template
        template = re.sub(
            r'## 👔 Principal Engineer Review.*?(?=## 🔄 Integration Status)',
            engineer_review + '\n---\n\n',
            template,
            flags=re.DOTALL
        )

        # Write output file
        self.output_file.write_text(template)
        print_success(f"Proof file generated: {self.output_file}")

        return True

    def verify_proof_file(self) -> None:
        """Verify the generated proof file"""
        print_header("🔍 Verifying Proof File")

        content = self.output_file.read_text()

        # Check for remaining placeholders
        placeholders = re.findall(r'\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]', content)

        if placeholders:
            print_warning(f"Found {len(placeholders)} placeholders remaining")
            for placeholder in set(placeholders):
                print_info(f"  - {placeholder}")
            print_info("You may need to manually fill these in")
        else:
            print_success("No placeholders found - proof file looks complete!")

        # Check for actual data
        tests = self.extract_test_results()
        coverage = self.extract_coverage()

        if tests:
            print_success(f"Test count: {tests['passed']}/{tests['total']}")
        else:
            print_warning("Could not extract test count")

        if coverage:
            print_success(f"Coverage: {coverage}%")
        else:
            print_warning("Could not extract coverage percentage")

        # Remind about Principal Engineer Review
        print_info("")
        print_info("📝 IMPORTANT: Complete the Principal Engineer Review section")
        print_info("   This section requires strategic thinking about:")
        print_info("   - What's going well in this stage")
        print_info("   - Potential risks and concerns")
        print_info("   - Considerations before next stage")
        print_info("   Thoughtful review now prevents costly mistakes later!")

    def run(self) -> int:
        """Main execution"""
        print_header(f"🚀 Proof Generator - Stage {self.stage_number}")

        if not self.check_requirements():
            return 2

        print_info(f"Tech stack: {self.tech_stack}")
        print_info(f"Output file: {self.output_file}")

        if not self.generate_proof_file():
            return 1

        self.verify_proof_file()

        print_header("✅ Proof Generation Complete")
        print_info(f"Next steps:")
        print_info(f"  1. ⭐ Complete the Principal Engineer Review section (CRITICAL)")
        print_info(f"  2. Review {self.output_file} and fill any remaining placeholders")
        print_info(f"  3. Run: grep -i '\\[.*\\]' {self.output_file}")
        print_info(f"  4. Update CHANGELOG.md")
        print_info(f"  5. Create stage completion commit")

        return 0

def show_help():
    print("""
Proof File Generator Script

USAGE:
    ./scripts/generate-proof.py <stage_number> [--tech dotnet|typescript]

ARGUMENTS:
    stage_number       Stage number (e.g., 7, 8, 9)

OPTIONS:
    --tech STACK       Specify tech stack: dotnet or typescript (auto-detected if not provided)
    --help             Show this help message

EXAMPLES:
    ./scripts/generate-proof.py 7 --tech dotnet
    ./scripts/generate-proof.py 9 --tech typescript
    ./scripts/generate-proof.py 10

REQUIREMENTS:
    - Gate outputs must be in .gate-outputs/ directory
      (Run ./scripts/run-quality-gates.sh first)
    - STAGE_PROOF_TEMPLATE.md must exist

OUTPUT:
    - STAGE_X_PROOF.md file with actual data from gate outputs
    - Verification report showing what was filled

EXIT CODES:
    0 - Proof file generated successfully
    1 - Error during generation
    2 - Missing requirements or invalid usage
""")

def main():
    if len(sys.argv) < 2 or "--help" in sys.argv:
        show_help()
        return 0 if "--help" in sys.argv else 2

    # Parse arguments
    stage_number = None
    tech_stack = None

    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--tech":
            if i + 1 < len(sys.argv):
                tech_stack = sys.argv[i + 1].lower()
        elif arg.isdigit():
            stage_number = int(arg)

    if not stage_number:
        print_error("Stage number is required")
        show_help()
        return 2

    # Auto-detect tech stack if not provided
    if not tech_stack:
        if Path("package.json").exists():
            tech_stack = "typescript"
        elif list(Path(".").glob("*.sln")) or list(Path("src").glob("**/*.csproj")):
            tech_stack = "dotnet"
        else:
            print_error("Could not auto-detect tech stack. Use --tech flag.")
            return 2

    if tech_stack not in ["dotnet", "typescript"]:
        print_error(f"Invalid tech stack: {tech_stack}")
        return 2

    # Run generator
    generator = ProofGenerator(stage_number, tech_stack)
    return generator.run()

if __name__ == "__main__":
    sys.exit(main())
