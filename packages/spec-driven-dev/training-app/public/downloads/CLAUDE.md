# CLAUDE.md - Retry Utility Project

> **This file is your project specification.** Claude Code reads it automatically on every session.

## Project Overview

Build a production-quality retry utility with exponential backoff.

**Technology Stack:**
- TypeScript (or your preferred language)
- Jest/Vitest for testing
- Node.js runtime

**Non-Negotiable Requirements:**
- Test-first development (RED-GREEN-REFACTOR)
- ≥90% code coverage enforced
- Quality gates must pass before completion

---

## Stage Execution Protocol

**Read `STAGE_EXECUTION_FRAMEWORK.md` for the full protocol.**

Quick reference:
```bash
# BEFORE: Initialize the stage
./scripts/init-stage.sh --stage 1.0 --name "Retry Utility" --profile BACKEND

# DURING: Build with TDD (RED → GREEN → REFACTOR)

# AFTER: Verify and complete
./scripts/run-quality-gates.sh --stage 1.0 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 1.0 --name "Retry Utility"
```

---

## Stage Roadmap

### Stage 1.0: Retry Utility 🔴 NOT STARTED
**Goal:** Implement a retry function with exponential backoff

**Deliverables:**
- [ ] `retry(fn, options)` function
- [ ] Exponential backoff between retries
- [ ] Configurable max retries
- [ ] Return result on success, throw on final failure
- [ ] Comprehensive test suite

**Success Criteria:**
- All tests passing
- Coverage ≥90%
- Quality gates 1-8 pass

---

## Feature Requirements

### retry(fn, options)

```typescript
interface RetryOptions {
  maxRetries: number;      // Maximum number of retry attempts
  initialDelayMs: number;  // Initial delay before first retry
  maxDelayMs?: number;     // Optional cap on delay
  backoffMultiplier?: number; // Default: 2
}

// Returns the result of fn() on success
// Throws the last error after all retries exhausted
async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T>
```

### Behavior

1. Execute `fn()` immediately
2. If success, return result
3. If failure:
   - If retries remaining, wait `delay` then retry
   - Increase delay: `delay = delay * backoffMultiplier`
   - Cap delay at `maxDelayMs` if specified
4. After `maxRetries` failures, throw the last error

### Example Usage

```typescript
const result = await retry(
  () => fetchFromUnreliableAPI(),
  { maxRetries: 3, initialDelayMs: 100 }
);
// Attempts: immediate, +100ms, +200ms, +400ms (if all fail, throws)
```

---

## Development Workflow

### TDD Cycle (Every Feature)

1. **RED**: Write a failing test first
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Clean up while keeping tests green

### Test Cases to Cover

- [ ] Returns result on first success
- [ ] Retries on failure and succeeds
- [ ] Throws after max retries exhausted
- [ ] Exponential backoff timing
- [ ] Respects maxDelayMs cap
- [ ] Custom backoff multiplier
- [ ] Handles synchronous functions
- [ ] Preserves error type on final throw

---

## Quality Gates

| Gate | What It Checks |
|------|----------------|
| 1 | No template files |
| 2 | Linting passes |
| 3 | Build succeeds |
| 4 | Type checking passes |
| 5 | All tests pass |
| 6 | Coverage ≥90% |
| 7 | No security vulnerabilities |
| 8 | Proof file complete |

**All 8 gates must pass before stage completion.**

---

## Context Recovery

If your session resets, recover context:

```bash
cat stage-proofs/stage-1.0/.stage-state.yaml
```

Then tell Claude: "Read CLAUDE.md and the state file. Continue Stage 1.0."

---

**This is your specification. Claude reads it and follows it.**
