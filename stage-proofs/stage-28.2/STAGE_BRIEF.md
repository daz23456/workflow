# Stage 28.2: Circuit Breaker API

**Profile:** BACKEND_DOTNET | **Tech Stack:** .NET | **Started:** 2025-12-06

---

## Quick Commands

```bash
# Run quality gates
./scripts/run-quality-gates.sh --stage 28.2 1 2 3 4 5 6 7 8

# Generate screenshot manifest (if UI changes)
./scripts/generate-screenshot-manifest.sh --stage 28.2

# Capture screenshots
cd src/workflow-ui && npx ts-node scripts/take-screenshots.ts --stage 28.2

# Complete stage (after gates pass)
./scripts/complete-stage.sh --stage 28.2 --name "Circuit Breaker API"

# Check stage status
cat stage-proofs/stage-28.2/.stage-state.yaml
```

---

## Checklist

### BEFORE (do first)
- [x] Directory created: `stage-proofs/stage-28.2/`
- [x] Proof file created: `stage-proofs/stage-28.2/STAGE_28.2_PROOF.md`
- [x] State file created: `stage-proofs/stage-28.2/.stage-state.yaml`
- [ ] Review stage objectives in CLAUDE.md
- [ ] Create todo list for deliverables

### DURING (implementation)
- [ ] TDD: RED → GREEN → REFACTOR
- [ ] Tests passing continuously
- [ ] Coverage ≥90%

### AFTER (completion)
- [ ] Generate screenshot manifest: `./scripts/generate-screenshot-manifest.sh --stage 28.2`
- [ ] Capture screenshots (if UI affected): `cd src/workflow-ui && npx ts-node scripts/take-screenshots.ts --stage 28.2`
- [ ] Run: `./scripts/run-quality-gates.sh --stage 28.2 1 2 3 4 5 6 7 8`
- [ ] All gates pass
- [ ] Run: `./scripts/complete-stage.sh --stage 28.2 --name "Circuit Breaker API"`
- [ ] Verify tag created: `git tag -l | grep stage-28.2`

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



---

## Files

- **Proof:** [`stage-proofs/stage-28.2/STAGE_28.2_PROOF.md`](./stage-proofs/stage-28.2/STAGE_28.2_PROOF.md)
- **State:** [`.stage-state.yaml`](./.stage-state.yaml)
- **Gates:** [`reports/gates/`](./reports/gates/)
- **Coverage:** [`reports/coverage/`](./reports/coverage/)
