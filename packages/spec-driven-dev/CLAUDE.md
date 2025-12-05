# CLAUDE.md - Spec-Driven Development Framework

## What is Spec-Driven Development?

A structured framework for **human + AI collaboration** that transforms how you build software with Claude Code.

**The Partnership Model:**
- **You** define the what (specifications, constraints, goals)
- **Claude Code** handles the how (implementation, tests, refactoring)
- **Quality gates** verify the work is done right

**Three Pillars:**
1. **Specification** - CLAUDE.md as the single source of truth
2. **Execution** - Stage-based development with BEFORE → DURING → AFTER workflow
3. **Verification** - Quality gates that prove completion

---

## Why This Exists

### The Problem: AI Coding Without Constraints

We've all experienced it:

| Frustration | Root Cause |
|-------------|------------|
| Claude generates code that doesn't fit your architecture | No context about your constraints |
| Code works but has no tests | No enforcement of quality standards |
| Session resets = lost context = repeat yourself | No persistent state |
| "Almost done" for weeks | No objective definition of done |
| Technical debt accumulates silently | No gates to catch it |

### The Solution: A Collaboration Model That Works

After hundreds of hours of human + Claude Code collaboration, this framework emerged:

**What Changed:**
- Claude reads CLAUDE.md and **understands your project** before writing code
- TDD is **enforced**, not hoped for - tests come first
- Quality is **proven** via gates, not assumed
- Context is **recovered** automatically when sessions restart
- Completion is **objective** - metrics, not feelings

**Results from real-world use:**
- 26+ stages completed with consistent quality
- 3,900+ tests written with TDD
- 90%+ coverage maintained across entire codebase
- Zero production regressions from tested code
- Complex features delivered in 1-2 weeks per stage

---

## How the Collaboration Works

### You Provide Context, Claude Follows It

```
┌─────────────────────────────────────────────────────────┐
│                    YOU (Human)                          │
│  - Define CLAUDE.md (goals, constraints, tech stack)    │
│  - Break work into stages                               │
│  - Review and guide                                     │
│  - Make architectural decisions                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  CLAUDE CODE (AI)                       │
│  - Reads CLAUDE.md automatically                        │
│  - Writes tests FIRST (TDD enforced)                    │
│  - Implements to pass tests                             │
│  - Refactors while keeping tests green                  │
│  - Maintains consistency with your architecture         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 QUALITY GATES (Verification)            │
│  - Build passes? ✅                                      │
│  - Tests pass? ✅                                        │
│  - Coverage ≥90%? ✅                                     │
│  - No vulnerabilities? ✅                                │
│  - Proof file complete? ✅                               │
└─────────────────────────────────────────────────────────┘
```

### Real Conversation Example

```
You: "We're starting Stage 5. Implement retry logic for HTTP calls
     with exponential backoff. Read CLAUDE.md for constraints."

Claude: "I see from CLAUDE.md that you're using .NET 8 and require
        90%+ coverage. Let me start with failing tests for the
        retry logic..."

        [Writes RetryPolicyTests.cs with 8 test cases]

        "Tests written and failing as expected (RED). Now
        implementing the RetryPolicy class..."

        [Writes RetryPolicy.cs]

        "All 8 tests passing (GREEN). Current coverage: 94.2%.
        Ready to refactor or move to next feature?"

You: "Add a maximum retry count configuration."

Claude: "Adding test first for max retry count..."

        [TDD cycle continues]
```

### Why This Works Better Than "Just Chat"

| Without Framework | With Spec-Driven |
|-------------------|------------------|
| Repeat context every session | Context persists in CLAUDE.md |
| Claude guesses your preferences | Claude follows explicit constraints |
| Tests are "nice to have" | Tests are required (gates enforce) |
| Quality varies by session | Quality is consistent (90%+ always) |
| "Is it done?" is subjective | "Is it done?" is objective (proof file) |

---

## The Value: What You Get

### For Individual Developers

- **Ship faster** - Claude handles boilerplate, you focus on architecture
- **Ship safer** - TDD catches bugs before production
- **Stay consistent** - Same quality every time, every session
- **Never lose context** - Pick up exactly where you left off

### For Teams

- **Onboard faster** - New devs read CLAUDE.md and understand the project
- **Review less** - Gates catch what code review would
- **Document automatically** - Proof files create audit trail
- **Scale AI usage** - Framework works the same for everyone

### Real Metrics (From Production Use)

| Metric | Before | After |
|--------|--------|-------|
| Test coverage | Variable (40-80%) | Consistent (90%+) |
| Time to implement feature | Unpredictable | 1-2 weeks/stage |
| Context recovery time | 30+ minutes | ~30 seconds |
| "Is it done?" clarity | Subjective | Objective |
| Production regressions | Occasional | Zero from tested code |

---

## Core Concepts

### 1. CLAUDE.md (The Spec)

This file IS the spec. Claude Code reads it automatically on every session.

**What to include:**
- Project overview and goals
- Technology stack and constraints
- Non-negotiable requirements
- Stage roadmap with completion status
- Development workflow and conventions

### 2. Stages (The Work Units)

Break work into **stages** - focused units of delivery (1-2 weeks each).

Each stage has:
- Clear deliverables
- Success criteria
- Test requirements
- A proof file documenting completion

### 3. Quality Gates (The Verification)

Automated checks that PROVE a stage is complete:

| Gate | What It Checks |
|------|----------------|
| 1 | No template files (Class1.cs, UnitTest1.cs) |
| 2 | Linting passes (0 errors) |
| 3 | Build succeeds (0 warnings, 0 errors) |
| 4 | Type safety (for TypeScript) |
| 5 | All tests pass (0 failures, 0 skipped) |
| 6 | Coverage ≥90% |
| 7 | Security scan (0 vulnerabilities) |
| 8 | Proof file complete (no placeholders) |

---

## Stage Execution Protocol

### Every Stage: 3 Phases

```
BEFORE → DURING → AFTER
```

### BEFORE: Initialize

```bash
./scripts/init-stage.sh --stage 1.0 --name "Feature Name" --profile BACKEND
```

This creates:
- `stage-proofs/stage-1.0/` directory
- Proof file template
- State tracking file

### DURING: Build with TDD

Follow the RED → GREEN → REFACTOR cycle:

1. **RED**: Write a failing test
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Improve while keeping tests green
4. **REPEAT**: Until feature is complete

Claude Code assists here - it knows to write tests first because this spec says so.

### AFTER: Verify and Complete

```bash
./scripts/run-quality-gates.sh --stage 1.0 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 1.0 --name "Feature Name"
```

This:
- Runs all quality gates (fails fast on first failure)
- Generates the proof file
- Creates a git tag
- Updates CHANGELOG.md

---

## Context Recovery

**Session lost? Context reset?** Recover in seconds:

```bash
cat stage-proofs/stage-1.0/.stage-state.yaml
```

```yaml
stage: "1.0"
name: "User Authentication"
phase: "DURING"
started_at: "2025-12-05T10:30:00Z"
current_task: "Implementing password hashing"
deliverables:
  - name: "Login endpoint"
    status: "complete"
  - name: "Password hashing"
    status: "in_progress"
  - name: "JWT generation"
    status: "pending"
```

Claude reads this and continues exactly where you left off.

---

## TDD is Non-Negotiable

**Every feature has tests written FIRST.**

```
┌───────────────────────────────────────┐
│  RED → GREEN → REFACTOR → COMMIT      │
│         ↑_____________________↓       │
└───────────────────────────────────────┘
```

Why TDD?
- Bugs found at commit time, not production
- 90%+ coverage enforced (not aspirational)
- Safe refactoring (tests catch regressions)
- Living documentation (tests describe behavior)

---

## Stage Roadmap

### Stage 1: [Your First Stage] 🔴 NOT STARTED
**Goal:** [What you're building]
**Deliverables:**
- [ ] Deliverable 1
- [ ] Deliverable 2
- [ ] Deliverable 3

**Success Criteria:**
- All tests passing
- Coverage ≥90%
- Quality gates pass

---

## Development Workflow

### Starting a New Stage

1. Run `init-stage.sh` to set up the stage
2. Open Claude Code
3. Say: "We're starting Stage X, read CLAUDE.md"
4. Claude loads context automatically and follows TDD

### During Development

1. Tell Claude what to build
2. Claude writes failing tests first
3. Claude implements to pass
4. Claude refactors while keeping tests green
5. You review and guide

### Completing a Stage

1. Run quality gates
2. Fill in the proof file
3. Run `complete-stage.sh`
4. Commit and tag

---

## Gate Profiles

Use the right profile for your work:

| Profile | Gates | Use For |
|---------|-------|---------|
| `BACKEND` | 1-8 | .NET, Python, Go backend |
| `FRONTEND` | 1-8, 14, 15 | TypeScript UI |
| `MINIMAL` | 1-8 | POC, experiments |

---

## Proof Files

Every completed stage has a proof file:

```markdown
# Stage 1.0 Completion Proof

## TL;DR
> Implemented user authentication with JWT tokens.

## Key Metrics
- **Tests:** 45/45 passing (100%)
- **Coverage:** 94.2% statements
- **Vulnerabilities:** 0

## Quality Gates
| Gate | Result |
|------|--------|
| 1-8  | ✅ PASS |

**Status:** ✅ READY FOR NEXT STAGE
```

No more "I think it's done" - **metrics prove completion**.

---

## Non-Negotiable Requirements

- ✅ Test-first development (RED-GREEN-REFACTOR)
- ✅ ≥90% code coverage enforced
- ✅ Zero tolerance for test failures
- ✅ No skipped tests
- ✅ Quality gates must pass before stage completion

---

## Getting Started

1. Copy this CLAUDE.md to your project root
2. Customize the Stage Roadmap for your project
3. Set up the scripts (or run gates manually)
4. Start your first stage
5. Let Claude Code follow the spec

**Time to first stage:** ~30 minutes

---

**This is your specification. Claude Code reads it and follows it. Quality is enforced, not hoped for.**
