# Stage Execution Framework

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

### DURING Execution:
1. **Strict TDD**: RED → GREEN → REFACTOR for every feature
2. **Progress Tracking**: Update checklist as tasks complete
3. **Quality Gates**: All tests pass, coverage ≥90%

### AFTER Completion:

**IMPORTANT:** Before following these steps, you MUST run all quality gates and follow the strict completion procedure detailed below.

**Overview of completion steps:**
1. **Run Quality Gates** - ALL 6 gates must pass (see "Stage Completion Quality Gates" section below)
2. **Create Stage Proof File** - Fill with actual results (see "Proof File Completion Standards" section below)
3. **Update CHANGELOG.md** - With actual metrics
4. **Create Stage Completion Commit** - Following format guidelines
5. **Tag the Commit** - With actual metrics in tag message
6. **Final Verification** - Ensure everything is complete

**For detailed procedures, see:**
- **Stage Completion Quality Gates (MANDATORY)** - Section below with 6 gates that must all pass
- **Stage Completion Procedure (STRICT SEQUENTIAL ORDER)** - Section below with 7-step procedure
- **Quality Gate Failure Procedures** - Section below with specific remediation steps
- **Proof File Completion Standards** - Section below with validation requirements

**Quick Checklist (see sections below for details):**
- [ ] Gate 1: Clean Release build (0 warnings, 0 errors)
- [ ] Gate 2: All tests passing (0 failures, 0 skipped)
- [ ] Gate 3: Coverage ≥90%
- [ ] Gate 4: Zero security vulnerabilities
- [ ] Gate 5: No template files (Class1.cs, UnitTest1.cs removed)
- [ ] Gate 6: Proof file complete (no placeholders)
- [ ] CHANGELOG.md updated with actual metrics
- [ ] Commit created with comprehensive message
- [ ] Tag created pointing to commit
- [ ] Final verification passes

**If all boxes are checked: ✅ STAGE IS COMPLETE**

Otherwise, see detailed procedures below.

---

## Stage Completion Quality Gates (MANDATORY)

**Before creating ANY stage completion commit or tag, you MUST run these checks in order.**

Every gate must show ✅ PASS. If ANY gate fails, it is a **BLOCKER** - the stage is NOT complete.

### Gate 1: Clean Build
```bash
# Clean the solution first
dotnet clean

# Build in Release mode - MUST show 0 warnings, 0 errors
dotnet build --configuration Release
```

**Expected Output:**
```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

**BLOCKER:** Any warnings or errors = STAGE NOT COMPLETE

---

### Gate 2: All Tests Passing
```bash
# Run all tests in Release configuration
dotnet test --configuration Release
```

**Expected Output:**
```
Passed!  - Failed:     0, Passed:    N, Skipped:     0, Total:    N
```

**BLOCKER:** Any test failures or skipped tests = STAGE NOT COMPLETE

---

### Gate 3: Code Coverage ≥90%
```bash
# Generate coverage
dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage

# Install report generator (if not already installed)
dotnet tool install --global dotnet-reportgenerator-globaltool
export PATH="$PATH:$HOME/.dotnet/tools"

# Generate human-readable report
reportgenerator \
  -reports:./coverage/**/coverage.cobertura.xml \
  -targetdir:./coverage/report \
  -reporttypes:"Html;TextSummary;Cobertura"

# Check coverage percentage
grep "Line coverage:" ./coverage/report/Summary.txt
```

**Expected Output:**
```
Line coverage: 91.8%   (or any value ≥90%)
```

**BLOCKER:** Coverage < 90% = STAGE NOT COMPLETE

---

### Gate 4: Zero Security Vulnerabilities
```bash
# Check for ALL vulnerabilities including transitive dependencies
dotnet list package --vulnerable --include-transitive
```

**Expected Output:**
```
The given project has no vulnerable packages
```

**BLOCKER:** ANY vulnerabilities (HIGH, MODERATE, or LOW) = STAGE NOT COMPLETE

---

### Gate 5: No Template/Scaffolding Files
```bash
# Check for common template files that should have been removed
find . -name "Class1.cs" -o -name "UnitTest1.cs" -o -name "WeatherForecast.cs"
```

**Expected Output:**
```
(empty - no files found)
```

**BLOCKER:** Any template files found = STAGE NOT COMPLETE

---

### Gate 6: Proof File Completeness
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

## Stage Completion Procedure (STRICT SEQUENTIAL ORDER)

**Follow these steps in EXACT order. Do not skip steps. If any step fails, fix the issue and restart from Step 1.**

### Step 1: Run ALL Quality Gates
- Execute each gate command (above) in order: Gate 1 → Gate 2 → Gate 3 → Gate 4 → Gate 5 → Gate 6
- If ANY gate fails:
  1. **STOP immediately**
  2. Fix the issue (see "Quality Gate Failure Procedures" below)
  3. **Restart from Gate 1** (dependency updates can break other gates)
- Document actual output from each gate in `STAGE_X_PROOF.md`

**Prerequisites to proceed:**
- [ ] All 6 gates show ✅ PASS
- [ ] All gate outputs copied to proof file

---

### Step 2: Fill Out Proof File COMPLETELY
Open `STAGE_X_PROOF.md` and verify ALL sections are filled with actual data:

**Required sections (NO placeholders allowed):**
- [ ] Stage Summary table with actual numbers (e.g., `21/21`, `91.8%`, `0`)
- [ ] Test results with actual output from `dotnet test`
- [ ] Coverage percentage with actual number from `Summary.txt`
- [ ] Build output showing `0 Warning(s), 0 Error(s)`
- [ ] Security status showing `0 vulnerabilities` with verification date
- [ ] Deliverables checklist with all items checked `[x]`
- [ ] File structure tree with actual files
- [ ] Commit hash (leave as placeholder, will be filled after Step 4)
- [ ] Tag name specified

**Verification command (MUST return empty):**
```bash
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_X_PROOF.md
```

**Prerequisites to proceed:**
- [ ] Proof file verification command returns empty
- [ ] All sections reviewed and contain actual data

---

### Step 3: Update CHANGELOG.md
Update the changelog with actual metrics from the completed stage:

**Required updates:**
- [ ] Stage completion entry with actual date
- [ ] Test count: actual numbers (e.g., `21/21`)
- [ ] Coverage: actual percentage (e.g., `91.8%`)
- [ ] Build warnings: actual count (should be `0`)
- [ ] Deliverables: actual count (e.g., `17/17`)
- [ ] Overall progress percentage updated
- [ ] "Last Updated" date updated

**Prerequisites to proceed:**
- [ ] CHANGELOG.md contains actual metrics (no placeholders)
- [ ] Overall progress percentage matches completed stages

---

### Step 4: Create Stage Completion Commit
```bash
# Stage only source files and documentation (NOT bin/obj directories)
git add src/ tests/ *.md

# Verify what's staged (review the list)
git diff --cached --stat

# Create commit with comprehensive message (use heredoc for formatting)
git commit -m "$(cat <<'EOF'
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
✅ Build: 0 warnings, 0 errors
✅ Security: 0 vulnerabilities
✅ All deliverables: [N/N] complete

## Value Delivered
[1-2 sentence summary of what this enables]

## Proof
See STAGE_X_PROOF.md for complete results.

## Ready for Next Stage
All quality gates passed. CHANGELOG.md updated.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Prerequisites to proceed:**
- [ ] Commit created successfully
- [ ] Commit message contains actual metrics (no placeholders)

---

### Step 5: Update Proof File with Commit Hash
```bash
# Get the commit hash
git log -1 --format=%h

# Edit STAGE_X_PROOF.md and replace commit hash placeholder with actual hash
```

**Prerequisites to proceed:**
- [ ] Proof file contains actual commit hash

---

### Step 6: Create Git Tag
```bash
# Create annotated tag with actual metrics
git tag -a stage-X-complete -m "Stage X: [Name] - N tests, XX% coverage, 0 vulnerabilities"

# Verify tag points to correct commit
git log --oneline --decorate -5
```

**Expected output:**
```
abc1234 (HEAD -> master, tag: stage-X-complete) ✅ Stage X Complete: [Name]
```

**Prerequisites to proceed:**
- [ ] Tag created successfully
- [ ] Tag points to stage completion commit
- [ ] Tag message contains actual metrics

---

### Step 7: Final Verification
```bash
# Verify no uncommitted changes to source files
git status src/ tests/ *.md

# Verify all quality gates still pass (quick check)
dotnet test && dotnet build --configuration Release
```

**Expected output:**
```
nothing to commit, working tree clean
[tests pass, build succeeds]
```

**Stage completion checklist:**
- [ ] All 6 quality gates pass
- [ ] Proof file complete with actual results
- [ ] CHANGELOG.md updated
- [ ] Commit created with comprehensive message
- [ ] Proof file updated with commit hash
- [ ] Tag created pointing to commit
- [ ] No uncommitted changes
- [ ] Final verification passes

**If all checkboxes are checked: ✅ STAGE IS COMPLETE**

---

## Quality Gate Failure Procedures

**If any quality gate fails, follow these procedures. Do NOT create commit or tag until the issue is resolved.**

### If Gate 1 Fails: Build Errors or Warnings

**Symptoms:**
```
Build FAILED.
    X Warning(s)
    Y Error(s)
```

**Resolution Steps:**
1. Review build output for specific errors/warnings
2. Fix ALL errors first (code won't compile)
3. Fix ALL warnings (zero tolerance - warnings become errors in production)
4. Common causes:
   - Unused variables: Remove them or use them
   - Nullable reference warnings: Add null checks or use `!` operator if certain
   - Deprecated APIs: Update to current APIs
   - Missing dependencies: Add required package references
5. Re-run: `dotnet build --configuration Release`
6. **Restart from Gate 1** (code changes can affect tests)

---

### If Gate 2 Fails: Test Failures

**Symptoms:**
```
Failed!  - Failed:     X, Passed:    Y, Skipped:     Z
```

**Resolution Steps:**
1. Review test output for specific failures
2. For each failing test:
   - Read the failure message and stack trace
   - Determine if implementation is wrong or test is wrong
   - Fix the code (following TDD: make test green)
3. If tests are skipped:
   - Remove `Skip` attributes
   - Or delete the test if it's no longer relevant
4. Re-run: `dotnet test`
5. **Restart from Gate 1** (code changes can introduce build warnings)

---

### If Gate 3 Fails: Coverage < 90%

**Symptoms:**
```
Line coverage: 85.2%   (below 90% threshold)
```

**Resolution Steps:**
1. Open HTML report: `open ./coverage/report/index.html`
2. Identify uncovered lines (highlighted in red)
3. For each uncovered section:
   - Write additional test cases
   - Ensure edge cases are covered
   - Test error paths, not just happy paths
4. Common uncovered areas:
   - Exception handling blocks
   - Validation logic
   - Edge cases (null, empty, boundary values)
5. Re-run: `dotnet test --collect:"XPlat Code Coverage"` and regenerate report
6. **Restart from Gate 1** (new tests can fail or affect build)

---

### If Gate 4 Fails: Security Vulnerabilities

**Symptoms:**
```
The following sources have vulnerable packages:
   Project: WorkflowCore
      [HIGH] System.Text.Json 8.0.0
         CVE-2024-12345 ...
```

**Resolution Steps:**
1. Note ALL vulnerabilities: package name, current version, CVE numbers, severity
2. For each vulnerable package:
   ```bash
   # Update to latest version
   dotnet add src/ProjectName package PackageName

   # If dependency conflict occurs, update conflicting package first
   dotnet add src/ProjectName package ConflictingPackage
   ```
3. Verify resolution:
   ```bash
   dotnet list package --vulnerable --include-transitive
   ```
4. Document ALL updates in `STAGE_X_PROOF.md` security section:
   - Package name
   - Version before → Version after
   - CVE numbers resolved
   - Severity level
5. **Restart from Gate 1** (dependency updates can break tests or introduce warnings)

---

### If Gate 5 Fails: Template Files Found

**Symptoms:**
```
./src/WorkflowCore/Class1.cs
./tests/WorkflowCore.Tests/UnitTest1.cs
```

**Resolution Steps:**
1. Remove ALL template files:
   ```bash
   rm -f src/*/Class1.cs
   rm -f tests/*/UnitTest1.cs
   rm -f src/*/WeatherForecast.cs
   ```
2. If any "tests" were in template files (like UnitTest1.cs):
   - Update test count in success criteria
   - Update proof file with correct test count
3. Verify removal:
   ```bash
   find . -name "Class1.cs" -o -name "UnitTest1.cs"
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
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Tests Passing | 100% | 21/21 | ✅ PASS |   ← actual numbers
| Coverage | ≥90% | 91.8% | ✅ PASS |        ← actual percentage
| Build Warnings | 0 | 0 | ✅ PASS |          ← actual count
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
Passed!  - Failed:     0, Passed:    21, Skipped:     0, Total:    21
```
```

❌ Bad: `[TO BE VERIFIED]`
✅ Good: Paste the actual command output

---

**3. Coverage Report with Actual Percentage**
```markdown
## Code Coverage
Line coverage: 91.8%   ← from Summary.txt
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
    0 Warning(s)    ← actual count
    0 Error(s)      ← actual count
```

❌ Bad: `Build: [STATUS]`
✅ Good: Paste actual build output showing 0 warnings

---

**5. Security Status**
```markdown
## Security
✅ All NuGet vulnerabilities resolved
✅ System.Text.Json updated to 10.0.0 (from 8.0.0 - HIGH severity CVEs)
✅ Verified: 2025-11-21    ← actual date

Command: dotnet list package --vulnerable --include-transitive
Result: The given project has no vulnerable packages
```

❌ Bad: `Security: [TO BE CHECKED]`
✅ Good: Document actual packages updated and verification date

---

**6. Deliverables Checklist (All Checked)**
```markdown
## Deliverables
- [x] Solution file created        ← all must be [x]
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
