# Stage Completion Checklist

**Copy this checklist into your working notes when starting stage completion.**

---

## Pre-Completion Verification

### 1. Quality Gates (RUN IN ORDER - ALL MUST PASS)

Run each gate command and verify expected output. If ANY gate fails, STOP and fix the issue before proceeding.

#### Gate 1: Clean Release Build
```bash
dotnet clean
dotnet build --configuration Release
```
- [ ] **Expected:** `Build succeeded. 0 Warning(s), 0 Error(s)`
- [ ] **BLOCKER if:** Any warnings or errors

#### Gate 2: All Tests Passing
```bash
dotnet test --configuration Release
```
- [ ] **Expected:** `Passed! - Failed: 0, Passed: N, Skipped: 0`
- [ ] **BLOCKER if:** Any failures or skipped tests

#### Gate 3: Code Coverage ≥90%
```bash
dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage
dotnet tool install --global dotnet-reportgenerator-globaltool
export PATH="$PATH:$HOME/.dotnet/tools"
reportgenerator -reports:./coverage/**/coverage.cobertura.xml -targetdir:./coverage/report -reporttypes:"Html;TextSummary;Cobertura"
grep "Line coverage:" ./coverage/report/Summary.txt
```
- [ ] **Expected:** `Line coverage: XX.X%` (where XX.X ≥ 90)
- [ ] **BLOCKER if:** Coverage < 90%

#### Gate 4: Zero Security Vulnerabilities
```bash
dotnet list package --vulnerable --include-transitive
```
- [ ] **Expected:** `The given project has no vulnerable packages`
- [ ] **BLOCKER if:** ANY vulnerabilities (HIGH, MODERATE, or LOW)

#### Gate 5: No Template/Scaffolding Files
```bash
find . -name "Class1.cs" -o -name "UnitTest1.cs" -o -name "WeatherForecast.cs"
```
- [ ] **Expected:** (empty - no files found)
- [ ] **BLOCKER if:** Any template files exist

#### Gate 6: Proof File Completeness
```bash
grep -i -E "\[(TO BE|PLACEHOLDER|TBD|TODO|PENDING|STATUS|XXX|N/N|X%)\]" STAGE_*_PROOF.md
```
- [ ] **Expected:** (empty - no placeholders found)
- [ ] **BLOCKER if:** Any placeholders remain

---

### 2. Documentation Completeness

#### STAGE_X_PROOF.md Verification
- [ ] Stage Summary table has actual numbers (e.g., `21/21`, `91.8%`, `0`)
- [ ] Test output pasted (actual `dotnet test` output)
- [ ] Coverage percentage matches `Summary.txt`
- [ ] Build output shows `0 Warning(s), 0 Error(s)`
- [ ] Security section lists actual package updates (if any) and verification date
- [ ] All deliverables checked `[x]` (no `[ ]` unchecked items)
- [ ] File structure tree reflects actual files
- [ ] Commit hash placeholder present (will be filled after commit)
- [ ] Tag name specified

#### CHANGELOG.md Verification
- [ ] Stage entry has actual completion date
- [ ] Test count actual numbers (e.g., `21/21`)
- [ ] Coverage actual percentage (e.g., `91.8%`)
- [ ] Build warnings actual count (should be `0`)
- [ ] Deliverables actual count (e.g., `17/17`)
- [ ] Overall progress percentage updated
- [ ] "Last Updated" date updated

---

### 3. Git Preparation

#### Stage Changes
```bash
git add src/ tests/ *.md
git diff --cached --stat
```
- [ ] Review staged changes (only source files and docs, NOT bin/obj)
- [ ] No unexpected files staged

---

## Stage Completion Procedure

### Step 1: Verify All Quality Gates Pass
- [ ] All 6 gates show ✅ PASS (checkboxes above)
- [ ] All gate outputs copied to `STAGE_X_PROOF.md`

**If ANY gate failed:** Fix the issue and restart from Gate 1.

---

### Step 2: Create Stage Completion Commit
```bash
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

- [ ] Commit created successfully
- [ ] Commit message contains actual metrics (no placeholders)

---

### Step 3: Update Proof File with Commit Hash
```bash
# Get the commit hash
git log -1 --format=%h

# Edit STAGE_X_PROOF.md and replace commit hash placeholder with actual hash
```

- [ ] Proof file updated with actual commit hash

---

### Step 4: Create Git Tag
```bash
# Create annotated tag with actual metrics
git tag -a stage-X-complete -m "Stage X: [Name] - N tests, XX% coverage, 0 vulnerabilities"

# Verify tag points to correct commit
git log --oneline --decorate -5
```

- [ ] Tag created successfully
- [ ] Tag points to stage completion commit
- [ ] Tag message contains actual metrics

---

### Step 5: Final Verification
```bash
# Verify no uncommitted changes to source files
git status src/ tests/ *.md

# Quick verification that gates still pass
dotnet test && dotnet build --configuration Release
```

- [ ] No uncommitted changes
- [ ] Tests still pass
- [ ] Build still succeeds

---

## Final Checklist

**Before declaring stage complete, verify ALL boxes are checked:**

### Quality Gates
- [ ] Gate 1: Clean Release build (0 warnings, 0 errors)
- [ ] Gate 2: All tests passing (0 failures, 0 skipped)
- [ ] Gate 3: Coverage ≥90%
- [ ] Gate 4: Zero security vulnerabilities
- [ ] Gate 5: No template files
- [ ] Gate 6: Proof file complete (no placeholders)

### Documentation
- [ ] `STAGE_X_PROOF.md` complete with actual results
- [ ] `CHANGELOG.md` updated with actual metrics
- [ ] No placeholders remain in any documentation

### Git
- [ ] Commit created with comprehensive message
- [ ] Proof file updated with commit hash
- [ ] Tag created pointing to commit
- [ ] No uncommitted changes

### Verification
- [ ] Final tests pass
- [ ] Final build succeeds
- [ ] All deliverables complete

---

## If ALL Boxes Are Checked: ✅ STAGE IS COMPLETE

**If any boxes are unchecked:** The stage is NOT complete. Fix the issues and restart from the appropriate step.

---

## Quick Reference

### If a Quality Gate Fails

**Gate 1 (Build):** Fix warnings/errors → Re-run from Gate 1
**Gate 2 (Tests):** Fix failing tests → Re-run from Gate 1
**Gate 3 (Coverage):** Add tests for uncovered lines → Re-run from Gate 1
**Gate 4 (Security):** Update vulnerable packages → Re-run from Gate 1
**Gate 5 (Templates):** Remove template files → Re-run from Gate 1
**Gate 6 (Proof):** Fill placeholders with actual data → No gate restart needed

**See STAGE_EXECUTION_FRAMEWORK.md "Quality Gate Failure Procedures" for detailed remediation steps.**

---

## Notes

- This checklist is derived from `STAGE_EXECUTION_FRAMEWORK.md`
- For complete procedures and failure handling, see that document
- All stages must follow this checklist for completion
- Zero tolerance for skipping steps or incomplete documentation

**Last Updated:** 2025-11-21
