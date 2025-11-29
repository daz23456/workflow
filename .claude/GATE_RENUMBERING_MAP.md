# Gate Renumbering Map

**Date:** 2025-11-29
**Reason:** Align gate numbers with logical execution order for better adoption

---

## Mapping: Old → New

### TIER 1 (Mandatory - Execution Order Changes)

| Old Number | Old Name | New Number | New Name | Execution Order |
|------------|----------|------------|----------|-----------------|
| Gate 5 | No Template Files | **Gate 1** | No Template Files | 1st (5 sec) |
| Gate 8 | Linting & Code Style | **Gate 2** | Linting & Code Style | 2nd (10-30 sec) |
| Gate 1 | Clean Build | **Gate 3** | Clean Build | 3rd (1-3 min) |
| Gate 9 | Type Safety [TS only] | **Gate 4** | Type Safety [TS only] | 4th (10-20 sec) |
| Gate 2 | All Tests Passing | **Gate 5** | All Tests Passing | 5th (1-5 min) |
| Gate 3 | Code Coverage ≥90% | **Gate 6** | Code Coverage ≥90% | 6th (same run) |
| Gate 4 | Zero Vulnerabilities | **Gate 7** | Zero Vulnerabilities | 7th (10-30 sec) |
| Gate 6 | Proof Completeness | **Gate 8** | Proof Completeness | 8th (5 sec) |

### TIER 2 (Recommended)

| Old Number | Old Name | New Number | New Name |
|------------|----------|------------|----------|
| Gate 7 | Mutation Testing ≥80% | **Gate 9** | Mutation Testing ≥80% |
| Gate 13 | Documentation Completeness | **Gate 10** | Documentation Completeness |

### TIER 3 (Optional - No Changes Needed for 11-20)

| Old Number | Old Name | New Number | New Name |
|------------|----------|------------|----------|
| Gate 10 | Integration Tests | **Gate 11** | Integration Tests |
| Gate 11 | Performance Benchmarks | **Gate 12** | Performance Benchmarks |
| Gate 12 | API Contract Validation | **Gate 13** | API Contract Validation |
| Gate 14 | Accessibility Testing | **Gate 14** | Accessibility Testing |
| Gate 15 | E2E Tests | **Gate 15** | E2E Tests |
| Gate 16 | SAST | **Gate 16** | SAST |
| Gate 17 | Observability Readiness | **Gate 17** | Observability Readiness |
| Gate 18 | Code Complexity | **Gate 18** | Code Complexity |
| Gate 19 | Dependency Freshness | **Gate 19** | Dependency Freshness |
| Gate 20 | Beginner Path | **Gate 20** | Beginner Path |

---

## Quick Reference: New Gate Numbers

**TIER 1 (Mandatory):** Gates 1-8
**TIER 2 (Recommended):** Gates 9-10
**TIER 3 (Optional):** Gates 11-20

**Execution Order (Fast-Fail):**
1 → 2 → 3 → [4 if TS] → 5 → 6 → 7 → 8

---

## Search & Replace Patterns

### For STAGE_EXECUTION_FRAMEWORK.md:
```
Gate 5 → Gate 1 (No Template Files)
Gate 8 → Gate 2 (Linting)
Gate 1 → Gate 3 (Build)
Gate 9 → Gate 4 (Type Safety)
Gate 2 → Gate 5 (Tests)
Gate 3 → Gate 6 (Coverage)
Gate 4 → Gate 7 (Security)
Gate 6 → Gate 8 (Proof)
Gate 7 → Gate 9 (Mutation)
Gate 13 → Gate 10 (Documentation)
Gate 10 → Gate 11 (Integration)
Gate 11 → Gate 12 (Performance)
Gate 12 → Gate 13 (API Contract)
```

### For Proof Files:
Same as above, but also check:
- Gate selection rationale sections
- Gate output filenames: `gate-X-*.txt`
- Commit messages referencing gates

---

## Files to Update

### Framework Documents (3 files)
- [x] .claude/GATE_RENUMBERING_MAP.md (this file)
- [ ] STAGE_EXECUTION_FRAMEWORK.md
- [ ] .claude/stage-completion-checklist.md
- [ ] STAGE_PROOF_TEMPLATE.md

### Completed Stage Proofs (8 files)
- [ ] stage-proofs/stage-1/STAGE_1_PROOF.md
- [ ] stage-proofs/stage-2/STAGE_2_PROOF.md
- [ ] stage-proofs/stage-3/STAGE_3_PROOF.md
- [ ] stage-proofs/stage-4/STAGE_4_PROOF.md
- [ ] stage-proofs/stage-5/STAGE_5_PROOF.md
- [ ] stage-proofs/stage-6/STAGE_6_PROOF.md
- [ ] stage-proofs/stage-7/STAGE_7_PROOF.md
- [ ] stage-proofs/stage-7.5/STAGE_7.5_PROOF.md
- [ ] stage-proofs/stage-7.9/STAGE_7.9_PROOF.md

### Project Documentation (2 files)
- [ ] CLAUDE.md (if gates referenced)
- [ ] CHANGELOG.md (add renumbering note)

### Scripts (if any)
- [ ] scripts/run-quality-gates.sh (if exists)
- [ ] Any other automation scripts

---

## Validation Checklist

After renumbering:
- [ ] All gate references consistent across documents
- [ ] Execution order clearly documented (1 → 2 → 3 → 4...)
- [ ] TIER 1 = Gates 1-8
- [ ] TIER 2 = Gates 9-10
- [ ] TIER 3 = Gates 11-20
- [ ] No broken links or references
- [ ] All proof files updated
- [ ] Changelog documents the change
