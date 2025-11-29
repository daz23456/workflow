# Stage Execution Framework

## 📋 QUICK START: Select Your Quality Gates (30 seconds)

**First time here?** Start with the [5-Step Beginner Path](#beginner-path) below, then come back to this table.

**Experienced user?** Use this lookup table to instantly select the right gates for your stage:

| Your Stage Involves... | Required Gates | Why These Gates? |
|------------------------|----------------|------------------|
| **.NET Backend Code** | 1-8 | Clean build + tests + coverage + security + linting (Gate 8 catches unused vars, nullability issues) |
| **.NET API Endpoints** | 1-8, 10, 12 | Everything above + integration tests (Gate 10 verifies endpoints work end-to-end) + API contract validation (Gate 12 prevents breaking changes) |
| **TypeScript/React UI** | 1-6, 8, 9, 13, 14 | Core gates + linting (Gate 8) + **type-check (Gate 9 MANDATORY)** + docs (Gate 13) + accessibility (Gate 14 for WCAG compliance) |
| **TypeScript Backend/Node.js** | 1-9 | Core gates + linting + type-check (TypeScript type safety is non-negotiable) |
| **Performance-Critical Features** | 1-8, 11 | Everything above + benchmarks (Gate 11 catches performance regressions before production) |
| **Pure Documentation/Config** | 1-6 only | Skip code-specific gates (8, 9, 10, 11, 12) - just verify build, tests, coverage, security, no templates, proof complete |
| **Library/SDK (Public API)** | 1-8, 12, 13 | Everything above + API contract (Gate 12 ensures semantic versioning) + docs (Gate 13 for public API documentation) |

### 🎯 Copy-Paste Quick Commands

**Running all mandatory gates (.NET):**
```bash
# Gate 1: Clean Build
dotnet clean && dotnet build --configuration Release

# Gate 2: All Tests Passing
dotnet test --configuration Release

# Gate 3: Coverage ≥90%
dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage && \
reportgenerator -reports:./coverage/**/coverage.cobertura.xml -targetdir:./coverage/report && \
grep "Line coverage:" ./coverage/report/Summary.txt

# Gate 4: Zero Vulnerabilities
dotnet list package --vulnerable --include-transitive

# Gate 5: No Template Files
find . -name "Class1.cs" -o -name "UnitTest1.cs" -o -name "WeatherForecast.cs"

# Gate 6: Proof File Completeness
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_*_PROOF.md
```

**Running all mandatory gates (TypeScript):**
```bash
# Gate 1: Clean Build
npm run clean && npm run build && npm run type-check

# Gate 2: All Tests Passing
npm test

# Gate 3: Coverage ≥90%
npm run test:coverage

# Gate 4: Zero Vulnerabilities
npm audit --audit-level=moderate

# Gate 5: No Template Files
find . -name "App.test.tsx" -o -name "setupTests.ts" -o -name "logo.svg"

# Gate 6: Proof File Completeness
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_*_PROOF.md
```

### 🔰 First Time Here? <a name="beginner-path"></a>

**If you've never used this framework before, follow this 5-step path:**

1. **Understand the "Why"** (2 minutes)
   - Read: "Why It Matters (Value to Project)" in the Stage 1 section below
   - **Key insight**: Quality gates prevent broken code from ever being deployed
   - **Learn more**: [TDD Fundamentals](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

2. **Identify Your Tech Stack** (30 seconds)
   - Are you working in .NET, TypeScript, or both?
   - Look at the table above and find your row
   - **Example**: Building a React component? → Use gates 1-6, 8, 9, 13, 14

3. **Verify Your Tools Work** (5 minutes)
   - Jump to "Pre-Stage Tool Verification" section below
   - Run the commands to ensure everything is installed
   - **Why this matters**: Discovering missing tools mid-stage wastes 30+ minutes

4. **Read the BEFORE Phase** (10 minutes)
   - Review the "BEFORE Starting" section below
   - Understand the 5 steps you'll follow before coding
   - **Critical**: Gate selection happens in BEFORE phase, not during coding

5. **See a Working Example** (15 minutes)
   - Open `STAGE_1_PROOF.md` to see a completed stage
   - Notice how actual metrics (21/21 tests, 91.8% coverage) replace placeholders
   - Read the **Principal Engineer Review** section - this strategic analysis is REQUIRED for every stage
   - **Pattern to follow**: Your stage proof should look exactly like this

**Total time to onboard: ~30 minutes. After this, you'll complete stages 2-3x faster than without the framework.**

**🎯 Key Insight:** The Principal Engineer Review section forces you to think critically about what you built. It catches risks early and prevents technical debt from accumulating. Don't skip it!

### 💡 Common Scenarios & Gate Selection

**Scenario 1: "I'm adding a new API endpoint to an existing .NET service"**
- **Gates needed**: 1-8 (mandatory + linting), 10 (integration tests for the new endpoint), 12 (API contract validation)
- **Why Gate 10?** Integration tests verify your endpoint works with the database, auth middleware, etc.
- **Why Gate 12?** Ensures your OpenAPI spec is updated and no breaking changes introduced

**Scenario 2: "I'm building a React component library"**
- **Gates needed**: 1-6, 8, 9 (TypeScript type-check MANDATORY), 13 (component docs), 14 (accessibility)
- **Why Gate 9?** TypeScript type errors = runtime crashes. Type-check catches them at build time.
- **Why Gate 14?** UI components must be keyboard-navigable and screen-reader friendly

**Scenario 3: "I'm refactoring existing code (no new features)"**
- **Gates needed**: 1-8 (minimum - ensure refactor doesn't break anything)
- **Why no extra gates?** No new APIs (skip 12), no new features (skip 13), no UI changes (skip 14)
- **Safety net**: Gates 1-3 ensure your refactor is safe (tests still pass, coverage maintained)

**Scenario 4: "I'm optimizing a slow database query"**
- **Gates needed**: 1-8, 11 (performance regression detection)
- **Why Gate 11?** Benchmarks prove your optimization actually works (not just "feels faster")
- **Pro tip**: Run `dotnet run --project Benchmarks` before and after to measure speedup

### 📚 Learning Resources

**New to TDD?**
- [Test-Driven Development by Kent Beck](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530) (book)
- [TDD Cycle: Red-Green-Refactor](https://www.codecademy.com/article/tdd-red-green-refactor) (article, 10 min)

**New to Quality Gates?**
- [Continuous Integration Best Practices](https://martinfowler.com/articles/continuousIntegration.html) (article, 20 min)
- [Why Code Coverage Matters](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html) (Google Testing Blog, 15 min)

**New to Accessibility Testing?**
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/) (interactive checklist)
- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/) (free tool for accessibility testing)

**New to Mutation Testing?**
- [Mutation Testing: A Gentle Introduction](https://stryker-mutator.io/docs/) (Stryker docs, 15 min)
- [Why Mutation Testing Matters](https://blog.codacy.com/mutation-testing/) (article, 10 min)

---

## Technology Stack Configuration

**Before starting any stage, identify your technology stack and use the corresponding commands throughout this framework.**

### .NET Projects
- **Build**: `dotnet build --configuration Release`
- **Clean**: `dotnet clean`
- **Test**: `dotnet test --configuration Release`
- **Coverage**: `dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage`
- **Coverage Report**: `reportgenerator -reports:./coverage/**/coverage.cobertura.xml -targetdir:./coverage/report`
- **Vulnerabilities**: `dotnet list package --vulnerable --include-transitive`
- **Mutation Testing**: `dotnet stryker --config-file stryker-config.json`
- **Linting**: `dotnet format --verify-no-changes`

### TypeScript/Node.js Projects
- **Build**: `npm run build`
- **Clean**: `npm run clean` or `rm -rf dist/`
- **Test**: `npm test` or `npx vitest run` or `npx jest`
- **Coverage**: `npm run test:coverage`
- **Vulnerabilities**: `npm audit --audit-level=moderate`
- **Mutation Testing**: `npx stryker run`
- **Linting**: `npm run lint`
- **Type Check**: `npm run type-check` or `tsc --noEmit`

---

## Execution Protocol

For each stage, we follow this systematic process:

### BEFORE Starting:

1. **Stage Declaration**

   - Stage number and name
   - Duration estimate
   - Dependencies (what must be completed first)

2. **Objectives Statement**

   - What we will build (specific deliverables)
   - Why it matters (value to the project)
   - How it fits into the larger system

3. **Success Criteria**
   - Specific, measurable outcomes
   - Test coverage targets
   - Performance benchmarks (if applicable)

4. **Selecting Quality Gates for Your Stage**

   Determine which quality gates apply to this stage based on what you're building:

   #### Mandatory Gates (Always Required - Gates 1-6)
   - [x] Gate 1: Clean Build
   - [x] Gate 2: All Tests Passing
   - [x] Gate 3: Code Coverage ≥90%
   - [x] Gate 4: Zero Security Vulnerabilities
   - [x] Gate 5: No Template Files
   - [x] Gate 6: Proof File Completeness

   #### Mutation Testing (Recommended - Gate 7)
   - [ ] Gate 7: Mutation Testing ≥80% - Document score, not blocking

   #### Context-Dependent Gates (Select Based on Stage Content)

   **Answer these questions to determine which additional gates apply:**

   1. **Does this stage involve code?**
      - Yes → Add Gate 8 (Linting & Code Style)

   2. **Is this a TypeScript project?**
      - Yes → Add Gate 9 (Type Safety Validation) - **MANDATORY** for TypeScript

   3. **Does this stage create or modify APIs, integrations, or multi-component interactions?**
      - Yes → Add Gate 10 (Integration Tests)

   4. **Does this stage add performance-critical features or have existing benchmarks?**
      - Yes → Add Gate 11 (Performance Regression Detection)

   5. **Does this stage expose or modify public API contracts?**
      - Yes → Add Gate 12 (API Contract Validation)

   6. **Does this stage add user-facing features or complex internal logic?**
      - Yes → Add Gate 13 (Documentation Completeness)

   7. **Does this stage include UI/frontend components?**
      - Yes → Add Gate 14 (Accessibility Testing) - WCAG 2.1 AA compliance

   **Gate Selection Examples:**
   - **Stage 2 (Schema Validation - .NET)**: Gates 1-8 (add linting)
   - **Stage 7 (API Gateway - .NET)**: Gates 1-8, 10, 12 (add integration tests + API contract validation)
   - **Stage 9.1 (Visual Workflow Builder - React/TypeScript)**: Gates 1-6, 8, 9, 13, 14 (TypeScript type-check + docs + accessibility, skip mutation for UI)

5. **Pre-Stage Tool Verification**

   Before starting implementation, verify all required tools are installed and working:

   #### .NET Projects
   ```bash
   # Verify .NET SDK version
   dotnet --version  # Should show 8.0.x or later

   # Verify build tools work
   dotnet build --help

   # Verify test runner works
   dotnet test --help

   # Verify coverage tools (if not installed, install now)
   dotnet tool list --global | grep reportgenerator || dotnet tool install --global dotnet-reportgenerator-globaltool

   # Verify mutation testing (if using Gate 7)
   dotnet tool list --global | grep stryker || dotnet tool install --global dotnet-stryker
   ```

   #### TypeScript/Node.js Projects
   ```bash
   # Verify Node.js version
   node --version  # Should show v18.x or later
   npm --version

   # Verify dependencies installed
   npm install

   # Verify test runner works
   npm test -- --version  # or: npx vitest --version

   # Verify build works
   npm run build -- --help  # Verify build script exists

   # Verify linting tools (if using Gate 8)
   npx oxlint --version  # Optional but recommended
   npx eslint --version

   # Verify TypeScript compiler (if TypeScript project)
   npx tsc --version

   # Verify mutation testing (if using Gate 7)
   npx stryker --version
   ```

   **Tool Installation Checklist:**
   - [ ] Language SDK/runtime installed and verified
   - [ ] Build tools working
   - [ ] Test runner working
   - [ ] Coverage tools installed (reportgenerator/.NET or built-in/TypeScript)
   - [ ] Linting tools installed (if using Gate 8)
   - [ ] Mutation testing tools installed (if using Gate 7)
   - [ ] All package dependencies installed (`dotnet restore` or `npm install`)

   **Why this matters:** Discovering missing tools mid-stage disrupts flow and wastes time. Verify everything works before you begin.

### DURING Execution:

1. **Strict TDD**: RED → GREEN → REFACTOR for every feature
2. **Progress Tracking**: Update checklist as tasks complete
3. **Quality Gates**: All tests pass, coverage ≥90%

### AFTER Completion:

**IMPORTANT:** Before following these steps, you MUST run all quality gates and follow the strict completion procedure detailed below.

**Overview of completion steps:**

1. **Run Quality Gates** - 6 mandatory gates + selected context-dependent gates
2. **Complete Documentation** - Proof file + CHANGELOG.md with actual metrics
3. **Create Stage Completion Commit** - Following format guidelines
4. **Tag & Finalize** - Update proof with commit hash + create tag
5. **Final Verification** - Ensure everything is complete

**For detailed procedures, see:**

- **Stage Completion Quality Gates (MANDATORY)** - Section below with 6 required + 1 recommended + 7 context-dependent gates
- **Stage Completion Procedure (STRICT SEQUENTIAL ORDER)** - Section below with 5-step procedure
- **Quality Gate Failure Procedures** - Section below with specific remediation steps
- **Proof File Completion Standards** - Section below with validation requirements

**Quick Checklist (see sections below for details):**

- [ ] Gate 1: Clean Release build (0 warnings, 0 errors)
- [ ] Gate 2: All tests passing (0 failures, 0 skipped)
- [ ] Gate 3: Coverage ≥90%
- [ ] Gate 4: Zero security vulnerabilities
- [ ] Gate 5: No template files (Class1.cs, UnitTest1.cs removed)
- [ ] Gate 6: Proof file complete (no placeholders)
- [ ] Gate 7: Mutation testing ≥80%
- [ ] CHANGELOG.md updated with actual metrics
- [ ] Commit created with comprehensive message
- [ ] Tag created pointing to commit
- [ ] Final verification passes

**If all boxes are checked: ✅ STAGE IS COMPLETE**

Otherwise, see detailed procedures below.

---

## ⚠️ Common Pitfalls: Learn from Our Mistakes

> **Developer Experience Insight**: These warnings come from real pain points encountered during Stages 1-7. Reading these 5 minutes now saves you 2+ hours of debugging later.

### Pitfall #1: Running Gates Out of Order

**What happened:**
> Stage 5 completion - We updated a NuGet package to fix a security vulnerability (Gate 4), then marked all gates complete. Two days later, CI pipeline failed because the update introduced a new compiler warning. We had to revert the stage completion, fix the warning, and re-run all gates.

**Why it happened:**
- Ran Gate 4 (security) last instead of in order
- Didn't re-run Gate 1 (build) after package update
- Assumed package updates are safe

**The rule:**
✅ **ALWAYS run gates in sequential order (1→2→3→4→5→6)**
✅ **If ANY gate fails and you make code changes, restart from Gate 1**
✅ **Dependencies change = everything downstream can break**

**Time cost**: 4 hours of rework vs. 5 minutes of re-running all gates

---

### Pitfall #2: Proof File Placeholders "I'll Fill Later"

**What happened:**
> Stage 3 completion - Created proof file with placeholders `[XX%]` and `[N/N tests]`, planning to fill them after commit. Got interrupted by urgent bug fix. Three weeks later, came back to stage - had no idea what the actual numbers were. Had to re-run all gates to get the metrics.

**Why it happened:**
- Created proof file before running gates (backwards order)
- Assumed "I'll remember to fill this in"
- No verification step caught the placeholders

**The rule:**
✅ **Run gates FIRST, collect outputs, THEN create proof file**
✅ **Copy-paste actual command output immediately (don't type numbers manually)**
✅ **Run Gate 6 verification before committing**: `grep -i "\[XX%\]" STAGE_*_PROOF.md` should be empty

**Time cost**: 1 hour re-running gates vs. 10 seconds copy-pasting output correctly the first time

---

### Pitfall #3: Skipping Tool Verification Until Mid-Stage

**What happened:**
> Stage 7.5 completion - Started coding output mapping, wrote 15 tests, ready to run mutation testing (Gate 7). Discovered `dotnet-stryker` wasn't installed. Installation took 5 minutes, but waiting for Stryker to run first time (downloading packages, building analyzers) took 20 minutes. Lost flow state, forgot which mutants I wanted to verify.

**Why it happened:**
- Skipped "Pre-Stage Tool Verification" section
- Assumed tools were already installed
- Discovered missing tool at worst possible time (end of stage, trying to finish)

**The rule:**
✅ **Run "Pre-Stage Tool Verification" commands BEFORE writing any code**
✅ **Install ALL tools upfront, even if "I might not need mutation testing"**
✅ **Tools needed for gates should be ready to go, not discovered when gates fail**

**Time cost**: 25 minutes of disruption + lost flow state vs. 5 minutes upfront verification

---

### Pitfall #4: Type-Checking Only at Build Time (TypeScript)

**What happened:**
> Stage 9.1 (React UI) - Wrote 30 React components, ran `npm run build` (Gate 1) - success! Celebrated. Pushed to CI. CI failed with "npm run type-check failed: 47 type errors". Realized `npm run build` in our project doesn't run `tsc --noEmit`, only webpack build. Spent 2 hours fixing type errors that should have been caught locally.

**Why it happened:**
- Assumed build = type-check (not always true)
- Didn't read Gate 9 requirement: "TypeScript type-check is MANDATORY"
- CI caught what local process missed

**The rule:**
✅ **For TypeScript: Gate 1 = `npm run build` AND `npm run type-check`** (two commands)
✅ **Never skip `tsc --noEmit` for TypeScript projects**
✅ **Type errors at runtime = preventable disasters**

**Time cost**: 2 hours fixing type errors + CI pipeline failure vs. 30 seconds running `npm run type-check`

---

### Pitfall #5: Forgetting to Update Proof File with Commit Hash

**What happened:**
> Stage 6 completion - Followed procedure perfectly: ran gates, created proof file, committed with tag `stage-6-complete`. Two months later, needed to reference Stage 6 work. Proof file said "Commit: [TO BE FILLED]". Had to use `git log --grep "Stage 6"` and manually match dates to find the commit.

**Why it happened:**
- Created commit (Step 3) and tag (Step 4) correctly
- Forgot Step 4 requirement: "Edit STAGE_X_PROOF.md: Replace commit hash placeholder with $COMMIT_HASH"
- Didn't verify final state before moving to next stage

**The rule:**
✅ **Step 4 has TWO parts**: (1) Get commit hash, (2) **Update proof file with hash**
✅ **Proof file should have actual commit hash, not placeholder**
✅ **Step 5 verification catches this**: `git diff STAGE_X_PROOF.md` should show updated hash

**Time cost**: 10 minutes hunting for commit vs. 15 seconds updating proof file in Step 4

---

**Summary: 5 Pitfalls Cost 8+ Hours Total. Reading This Section: 5 Minutes.**

**Next Developer Reading This**: You're welcome. We made these mistakes so you don't have to. 😊

---

## Stage Completion Quality Gates (MANDATORY)

**Before creating ANY stage completion commit or tag, you MUST run these checks in order.**

Every gate must show ✅ PASS. If ANY gate fails, it is a **BLOCKER** - the stage is NOT complete.

### Gate 1: Clean Build

**Commands:**
- .NET: `dotnet clean && dotnet build --configuration Release`
- TypeScript: `npm run clean && npm run build && npm run type-check`

**Expected**: `Build succeeded. 0 Warning(s) 0 Error(s)` (.NET) or `✓ Built` with no errors (TypeScript)

**BLOCKER:** Any warnings or errors = STAGE NOT COMPLETE

---

### Gate 2: All Tests Passing

**Commands:**
- .NET: `dotnet test --configuration Release`
- TypeScript: `npm test` (or `npx vitest run` / `npx jest`)

**Expected**: All tests pass, 0 failures, 0 skipped

**BLOCKER:** Any test failures or skipped tests = STAGE NOT COMPLETE

---

### Gate 3: Code Coverage ≥90%

**Commands:**
- .NET: `dotnet test --collect:"XPlat Code Coverage" && reportgenerator -reports:./coverage/**/coverage.cobertura.xml -targetdir:./coverage/report`
- TypeScript: `npm run test:coverage` (or `npx vitest run --coverage` / `npx jest --coverage`)

**Check coverage:**
- .NET: `grep "Line coverage:" ./coverage/report/Summary.txt`
- TypeScript: Check terminal output or `coverage/index.html`

**Expected**: Line coverage ≥90%

**BLOCKER:** Coverage < 90% = STAGE NOT COMPLETE

---

### Gate 4: Zero Security Vulnerabilities

**Commands:**
- .NET: `dotnet list package --vulnerable --include-transitive`
- TypeScript: `npm audit --audit-level=moderate`

**Expected**: No vulnerabilities found

**Note**: For TypeScript, focus on HIGH and MODERATE severity in production dependencies.

**BLOCKER:** ANY HIGH or MODERATE vulnerabilities = STAGE NOT COMPLETE

---

### Gate 5: No Template/Scaffolding Files

**Commands:**
- .NET: `find . -name "Class1.cs" -o -name "UnitTest1.cs" -o -name "WeatherForecast.cs"`
- TypeScript: `find . -name "*.test.tsx.backup" -o -name "setupTests.ts.example"` or check for framework boilerplate

**Expected**: No files found (empty output)

**BLOCKER:** Any template files found = STAGE NOT COMPLETE

---

### Gate 6: Proof File Completeness

**This gate is technology-agnostic** - applies to all projects.

```bash
# Check proof file for placeholders (case-insensitive)
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_*_PROOF.md
```

**Expected Output:**
```
(empty - no placeholders found)
```

**BLOCKER:** Any placeholders in proof file = STAGE NOT COMPLETE

---

### Gate 7: Mutation Testing Score ≥80%

**Commands:**
- .NET: `dotnet stryker --config-file stryker-config.json`
- TypeScript: `npx stryker run`

**Expected**: Mutation score ≥80%

**Score interpretation**: ≥90% Excellent | ≥80% Good | ≥70% Acceptable | <70% Weak | <60% Poor

**RECOMMENDED (not blocking)**: Document score in proof file. If <80%, consider adding tests for survived mutants in critical code paths. Run this gate last (slower than others).

---

## Context-Dependent Quality Gates (Gates 8-14)

**These gates are OPTIONAL and should be selected during the BEFORE phase based on what you're building.**
Refer to the "Selecting Quality Gates for Your Stage" section above to determine which apply.

### Gate 8: Linting & Code Style

**Applicability**: Recommended for all stages that involve code

**Commands:**
- .NET: `dotnet format --verify-no-changes`
- TypeScript: `npx oxlint src/ && npm run lint`
  - **oxlint first**: Rust-based, 50-100x faster, catches ~80% of issues instantly
  - **ESLint second**: Full rule set with plugins and custom rules

**Expected**: No output (exit code 0) for .NET, `✓ No linting errors or warnings` for TypeScript

**Purpose**: Enforce consistent code style, catch common mistakes (unused variables, missing types, etc.)

---

### Gate 9: Type Safety Validation (TypeScript Only)

**Applicability**: **MANDATORY** for TypeScript projects, N/A for .NET (already covered in Gate 1)

**Commands:**
- TypeScript: `npm run type-check` or `tsc --noEmit`

**Expected**: No output (exit code 0)

**Purpose**: Catch type errors before runtime. TypeScript's main value proposition.

---

### Gate 10: Integration Tests

**Applicability**: Stages that create or modify APIs, integrations, or multi-component interactions (typically Stage 7+)

**Commands:**
- .NET: `dotnet test --filter Category=Integration`
- TypeScript: `npm run test:integration` (Playwright, Cypress, or Supertest)

**Expected**: `Passed! - Failed: 0, Passed: N, Skipped: 0` (.NET) or `All integration tests passed` (TypeScript)

**Purpose**: Verify that components work together correctly, not just in isolation. Tests API endpoints, database interactions, external service integrations.

---

### Gate 11: Performance Regression Detection

**Applicability**: Stages that add performance-critical features or have existing benchmarks (typically Stage 10+)

**Commands:**
- .NET: `dotnet run --project tests/Benchmarks --configuration Release`
- TypeScript: `npm run benchmark` or `npx autocannon http://localhost:3000`

**Expected**: No significant regressions (<10% slowdown), all benchmarks within acceptable thresholds

**Purpose**: Catch performance degradation early. Ensure new features don't slow down critical paths.

---

### Gate 12: API Contract Validation

**Applicability**: Stages that expose or modify public API contracts (typically Stage 7+)

**Commands:**
- .NET: `dotnet swagger tofile --output swagger.json bin/Release/net8.0/YourApi.dll v1`
- TypeScript: `npm run validate:api` or `npx swagger-cli validate openapi.yaml`

**Expected**: `✓ OpenAPI spec generated successfully` with no breaking changes (or documented intentional breaks)

**Purpose**: Prevent breaking changes to public APIs. Ensure API documentation stays in sync with implementation.

---

### Gate 13: Documentation Completeness

**Applicability**: Recommended for all stages, especially those adding user-facing features or complex internal logic

**Checklist:**
- [ ] README.md updated with new features
- [ ] API documentation updated (XML comments in .NET, JSDoc in TypeScript)
- [ ] CHANGELOG.md entry created for this stage
- [ ] Migration guide (if breaking changes introduced)
- [ ] Inline code comments for complex logic

**Verification:**
- .NET: Check XML doc comments on public APIs
- TypeScript: Check JSDoc comments, run `npx typedoc`

**Purpose**: Users and future maintainers can understand and use new features without diving into implementation.

---

### Gate 14: Accessibility Testing

**Applicability**: UI/frontend stages (React, Next.js, Blazor, etc.) - WCAG 2.1 AA compliance

**Commands:**
- .NET (Blazor/Razor): Manual testing + browser DevTools
- TypeScript/React: `npm run test:a11y` (axe-core, jest-axe, Playwright accessibility)

**Automated Testing:**
- Run axe-core accessibility scanner: `npx @axe-core/cli http://localhost:3000`
- Run Lighthouse: `npx lighthouse http://localhost:3000 --only-categories=accessibility`
- Expected: 100% automated test pass, Lighthouse score ≥90

**Manual Testing Checklist:**
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus indicators visible on all interactive elements
- [ ] Screen reader announces content correctly (test with NVDA/VoiceOver)
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI components)
- [ ] Images have alt text
- [ ] Forms have labels and error messages
- [ ] No keyboard traps
- [ ] Semantic HTML used (headings hierarchy, landmarks)

**Purpose**: Ensure application is usable by people with disabilities. WCAG 2.1 AA compliance is often a legal requirement.

---

### Gate 15: End-to-End (E2E) Testing

**Applicability**: Stages that implement complete user workflows or UI flows (typically Stage 9+ for UI, Stage 11+ for full system E2E)

**Commands:**
- .NET: `dotnet test --filter Category=E2E` or `npx playwright test` (for Blazor/Razor apps)
- TypeScript: `npx playwright test` or `npx cypress run`

**Expected**: All E2E tests pass, critical user journeys verified

**What E2E Tests Verify:**
- Complete user workflows from start to finish (not just single components)
- Multi-step processes work end-to-end (e.g., login → create workflow → execute → view results)
- Real browser interactions (clicks, form submissions, navigation)
- Cross-component integration (UI + API + database working together)
- Authentication flows, session management, error handling

**Example E2E Scenarios:**
```typescript
// Example: Playwright E2E test for workflow creation flow
test('User can create and execute workflow', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('[name=username]', 'testuser');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  // 2. Create workflow
  await page.goto('/workflows/new');
  await page.fill('[name=workflow-name]', 'test-workflow');
  await page.click('button:has-text("Save")');

  // 3. Execute workflow
  await page.click('button:has-text("Execute")');
  await page.waitForSelector('.execution-status:has-text("Success")');

  // 4. Verify results
  const results = await page.textContent('.execution-results');
  expect(results).toContain('42 tasks completed');
});
```

**When to Use Gate 15:**
- ✅ Use when: Building user-facing features that span multiple pages/components
- ✅ Use when: Implementing critical business workflows (checkout, order fulfillment)
- ✅ Use when: Stage involves UI + API integration
- ⏭️ Skip when: Pure backend API (use Gate 10 Integration Tests instead)
- ⏭️ Skip when: Single component/service with no user flow

**Setup Requirements:**
- .NET: Install Playwright via `dotnet add package Microsoft.Playwright` + `pwsh bin/Debug/net8.0/playwright.ps1 install`
- TypeScript: Install Playwright via `npm install -D @playwright/test` + `npx playwright install`
- Or Cypress: `npm install -D cypress` + `npx cypress open`

**Performance Considerations:**
- E2E tests are slower than unit/integration tests (30s-2min per test)
- Run critical user journeys only (3-5 E2E tests max per stage)
- Use headless mode in CI: `npx playwright test --headed=false`
- Parallelize when possible: `npx playwright test --workers=4`

**Purpose**: Verify complete user workflows work end-to-end in a real browser. Catches issues that unit/integration tests miss (e.g., broken navigation, session issues, UI state bugs).

---

### Gate 16: Static Application Security Testing (SAST)

**Applicability**: Recommended for all stages that handle sensitive data, user input, or authentication (typically Stage 7+ for APIs, Stage 9+ for UI)

**Commands:**
- .NET: `dotnet build /p:EnableNETAnalyzers=true /p:AnalysisLevel=latest` + SecurityCodeScan NuGet package
- TypeScript: `npx eslint . --ext .ts,.tsx --plugin security` (requires `eslint-plugin-security`)

**Expected**: No HIGH or CRITICAL security issues found

**What SAST Detects:**
- **SQL Injection vulnerabilities**: Unsanitized user input in SQL queries
- **Cross-Site Scripting (XSS)**: Unsafe HTML rendering, dangerouslySetInnerHTML
- **Hardcoded secrets**: API keys, passwords, tokens in source code
- **Insecure cryptography**: Weak hashing (MD5, SHA1), ECB mode encryption
- **Path traversal**: Unsafe file path construction from user input
- **Command injection**: Unsanitized input passed to shell commands
- **Insecure deserialization**: Deserializing untrusted data without validation
- **Weak random number generation**: Using `Random` for security-sensitive operations (use `RandomNumberGenerator`)

**Setup Instructions:**

**.NET Setup:**
```bash
# Install SecurityCodeScan analyzer
dotnet add package SecurityCodeScan.VS2019 --version 5.6.7

# Enable .NET analyzers in .csproj
<PropertyGroup>
  <EnableNETAnalyzers>true</EnableNETAnalyzers>
  <AnalysisLevel>latest</AnalysisLevel>
  <TreatWarningsAsErrors>false</TreatWarningsAsErrors>
  <WarningsAsErrors>SCS0001;SCS0002;SCS0003</WarningsAsErrors> <!-- SQL Injection, XSS, Path Traversal -->
</PropertyGroup>

# Build with analyzers enabled
dotnet build --configuration Release
```

**TypeScript Setup:**
```bash
# Install ESLint security plugin
npm install -D eslint-plugin-security

# Add to .eslintrc.js or .eslintrc.json
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error"
  }
}

# Run ESLint with security plugin
npx eslint . --ext .ts,.tsx
```

**Common Vulnerabilities to Fix:**

**Example 1: SQL Injection (.NET)**
```csharp
// ❌ BAD: SQL Injection vulnerability
string query = $"SELECT * FROM Users WHERE Username = '{username}'";
var results = db.ExecuteQuery(query);

// ✅ GOOD: Parameterized query
string query = "SELECT * FROM Users WHERE Username = @Username";
var results = db.ExecuteQuery(query, new { Username = username });
```

**Example 2: XSS (TypeScript/React)**
```typescript
// ❌ BAD: XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ GOOD: Safe rendering
<div>{userInput}</div>  // React escapes by default
```

**Example 3: Hardcoded Secrets (.NET)**
```csharp
// ❌ BAD: Hardcoded API key
string apiKey = "sk-1234567890abcdef";

// ✅ GOOD: Environment variable or Azure Key Vault
string apiKey = Environment.GetEnvironmentVariable("API_KEY");
```

**When to Use Gate 16:**
- ✅ Use when: Building API endpoints that accept user input
- ✅ Use when: Handling authentication, authorization, or sensitive data
- ✅ Use when: File uploads, database queries, external API calls
- ✅ Use when: Storing or transmitting passwords, tokens, credit cards
- ⏭️ Skip when: Pure UI components with no data handling (still use for forms)
- ⏭️ Skip when: Stage is pure documentation or configuration

**Severity Levels:**
- **CRITICAL**: SQL injection, command injection, hardcoded secrets → **BLOCKER** (must fix)
- **HIGH**: XSS, path traversal, insecure crypto → **BLOCKER** (must fix)
- **MEDIUM**: Weak random, insecure defaults → Recommended to fix
- **LOW**: Code quality issues → Nice to fix, not blocking

**False Positives:**
- SAST tools can produce false positives (flagging safe code as vulnerable)
- Review each issue carefully - don't blindly suppress warnings
- Document suppressions with justification: `#pragma warning disable SCS0001 // Reason: User input is validated upstream`

**Purpose**: Detect security vulnerabilities in source code before deployment. Prevents OWASP Top 10 vulnerabilities from reaching production.

---

### Gate 17: Observability Readiness

**Applicability**: Recommended for all backend services and critical production systems (typically Stage 7+)

**Commands:**
- .NET: Verify structured logging, correlation IDs, health checks configured
- TypeScript: Verify Winston/Pino logging, request IDs, health endpoints configured

**Expected**: Structured logging in place, correlation IDs tracked, health/metrics endpoints exposed

**What Observability Readiness Verifies:**
- **Structured logging**: JSON-formatted logs with contextual fields (not console.log or string interpolation)
- **Correlation IDs**: Request tracking across services (trace entire user journey)
- **Health checks**: `/health` endpoint with dependency status (database, Redis, external APIs)
- **Metrics exposure**: Prometheus/OpenTelemetry metrics endpoint (response times, error rates, throughput)
- **Error tracking integration**: Sentry/New Relic/Application Insights configured
- **PII redaction**: Sensitive data (passwords, tokens, SSNs) not logged
- **Log levels**: Configurable via environment (DEBUG in dev, INFO/WARN in prod)
- **Distributed tracing**: OpenTelemetry/Jaeger tracing headers propagated

**Setup Instructions:**

**.NET Observability Setup:**
```csharp
// Program.cs - Structured logging with Serilog
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(new JsonFormatter())  // Structured JSON logs
    .Enrich.WithCorrelationId()            // Add correlation IDs
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .CreateLogger();

builder.Host.UseSerilog();

// Add correlation ID middleware
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<CorrelationIdMiddleware>();

// Add health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>()
    .AddRedis(redisConnectionString)
    .AddUrlGroup(new Uri("https://external-api.com/health"), "external-api");

// Expose metrics
builder.Services.AddOpenTelemetryMetrics(opts => {
    opts.AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddPrometheusExporter();
});

// Map health and metrics endpoints
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions {
    Predicate = check => check.Tags.Contains("ready")
});
app.MapPrometheusScrapingEndpoint("/metrics");
```

**TypeScript Observability Setup:**
```typescript
// logger.ts - Structured logging with Winston/Pino
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()  // Structured JSON logs
  ),
  defaultMeta: {
    service: 'workflow-api',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console()
  ]
});

// middleware/correlation.ts - Correlation ID middleware
import { v4 as uuidv4 } from 'uuid';

export function correlationIdMiddleware(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);

  // Add to all logs
  logger.defaultMeta.correlationId = req.correlationId;

  next();
}

// routes/health.ts - Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      externalApi: await checkExternalApi()
    }
  };

  const isHealthy = Object.values(health.checks).every(c => c.status === 'up');
  res.status(isHealthy ? 200 : 503).json(health);
});

// Prometheus metrics
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

**Verification Checklist:**

1. **Structured Logging Check**
   ```bash
   # .NET: Run app and check logs are JSON
   dotnet run | head -10
   # Should see: {"@t":"2025-01-15T10:30:45.123Z","@mt":"Request started...","CorrelationId":"abc123"}

   # TypeScript: Check logs are JSON
   npm run dev | head -10
   # Should see: {"level":"info","message":"Server started","service":"workflow-api","timestamp":"2025-01-15T10:30:45.123Z"}
   ```

2. **Correlation ID Check**
   ```bash
   # Send request with correlation ID
   curl -H "X-Correlation-ID: test-123" http://localhost:5000/api/workflows

   # Check logs include correlation ID
   # ✅ Verify: Logs show "correlationId":"test-123" or "CorrelationId":"test-123"
   ```

3. **Health Check Verification**
   ```bash
   # .NET
   curl http://localhost:5000/health
   # ✅ Expected: {"status":"Healthy","totalDuration":"00:00:00.123"}

   # TypeScript
   curl http://localhost:3000/health
   # ✅ Expected: {"status":"healthy","checks":{"database":{"status":"up"},...}}
   ```

4. **Metrics Endpoint Verification**
   ```bash
   # .NET (Prometheus)
   curl http://localhost:5000/metrics
   # ✅ Expected: Prometheus format metrics

   # TypeScript
   curl http://localhost:3000/metrics
   # ✅ Expected: Prometheus format metrics
   ```

5. **PII Redaction Check**
   ```bash
   # Search logs for common PII patterns
   grep -i "password\|ssn\|credit.*card" logs/*.log
   # ✅ Expected: No matches (PII should be redacted as "***")
   ```

**When to Use Gate 17:**
- ✅ Use when: Building production backend services or APIs
- ✅ Use when: System needs to be debuggable in production
- ✅ Use when: Multiple services need request tracing
- ✅ Use when: SLA/SLO monitoring required
- ⏭️ Skip when: Pure UI/frontend (no backend)
- ⏭️ Skip when: Prototype/POC (not production-bound)
- ⏭️ Skip when: Observability already configured in earlier stage

**Common Observability Anti-Patterns to Avoid:**

❌ **BAD: String interpolation logging**
```csharp
logger.LogInformation($"User {userId} logged in at {DateTime.Now}");
```

✅ **GOOD: Structured logging**
```csharp
logger.LogInformation("User logged in", new { UserId = userId, Timestamp = DateTime.UtcNow });
```

❌ **BAD: Console.WriteLine in production**
```csharp
Console.WriteLine("Processing order " + orderId);
```

✅ **GOOD: Structured logger**
```csharp
_logger.LogInformation("Processing order {OrderId}", orderId);
```

❌ **BAD: Logging passwords/tokens**
```typescript
logger.info(`User authenticated with password: ${password}`);
```

✅ **GOOD: Redact sensitive data**
```typescript
logger.info('User authenticated', { userId, passwordHash: '***' });
```

**Observability Maturity Levels:**

- **Level 1** (Minimum): Structured JSON logs, correlation IDs, `/health` endpoint
- **Level 2** (Production-Ready): Above + Prometheus metrics, error tracking (Sentry), log aggregation (ELK/DataDog)
- **Level 3** (World-Class): Above + distributed tracing (OpenTelemetry), SLO dashboards, alerting rules, log retention policies

**Purpose**: Ensure production systems are debuggable, monitorable, and traceable. Observability is critical for incident response, performance tuning, and understanding user journeys across distributed systems.

---

### Gate 18: Code Complexity Analysis

**Applicability**: Recommended for all stages, especially those adding complex business logic or refactoring existing code

**Commands:**
- .NET: Use built-in code metrics (`dotnet-metrics`) or SonarQube/ReSharper
- TypeScript: Use ESLint complexity plugin (`eslint-plugin-complexity`) or SonarQube

**Expected**: Cyclomatic complexity ≤15, method length ≤50 lines, maintainability index ≥70

**What Code Complexity Analysis Measures:**
- **Cyclomatic Complexity**: Number of independent code paths (≤15 per method is maintainable)
- **Method/Function Length**: Lines of code per method (≤50 lines, ideally ≤20)
- **Cognitive Complexity**: How hard code is to understand (lower is better)
- **Nesting Depth**: Deeply nested conditionals (≤4 levels)
- **Class Coupling**: Dependencies between classes (low coupling preferred)
- **Maintainability Index**: Overall code maintainability score (0-100, ≥70 is good)

**Setup & Commands:**

**.NET Code Metrics:**
```bash
# Option 1: Built-in Visual Studio Code Metrics
# View > Other Windows > Code Metrics Results
# Analyze > Calculate Code Metrics

# Option 2: Command-line with dotnet-metrics (unofficial)
dotnet tool install --global dotnet-metrics
dotnet metrics --project src/YourProject/YourProject.csproj --output metrics.json

# Option 3: SonarQube (most comprehensive)
dotnet tool install --global dotnet-sonarscanner
dotnet sonarscanner begin /k:"project-key"
dotnet build
dotnet sonarscanner end

# Check metrics in metrics.json or SonarQube dashboard
```

**TypeScript/JavaScript Complexity:**
```bash
# Option 1: ESLint complexity plugin
npm install -D eslint-plugin-complexity

# Add to .eslintrc.js:
# module.exports = {
#   plugins: ['complexity'],
#   rules: {
#     'complexity': ['warn', { max: 15 }],
#     'max-lines-per-function': ['warn', { max: 50 }],
#     'max-depth': ['warn', { max: 4 }]
#   }
# };

npx eslint src/ --ext .ts,.tsx

# Option 2: TypeScript ESLint maintainability
npx eslint src/ --format json > complexity-report.json

# Option 3: SonarQube Scanner
npx sonar-scanner

# Option 4: Code Climate CLI (complexity analysis)
npm install -D @codeclimate/test-reporter
npx codeclimate analyze
```

**Complexity Thresholds & Interpretation:**

| Metric | Good | Acceptable | Needs Refactoring | Critical |
|--------|------|------------|-------------------|----------|
| Cyclomatic Complexity | ≤5 | 6-10 | 11-15 | >15 |
| Method Length (lines) | ≤20 | 21-50 | 51-100 | >100 |
| Nesting Depth | ≤2 | 3-4 | 5 | >5 |
| Maintainability Index | ≥80 | 70-79 | 60-69 | <60 |

**Verification Checklist:**

1. **Cyclomatic Complexity Check**
   ```bash
   # .NET: Check for methods with complexity >15
   # Look in Code Metrics results or SonarQube

   # TypeScript: Run ESLint with complexity rules
   npx eslint src/ --rule 'complexity: [error, {max: 15}]'
   # ✅ Expected: No errors (all methods ≤15 complexity)
   ```

2. **Method Length Check**
   ```bash
   # .NET: Check for methods >50 lines
   # Use ReSharper or manual review

   # TypeScript: ESLint max-lines-per-function
   npx eslint src/ --rule 'max-lines-per-function: [error, {max: 50}]'
   # ✅ Expected: No errors (all functions ≤50 lines)
   ```

3. **Nesting Depth Check**
   ```bash
   # TypeScript: ESLint max-depth
   npx eslint src/ --rule 'max-depth: [error, {max: 4}]'
   # ✅ Expected: No errors (nesting ≤4 levels)
   ```

**When to Use Gate 18:**
- ✅ Use when: Adding complex business logic or algorithms
- ✅ Use when: Refactoring legacy code
- ✅ Use when: Code review finds "this is hard to understand"
- ✅ Use when: Preparing for production (maintainability matters)
- ⏭️ Skip when: Pure configuration or data files
- ⏭️ Skip when: Generated code (auto-generated DTOs, migrations)
- ⏭️ Skip when: Simple CRUD with no business logic

**Common Complexity Issues & Refactoring:**

**❌ Issue 1: High Cyclomatic Complexity (>15)**
```typescript
// ❌ BAD: Complexity = 18 (too many if/else branches)
function processOrder(order: Order) {
  if (order.type === 'standard') {
    if (order.amount > 100) {
      if (order.customer.isPremium) {
        // ... 50 more lines of nested logic
      } else {
        // ...
      }
    } else {
      // ...
    }
  } else if (order.type === 'express') {
    // ...
  } else if (order.type === 'bulk') {
    // ...
  }
  // ... more branches
}

// ✅ GOOD: Extract strategies (Complexity = 3 per method)
function processOrder(order: Order) {
  const strategy = getProcessingStrategy(order.type);
  return strategy.process(order);
}

function processStandardOrder(order: Order) {
  if (order.amount > 100) {
    return processPremiumOrder(order);
  }
  return processRegularOrder(order);
}
```

**❌ Issue 2: Method Too Long (>50 lines)**
```csharp
// ❌ BAD: 120 lines in one method
public async Task<OrderResult> CreateOrder(CreateOrderRequest request)
{
    // Validate input (20 lines)
    if (request == null) throw new ArgumentNullException();
    if (string.IsNullOrEmpty(request.CustomerId)) throw new ValidationException();
    // ... 18 more validation lines

    // Check inventory (25 lines)
    var inventory = await _inventoryService.GetInventory(request.ProductId);
    if (inventory.Quantity < request.Quantity) {
        // ... complex inventory logic
    }

    // Calculate pricing (30 lines)
    var basePrice = inventory.UnitPrice * request.Quantity;
    var discount = CalculateDiscount(request);
    // ... complex pricing logic

    // Create order (25 lines)
    var order = new Order { /* ... */ };
    await _dbContext.Orders.AddAsync(order);
    // ... more order creation logic

    // Send notifications (20 lines)
    await _emailService.SendOrderConfirmation(order);
    await _smsService.SendOrderSMS(order);
    // ... more notification logic

    return new OrderResult { Success = true };
}

// ✅ GOOD: Extract to smaller methods (each <20 lines)
public async Task<OrderResult> CreateOrder(CreateOrderRequest request)
{
    ValidateRequest(request);
    await CheckInventoryAvailability(request);
    var pricing = CalculatePricing(request);
    var order = await CreateOrderEntity(request, pricing);
    await SendOrderNotifications(order);

    return new OrderResult { Success = true };
}
```

**❌ Issue 3: Deep Nesting (>4 levels)**
```typescript
// ❌ BAD: Nesting depth = 6
function validateUser(user) {
  if (user) {                           // Level 1
    if (user.isActive) {                // Level 2
      if (user.permissions) {           // Level 3
        if (user.permissions.canEdit) { // Level 4
          if (user.department === 'IT') { // Level 5
            if (user.certifications.length > 0) { // Level 6
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

// ✅ GOOD: Guard clauses (nesting depth = 1)
function validateUser(user) {
  if (!user) return false;
  if (!user.isActive) return false;
  if (!user.permissions?.canEdit) return false;
  if (user.department !== 'IT') return false;
  if (user.certifications.length === 0) return false;

  return true;
}
```

**Refactoring Strategies:**

1. **Extract Method** - Break large methods into smaller, focused ones
2. **Guard Clauses** - Return early to reduce nesting
3. **Strategy Pattern** - Replace complex conditionals with polymorphism
4. **Lookup Tables** - Replace long if/else chains with dictionaries
5. **LINQ/Functional** - Replace loops with declarative operations

**Automated Refactoring Tools:**
- **.NET**: ReSharper, Visual Studio refactoring tools
- **TypeScript**: WebStorm/IntelliJ refactoring, VS Code refactor actions
- **Both**: SonarQube Quick Fixes

**Purpose**: Maintain code that's easy to understand, test, and modify. Complex code = more bugs, slower onboarding, higher maintenance cost. Enforcing complexity limits keeps technical debt under control.

---

### Gate 19: Bundle Size & Asset Optimization (TypeScript/Frontend)

**Applicability**: MANDATORY for all TypeScript/React UI stages, recommended for any frontend deployments

**Commands:**
- TypeScript: Use `webpack-bundle-analyzer`, `source-map-explorer`, or built-in build stats
- Vite/Next.js: Built-in bundle analysis (`npm run build` shows sizes)

**Expected**: Total bundle size <500KB (gzipped), no single chunk >200KB, images optimized, lazy loading implemented

**What Bundle Size Analysis Measures:**
- **Total JavaScript bundle size**: All JS combined (target: <500KB gzipped)
- **Individual chunk sizes**: Code-split chunks (target: <200KB each)
- **CSS bundle size**: All stylesheets combined (target: <100KB)
- **Image sizes**: PNGs, JPGs, SVGs (target: <500KB each, <2MB total)
- **Vendor bundle size**: Third-party dependencies (target: <300KB)
- **Initial load time**: Time to First Contentful Paint (target: <1.5s)
- **Lazy loading coverage**: % of routes code-split (target: >80%)

**Setup & Commands:**

**Webpack Projects:**
```bash
# Install bundle analyzer
npm install -D webpack-bundle-analyzer

# Add to webpack.config.js:
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ]
};

# Build and analyze
npm run build
# Opens bundle-report.html showing size breakdown
```

**Vite Projects:**
```bash
# Install rollup visualizer
npm install -D rollup-plugin-visualizer

# Add to vite.config.ts:
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'bundle-stats.html'
    })
  ]
});

# Build and analyze
npm run build
# Opens bundle-stats.html
```

**Next.js Projects:**
```bash
# Install analyzer
npm install -D @next/bundle-analyzer

# Add to next.config.js:
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // your next config
});

# Build and analyze
ANALYZE=true npm run build
```

**Bundle Size Thresholds:**

| Asset Type | Good | Acceptable | Needs Optimization | Critical |
|------------|------|------------|-------------------|----------|
| Total JS (gzipped) | <250KB | 250-500KB | 500KB-1MB | >1MB |
| Single chunk | <100KB | 100-200KB | 200-300KB | >300KB |
| Total CSS | <50KB | 50-100KB | 100-150KB | >150KB |
| Images (each) | <100KB | 100-500KB | 500KB-1MB | >1MB |
| Vendor bundle | <150KB | 150-300KB | 300-500KB | >500KB |

**Verification Commands:**

```bash
# 1. Build and check output
npm run build

# Next.js shows sizes:
# ✅ Expected output:
# Route (app)                Size     First Load JS
# ┌ ○ /                      142 B          87.2 kB
# └ ○ /workflows             1.45 kB        88.5 kB
#
# First Load JS shared by all  87.1 kB  ← Should be <500KB
#   ├ chunks/framework.js      45.2 kB
#   ├ chunks/main.js           31.8 kB
#   └ chunks/webpack.js        10.1 kB

# Vite shows sizes:
# dist/index.html                   0.45 kB
# dist/assets/index-a3b2c1d4.css    12.34 kB │ gzip: 3.45 kB
# dist/assets/index-e5f6g7h8.js    245.67 kB │ gzip: 78.90 kB

# 2. Check for unoptimized images
find src/assets -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | xargs du -h | awk '$1 ~ /M$/ || $1 > 500'
# ✅ Expected: (empty - no images >500KB)

# 3. Check for large dependencies
npx webpack-bundle-analyzer dist/stats.json
# or
npx source-map-explorer dist/**/*.js

# 4. Lighthouse performance check
npx lighthouse http://localhost:3000 --only-categories=performance
# ✅ Expected: Performance score ≥90
```

**Optimization Strategies:**

**1. Code Splitting (Reduce Initial Load)**
```typescript
// ❌ BAD: Import everything upfront
import HeavyChart from './HeavyChart';
import HeavyEditor from './HeavyEditor';

function Dashboard() {
  return <div><HeavyChart /><HeavyEditor /></div>;
}

// ✅ GOOD: Lazy load heavy components
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./HeavyChart'));
const HeavyEditor = lazy(() => import('./HeavyEditor'));

function Dashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyChart />
      <HeavyEditor />
    </Suspense>
  );
}
```

**2. Tree Shaking (Remove Unused Code)**
```typescript
// ❌ BAD: Import entire library
import _ from 'lodash';
const result = _.debounce(fn, 300);

// ✅ GOOD: Import only what you need
import debounce from 'lodash/debounce';
const result = debounce(fn, 300);

// ✅ BETTER: Use modern alternatives
// lodash: 72KB → date-fns: 13KB
import { debounce } from './utils';  // Native implementation
```

**3. Image Optimization**
```bash
# Install image optimizer
npm install -D sharp imagemin imagemin-mozjpeg imagemin-pngquant

# Use Next.js Image component (auto-optimization)
import Image from 'next/image';

// ❌ BAD: Regular img tag
<img src="/hero.png" width={800} height={600} />

// ✅ GOOD: Next.js Image (lazy loads, optimizes, responsive)
<Image src="/hero.png" width={800} height={600} alt="Hero" />

# Convert to WebP (50% smaller than PNG/JPEG)
npx @squoosh/cli --webp auto src/assets/*.png
```

**4. Dependency Audit (Find Heavy Packages)**
```bash
# Find large dependencies
npx webpack-bundle-analyzer dist/stats.json

# Alternative: npm package cost
npx cost-of-modules

# Example output:
# moment.js        288 KB  ← Replace with date-fns (13KB)
# lodash           531 KB  ← Use lodash-es + tree shaking
# axios             14 KB  ← Good size
```

**When to Use Gate 19:**
- ✅ Use when: Building any frontend/UI stage
- ✅ Use when: Adding third-party libraries (check size impact)
- ✅ Use when: Deploying to production (performance matters)
- ✅ Use when: Users on mobile/slow connections
- ⏭️ Skip when: Pure backend/API (no frontend bundle)
- ⏭️ Skip when: Internal admin tool (performance less critical)

**Purpose**: Keep frontend applications fast and responsive. Large bundles = slow load times, poor mobile experience, higher bounce rates, worse SEO. Users abandon sites that take >3 seconds to load.

---

### Gate 20: Container Image Size (Docker/Kubernetes)

**Applicability**: Recommended for all Docker/Kubernetes deployments (typically Stage 11+)

**Commands:**
- Docker: `docker images` and `dive` image analyzer
- Kubernetes: Check image registry (ECR, GCR, Docker Hub)

**Expected**: Production images <500MB, Alpine-based <100MB, multi-stage builds used, no unnecessary layers

**What Container Image Size Analysis Measures:**
- **Total image size**: Compressed size in registry (target: <500MB)
- **Layer count**: Number of layers (target: <10)
- **Wasted space**: Files added then deleted (target: <10MB)
- **Base image efficiency**: Alpine vs Debian vs Ubuntu
- **Dependency bloat**: Unnecessary packages installed
- **Build cache efficiency**: Layer reuse percentage

**Setup & Commands:**

**Docker Image Analysis:**
```bash
# 1. Check current image size
docker images | grep workflow-api
# Example output:
# workflow-api   latest   abc123   2 minutes ago   1.2GB  ← TOO LARGE!

# 2. Analyze image layers with dive
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  wagoodman/dive:latest workflow-api:latest

# Shows:
# - Size of each layer
# - Wasted space (files added then deleted)
# - Efficiency score
# ✅ Target: Efficiency >95%, wasted space <10MB

# 3. Compare base images
docker images | grep node
# node:18              1.1GB  ← Large
# node:18-slim         240MB  ← Better
# node:18-alpine       180MB  ← Best
```

**Dockerfile Optimization:**

**❌ BAD: Inefficient Dockerfile (1.2GB)**
```dockerfile
FROM node:18

# Install everything (includes dev dependencies)
COPY package*.json ./
RUN npm install

# Copy all files (including node_modules, tests, docs)
COPY . .

# Build
RUN npm run build

# Run as root user
CMD ["npm", "start"]
```

**✅ GOOD: Optimized Multi-Stage Dockerfile (180MB)**
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy only dependency files first (better caching)
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:18-alpine

WORKDIR /app

# Copy only production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy only built artifacts (not source)
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**.NET Docker Optimization:**

**❌ BAD: Large .NET Image (850MB)**
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0

COPY . .
RUN dotnet publish -c Release -o /app

WORKDIR /app
ENTRYPOINT ["dotnet", "WorkflowApi.dll"]
```

**✅ GOOD: Optimized .NET Image (110MB)**
```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build

WORKDIR /src

# Copy only csproj first (better caching)
COPY src/WorkflowApi/*.csproj ./WorkflowApi/
RUN dotnet restore WorkflowApi/WorkflowApi.csproj

# Copy source and build
COPY src/WorkflowApi/ ./WorkflowApi/
RUN dotnet publish WorkflowApi/WorkflowApi.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    -p:PublishTrimmed=true \
    -p:TrimMode=link

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine

WORKDIR /app

# Copy only published artifacts
COPY --from=build /app/publish .

# Run as non-root
RUN addgroup -g 1001 -S dotnet && \
    adduser -S dotnet -u 1001
USER dotnet

EXPOSE 8080
ENTRYPOINT ["dotnet", "WorkflowApi.dll"]
```

**Image Size Thresholds:**

| Image Type | Good | Acceptable | Needs Optimization | Critical |
|------------|------|------------|-------------------|----------|
| .NET Alpine | <110MB | 110-200MB | 200-400MB | >400MB |
| .NET Debian | <200MB | 200-400MB | 400-600MB | >600MB |
| Node Alpine | <100MB | 100-200MB | 200-400MB | >400MB |
| Node Slim | <200MB | 200-350MB | 350-500MB | >500MB |
| Python Alpine | <80MB | 80-150MB | 150-300MB | >300MB |

**Verification Checklist:**

```bash
# 1. Build optimized image
docker build -t workflow-api:latest .

# 2. Check size
docker images workflow-api:latest
# ✅ Expected: <500MB (or <200MB for Alpine)

# 3. Run dive analysis
dive workflow-api:latest
# ✅ Expected: Efficiency >95%, wasted space <10MB

# 4. Check layer count
docker history workflow-api:latest | wc -l
# ✅ Expected: <10 layers

# 5. Scan for vulnerabilities
docker scan workflow-api:latest
# or with Trivy:
trivy image workflow-api:latest
# ✅ Expected: 0 HIGH/CRITICAL vulnerabilities

# 6. Test runtime
docker run -d -p 3000:3000 workflow-api:latest
curl http://localhost:3000/health
# ✅ Expected: Service starts and responds
```

**When to Use Gate 20:**
- ✅ Use when: Building Docker images for production
- ✅ Use when: Deploying to Kubernetes/cloud
- ✅ Use when: Registry storage costs matter
- ✅ Use when: Fast deployment times critical
- ⏭️ Skip when: No containerization used
- ⏭️ Skip when: Local dev only (not deploying images)

**Purpose**: Smaller images = faster deployments, lower storage costs, reduced attack surface, quicker rollbacks. In Kubernetes, 1GB image × 100 pods = 100GB network transfer on every deployment.

---

## 📊 Additional NFRs You Could Track

Beyond Gates 19-20, here are other Non-Functional Requirements worth considering:

### Performance NFRs

**Gate 21: API Response Time Thresholds**
- p50 latency <100ms, p95 <300ms, p99 <1000ms
- Tools: k6, Artillery, Apache Bench
- Verification: `k6 run --vus 10 --duration 30s load-test.js`

**Gate 22: Database Query Performance**
- No queries >100ms, indexes on foreign keys, explain plan analysis
- Tools: SQL Profiler, pgBadger, MySQL slow query log
- Verification: `EXPLAIN ANALYZE SELECT ...` shows index usage

**Gate 23: Page Load Performance (Core Web Vitals)**
- LCP <2.5s, FID <100ms, CLS <0.1
- Tools: Lighthouse, WebPageTest, Chrome DevTools
- Verification: `npx lighthouse http://localhost:3000 --preset=perf`

### Resource NFRs

**Gate 24: Memory Usage Limits**
- Heap usage <512MB, no memory leaks, GC pressure acceptable
- Tools: Node.js heap snapshots, .NET Memory Profiler
- Verification: `node --expose-gc --max-old-space-size=512 index.js`

**Gate 25: CPU Usage Limits**
- CPU usage <70% under load, no CPU-bound operations blocking event loop
- Tools: clinic.js, dotnet-counters
- Verification: Load test + monitor CPU with `top` or `htop`

### Scalability NFRs

**Gate 26: Concurrent User Load Testing**
- Support 1000 concurrent users, requests per second >500
- Tools: k6, Gatling, JMeter
- Verification: `k6 run --vus 1000 --duration 5m load-test.js`

**Gate 27: Database Connection Pool Limits**
- Max connections configured, connection leaks detected
- Tools: PgBouncer, connection pool monitoring
- Verification: Check pool exhaustion under load

### Reliability NFRs

**Gate 28: Error Rate Thresholds**
- Error rate <0.1% (99.9% success rate)
- Tools: Application monitoring (New Relic, DataDog)
- Verification: Monitor error rate during load tests

**Gate 29: Circuit Breaker & Retry Logic**
- Circuit breakers configured for external dependencies, exponential backoff
- Tools: Polly (.NET), resilience4j (Java), node-retry
- Verification: Simulate dependency failure, verify graceful degradation

### Security NFRs

**Gate 30: Dependency Age & License Compliance**
- No dependencies >2 years old, all licenses whitelisted
- Tools: `npm outdated`, license-checker, FOSSA
- Verification: `npx license-checker --onlyAllow "MIT;Apache-2.0;BSD-3-Clause"`

**Gate 31: SSL/TLS Certificate Validation**
- Certificates valid >30 days, TLS 1.2+ only, strong cipher suites
- Tools: testssl.sh, SSL Labs
- Verification: `testssl.sh https://api.example.com`

### Cost NFRs

**Gate 32: Cloud Resource Cost Limits**
- Daily cost <$X, auto-shutdown unused resources
- Tools: AWS Cost Explorer, Azure Cost Management
- Verification: Tag resources, set budget alerts

**Gate 33: Build Time Limits**
- CI build <5 minutes, caching effective
- Tools: GitLab CI analytics, GitHub Actions timing
- Verification: Monitor pipeline duration trends

---

## 🎯 Recommended NFR Priorities

**Tier 1 (Add Immediately):**
- ✅ Gate 19: Bundle Size (frontend performance)
- ✅ Gate 20: Container Image Size (deployment speed)
- ✅ Gate 21: API Response Time (user experience)
- ✅ Gate 23: Page Load Performance (SEO + UX)

**Tier 2 (Add for Production Systems):**
- Gate 24: Memory Usage Limits
- Gate 26: Concurrent User Load Testing
- Gate 28: Error Rate Thresholds
- Gate 30: Dependency Age & License Compliance

**Tier 3 (Add for Scale/Enterprise):**
- Gate 22: Database Query Performance
- Gate 27: Connection Pool Limits
- Gate 29: Circuit Breaker & Retry Logic
- Gate 31: SSL/TLS Certificate Validation

**Tier 4 (Optional/Advanced):**
- Gate 25: CPU Usage Limits
- Gate 32: Cloud Resource Cost Limits
- Gate 33: Build Time Limits

---

## Stage Completion Procedure (STRICT SEQUENTIAL ORDER)

**Follow these steps in EXACT order. Do not skip steps. If any step fails, fix the issue and restart from Step 1.**

### Step 1: Run ALL Quality Gates

- Execute each gate command (above) in order: Gate 1 → Gate 2 → Gate 3 → Gate 4 → Gate 5 → Gate 6 → Gate 7 (recommended)
- If ANY of Gates 1-6 fail:
  1. **STOP immediately**
  2. Fix the issue (see "Quality Gate Failure Procedures" below)
  3. **Restart from Gate 1** (dependency updates can break other gates)
- If Gate 7 (mutation testing) shows <80%:
  1. Document the score in proof file
  2. Consider adding tests for survived mutants
  3. Not blocking, but improvement recommended for critical code
- Document actual output from each gate in `STAGE_X_PROOF.md`

**Prerequisites to proceed:**

- [ ] All 6 mandatory gates (1-6) show ✅ PASS
- [ ] Gate 7 (mutation testing) run and score documented
- [ ] All gate outputs copied to proof file

---

### Step 2: Complete Documentation (Proof File + CHANGELOG.md)

**A. Fill out STAGE_X_PROOF.md with actual data:**
- [ ] Stage Summary table (e.g., `21/21 tests`, `91.8% coverage`, `0 vulnerabilities`)
- [ ] Test results, coverage report, build output, security scan output
- [ ] Deliverables checklist (all items `[x]`)
- [ ] **👔 Principal Engineer Review** (CRITICAL - see below)
- [ ] Commit hash placeholder (will be filled in Step 4)

**B. Complete the Principal Engineer Review Section:**

This section requires strategic thinking - do NOT skip it!

**What's Going Well (3-5 strengths):**
- Review test coverage quality, architecture decisions, error handling, performance, code quality
- Be specific with concrete examples (e.g., "TypeCompatibilityChecker uses recursive validation, handles nested objects correctly")

**Potential Risks & Concerns (2-4 risks):**
- Think: What could go wrong in production?
- Consider: Error recovery, performance at scale, security gaps, tech debt, missing features
- For each risk: Impact + Mitigation plan

**Pre-Next-Stage Considerations (3-5 items):**
- What does the next stage need from this stage?
- Are there assumptions that need documenting?
- What technical debt was introduced?
- Integration points, performance baselines, observability gaps

**Recommendation:**
- PROCEED: All gates passed, risks manageable
- PROCEED WITH CAUTION: Gates passed but significant risks/debt
- REVISIT BEFORE NEXT STAGE: Critical issues need addressing

💡 **Tip:** The proof generator script (`generate-proof.py`) creates intelligent prompts for this section based on stage number and tech stack. Use it as a starting point, then customize based on actual implementation.

**C. Update CHANGELOG.md:**
- [ ] Stage completion entry with date, test count, coverage %, deliverables count
- [ ] Overall progress percentage updated
- [ ] "Last Updated" date updated

**Verification:** `grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|XXX|N/N|X%)\]" STAGE_X_PROOF.md` must return empty

**Prerequisites to proceed:**
- [ ] Principal Engineer Review completed with thoughtful analysis
- [ ] Both proof file and CHANGELOG.md complete with actual metrics (no placeholders)

---

### Step 3: Create Stage Completion Commit

```bash
# Stage only source files and documentation (NOT bin/obj directories)
git add src/ tests/ *.md

# Verify what's staged
git diff --cached --stat

# Create commit with comprehensive message
git commit -m "$(cat <<'EOF'
✅ Stage X Complete: [Stage Name]

## Stage Summary
- Tests: [N passing / 0 failing]
- Coverage: [X.X%]
- Deliverables: [N/N completed]

## Success Criteria Met
✅ All tests passing | ✅ Coverage ≥90% | ✅ Build: 0 warnings | ✅ Security: 0 vulnerabilities

## Value Delivered
[1-2 sentence summary of what this enables]

See STAGE_X_PROOF.md for complete results.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Prerequisites to proceed:** Commit created successfully with actual metrics

---

### Step 4: Tag & Finalize

```bash
# Get commit hash and update proof file
COMMIT_HASH=$(git log -1 --format=%h)
# Edit STAGE_X_PROOF.md: Replace commit hash placeholder with $COMMIT_HASH

# Create annotated tag
git tag -a stage-X-complete -m "Stage X: [Name] - N tests, XX% coverage, 0 vulnerabilities"

# Verify
git log --oneline --decorate -5
```

**Expected:** Tag points to completion commit: `abc1234 (HEAD -> master, tag: stage-X-complete) ✅ Stage X Complete`

**Prerequisites to proceed:**
- [ ] Proof file contains actual commit hash
- [ ] Tag created and points to correct commit

---

### Step 5: Final Verification & Manual Reality Checks

> **Why this step matters**: Automated gates verify the code works, but manual verification ensures your proof file matches reality and the stage actually delivers the promised value. This is where you think like the developer who inherits this code 6 months from now.

#### A. Automated Verification (2 minutes)

```bash
# Verify no uncommitted changes
git status src/ tests/ *.md
# ✅ Expected: "nothing to commit, working tree clean"

# Quick quality gate sanity check (optional but recommended)
dotnet test && dotnet build --configuration Release  # .NET
npm test && npm run build                              # TypeScript
# ✅ Expected: All tests pass, build succeeds
```

#### B. Manual Smoke Testing (5-10 minutes)

**Purpose**: Verify that what you built actually works in practice, not just in tests.

**For Backend APIs:**
```bash
# Start the service locally
dotnet run --project src/YourProject  # .NET
npm run dev                             # TypeScript

# Test critical endpoints manually (use curl, Postman, or browser)
curl -X POST http://localhost:5000/api/workflows/test -H "Content-Type: application/json" -d '{"input":"test"}'
# ✅ Expected: Successful response with expected data

# Verify error handling works
curl -X POST http://localhost:5000/api/workflows/test -H "Content-Type: application/json" -d '{"invalid":"data"}'
# ✅ Expected: 400 Bad Request with helpful error message
```

**For UI Components:**
```bash
# Start the dev server
npm run dev

# Open browser to http://localhost:3000
# Manual checks:
# - Does the feature render correctly?
# - Can you interact with it (click buttons, submit forms)?
# - Do error states display properly?
# - Does it work on mobile viewport (resize browser)?
```

**For Libraries/Services:**
```bash
# Run a quick integration test manually
# Example: Create a simple script that uses your new feature
dotnet run --project examples/QuickTest.cs
node scripts/test-feature.js

# ✅ Expected: Feature works as documented in proof file
```

#### C. Reality Check: Proof Claims vs. Actual Behavior (5 minutes)

**Cross-reference your proof file claims with actual system behavior.**

**Checklist:**

1. **Test Count Verification**
   ```bash
   # Open proof file, note test count (e.g., "42/42 tests passing")
   grep "Tests:" STAGE_X_PROOF.md

   # Run tests and count actual output
   dotnet test | grep "Passed:"
   npm test | grep "Test Suites:"

   # ✅ Verify: Numbers match exactly
   ```

2. **Coverage Percentage Verification**
   ```bash
   # Open proof file, note coverage (e.g., "92.3%")
   grep "Coverage:" STAGE_X_PROOF.md

   # Check actual coverage report
   grep "Line coverage:" ./coverage/report/Summary.txt  # .NET
   cat coverage/coverage-summary.json | grep "lines"   # TypeScript

   # ✅ Verify: Percentages match (within 0.1%)
   ```

3. **Deliverables Completeness Check**
   ```bash
   # For each deliverable in proof file marked [x]:
   # - Can you find the actual file in src/ or tests/?
   # - Does the file contain the claimed functionality?
   # - Are there tests for this deliverable that pass?

   # Example: Proof says "[x] WorkflowOrchestrator service"
   # ✅ Check: ls src/Services/WorkflowOrchestrator.cs exists
   # ✅ Check: grep "class WorkflowOrchestrator" confirms it's there
   # ✅ Check: ls tests/.../WorkflowOrchestratorTests.cs has tests
   ```

4. **Feature Works as Described**
   ```bash
   # Open proof file "Value Delivered" section
   # Example: "Users can now execute workflows in parallel with 2x speedup"

   # ✅ Verify: Actually run a workflow in parallel and check logs
   # ✅ Verify: Timing shows it's faster than sequential (not just "feels faster")
   # ✅ Verify: Can demonstrate this to stakeholder if asked
   ```

5. **Error Messages Match Documentation**
   ```bash
   # If proof claims "helpful error messages with suggested fixes"

   # ✅ Test: Trigger an error condition
   # ✅ Verify: Error message is actually helpful (not just a stack trace)
   # ✅ Verify: Suggested fix is present and actionable

   # Example: Invalid workflow input should return:
   # "Error: Field 'userId' must be a string, got integer. Fix: Change userId to a string value."
   ```

#### D. Future Developer Perspective Check (3 minutes)

**Imagine you're a new developer who just joined the team. Read your proof file and ask:**

**Questions to ask yourself:**

1. **"Can I understand what was built from the proof file alone?"**
   - [ ] Yes - proof file has clear descriptions, not just file names
   - [ ] No - go back and add context to deliverables section

2. **"Can I reproduce these results with the commands in the proof file?"**
   - [ ] Yes - commands are copy-pasteable and work
   - [ ] No - fix commands or add missing setup steps

3. **"If I needed to modify this feature, where would I start?"**
   - [ ] Clear - proof file shows file structure and test coverage
   - [ ] Unclear - add file structure diagram or "Where to Find" section

4. **"Are there any surprises between proof claims and actual behavior?"**
   - [ ] No surprises - everything works as documented
   - [ ] Surprises found - update proof file or fix implementation

#### E. Common Reality Mismatches to Watch For

**🚨 Red flags that your proof doesn't match reality:**

1. **"21/21 tests passing" but `dotnet test` shows 20/20**
   - Forgot to commit a test file, or counted wrong
   - **Fix**: Re-run tests, update proof with actual count

2. **"Zero vulnerabilities" but `npm audit` shows 2 moderate**
   - Ran audit before recent dependency update
   - **Fix**: Re-run audit, update dependencies or document exceptions

3. **"Coverage 92%" but report shows 87%"**
   - Typo, or coverage dropped after last commit
   - **Fix**: Re-generate coverage report, update proof with actual number

4. **"Users can execute workflows" but manual test fails with 500 error**
   - Tests pass in isolation but integration is broken
   - **Fix**: Fix integration issue, re-run all gates, update proof

5. **"API endpoint returns user details" but response is empty**
   - Test mocks data, but real database is empty
   - **Fix**: Add database seed data or update test to use real data

**If you find ANY mismatch: Fix it, re-run gates, update proof file.**

#### F. Final Stage Completion Checklist

Before moving to next stage, verify ALL of these:

**Automated Checks:**
- [ ] All mandatory quality gates passed (Gates 1-6)
- [ ] Selected context-dependent gates passed (8, 9, 10, etc.)
- [ ] Documentation complete (proof file + CHANGELOG.md, no placeholders)
- [ ] Commit created with comprehensive message and actual metrics
- [ ] Proof file updated with actual commit hash (not `[TO BE FILLED]`)
- [ ] Tag created and points to completion commit
- [ ] No uncommitted changes in `git status src/ tests/ *.md`

**Manual Verification:**
- [ ] Smoke tested critical features - they work in practice, not just in tests
- [ ] Test count in proof matches `dotnet test` / `npm test` output
- [ ] Coverage percentage in proof matches coverage report (within 0.1%)
- [ ] All deliverables marked `[x]` actually exist and work
- [ ] "Value Delivered" claims are demonstrable (can show to stakeholder)
- [ ] Error messages match documentation (helpful, with suggested fixes)
- [ ] Proof file is understandable to future developer (context, not just file names)
- [ ] No reality mismatches found (proof claims = actual behavior)

**✅ STAGE IS COMPLETE** if ALL checkboxes checked (both automated and manual)

**⏭️ Ready to proceed to next stage**

---

## Quality Gate Failure Procedures

**If any quality gate fails, follow these procedures. Do NOT create commit or tag until the issue is resolved.**

### If Gate 1 Fails: Build Errors or Warnings

**Symptoms:**
- .NET: `Build FAILED. X Warning(s) Y Error(s)`
- TypeScript: `error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'`

**Resolution Steps:**

1. Review build output for specific errors/warnings
2. Fix ALL errors first (code won't compile)
3. Fix ALL warnings (zero tolerance)
4. Common causes:
   - **Unused variables**: Remove them or prefix with `_` (TypeScript) / remove (C#)
   - **Type errors** (TypeScript): Add proper type annotations, fix type mismatches
   - **Nullable reference warnings** (.NET): Add null checks or use `!` operator if certain
   - **Deprecated APIs**: Update to current APIs
   - **Missing dependencies**: `dotnet add package` (.NET) or `npm install` (TypeScript)
5. Re-run:
   - .NET: `dotnet build --configuration Release`
   - TypeScript: `npm run build && npm run type-check`
6. **Restart from Gate 1** (code changes can affect tests)

---

### If Gate 2 Fails: Test Failures

**Symptoms:**
- .NET: `Failed! - Failed: X, Passed: Y, Skipped: Z`
- TypeScript: `FAIL src/service.test.ts ✕ should handle error case (5 ms)`

**Resolution Steps:**

1. Review test output for specific failures and stack traces
2. For each failing test:
   - Read the failure message and stack trace
   - Determine if implementation is wrong or test is wrong
   - Fix the code (following TDD: make test green)
3. If tests are skipped:
   - .NET: Remove `Skip` attributes from `[Fact(Skip="reason")]`
   - TypeScript: Remove `.skip` from `test.skip()` or `it.skip()`
   - Or delete the test if it's no longer relevant
4. Re-run:
   - .NET: `dotnet test`
   - TypeScript: `npm test` or `npx vitest run`
5. **Restart from Gate 1** (code changes can introduce build warnings)

---

### If Gate 3 Fails: Coverage < 90%

**Symptoms:**
- .NET: `Line coverage: 85.2% (below 90% threshold)`
- TypeScript: `All files | 85.2 | 78.5 | 82.1 | 85.2 |`

**Resolution Steps:**

1. Open HTML coverage report:
   - .NET: `open ./coverage/report/index.html`
   - TypeScript: `open ./coverage/index.html` or `npx vitest ui`
2. Identify uncovered lines (highlighted in red)
3. For each uncovered section:
   - Write additional test cases
   - Ensure edge cases are covered
   - Test error paths, not just happy paths
4. Common uncovered areas:
   - Exception handling blocks (try/catch)
   - Validation logic
   - Edge cases (null, empty, boundary values)
   - Early returns and error conditions
5. Re-run and regenerate report:
   - .NET: `dotnet test --collect:"XPlat Code Coverage" && reportgenerator ...`
   - TypeScript: `npm run test:coverage`
6. **Restart from Gate 1** (new tests can fail or affect build)

---

### If Gate 4 Fails: Security Vulnerabilities

**Symptoms:**
- .NET: `[HIGH] System.Text.Json 8.0.0 CVE-2024-12345`
- TypeScript: `found 3 vulnerabilities (2 moderate, 1 high) in 1245 scanned packages`

**Resolution Steps:**

1. Note ALL vulnerabilities: package name, current version, CVE numbers, severity
2. Update vulnerable packages:
   - .NET:
     ```bash
     # Update to latest version
     dotnet add src/ProjectName package PackageName
     # If dependency conflict, update conflicting package first
     ```
   - TypeScript:
     ```bash
     # Automatic fix for most vulnerabilities
     npm audit fix
     # If breaking changes required
     npm audit fix --force  # Use with caution
     # Or manually update package.json and run npm install
     ```
3. Verify resolution:
   - .NET: `dotnet list package --vulnerable --include-transitive`
   - TypeScript: `npm audit` (should show 0 vulnerabilities)
4. Document ALL updates in `STAGE_X_PROOF.md` security section:
   - Package name
   - Version before → Version after
   - CVE numbers resolved
   - Severity level
5. **Restart from Gate 1** (dependency updates can break tests or introduce warnings)

---

### If Gate 5 Fails: Template Files Found

**Symptoms:**
- .NET: `./src/WorkflowCore/Class1.cs`, `./tests/WorkflowCore.Tests/UnitTest1.cs`
- TypeScript: `./src/App.test.tsx`, `./src/setupTests.ts` (from create-react-app)

**Resolution Steps:**

1. Remove ALL template files:
   - .NET:
     ```bash
     rm -f src/*/Class1.cs tests/*/UnitTest1.cs src/*/WeatherForecast.cs
     ```
   - TypeScript:
     ```bash
     rm -f src/App.test.tsx src/setupTests.ts src/logo.svg
     # Or framework-specific: rm -f src/app/page.tsx (Next.js default)
     ```
2. If any "tests" were in template files:
   - Update test count in success criteria
   - Update proof file with correct test count
3. Verify removal:
   ```bash
   # .NET
   find . -name "Class1.cs" -o -name "UnitTest1.cs"
   # TypeScript
   find . -name "App.test.tsx"
   # Should return empty
   ```
4. **Restart from Gate 1** (removing files changes test count)

---

### If Gate 6 Fails: Proof File Contains Placeholders

**Symptoms:**

```
STAGE_1_PROOF.md:15:| Tests | [N/N] | ...
STAGE_1_PROOF.md:42:Coverage: [XX%]
STAGE_1_PROOF.md:58:[TO BE VERIFIED]
```

**Resolution Steps:**

1. For each placeholder found:
   - Run the corresponding command
   - Copy actual output
   - Replace placeholder with actual data
2. Common placeholders to replace:
   - `[N/N]` → actual test count (e.g., `21/21`)
   - `[XX%]` → actual coverage (e.g., `91.8%`)
   - `[TO BE VERIFIED]` → paste actual command output
   - `[STATUS]` → `✅ PASS` or actual status
   - `[TBD]` → actual data
3. Re-run verification:
   ```bash
   grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_*_PROOF.md
   # Should return empty
   ```
4. No need to restart gates (documentation only)

---

## Proof File Completion Standards

**A stage proof file is NOT complete until it meets ALL these standards.**

### Definition of "Complete"

A proof file is complete when:

1. ✅ Every section has actual data (no placeholders)
2. ✅ All metrics match actual command outputs
3. ✅ All checkboxes are checked `[x]` (no `[ ]` for deliverables)
4. ✅ Verification command returns empty (no placeholders detected)

### Required Sections

Every `STAGE_X_PROOF.md` must contain:

**1. Stage Summary Table**

```markdown
| Metric         | Target | Actual | Status  |
| -------------- | ------ | ------ | ------- | ------------------- |
| Tests Passing  | 100%   | 21/21  | ✅ PASS | ← actual numbers    |
| Coverage       | ≥90%   | 91.8%  | ✅ PASS | ← actual percentage |
| Build Warnings | 0      | 0      | ✅ PASS | ← actual count      |
```

❌ Bad: `| Tests | [N/N] | [STATUS] |`
✅ Good: `| Tests Passing | 100% | 21/21 | ✅ PASS |`

---

**2. Test Results with Actual Output**

```markdown
## Test Results

Paste actual output from `dotnet test`:
```

Test run for /path/to/WorkflowCore.Tests.dll
Passed! - Failed: 0, Passed: 21, Skipped: 0, Total: 21

```

```

❌ Bad: `[TO BE VERIFIED]`
✅ Good: Paste the actual command output

---

**3. Coverage Report with Actual Percentage**

```markdown
## Code Coverage

Line coverage: 91.8% ← from Summary.txt
Covered lines: 147
Uncovered lines: 13
```

❌ Bad: `Coverage: [XX%]`
✅ Good: `Coverage: 91.8%` (exact number from report)

---

**4. Build Output**

```markdown
## Build Quality

dotnet build --configuration Release
Build succeeded.
0 Warning(s) ← actual count
0 Error(s) ← actual count
```

❌ Bad: `Build: [STATUS]`
✅ Good: Paste actual build output showing 0 warnings

---

**5. Security Status**

```markdown
## Security

✅ All NuGet vulnerabilities resolved
✅ System.Text.Json updated to 10.0.0 (from 8.0.0 - HIGH severity CVEs)
✅ Verified: 2025-11-21 ← actual date

Command: dotnet list package --vulnerable --include-transitive
Result: The given project has no vulnerable packages
```

❌ Bad: `Security: [TO BE CHECKED]`
✅ Good: Document actual packages updated and verification date

---

**6. Deliverables Checklist (All Checked)**

```markdown
## Deliverables

- [x] Solution file created ← all must be [x]
- [x] WorkflowCore project created
- [x] All tests implemented
```

❌ Bad: `- [ ] Feature coming soon`
✅ Good: All items checked `[x]` before stage complete

---

### Validation Commands

**Before considering stage complete, run these:**

```bash
# 1. Check for any placeholder patterns
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX)\]" STAGE_*_PROOF.md

# 2. Check for template metric placeholders
grep -E "\[N/N\]|\[X%\]|\[XX%\]|\[N\]" STAGE_*_PROOF.md

# 3. Check for unchecked deliverables
grep "^- \[ \]" STAGE_*_PROOF.md

# All three commands should return EMPTY
```

---

### Common Mistakes to Avoid

1. ❌ **Creating proof file with placeholders, planning to "fill later"**

   - ✅ Run commands FIRST, then fill proof file with results

2. ❌ **Copying test count from code without running tests**

   - ✅ Run `dotnet test`, paste actual output

3. ❌ **Estimating coverage percentage**

   - ✅ Generate report, use exact number from `Summary.txt`

4. ❌ **Assuming no vulnerabilities without scanning**

   - ✅ Run `dotnet list package --vulnerable`, document results

5. ❌ **Using previous stage's proof as template without updating**

   - ✅ Use `STAGE_PROOF_TEMPLATE.md`, fill with current stage's data

6. ❌ **Marking deliverables complete before they're implemented**

   - ✅ Check `[x]` only when feature is coded, tested, and verified

7. ❌ **Leaving commit hash as `[TO BE FILLED]` after committing**
   - ✅ Update with actual commit hash from `git log`

---

### Correct Procedure for Proof Files

**Step-by-step:**

1. **Copy template:**

   ```bash
   cp STAGE_PROOF_TEMPLATE.md STAGE_X_PROOF.md
   ```

2. **Run quality gates** (all 6 gates)

3. **Fill proof file with actual results:**

   - Paste `dotnet test` output → Test Results section
   - Paste coverage percentage from `Summary.txt` → Coverage section
   - Paste `dotnet build` output → Build Quality section
   - Document package updates → Security section
   - Check deliverables one-by-one → Deliverables section

4. **Verify no placeholders:**

   ```bash
   grep -i -E "\[(TO BE|TBD|TODO)\]" STAGE_X_PROOF.md
   # Should return empty
   ```

5. **Only then create commit** (Step 4 of Stage Completion Procedure)

---

**Reference Example:** See `STAGE_1_PROOF.md` for a complete, properly-filled proof file.

---

## Stage Completion Commit Message Format

```
✅ Stage X Complete: [Stage Name]

## Stage Summary
- Duration: [actual time]
- Tests: [N passing / 0 failing]
- Coverage: [X.X%]
- Deliverables: [N/N completed]

## What Was Built
1. [Deliverable 1]
2. [Deliverable 2]
...

## Success Criteria Met
✅ All tests passing: [N tests, 0 failures]
✅ Code coverage: [X.X%] (target: ≥90%)
✅ Build: 0 warnings
✅ All deliverables: [N/N] complete

## Value Delivered
[1-2 sentence summary of what this enables]

## Proof
See STAGE_X_PROOF.md for complete results.

## Ready for Next Stage
All quality gates passed. CHANGELOG.md updated.

---
🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Stage 1: Foundation (Week 1, Days 1-2)

### 📋 STAGE DECLARATION

**Stage:** 1 - Foundation
**Duration:** 2 days
**Dependencies:** None (starting from scratch)

### 🎯 OBJECTIVES

#### What We Will Build:

1. **Project Structure**

   - .NET 8 solution with WorkflowCore library
   - Test project with xUnit, Moq, FluentAssertions
   - All NuGet dependencies configured

2. **Schema Models** (Task 1.2)

   - `SchemaDefinition` - JSON Schema representation
   - `PropertyDefinition` - Schema property with nested support
   - Full serialization/deserialization support

3. **CRD Models** (Task 1.3)

   - `WorkflowTaskResource` - Kubernetes CRD for tasks
   - `WorkflowTaskSpec` - Task specification with schemas
   - `HttpRequestDefinition` - HTTP task configuration

4. **Schema Parser** (Task 1.4)

   - `ISchemaParser` interface
   - `SchemaParser` implementation using JsonSchema.Net
   - Convert SchemaDefinition to JsonSchema objects

5. **Type Compatibility Checker** (Task 1.5)

   - `ITypeCompatibilityChecker` interface
   - `TypeCompatibilityChecker` with recursive validation
   - `CompatibilityResult` with detailed error reporting

6. **Workflow Models** (Task 1.6)

   - `WorkflowResource` - Kubernetes CRD for workflows
   - `WorkflowSpec` - Workflow definition with tasks
   - `WorkflowTaskStep` - Individual task in workflow

7. **Error Message Standards** (Task 1.7)
   - `ErrorMessageBuilder` static class
   - Standardized error methods with suggested fixes
   - Consistent error formatting

#### Why It Matters (Value to Project):

**1. Type Safety Foundation**

- Prevents runtime errors by catching type mismatches at design time
- Reduces debugging time and production incidents
- **Value**: Users can't deploy workflows with incompatible task chains

**2. Schema Validation Core**

- Ensures data integrity throughout the workflow
- Validates inputs before execution
- **Value**: Garbage in = rejected at the door, not propagated

**3. Developer Experience**

- Clear, consistent error messages guide users to solutions
- Suggested fixes reduce friction
- **Value**: Developers succeed faster, less support burden

**4. Kubernetes-Native Design**

- CRDs allow declarative workflow definition
- Fits naturally into K8s ecosystem
- **Value**: Familiar patterns for K8s users, GitOps-ready

**5. Testability from Day One**

- Every component has interfaces
- TDD ensures quality
- **Value**: Confidence in changes, safe refactoring, regression protection

#### How It Fits Into Larger System:

```
┌─────────────────────────────────────────────────────┐
│ Stage 1: FOUNDATION (What we're building now)       │
│                                                      │
│  ┌──────────────┐      ┌─────────────────┐         │
│  │ Schema Models│──────│Type Compatibility│         │
│  │ + Parser     │      │Checker           │         │
│  └──────┬───────┘      └────────┬─────────┘         │
│         │                       │                   │
│         └───────────┬───────────┘                   │
│                     │                               │
│              ┌──────▼──────┐                        │
│              │ CRD Models  │                        │
│              │ (Task + WF) │                        │
│              └─────────────┘                        │
└─────────────────────────────────────────────────────┘
                      │
                      │ Used by ↓
                      │
┌─────────────────────▼─────────────────────────────┐
│ Stage 2: Schema Validator                         │
│ (validates data against schemas)                  │
└───────────────────────────────────────────────────┘
                      │
                      │ Used by ↓
                      │
┌─────────────────────▼─────────────────────────────┐
│ Stage 3: Template Parser + Workflow Validator     │
│ (parses {{templates}}, validates workflows)       │
└───────────────────────────────────────────────────┘
                      │
                      │ Used by ↓
                      │
┌─────────────────────▼─────────────────────────────┐
│ Stage 4: Execution Graph Builder                  │
│ (builds dependency graph, detects cycles)         │
└───────────────────────────────────────────────────┘
                      │
                      │ Used by ↓
                      │
┌─────────────────────▼─────────────────────────────┐
│ Later Stages: Operator, Gateway, Executor, UI     │
└───────────────────────────────────────────────────┘
```

**Foundation Impact**: Everything else builds on these models and validators. If Stage 1 is solid, the entire system is solid.

### ✅ SUCCESS CRITERIA

#### Must Achieve:

1. **All Tests Passing**

   - SchemaDefinitionTests: 3 tests passing
   - WorkflowTaskResourceTests: 1 test passing
   - SchemaParserTests: 2 tests passing
   - TypeCompatibilityCheckerTests: 4 tests passing
   - WorkflowResourceTests: 1 test passing
   - ErrorMessageBuilderTests: 3 tests passing
   - **Total: 14 tests, 0 failures**

2. **Code Coverage**

   - Line coverage ≥ 90%
   - Branch coverage ≥ 85%
   - Coverage report generated

3. **Build Quality**

   - `dotnet build` succeeds with 0 warnings
   - All dependencies resolved
   - Solution structure matches specification

4. **Functionality**
   - SchemaDefinition serializes/deserializes correctly
   - Type checker detects mismatches (string vs integer)
   - Type checker validates nested objects recursively
   - Type checker validates array item types
   - Error messages include suggested fixes
   - CRDs can be deserialized from YAML

#### Deliverables Checklist:

- [ ] Solution file created: `WorkflowOperator.sln`
- [ ] WorkflowCore project created with all dependencies
- [ ] WorkflowCore.Tests project created with test dependencies
- [ ] `SchemaDefinition.cs` implemented
- [ ] `PropertyDefinition.cs` implemented
- [ ] `WorkflowTaskResource.cs` implemented
- [ ] `HttpRequestDefinition.cs` implemented
- [ ] `SchemaParser.cs` implemented with interface
- [ ] `SchemaParseException.cs` implemented
- [ ] `TypeCompatibilityChecker.cs` implemented with interface
- [ ] `CompatibilityResult.cs` implemented
- [ ] `WorkflowResource.cs` implemented
- [ ] `WorkflowSpec.cs` implemented
- [ ] `WorkflowTaskStep.cs` implemented
- [ ] `ErrorMessageBuilder.cs` implemented
- [ ] All 14 tests written and passing
- [ ] Coverage report showing ≥90%

### 📊 PROOF OF ACHIEVEMENT (To be completed after execution)

#### Test Results:

```
[To be filled with actual test output]
dotnet test --logger "console;verbosity=detailed"
```

#### Coverage Report:

```
[To be filled with coverage report]
dotnet test --collect:"XPlat Code Coverage"
reportgenerator -reports:coverage/**/coverage.cobertura.xml -targetdir:coverage/report
```

#### Build Output:

```
[To be filled with build output]
dotnet build --configuration Release
```

#### File Structure Verification:

```
[To be filled with directory tree]
tree src/ tests/
```

#### Demonstration:

```
[To be filled with code examples showing:]
1. Schema serialization working
2. Type compatibility checking working
3. Error messages with suggestions
4. YAML deserialization working
```

---

## Ready to Execute?

When you're ready, I will:

1. ✅ Execute Stage 1 following strict TDD
2. ✅ Track progress with todo list
3. ✅ Run all tests after each implementation
4. ✅ Generate proof of achievement at the end
5. ✅ Verify all success criteria are met
6. ✅ Provide comprehensive stage sign-off

**Shall we begin Stage 1: Foundation?**

---

## 📦 APPENDIX: .NET Backend Stage Completion Template

> **Copy-Paste Workflow**: Use this template for any .NET backend stage (API endpoints, services, business logic). Adapt gate selection based on stage content using the Quick Reference Card above.

### Pre-Stage Checklist (5 minutes)

```bash
# Verify .NET SDK
dotnet --version  # Should show 8.0.x or later

# Install coverage tools if not already installed
dotnet tool install --global dotnet-reportgenerator-globaltool

# Install mutation testing (if using Gate 7)
dotnet tool install --global dotnet-stryker

# Verify all tools work
dotnet build --help && dotnet test --help && reportgenerator --help
```

### BEFORE Phase: Gate Selection (2 minutes)

**Use the Quick Start table above to select gates. For typical .NET backend stage:**

- ✅ Gates 1-8 (mandatory + linting)
- ✅ Gate 10 (if creating API endpoints or integrations)
- ✅ Gate 12 (if modifying public API contracts)
- ✅ Gate 7 (mutation testing - recommended but not blocking)

### DURING Phase: TDD Workflow

```bash
# 1. Write failing test (RED)
touch tests/YourProject.Tests/Services/NewFeatureTests.cs
# Write test that fails
dotnet test
# Verify test FAILS

# 2. Write minimum code to pass (GREEN)
touch src/YourProject/Services/NewFeature.cs
# Implement minimal solution
dotnet test
# Verify test PASSES

# 3. Refactor while keeping tests green
# Improve code quality
dotnet test
# Verify tests still PASS

# 4. Repeat for next feature
```

### AFTER Phase: Stage Completion (30-40 minutes)

#### Step 1: Run All Quality Gates (15-20 minutes)

```bash
# Gate 1: Clean Build
dotnet clean && dotnet build --configuration Release
# ✅ Verify: "Build succeeded. 0 Warning(s) 0 Error(s)"

# Gate 2: All Tests Passing
dotnet test --configuration Release
# ✅ Verify: "Passed! - Failed: 0, Passed: N, Skipped: 0"

# Gate 3: Code Coverage ≥90%
dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage
reportgenerator -reports:./coverage/**/coverage.cobertura.xml -targetdir:./coverage/report -reporttypes:"Html;TextSummary"
grep "Line coverage:" ./coverage/report/Summary.txt
# ✅ Verify: "Line coverage: XX.X%" where XX.X ≥ 90

# Gate 4: Zero Security Vulnerabilities
dotnet list package --vulnerable --include-transitive
# ✅ Verify: "The given project has no vulnerable packages"

# Gate 5: No Template Files
find . -name "Class1.cs" -o -name "UnitTest1.cs" -o -name "WeatherForecast.cs"
# ✅ Verify: (empty output)

# Gate 6: Proof File Completeness (run after creating proof file)
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_*_PROOF.md
# ✅ Verify: (empty output)

# Gate 7: Mutation Testing (Recommended, ~10-15 minutes)
dotnet stryker --config-file stryker-config.json
# 📊 Document score in proof file (≥80% is good, ≥90% is excellent)

# Gate 8: Linting & Code Style
dotnet format --verify-no-changes
# ✅ Verify: (no output, exit code 0)

# Gate 10: Integration Tests (if applicable)
dotnet test --filter Category=Integration
# ✅ Verify: All integration tests pass

# Gate 12: API Contract Validation (if applicable)
dotnet swagger tofile --output swagger.json bin/Release/net8.0/YourApi.dll v1
# ✅ Verify: OpenAPI spec generated, no breaking changes
```

**⚠️ CRITICAL**: If ANY gate 1-6 fails, fix the issue and restart from Gate 1. Dependencies can break downstream gates.

#### Step 2: Create Proof File (10 minutes)

```bash
# Copy template
cp STAGE_PROOF_TEMPLATE.md STAGE_X_PROOF.md

# Fill with actual data (copy-paste command outputs from Step 1)
# ✅ Replace [N/N] with actual test count (e.g., "42/42")
# ✅ Replace [XX%] with actual coverage (e.g., "92.3%")
# ✅ Replace [TO BE VERIFIED] with actual command outputs
# ✅ Check all deliverables [x]

# Verify no placeholders remain
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_X_PROOF.md
# Must return empty

# Update CHANGELOG.md
# Add entry with actual metrics: test count, coverage %, deliverables
```

#### Step 3: Create Stage Completion Commit (2 minutes)

```bash
# Stage only source files and documentation (NOT bin/obj)
git add src/ tests/ *.md

# Verify what's staged
git diff --cached --stat

# Create commit with actual metrics
git commit -m "$(cat <<'EOF'
✅ Stage X Complete: [Stage Name]

## Stage Summary
- Tests: [N passing / 0 failing]
- Coverage: [X.X%]
- Deliverables: [N/N completed]

## Success Criteria Met
✅ All tests passing | ✅ Coverage ≥90% | ✅ Build: 0 warnings | ✅ Security: 0 vulnerabilities

## Value Delivered
[1-2 sentence summary of what this enables]

See STAGE_X_PROOF.md for complete results.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

#### Step 4: Tag & Finalize (2 minutes)

```bash
# Get commit hash
COMMIT_HASH=$(git log -1 --format=%h)
echo "Commit hash: $COMMIT_HASH"

# Update proof file with commit hash
# Edit STAGE_X_PROOF.md: Replace "[commit hash]" with $COMMIT_HASH

# Create annotated tag
git tag -a stage-X-complete -m "Stage X: [Name] - N tests, XX% coverage, 0 vulnerabilities"

# Verify tag points to completion commit
git log --oneline --decorate -5
# Should show: abc1234 (HEAD -> master, tag: stage-X-complete) ✅ Stage X Complete
```

#### Step 5: Final Verification (2 minutes)

```bash
# Verify no uncommitted changes
git status src/ tests/ *.md
# ✅ Expected: "nothing to commit, working tree clean"

# Quick sanity check (optional but recommended)
dotnet test && dotnet build --configuration Release
# ✅ Expected: All tests pass, build succeeds

# Verify proof file has commit hash (not placeholder)
grep "Commit:" STAGE_X_PROOF.md
# ✅ Should show actual hash, not "[TO BE FILLED]"
```

### ✅ Stage Complete Checklist

Before moving to next stage, verify:

- [ ] All mandatory gates passed (Gates 1-6)
- [ ] Selected context-dependent gates passed (8, 10, 12, etc.)
- [ ] Proof file complete (no placeholders, actual metrics)
- [ ] CHANGELOG.md updated with this stage
- [ ] Commit created with comprehensive message
- [ ] Proof file updated with actual commit hash
- [ ] Tag created and points to completion commit
- [ ] No uncommitted changes in src/, tests/, *.md

**If all boxes checked: ✅ STAGE IS COMPLETE. Proceed to next stage.**

### 🎯 Time Estimates

- **Pre-Stage Tool Verification**: 5 minutes
- **DURING (TDD implementation)**: Varies by stage (hours to days)
- **AFTER (Quality gates + documentation + commit)**: 30-40 minutes
  - Gates 1-8: 15-20 minutes
  - Proof file creation: 10 minutes
  - Commit + tag: 4 minutes
  - Final verification: 2 minutes

**Pro tip**: Save gate outputs to files during Step 1 for easy copy-paste into proof file:

```bash
# Save all gate outputs
dotnet test > gate2-tests.txt
grep "Line coverage:" ./coverage/report/Summary.txt > gate3-coverage.txt
dotnet build --configuration Release > gate1-build.txt
# Then copy-paste from files into STAGE_X_PROOF.md
```

---

**End of .NET Backend Template**

---

## 📦 APPENDIX: TypeScript UI Stage Completion Template

> **Copy-Paste Workflow**: Use this template for any TypeScript/React UI stage (components, pages, features). Adapt gate selection based on stage content using the Quick Reference Card above.

### Pre-Stage Checklist (5 minutes)

```bash
# Verify Node.js version
node --version  # Should show v18.x or later
npm --version

# Install dependencies if not already installed
npm install

# Verify test runner works
npm test -- --version  # or: npx vitest --version

# Verify build works
npm run build

# Verify linting tools (if using Gate 8)
npx oxlint --version  # Optional but recommended (50-100x faster than ESLint)
npx eslint --version

# Verify TypeScript compiler (MANDATORY for TypeScript)
npx tsc --version

# Verify mutation testing (if using Gate 7)
npx stryker --version

# Verify E2E testing (if using Gate 15)
npx playwright --version
```

### BEFORE Phase: Gate Selection (2 minutes)

**Use the Quick Start table above to select gates. For typical TypeScript UI stage:**

- ✅ Gates 1-6 (mandatory)
- ✅ Gate 8 (linting - oxlint + ESLint)
- ✅ Gate 9 (type-check - MANDATORY for TypeScript)
- ✅ Gate 13 (documentation - JSDoc for components)
- ✅ Gate 14 (accessibility - WCAG 2.1 AA compliance)
- ✅ Gate 7 (mutation testing - recommended but not blocking)
- ✅ Gate 15 (E2E - if building complete user flows)

### DURING Phase: TDD Workflow

```bash
# 1. Write failing test (RED)
touch src/components/NewFeature.test.tsx
# Write test that fails
npm test
# Verify test FAILS

# 2. Write minimum code to pass (GREEN)
touch src/components/NewFeature.tsx
# Implement minimal solution
npm test
# Verify test PASSES

# 3. Refactor while keeping tests green
# Improve code quality (extract hooks, improve props, etc.)
npm test
# Verify tests still PASS

# 4. Repeat for next feature
```

### AFTER Phase: Stage Completion (30-40 minutes)

#### Step 1: Run All Quality Gates (15-20 minutes)

```bash
# Gate 1: Clean Build
npm run clean && npm run build && npm run type-check
# ✅ Verify: "✓ Built" with no errors, type-check passes

# Gate 2: All Tests Passing
npm test
# ✅ Verify: "Tests passed" or "Test Suites: X passed, X total"

# Gate 3: Code Coverage ≥90%
npm run test:coverage
# ✅ Verify: "All files | 90+ |" in coverage output
# Open coverage/index.html to see detailed report

# Gate 4: Zero Vulnerabilities
npm audit --audit-level=moderate
# ✅ Verify: "found 0 vulnerabilities" or "0 moderate"

# Gate 5: No Template Files
find . -name "App.test.tsx" -o -name "setupTests.ts" -o -name "logo.svg"
# ✅ Verify: (empty output)

# Gate 6: Proof File Completeness (run after creating proof file)
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_*_PROOF.md
# ✅ Verify: (empty output)

# Gate 7: Mutation Testing (Recommended, ~10-15 minutes)
npx stryker run
# 📊 Document score in proof file (≥80% is good, ≥90% is excellent)

# Gate 8: Linting & Code Style
npx oxlint src/ && npm run lint
# ✅ Verify: "✓ No linting errors or warnings"
# oxlint first (fast), then ESLint (comprehensive)

# Gate 9: Type Safety Validation (MANDATORY for TypeScript)
npm run type-check
# or: npx tsc --noEmit
# ✅ Verify: (no output, exit code 0)
# CRITICAL: Type errors = runtime crashes

# Gate 13: Documentation Completeness
# Manual checklist:
# - [ ] README.md updated with new components/features
# - [ ] JSDoc comments on all exported components/functions
# - [ ] Storybook stories created (if using Storybook)
# - [ ] Props documented with TypeScript types
# - [ ] CHANGELOG.md entry created

# Gate 14: Accessibility Testing
# Automated:
npx @axe-core/cli http://localhost:3000
npx lighthouse http://localhost:3000 --only-categories=accessibility
# ✅ Verify: Lighthouse score ≥90, axe violations = 0

# Manual checklist:
# - [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
# - [ ] Focus indicators visible on all interactive elements
# - [ ] Screen reader announces content correctly (NVDA/VoiceOver)
# - [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
# - [ ] Images have alt text
# - [ ] Forms have labels and error messages
# - [ ] No keyboard traps
# - [ ] Semantic HTML (headings hierarchy, landmarks)

# Gate 15: E2E Testing (if applicable)
npx playwright test
# ✅ Verify: All E2E tests pass (critical user flows verified)
```

**⚠️ CRITICAL**: If ANY gate 1-6 fails, fix the issue and restart from Gate 1. Dependencies can break downstream gates.

#### Step 2: Create Proof File (10 minutes)

```bash
# Copy template
cp STAGE_PROOF_TEMPLATE.md STAGE_X_PROOF.md

# Fill with actual data (copy-paste command outputs from Step 1)
# ✅ Replace [N/N] with actual test count (e.g., "42 passed, 42 total")
# ✅ Replace [XX%] with actual coverage (e.g., "92.3%")
# ✅ Replace [TO BE VERIFIED] with actual command outputs
# ✅ Check all deliverables [x]

# Verify no placeholders remain
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_X_PROOF.md
# Must return empty

# Update CHANGELOG.md
# Add entry with actual metrics: test count, coverage %, deliverables
```

#### Step 3: Create Stage Completion Commit (2 minutes)

```bash
# Stage only source files and documentation (NOT node_modules, dist)
git add src/ *.md package.json package-lock.json

# Verify what's staged
git diff --cached --stat

# Create commit with actual metrics
git commit -m "$(cat <<'EOF'
✅ Stage X Complete: [Stage Name]

## Stage Summary
- Tests: [N passing / 0 failing]
- Coverage: [X.X%]
- Deliverables: [N/N completed]

## Success Criteria Met
✅ All tests passing | ✅ Coverage ≥90% | ✅ Build: 0 errors | ✅ Security: 0 vulnerabilities | ✅ Type-check: passed

## Value Delivered
[1-2 sentence summary of what this enables]

See STAGE_X_PROOF.md for complete results.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

#### Step 4: Tag & Finalize (2 minutes)

```bash
# Get commit hash
COMMIT_HASH=$(git log -1 --format=%h)
echo "Commit hash: $COMMIT_HASH"

# Update proof file with commit hash
# Edit STAGE_X_PROOF.md: Replace "[commit hash]" with $COMMIT_HASH

# Create annotated tag
git tag -a stage-X-complete -m "Stage X: [Name] - N tests, XX% coverage, 0 vulnerabilities"

# Verify tag points to completion commit
git log --oneline --decorate -5
# Should show: abc1234 (HEAD -> master, tag: stage-X-complete) ✅ Stage X Complete
```

#### Step 5: Final Verification (2 minutes)

```bash
# Verify no uncommitted changes
git status src/ *.md
# ✅ Expected: "nothing to commit, working tree clean"

# Quick sanity check (optional but recommended)
npm test && npm run build && npm run type-check
# ✅ Expected: All tests pass, build succeeds, type-check passes

# Verify proof file has commit hash (not placeholder)
grep "Commit:" STAGE_X_PROOF.md
# ✅ Should show actual hash, not "[TO BE FILLED]"

# MANUAL VERIFICATION (TypeScript UI specific):
# Start dev server and test in browser
npm run dev
# Open http://localhost:3000
# - Does the UI render correctly?
# - Can you interact with new components?
# - Do error states display properly?
# - Works on mobile viewport (resize browser)?
# - No console errors or warnings?
```

### ✅ Stage Complete Checklist

Before moving to next stage, verify:

- [ ] All mandatory gates passed (Gates 1-6)
- [ ] TypeScript type-check passed (Gate 9 - MANDATORY)
- [ ] Selected context-dependent gates passed (8, 13, 14, 15, etc.)
- [ ] Proof file complete (no placeholders, actual metrics)
- [ ] CHANGELOG.md updated with this stage
- [ ] Commit created with comprehensive message
- [ ] Proof file updated with actual commit hash
- [ ] Tag created and points to completion commit
- [ ] No uncommitted changes in src/, *.md
- [ ] Manual smoke test passed (UI works in browser)
- [ ] No TypeScript errors (checked with `tsc --noEmit`)
- [ ] No accessibility violations (axe + manual keyboard nav)
- [ ] Component documentation complete (JSDoc/Storybook)

**If all boxes checked: ✅ STAGE IS COMPLETE. Proceed to next stage.**

### 🎯 Time Estimates

- **Pre-Stage Tool Verification**: 5 minutes
- **DURING (TDD implementation)**: Varies by stage (hours to days)
- **AFTER (Quality gates + documentation + commit)**: 30-40 minutes
  - Gates 1-9, 13, 14: 15-20 minutes
  - Proof file creation: 10 minutes
  - Commit + tag: 4 minutes
  - Final verification: 2 minutes

**Pro tips for TypeScript UI stages:**
- Use Storybook for component development (see components in isolation)
- Test accessibility as you build (don't wait for Gate 14)
- Keep bundle size in check: `npm run build` and check dist/ size
- Use React DevTools to debug component hierarchy
- Lighthouse CI in local dev: `npx lighthouse http://localhost:3000`

```bash
# Save all gate outputs (recommended for TypeScript)
npm test > gate2-tests.txt 2>&1
npm run test:coverage > gate3-coverage.txt 2>&1
npm run build 2>&1 | tee gate1-build.txt
npm run type-check > gate9-typecheck.txt 2>&1
# Then copy-paste from files into STAGE_X_PROOF.md
```

### 🎨 TypeScript/React Specific Best Practices

**1. Type Safety (Gate 9 is MANDATORY)**
```typescript
// ❌ BAD: Implicit any
function handleClick(event) {
  console.log(event.target.value);
}

// ✅ GOOD: Explicit types
function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
  console.log(event.currentTarget.value);
}
```

**2. Accessibility (Gate 14)**
```tsx
// ❌ BAD: No accessibility
<div onClick={handleClick}>Click me</div>

// ✅ GOOD: Semantic + accessible
<button onClick={handleClick} aria-label="Submit form">
  Click me
</button>
```

**3. Testing (Gate 2)**
```typescript
// ❌ BAD: Testing implementation details
expect(wrapper.find('.button').length).toBe(1);

// ✅ GOOD: Testing user behavior
expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
```

**4. Documentation (Gate 13)**
```typescript
/**
 * Button component with loading state
 *
 * @param props - Component props
 * @param props.loading - Shows loading spinner when true
 * @param props.onClick - Click handler
 * @param props.children - Button label
 *
 * @example
 * <Button loading={false} onClick={handleSubmit}>
 *   Submit Form
 * </Button>
 */
export function Button({ loading, onClick, children }: ButtonProps) {
  // Implementation
}
```

---

**End of TypeScript UI Template**
