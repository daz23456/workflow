# Stage Execution Checklist (MANDATORY)

**Version:** 4.3.0 | **Scripts are REQUIRED. No manual alternative.**

---

## ⚠️ CRITICAL: Use Scripts Only

**DO NOT manually create directories or files. The scripts handle everything correctly.**

If you skip the scripts, artifacts will be in wrong locations and the stage will need to be redone.

---

## Stage Workflow (3 Commands)

### 1. BEFORE: Initialize Stage

```bash
./scripts/init-stage.sh --stage <NUMBER> --name "<NAME>" --profile <PROFILE>
```

**Profiles:**
| Profile | Gates | Use For |
|---------|-------|---------|
| `BACKEND_DOTNET` | 1-10 | .NET backend work |
| `FRONTEND_TS` | 1-10, 14, 15, 21, 22 | TypeScript/React UI |
| `MINIMAL` | 1, 3, 5, 6, 8 | POC, small fixes |

*Gates 9-10 = TIER 2 (Mutation Testing, Documentation). Gates 11-22 = optional, add as needed.*

**Example:**
```bash
./scripts/init-stage.sh --stage 9.7 --name "Transform DSL" --profile BACKEND_DOTNET
```

**This creates:**
- `stage-proofs/stage-9.7/` directory
- `stage-proofs/stage-9.7/STAGE_9.7_PROOF.md` (from template)
- `stage-proofs/stage-9.7/.stage-state.yaml` (for context recovery)
- `stage-proofs/stage-9.7/STAGE_BRIEF.md` (quick reference)
- All report subdirectories

---

### 2. DURING: Implement with TDD

```
RED → GREEN → REFACTOR → COMMIT
```

- Write failing test first
- Implement minimal code to pass
- Refactor while green
- Commit frequently

**Update state as you work:**
```bash
# Edit .stage-state.yaml to track progress
# status: during
# current_task: "Implementing X"
```

---

### 3. AFTER: Complete Stage

**Step 3a: Run Quality Gates**
```bash
./scripts/run-quality-gates.sh --stage <NUMBER> 1 2 3 4 5 6 7 8
```

If any gate fails → fix and re-run.

**Step 3b: Fill Proof File**
- Open `stage-proofs/stage-<NUMBER>/STAGE_<NUMBER>_PROOF.md`
- Replace ALL placeholders with actual values
- Principal Engineer Review must be SPECIFIC (not generic)

**Step 3c: Complete Stage**
```bash
./scripts/complete-stage.sh --stage <NUMBER> --name "<NAME>"
```

**This handles:**
- Validates gates passed
- Generates CHANGELOG entry
- Creates implementation commit
- Updates proof with commit hash
- Creates git tag
- **Updates documentation (CLAUDE.md, COMPLETED_STAGES_ARCHIVE.md, FUTURE_STAGES.md)**
- Creates documentation commit

---

## Parallel Stages (Worktrees)

```bash
./scripts/init-stage.sh --stage 9.7 --name "Feature" --profile BACKEND_DOTNET --worktree
cd ../workflow-stage-9.7
# Work in isolation
# When done:
git checkout master && git merge stage-9.7
```

---

## Context Recovery

Lost your place? Read the state file:
```bash
cat stage-proofs/stage-<NUMBER>/.stage-state.yaml
./scripts/stage-status.sh --stage <NUMBER>
```

---

## Gate Reference

| Gate | Name | Pass Criteria |
|------|------|---------------|
| 1 | No Templates | No Class1.cs, UnitTest1.cs |
| 2 | Linting | 0 errors |
| 3 | Build | 0 errors, 0 warnings |
| 4 | Type Safety | 0 type errors (TS only) |
| 5 | Tests | 0 failures, 0 skipped |
| 6 | Coverage | ≥90% |
| 7 | Security | 0 vulnerabilities |
| 8 | Proof | No placeholders |
| 9 | Mutation | ≥80% mutation score |
| 10 | Documentation | README complete, API docs ≥90% |
| 14 | Accessibility | ≥90 Lighthouse (TS UI only) |
| 15 | E2E Tests | All Playwright pass (TS UI only) |
| 21 | Storybook | All components have stories (TS UI only) |
| 22 | Screenshots | All UI pages captured (TS UI only) |

---

## Verification

After `complete-stage.sh` runs, verify:
```bash
ls stage-proofs/stage-<NUMBER>/reports/gates/   # Gate outputs exist
git tag -l | grep stage-<NUMBER>                 # Tag exists
git log --oneline -1                             # Commit exists
```

---

## ❌ DO NOT

- ❌ Manually create `stage-proofs/stage-X/` directories
- ❌ Manually copy proof template
- ❌ Run `run-quality-gates.sh` without `--stage` parameter
- ❌ Manually update CHANGELOG.md (let `complete-stage.sh` do it)
- ❌ Manually update CLAUDE.md, COMPLETED_STAGES_ARCHIVE.md, FUTURE_STAGES.md
- ❌ Manually create git tags

**If you do any of the above, artifacts will be in wrong locations or inconsistent.**

---

## Scripts Reference

| Script | When | What It Does |
|--------|------|--------------|
| `init-stage.sh` | Start of stage | Creates all files in correct locations |
| `run-quality-gates.sh` | After implementation | Runs gates, saves to `stage-proofs/stage-X/reports/gates/` |
| `complete-stage.sh` | After gates pass | CHANGELOG, commits, tag, **updates all docs** |
| `stage-status.sh` | Anytime | Shows progress |

---

**3 commands. No manual steps. No exceptions.**
