# Stage 19.1: Condition Evaluation

**Profile:** BACKEND_DOTNET | **Tech Stack:** .NET | **Started:** 2025-12-04

---

## Quick Commands

```bash
# Run quality gates
./scripts/run-quality-gates.sh --stage 19.1 1 2 3 4 5 6 7 8

# Complete stage (after gates pass)
./scripts/complete-stage.sh --stage 19.1 --name "Condition Evaluation"

# Check stage status
cat stage-proofs/stage-19.1/.stage-state.yaml
```

---

## Checklist

### BEFORE (do first)
- [x] Directory created: `stage-proofs/stage-19.1/`
- [x] Proof file created: `stage-proofs/stage-19.1/STAGE_19.1_PROOF.md`
- [x] State file created: `stage-proofs/stage-19.1/.stage-state.yaml`
- [ ] Review stage objectives in CLAUDE.md
- [ ] Create todo list for deliverables

### DURING (implementation)
- [ ] TDD: RED → GREEN → REFACTOR
- [ ] Tests passing continuously
- [ ] Coverage ≥90%

### AFTER (completion)
- [ ] Run: `./scripts/run-quality-gates.sh --stage 19.1 1 2 3 4 5 6 7 8`
- [ ] All gates pass
- [ ] Run: `./scripts/complete-stage.sh --stage 19.1 --name "Condition Evaluation"`
- [ ] Verify tag created: `git tag -l | grep stage-19.1`

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

- **Proof:** [`stage-proofs/stage-19.1/STAGE_19.1_PROOF.md`](./stage-proofs/stage-19.1/STAGE_19.1_PROOF.md)
- **State:** [`.stage-state.yaml`](./.stage-state.yaml)
- **Gates:** [`reports/gates/`](./reports/gates/)
- **Coverage:** [`reports/coverage/`](./reports/coverage/)
