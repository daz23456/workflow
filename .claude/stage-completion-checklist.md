# Stage Completion Checklist

**Last Updated:** 2025-11-29
**Version:** 4.0.0 (Aligned with STAGE_EXECUTION_FRAMEWORK.md v4.0.0)

**Purpose:** Step-by-step executable workflow for completing stages with production-grade quality. Follow this checklist for every stage to ensure consistency and completeness.

**⚠️ BREAKING CHANGE in v4.0.0:** All gate numbers renumbered to match execution order (1 → 2 → 3...). See STAGE_EXECUTION_FRAMEWORK.md changelog for migration guide.

**Key Changes in v4.0.0:**
- ✅ **Gates renumbered to match execution order:** Gates 1-8 now run in numeric order (1 → 2 → 3 → 4 → 5 → 6 → 7 → 8)
- ✅ **Linting (now Gate 2) promoted to TIER 1:** Now mandatory and runs 2nd
- ✅ **Documentation (now Gate 10) promoted to TIER 2:** Now recommended
- ✅ **Sequential dual-linting for TypeScript:** oxlint (fast) → ESLint (comprehensive)
- ✅ **Prerequisites verification:** Check tools before starting
- ✅ **Beginner path reference:** Quick start for new users
- ✅ **Generic examples:** All project-specific references removed
- ✅ **Enhanced troubleshooting:** Solutions for every gate failure
- ✅ **New tools:** oxlint (fast linting), lhci (Lighthouse CI)

---

## 🚀 New to This Framework?

**First time using this checklist?** Start with the **5-Step Beginner Path** (see STAGE_EXECUTION_FRAMEWORK.md):
1. Understand the "Why" (5 min)
2. Run Your First Quality Gate (10 min)
3. Execute a Simple Stage (30 min)
4. Complete the Full Workflow (60 min)
5. Add Parallelism (if team >1 developer)

**Total: 2 hours** from zero to confident with the framework!

---

## 📋 Quick Reference - Gate Selection by Stage Type

**TIER 1 (Mandatory - ALWAYS Run):**
- Gate 1: No Template Files (5s) → **RUN FIRST**
- Gate 2: Linting (10-30s) → **RUN SECOND**
- Gate 3: Clean Build (1-3min) → **RUN THIRD**
- Gate 4: Type Safety [TypeScript only] (10-20s) → **RUN FOURTH**
- Gate 5: All Tests Passing (1-5min)
- Gate 6: Code Coverage ≥90% (same run)
- Gate 7: Zero Vulnerabilities (10-30s)
- Gate 8: Proof Completeness (5s)

**TIER 2 (Recommended - Strongly Encouraged):**
- Gate 9: Mutation Testing ≥80%
- Gate 10: Documentation Completeness

**TIER 3 (Optional - Context-Dependent):**
- Gate 11: Integration Tests (API/DB stages)
- Gate 12: Performance Benchmarks (performance-critical)
- Gate 13: API Contract Validation (public APIs)
- Gate 14: Accessibility Testing (UI only)
- Gate 15: E2E Tests (user-facing features)
- Gates 16-19: SAST, Observability, Complexity, Dependencies

**Quick Selection by Stage Type:**

| Stage Type | TIER 1 Gates | TIER 2 Gates | TIER 3 Gates | Tech Stack |
|------------|--------------|--------------|--------------|------------|
| .NET Backend API | 5, 8, 1, 2, 3, 4, 6 | 7, 13 | 10, 12 | .NET |
| TypeScript UI | 5, 8, 1, 9, 2, 3, 4, 6 | 7, 13 | 14, 15 | TypeScript |
| CLI Tool | 5, 8, 1, 2, 3, 4, 6 | 7, 13 | - | Any |
| Library/SDK | 5, 8, 1, 2, 3, 4, 6 | 7, 13 | - | Any |
| Performance-Critical | 5, 8, 1, 2, 3, 4, 6 | 7, 13 | 11 | Any |
| POC/Learning | 1, 2, 3, 4, 6 | - | - | Any (Beginner Path) |

---

## PHASE 1: BEFORE Starting Stage

### 1. Verify Prerequisites (5 min) - FIRST TIME ONLY

**Skip this if you've already verified tools in a previous stage.**

<details>
<summary><strong>Click to expand: First-time tool verification</strong></summary>

**Required Software:**

```bash
# Check all required tools
dotnet --version                     # Should be 8.0+
node --version                       # Should be 18.0+
npm --version                        # Should be 9.0+
git --version                        # Should be 2.30+
```

**Checklist:**
- [ ] .NET SDK 8.0+ installed → [Download](https://dotnet.microsoft.com/download)
- [ ] Node.js 18.0+ (LTS) → [Download](https://nodejs.org/)
- [ ] npm 9.0+ (included with Node.js)
- [ ] Git 2.30+ → [Download](https://git-scm.com/)

**Install Global Tools (.NET):**
```bash
# Coverage reporting
dotnet tool install --global dotnet-reportgenerator-globaltool

# Mutation testing (if using Gate 9)
dotnet tool install --global dotnet-stryker

# Verify installation
dotnet tool list -g
```

**Install Global Tools (TypeScript):**
```bash
# Playwright (E2E testing - if using Gate 15)
npx playwright install --with-deps chromium

# Lighthouse CI (Accessibility - if using Gate 14)
npm install -g @lhci/cli

# oxlint (Fast linting - optional alternative to ESLint)
npm install -D oxlint

# Verify installation
npx playwright --version
lhci --version
npx oxlint --version
```

**OS Compatibility:**
- ✅ macOS 12+: All tools supported
- ✅ Linux (Ubuntu 20.04+, Debian 11+): All tools supported
- ✅ Windows 10/11: Use WSL2 or PowerShell Core

</details>

---

### 2. Review Stage Objectives (5 min)
- [ ] Read stage description in `CLAUDE.md` or project documentation
- [ ] Understand what will be built and why it matters
- [ ] Identify dependencies on previous stages
- [ ] Review expected deliverables and test count

### 3. Select Quality Gates (3 min)
- [ ] Use tech stack table above to identify required gates
- [ ] **TIER 1 (Mandatory):** Always run Gates 1-8
- [ ] **TIER 2 (Recommended):** Consider Gates 7, 13
- [ ] **TIER 3 (Optional):** Select based on stage type (10-19)
- [ ] Document gate selection when creating proof file
- [ ] Note which optional gates are included/skipped and why

### 4. Quick Tool Verification (2 min)

**Run this before every stage to catch missing tools early:**

```bash
# .NET projects
dotnet --version && dotnet build --help > /dev/null && echo "✅ .NET ready"

# TypeScript projects
node --version && npm --version && npm run build --help > /dev/null 2>&1 && echo "✅ Node/npm ready"

# Both stacks
git --version && echo "✅ Git ready"
```

- [ ] All required tools responding
- [ ] No "command not found" errors
- [ ] Ready to proceed

---

### 5. Create Stage Directory & Proof File (2 min)
```bash
# Replace X with your stage number
STAGE_NUM=X
mkdir -p stage-proofs/stage-$STAGE_NUM/reports/{coverage,test-results,mutation,gates,benchmarks}
cp STAGE_PROOF_TEMPLATE.md stage-proofs/stage-$STAGE_NUM/STAGE_${STAGE_NUM}_PROOF.md
```
- [ ] Stage directory created: `stage-proofs/stage-X/`
- [ ] Reports subdirectories created
- [ ] Proof file created from template
- [ ] Stage number, date, and tech stack filled in proof file header
- [ ] Gate selection documented in proof file

---

### 6. Create Todo List (3 min)
- [ ] Break stage into tasks from `CLAUDE.md` deliverables
- [ ] Use TodoWrite tool to track progress
- [ ] Update todo list as tasks complete during implementation

**Total BEFORE Phase Time: ~15 minutes**

---

## PHASE 2: DURING Implementation

**TDD Cycle (RED → GREEN → REFACTOR):**

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Clean up while keeping tests green
4. **COMMIT**: Commit working code frequently

**Progress Tracking:**
- [ ] Update todo list as tasks complete
- [ ] Run tests after every change: `dotnet watch test` or `npm test -- --watch`
- [ ] Maintain ≥90% coverage continuously
- [ ] No broken builds committed

---

## PHASE 3: AFTER Implementation - Quality Gates

### Automation vs Manual Execution

**CRITICAL:** Choose Option A (automated) or Option B (manual)

#### Option A: Automated (Recommended - Saves 35+ minutes)

```bash
# Replace X with your stage number
STAGE_NUM=X
TECH=dotnet  # or typescript

./scripts/run-quality-gates.sh --stage $STAGE_NUM --tech $TECH 1 2 3 4 5 6 7 8
```

**What it does:**
- Runs all specified gates in order
- Saves outputs to `stage-proofs/stage-X/reports/gates/`
- Copies artifacts to `stage-proofs/stage-X/reports/`
- Colorized pass/fail indicators
- Fail-fast on mandatory gates

**Artifacts Created:**
- `stage-proofs/stage-X/reports/gates/gate-*.txt`
- `stage-proofs/stage-X/reports/coverage/`
- `stage-proofs/stage-X/reports/test-results/`
- `stage-proofs/stage-X/reports/mutation/` (if Gate 9)

#### Option B: Manual Execution

**Run gates in order. If ANY gate fails, STOP and fix before proceeding.**

---

### TIER 1: Mandatory Gates (1-8) - ALWAYS REQUIRED

#### Gate 1: No Template/Scaffolding Files

**Why First:** Don't even attempt to build/lint with template files present.

```bash
STAGE_NUM=X
find . -name "Class1.cs" -o -name "UnitTest1.cs" -o -name "WeatherForecast.cs" -o -name "App.test.tsx" \
  | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-1-templates.txt
```

**Pass Criteria:**
- [ ] **Expected:** (empty - no files found)
- [ ] **BLOCKER if:** Any template files exist

**Common Template Files:**
- **.NET:** `Class1.cs`, `UnitTest1.cs`, `WeatherForecast.cs`
- **TypeScript:** `App.test.tsx`, `setupTests.ts`, `logo.svg`

**Fix:**
```bash
# Delete template files
rm src/Class1.cs tests/UnitTest1.cs
# Re-run Gate 1
```

---

#### Gate 2: Linting & Code Style

**Why Second:** Catch style issues before compiling (fast feedback).

**.NET:**
```bash
STAGE_NUM=X
dotnet format --verify-no-changes 2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-2-lint.txt
```

**TypeScript (Sequential Dual-Linting - Recommended):**
```bash
STAGE_NUM=X

# Step 1: Run oxlint FIRST (fast fail-fast check - 2-5 seconds)
npx oxlint src/ 2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-2-oxlint.txt
if [ $? -ne 0 ]; then
  echo "❌ oxlint failed - stopping (ESLint skipped for speed)"
  exit 1
fi

# Step 2: Run ESLint ONLY if oxlint passed (comprehensive check - 30-60 seconds)
npm run lint 2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-2-eslint.txt
```

**Why Both Linters:**
- **oxlint** (2-5 sec): Fast syntax/common issues → immediate feedback
- **ESLint** (30-60 sec): Deep analysis, security plugins, custom rules
- **Sequential = Fail-fast:** Stop immediately if oxlint fails, save time

**Install oxlint:**
```bash
npm install -D oxlint
```

**Pass Criteria:**
- [ ] **Expected:** No formatting changes (.NET) or `0 errors, 0 warnings` from BOTH linters (TS)
- [ ] **BLOCKER if:** Any linting errors from either linter

**Fix:**
```bash
# .NET: Auto-fix formatting
dotnet format

# TypeScript: Auto-fix (try oxlint first, then ESLint)
npx oxlint src/ --fix
npm run lint -- --fix
```

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/gates/gate-2-lint.txt` (.NET)
- [ ] `stage-proofs/stage-X/reports/gates/gate-2-oxlint.txt` (TypeScript - oxlint)
- [ ] `stage-proofs/stage-X/reports/gates/gate-2-eslint.txt` (TypeScript - ESLint)

---

#### Gate 3: Clean Release Build

**Why Third:** Only build after templates removed and code is lint-clean.

**.NET:**
```bash
STAGE_NUM=X
dotnet clean
dotnet build --configuration Release | tee stage-proofs/stage-$STAGE_NUM/reports/gates/gate-3-build.txt
```

**TypeScript:**
```bash
STAGE_NUM=X
npm run build 2>&1 | tee stage-proofs/stage-$STAGE_NUM/reports/gates/gate-3-build.txt
npm run type-check 2>&1 | tee -a stage-proofs/stage-$STAGE_NUM/reports/gates/gate-3-build.txt
```

**Pass Criteria:**
- [ ] **Expected:** `Build succeeded. 0 Warning(s), 0 Error(s)` (.NET) or `Build completed` (TS)
- [ ] **BLOCKER if:** Any warnings or errors

---

#### Gate 4: Type Safety (TypeScript ONLY - MANDATORY for TS)

**Why Fourth:** Explicit type checking after successful build.

```bash
STAGE_NUM=X
npm run type-check 2>&1 | tee stage-proofs/stage-$STAGE_NUM/reports/gates/gate-4-typecheck.txt
```

**Pass Criteria:**
- [ ] **Expected:** `0 type errors`
- [ ] **BLOCKER if:** ANY type errors
- [ ] **CRITICAL:** Type errors cause runtime crashes - zero tolerance

**Why Separate from Build:**
- Build doesn't always catch type errors
- Type-checking must be explicit gate

**Fix:**
```bash
# Fix type errors in source
# Re-run Gate 4
npm run type-check
```

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/gates/gate-4-typecheck.txt`

---

#### Gate 5: All Tests Passing

**.NET:**
```bash
STAGE_NUM=X
dotnet test --configuration Release --logger "console;verbosity=detailed" | tee stage-proofs/stage-$STAGE_NUM/reports/gates/gate-5-tests.txt
```

**TypeScript:**
```bash
STAGE_NUM=X
npm test 2>&1 | tee stage-proofs/stage-$STAGE_NUM/reports/gates/gate-5-tests.txt
```

**Pass Criteria:**
- [ ] **Expected:** `Passed! - Failed: 0, Passed: N, Skipped: 0`
- [ ] **BLOCKER if:** Any failures or skipped tests

**Troubleshooting Skipped Tests:**

If Gate 5 fails with "Skipped tests detected":

```bash
# Step 1: Find skipped tests
# .NET
grep -rn "\[Fact(Skip" tests/

# TypeScript/Vitest
grep -rn "test.skip\|it.skip" src/

# Step 2: Fix each skipped test
# Option A: Implement the test (preferred)
#   - Remove .skip() or [Fact(Skip)]
#   - Write the test implementation
#   - Verify it passes: npm test (or dotnet test)

# Option B: Delete the test (if not needed)
#   - Test for future feature? Delete it (write when implementing feature)
#   - Test for deprecated feature? Delete it

# Step 3: Re-run Gate 5
./scripts/run-quality-gates.sh 5

# Should now show: "All tests passed (0 failures, 0 skipped)"
```

**Why This Matters:**
Skipped tests create false confidence. Coverage tools may count them as "tests written" but they don't validate behavior. In production, untested code paths cause bugs. TDD requires all tests to run.

---

#### Gate 6: Code Coverage ≥90%

**.NET:**
```bash
STAGE_NUM=X
dotnet test --collect:"XPlat Code Coverage" --results-directory ./stage-proofs/stage-$STAGE_NUM/reports/coverage
reportgenerator -reports:./stage-proofs/stage-$STAGE_NUM/reports/coverage/**/coverage.cobertura.xml \
                -targetdir:./stage-proofs/stage-$STAGE_NUM/reports/coverage \
                -reporttypes:"Html;TextSummary;Cobertura"
cat ./stage-proofs/stage-$STAGE_NUM/reports/coverage/Summary.txt | tee stage-proofs/stage-$STAGE_NUM/reports/gates/gate-6-coverage.txt
```

**TypeScript:**
```bash
STAGE_NUM=X
npm run test:coverage
cp -r coverage/ stage-proofs/stage-$STAGE_NUM/reports/coverage/
```

**Pass Criteria:**
- [ ] **Expected:** Line coverage ≥90%
- [ ] **BLOCKER if:** Coverage < 90%

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/coverage/index.html` (browsable)
- [ ] `stage-proofs/stage-X/reports/coverage/Summary.txt`

---

#### Gate 7: Zero Security Vulnerabilities

**.NET:**
```bash
STAGE_NUM=X
dotnet list package --vulnerable --include-transitive | tee stage-proofs/stage-$STAGE_NUM/reports/gates/gate-7-security.txt
```

**TypeScript:**
```bash
STAGE_NUM=X
npm audit --audit-level=moderate | tee stage-proofs/stage-$STAGE_NUM/reports/gates/gate-7-security.txt
```

**Pass Criteria:**
- [ ] **Expected:** `No vulnerable packages` (.NET) or `found 0 vulnerabilities` (TS)
- [ ] **BLOCKER if:** ANY vulnerabilities (HIGH, MODERATE, or LOW)

---

#### Gate 8: Proof File Completeness

```bash
STAGE_NUM=X
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" stage-proofs/stage-$STAGE_NUM/STAGE_${STAGE_NUM}_PROOF.md
```

**Pass Criteria:**
- [ ] **Expected:** (empty - no placeholders found)
- [ ] **BLOCKER if:** Any placeholders remain

**Verification Checklist:**
- [ ] Stage Summary table has actual numbers (e.g., `235/235`, `92.1%`, `0`)
- [ ] Test output section includes link to `./reports/test-results/test-results.xml`
- [ ] Coverage section includes link to `./reports/coverage/index.html`
- [ ] All deliverables checked `[x]`
- [ ] Principal Engineer Review is thoughtful (not generic)
- [ ] Commit hash placeholder present (will be filled after commit)

---

### TIER 2: Recommended Gates (9-10) - STRONGLY ENCOURAGED

#### Gate 9: Mutation Testing ≥80%

**Purpose:** Verify tests actually catch bugs, not just coverage

**.NET:**
```bash
STAGE_NUM=X
dotnet stryker --config-file stryker-config-workflowcore.json
cp -r mutation-reports/ stage-proofs/stage-$STAGE_NUM/reports/mutation/
```

**TypeScript:**
```bash
STAGE_NUM=X
npx stryker run
cp -r mutation-reports/ stage-proofs/stage-$STAGE_NUM/reports/mutation/
```

**Pass Criteria:**
- [ ] **Expected:** Mutation score ≥80%
- [ ] **⚠️ WARNING if:** Score <80% (not blocking, but MUST be documented in proof file)

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/mutation/index.html`
- [ ] `stage-proofs/stage-X/reports/mutation/stryker-report.json`

**If score <80%, document in Principal Engineer Review:**
- Why score is below target
- Which mutants survived and why
- Plan to improve in future stages

---

### TIER 3: Optional Gates (11-20) - CONTEXT-DEPENDENT

**Run only gates selected in tech stack table**

#### Gate 11: Integration Tests

**.NET:**
```bash
STAGE_NUM=X
dotnet test --filter Category=Integration \
  --logger "junit;LogFilePath=./stage-proofs/stage-$STAGE_NUM/reports/test-results/integration-results.xml" \
  --results-directory ./stage-proofs/stage-$STAGE_NUM/reports/test-results \
  2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-11-integration.txt
```

**TypeScript:**
```bash
STAGE_NUM=X
npm run test:integration -- --reporter=junit \
  --reporter-options=output=./stage-proofs/stage-$STAGE_NUM/reports/test-results/integration-results.xml \
  2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-11-integration.txt
```

**Pass Criteria:**
- [ ] **Expected:** All integration tests pass (0 failures)
- [ ] **BLOCKER if:** Any failures

**When to Use:**
- API endpoints
- Database access
- External service integration

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/test-results/integration-results.xml`
- [ ] `stage-proofs/stage-X/reports/gates/gate-11-integration.txt`

---

#### Gate 12: Performance Regression Detection

**.NET:**
```bash
STAGE_NUM=X
dotnet run --project tests/WorkflowCore.PerformanceTests --configuration Release \
  2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-12-performance.txt
cp benchmarks/results/* ./stage-proofs/stage-$STAGE_NUM/reports/benchmarks/ 2>/dev/null || true
```

**TypeScript (Backend/Node):**
```bash
STAGE_NUM=X
npm run benchmark 2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-12-performance.txt
cp benchmark-results.json ./stage-proofs/stage-$STAGE_NUM/reports/benchmarks/ 2>/dev/null || true
```

**TypeScript (Frontend/Web Performance):**
```bash
STAGE_NUM=X
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:3000 \
  --upload.target=filesystem \
  --upload.outputDir=./stage-proofs/stage-$STAGE_NUM/reports/lighthouse \
  2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-12-performance.txt
```

**Pass Criteria:**
- [ ] **Expected:** No regressions >10% vs baseline
- [ ] **BLOCKER if:** Significant regression without justification

**When to Use:**
- Performance-critical features
- After optimization work
- Before production deployment

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/benchmarks/results.json`
- [ ] `stage-proofs/stage-X/reports/lighthouse/` (web performance)
- [ ] `stage-proofs/stage-X/reports/gates/gate-12-performance.txt`

---

#### Gate 13: API Contract Validation

**.NET:**
```bash
STAGE_NUM=X
dotnet swagger tofile --output ./stage-proofs/stage-$STAGE_NUM/reports/openapi.json \
  ./src/WorkflowGateway/bin/Release/net8.0/WorkflowGateway.dll v1
# Validate spec
npx @openapitools/openapi-generator-cli validate \
  -i ./stage-proofs/stage-$STAGE_NUM/reports/openapi.json \
  2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-13-api-contract.txt
```

**TypeScript:**
```bash
STAGE_NUM=X
npm run openapi:generate 2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-13-api-contract.txt
# OR validate existing spec
npx @openapitools/openapi-generator-cli validate \
  -i ./openapi.json \
  2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-13-api-contract.txt
```

**Pass Criteria:**
- [ ] **Expected:** Spec up-to-date, no breaking changes
- [ ] **BLOCKER if:** Undocumented breaking changes

**When to Use:**
- Public APIs
- API version changes
- New endpoints added

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/openapi.json`
- [ ] `stage-proofs/stage-X/reports/gates/gate-13-api-contract.txt`

---

#### Gate 10: Documentation Completeness

**When to Use:**
- Public APIs
- Libraries
- Architectural changes
- UI components
- Complex algorithms

**Verification Commands:**
```bash
STAGE_NUM=X

# 1. Verify README exists and is not template
[ -f README.md ] && ! grep -q "TODO\|PLACEHOLDER" README.md
echo "README check: $?" | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-10-documentation.txt

# 2. Check for ADRs (if architectural changes this stage)
echo "ADRs found:" | tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-10-documentation.txt
ls -la docs/adr/*.md 2>&1 | tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-10-documentation.txt

# 3a. Verify API docs coverage (.NET)
dotnet tool install -g xmldocmd 2>/dev/null || true
xmldocmd ./src/*/bin/Release/net8.0/*.dll ./docs/api \
  2>&1 | tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-10-documentation.txt

# 3b. Verify JSDoc coverage (TypeScript)
npx typedoc --out ./stage-proofs/stage-$STAGE_NUM/reports/typedoc src/ \
  2>&1 | tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-10-documentation.txt
```

**ADR (Architecture Decision Record) Template:**
When creating ADRs for architectural changes, use this format in `docs/adr/NNNN-title.md`:

```markdown
# ADR-NNNN: [Title]

**Status:** Proposed | Accepted | Rejected | Deprecated
**Date:** YYYY-MM-DD
**Deciders:** [Names]

## Context
What problem are we solving? What constraints exist?

## Decision
What approach did we choose? Be specific.

## Consequences
**Positive:**
- What benefits does this bring?

**Negative:**
- What trade-offs or costs?

**Neutral:**
- What side effects?

## Alternatives Considered
1. **Option A:** Why we didn't choose it
2. **Option B:** Why we didn't choose it
```

**Checklist:**
- [ ] README updated with new features
- [ ] API docs generated (JSDoc/XML comments)
- [ ] ADRs created for architectural decisions
- [ ] Code comments on complex logic (why, not what)
- [ ] Public API documentation ≥90% coverage

**Pass Criteria:**
- [ ] README complete (no TODOs/placeholders)
- [ ] ADRs exist for architectural changes
- [ ] API docs coverage ≥90%

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/gates/gate-10-documentation.txt`
- [ ] `stage-proofs/stage-X/reports/typedoc/` (TypeScript)
- [ ] `docs/adr/*.md` (ADRs - committed to repo)

---

#### Gate 14: Accessibility Testing (UI Only)

**When to Use:**
- ALL UI components
- User-facing pages
- Form inputs

**Commands:**
```bash
STAGE_NUM=X

# 1. Start dev server (if not already running)
npm run dev &
DEV_PID=$!
sleep 5  # Wait for server

# 2. Run axe-core (automated accessibility checks)
npx @axe-core/cli http://localhost:3000 \
  --save ./stage-proofs/stage-$STAGE_NUM/reports/accessibility/axe-results.json \
  --exit \
  2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-14-accessibility.txt

# 3. Run Lighthouse CI (accessibility score)
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:3000 \
  --upload.target=filesystem \
  --upload.outputDir=./stage-proofs/stage-$STAGE_NUM/reports/lighthouse \
  2>&1 | tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-14-accessibility.txt

# 4. Cleanup (kill dev server)
kill $DEV_PID 2>/dev/null || true
```

**Manual Testing Checklist:**
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces all interactive elements
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Focus indicators visible on all interactive elements
- [ ] ARIA labels present on custom components

**Pass Criteria:**
- [ ] **Expected:** Lighthouse accessibility ≥90/100
- [ ] **Expected:** axe-core 0 critical/serious violations
- [ ] **BLOCKER if:** Score <90 or critical axe violations

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/accessibility/axe-results.json`
- [ ] `stage-proofs/stage-X/reports/lighthouse/` (browsable HTML)
- [ ] `stage-proofs/stage-X/reports/gates/gate-14-accessibility.txt`

---

#### Gate 15: E2E Tests

```bash
STAGE_NUM=X
npx playwright test
cp -r playwright-report/ stage-proofs/stage-$STAGE_NUM/reports/playwright/
```

**Pass Criteria:**
- [ ] **Expected:** All E2E tests pass
- [ ] **BLOCKER if:** Any failures

**When to Use:**
- User-facing features
- Critical user journeys
- Multi-step workflows

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/playwright/index.html`

---

#### Gate 16: SAST (Static Application Security Testing)

**.NET:**
```bash
STAGE_NUM=X
# SecurityCodeScan runs during build
dotnet build --configuration Release 2>&1 | grep -i "security\|warning" | \
  tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-16-sast.txt
```

**TypeScript:**
```bash
STAGE_NUM=X
# npm audit for dependency vulnerabilities
npm audit --audit-level=moderate 2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-16-sast.txt

# eslint-plugin-security for code vulnerabilities
npx eslint . --ext .ts,.tsx --plugin security \
  2>&1 | tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-16-sast.txt
```

**Pass Criteria:**
- [ ] No high/critical security issues

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/gates/gate-16-sast.txt`

---

#### Gate 17: Observability Readiness

```bash
STAGE_NUM=X

# Verify structured logging exists
echo "Checking structured logging..." | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-17-observability.txt
grep -r "ILogger\|console.log" src/ | wc -l | \
  tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-17-observability.txt

# Check for correlation IDs
echo "Checking correlation IDs..." | tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-17-observability.txt
grep -r "CorrelationId\|RequestId\|TraceId" src/ | wc -l | \
  tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-17-observability.txt

# Verify health check endpoints
echo "Checking health endpoints..." | tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-17-observability.txt
grep -r "health\|/healthz\|/ready" src/ | wc -l | \
  tee -a ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-17-observability.txt
```

**Checklist:**
- [ ] Structured logging implemented
- [ ] Correlation IDs propagated
- [ ] Health check endpoints exposed

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/gates/gate-17-observability.txt`

---

#### Gate 18: Code Complexity Analysis

**.NET:**
```bash
STAGE_NUM=X
dotnet tool install -g dotnet-metrics 2>/dev/null || true
dotnet-metrics analyze ./src/ --threshold 15 \
  2>&1 | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-18-complexity.txt
```

**TypeScript:**
```bash
STAGE_NUM=X
npx complexity-report src/ \
  --format json \
  --output ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-18-complexity.json
cat ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-18-complexity.json | \
  tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-18-complexity.txt
```

**Pass Criteria:**
- [ ] Cyclomatic complexity ≤15 per method
- [ ] Method length ≤50 lines
- [ ] Nesting depth ≤4 levels

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/gates/gate-18-complexity.txt`

---

#### Gate 19: Dependency Freshness

**.NET:**
```bash
STAGE_NUM=X
dotnet list package --outdated --include-transitive | \
  tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-19-dependencies.txt
```

**TypeScript:**
```bash
STAGE_NUM=X
npm outdated | tee ./stage-proofs/stage-$STAGE_NUM/reports/gates/gate-19-dependencies.txt
npx npm-check-updates --target minor  # Safe updates only
```

**Pass Criteria:**
- [ ] No critical dependencies >1 major version behind

**Note:** Balance freshness vs stability

**Artifacts:**
- [ ] `stage-proofs/stage-X/reports/gates/gate-19-dependencies.txt`

---

#### Gate 20: Beginner Path (Simplified)

**When to Use:** New contributors, learning stages, POC work

**Reduced Gate Set:** Run only Gates 1, 2, 3, 4, 6
- Gate 3: Clean Build
- Gate 5: All Tests Passing
- Gate 6: Code Coverage ≥90%
- Gate 7: Zero Vulnerabilities
- Gate 8: Proof Completeness

**Skip:** Mutation (7), linting (8), performance (11), accessibility (14)

**Purpose:** Lower barrier to entry while maintaining core quality

---

## PHASE 4: Proof File Completion

### Option A: Auto-Generate (Recommended - Saves 10 minutes)

```bash
STAGE_NUM=X
TECH=dotnet  # or typescript
python3 scripts/generate-proof.py $STAGE_NUM --tech $TECH
```

**What it does:**
- Extracts metrics from `stage-proofs/stage-X/reports/gates/`
- Fills Stage Summary table automatically
- Generates artifact links with `./reports/` prefix
- Creates proof file ready for manual completion

**Still need to manually complete:**
- [ ] Deliverables list (copy from CLAUDE.md)
- [ ] Principal Engineer Review analysis (thoughtful, not generic)
- [ ] Commit hash (after git commit step below)

### Option B: Manual Fill

- [ ] Copy test output to "Test Results" section
- [ ] Add link: `[View Test Results](./reports/test-results/test-results.xml)`
- [ ] Copy coverage percentage to "Code Coverage" section
- [ ] Add link: `[View HTML Report](./reports/coverage/index.html)`
- [ ] Copy build output to "Build Quality" section
- [ ] Add mutation testing results (if Gate 9 ran)
- [ ] Add link: `[View Stryker Report](./reports/mutation/index.html)`
- [ ] List all deliverables with checkboxes
- [ ] Complete Principal Engineer Review (see checklist below)

---

### Principal Engineer Review Checklist

**CRITICAL:** This section must be thoughtful, not just filled in!

- [ ] **What's Going Well (3-5 strengths):**
  - Specific observations with concrete examples
  - Example: "Test coverage at 94% with comprehensive edge case testing"
  - Example: "Clean architecture - clear separation between orchestration and execution"

- [ ] **Potential Risks & Concerns (2-4 concerns):**
  - Each risk includes:
    - **Impact:** What could go wrong
    - **Mitigation:** How to address it
  - Example: "TypeCompatibilityChecker complexity (Impact: Hard to maintain, Mitigation: Add unit tests for all edge cases)"

- [ ] **Pre-Next-Stage Considerations (3-5 items):**
  - What the next stage needs from this one
  - Assumptions to document
  - Tech debt or architecture concerns
  - Example: "Stage X+1 will consume these interfaces - ensure stability before proceeding"

- [ ] **Recommendation:** Select one:
  - **PROCEED** - All gates passed, no concerns
  - **PROCEED WITH CAUTION** - Gates passed, but address concerns in next stage
  - **REVISIT BEFORE NEXT STAGE** - Critical issues need resolution

- [ ] **Rationale (1-2 sentences):**
  - Explain why stage is ready (or not) for next stage
  - Example: "PROCEED - All gates passed with strong coverage and architecture. Monitor performance as workflow complexity grows."

---

### Artifact Linking Verification

**Ensure these artifacts are committed and linked in proof file:**

**.NET Stages:**
- [ ] `./reports/coverage/index.html` → Link in "Code Coverage" section
- [ ] `./reports/test-results/test-results.xml` → Link in "Test Results" section
- [ ] `./reports/mutation/index.html` → Link in "Mutation Testing" (if Gate 9)
- [ ] `./reports/gates/*.txt` → Optional reference

**TypeScript Stages:**
- [ ] `./reports/coverage/index.html` → Link in "Code Coverage" section
- [ ] `./reports/test-results/junit.xml` → Link in "Test Results" section
- [ ] `./reports/playwright/index.html` → Link in "E2E Tests" (if Gate 15)
- [ ] `./reports/lighthouse/report.html` → Link in "Accessibility" (if Gate 14)
- [ ] `./reports/mutation/index.html` → Link in "Mutation Testing" (if Gate 9)

**Link Format:**
```markdown
**Line Coverage:** 92.1% ([View HTML Report](./reports/coverage/index.html))
**E2E Tests:** 24/24 passing ([View Playwright Report](./reports/playwright/index.html))
```

---

## PHASE 5: Stage Completion

### Step 1: Verify All Quality Gates Pass

- [ ] All mandatory gates (1-6) show ✅ PASS
- [ ] Recommended gate (7) ran and score documented
- [ ] All selected context-dependent gates (8-20) show ✅ PASS
- [ ] All gate outputs saved to `stage-proofs/stage-X/reports/gates/`

**If ANY gate failed:** Fix the issue and restart from Gate 3.

---

### Step 2: Commit Artifacts & Source Code

```bash
STAGE_NUM=X

# Add source code and tests
git add src/ tests/

# Add documentation
git add *.md docs/

# Add stage-specific artifacts
git add stage-proofs/stage-$STAGE_NUM/

# Review staged changes
git diff --cached --stat
```

- [ ] Review staged changes (source, tests, docs, and reports)
- [ ] No unexpected files (no `bin/`, `obj/`, `node_modules/`)
- [ ] All artifacts referenced in proof file are staged
- [ ] Proof file itself is staged

---

### Step 3: Create Stage Completion Commit

```bash
STAGE_NUM=X

git commit -m "$(cat <<'EOF'
✅ Stage $STAGE_NUM Complete: [Stage Name]

## Stage Summary
- Duration: [actual time, e.g., "3 days"]
- Tests: [N passing / 0 failing]
- Coverage: [X.X%]
- Deliverables: [N/N completed]

## What Was Built
1. [Deliverable 1]
2. [Deliverable 2]
3. [Deliverable 3]
...

## Success Criteria Met
✅ All tests passing: [N tests, 0 failures]
✅ Code coverage: [X.X%] (target: ≥90%)
✅ Build: 0 warnings, 0 errors
✅ Security: 0 vulnerabilities
✅ All deliverables: [N/N] complete

## Quality Gates Passed
✅ Gate 3: Clean build
✅ Gate 5: All tests passing
✅ Gate 6: Coverage ≥90%
✅ Gate 7: Zero vulnerabilities
✅ Gate 1: No template files
✅ Gate 8: Proof file complete
[✅ Gate 9: Mutation testing - XX%]
[... list any other gates that ran]

## Value Delivered
[1-2 sentence summary of what this stage enables]

## Proof & Artifacts
See stage-proofs/stage-$STAGE_NUM/STAGE_${STAGE_NUM}_PROOF.md for complete results.
All artifacts committed to stage-proofs/stage-$STAGE_NUM/reports/ for verification.

## Ready for Next Stage
All quality gates passed. Principal Engineer Review complete. CHANGELOG.md updated.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

- [ ] Commit created successfully
- [ ] Commit message contains actual metrics (no placeholders)
- [ ] Commit message lists all gates that passed

---

### Step 4: Update Proof File with Commit Hash

```bash
STAGE_NUM=X

# Get the commit hash
COMMIT_HASH=$(git log -1 --format=%h)

# Display for verification
echo "Commit hash: $COMMIT_HASH"

# Update proof file
sed -i '' "s/\[commit hash\]/$COMMIT_HASH/g" stage-proofs/stage-$STAGE_NUM/STAGE_${STAGE_NUM}_PROOF.md

# Verify update
grep "$COMMIT_HASH" stage-proofs/stage-$STAGE_NUM/STAGE_${STAGE_NUM}_PROOF.md
```

- [ ] Proof file updated with actual commit hash
- [ ] No `[commit hash]` placeholder remains

---

### Step 5: Create Git Tag

```bash
STAGE_NUM=X

# Create annotated tag with actual metrics
git tag -a stage-$STAGE_NUM-complete -m "Stage $STAGE_NUM: [Name] - N tests, XX% coverage, 0 vulnerabilities"

# Verify tag points to correct commit
git log --oneline --decorate -5
```

- [ ] Tag created successfully
- [ ] Tag points to stage completion commit
- [ ] Tag message contains actual metrics
- [ ] Tag visible in `git log` output

---

### Step 6: Final Verification

```bash
STAGE_NUM=X

# Verify no uncommitted changes
git status stage-proofs/stage-$STAGE_NUM/ src/ tests/ *.md

# Verify artifacts exist and are committed
ls -la stage-proofs/stage-$STAGE_NUM/reports/coverage/index.html
ls -la stage-proofs/stage-$STAGE_NUM/reports/test-results/test-results.xml

# Quick verification that gates still pass
dotnet test && dotnet build --configuration Release
# or
npm test && npm run build
```

- [ ] No uncommitted changes to critical files
- [ ] Tests still pass
- [ ] Build still succeeds
- [ ] All artifacts committed and accessible

---

## Final Checklist

**Before declaring stage complete, verify ALL boxes are checked:**

### Quality Gates
- [ ] **Gate 3:** Clean build (0 warnings, 0 errors)
- [ ] **Gate 5:** All tests passing (0 failures)
- [ ] **Gate 6:** Coverage ≥90%
- [ ] **Gate 7:** Zero vulnerabilities
- [ ] **Gate 1:** No template files
- [ ] **Gate 8:** Proof file complete
- [ ] **Gate 9:** Mutation testing (≥80% or documented)
- [ ] **Gates 8-20:** Selected gates passed (based on tech stack)

### Documentation
- [ ] Proof file complete with actual results (`stage-proofs/stage-X/STAGE_X_PROOF.md`)
- [ ] Principal Engineer Review thoughtful and complete
- [ ] Gate selection rationale documented
- [ ] All artifacts committed and linked
- [ ] `CHANGELOG.md` updated with actual metrics
- [ ] No placeholders remain

### Git
- [ ] Artifacts committed (`stage-proofs/stage-X/reports/`)
- [ ] Source code committed
- [ ] Documentation committed
- [ ] Stage completion commit created
- [ ] Proof file updated with commit hash
- [ ] Tag created pointing to commit
- [ ] No uncommitted changes

### Verification
- [ ] Final tests pass
- [ ] Final build succeeds
- [ ] All deliverables complete
- [ ] Coverage reports viewable (click links in proof file)
- [ ] Test results viewable (click links in proof file)
- [ ] Links work in GitHub/GitLab web UI (if pushed)

---

## ✅ STAGE COMPLETE

**If ALL boxes are checked above, the stage is COMPLETE.**

**If any boxes are unchecked:** The stage is NOT complete. Fix the issues and restart from the appropriate step.

---

## Troubleshooting

### Quality Gate Failures

**Gate 3 (Build):**
- Fix warnings/errors
- Re-run from Gate 3

**Gate 5 (Tests):**
- Fix failing tests
- Re-run from Gate 3
- Check for skipped tests (not allowed)

**Gate 6 (Coverage):**
- Add tests for uncovered lines
- View `stage-proofs/stage-X/reports/coverage/index.html` to see which lines
- Re-run from Gate 3

**Gate 7 (Security):**
- Update vulnerable packages
- Re-run from Gate 3
- Document updates in proof file

**Gate 1 (Templates):**
- Remove template files
- Re-run from Gate 3

**Gate 8 (Proof):**
- Fill placeholders with actual data
- Link all artifacts
- Complete Principal Engineer Review
- No gate restart needed

**Gate 9 (Mutation):**
- If score <80%, document why in Principal Engineer Review
- Not blocking, but must be documented

**Gate 4 (Type-Check):**
- Fix type errors immediately
- Re-run from Gate 3
- Zero tolerance for type errors

---

### Artifact Linking Issues

**Reports not in correct location:**
```bash
# Check artifact locations
STAGE_NUM=X
ls -la stage-proofs/stage-$STAGE_NUM/reports/

# If missing, copy from temp locations:
cp -r coverage/ stage-proofs/stage-$STAGE_NUM/reports/coverage/
cp -r test-results/ stage-proofs/stage-$STAGE_NUM/reports/test-results/
```

**Links don't work in proof file:**
- Use relative paths: `./reports/coverage/index.html`
- Ensure artifacts are committed
- Test links in web UI after push

**git check-ignore issues:**
```bash
# Ensure artifacts are NOT ignored
git check-ignore stage-proofs/stage-X/reports/coverage/index.html
# Should return nothing (file not ignored)

# If ignored, update .gitignore to allow reports
```

---

## Notes

- This checklist is derived from `STAGE_EXECUTION_FRAMEWORK.md` v2.0
- For complete procedures and failure handling, see that document
- All stages must follow this checklist for completion
- Zero tolerance for skipping steps or incomplete documentation
- **Artifact linking is mandatory** for verifiable proofs

---

**Last Updated:** 2025-11-29
**Version:** 2.0 (Aligned with STAGE_EXECUTION_FRAMEWORK.md v2.0 + Centralized Artifacts)
