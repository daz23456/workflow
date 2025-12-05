# Methodology Deep Dive

A comprehensive reference for spec-driven development with AI coding assistants.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [The Three Pillars](#the-three-pillars)
3. [CLAUDE.md Structure](#claudemd-structure)
4. [Stage Lifecycle](#stage-lifecycle)
5. [TDD in Practice](#tdd-in-practice)
6. [Quality Gates Reference](#quality-gates-reference)
7. [Context Recovery](#context-recovery)
8. [Proof Files](#proof-files)
9. [Scaling the Framework](#scaling-the-framework)
10. [Anti-Patterns](#anti-patterns)

---

## Philosophy

### Human + AI Partnership

Spec-driven development is built on a clear division of labor:

| Human Responsibilities | AI Responsibilities |
|------------------------|---------------------|
| Define the "what" | Handle the "how" |
| Set constraints | Work within constraints |
| Make architectural decisions | Implement decisions consistently |
| Review and guide | Execute with quality |
| Define success criteria | Meet those criteria |

**The human is the architect. The AI is the builder.**

### Why Constraints Enable Creativity

Paradoxically, more constraints lead to better AI output:

```
❌ "Build me an auth system"
   → Claude guesses your preferences
   → May not fit your architecture
   → Quality varies

✅ "Build an auth system:
    - .NET 8, ASP.NET Core
    - JWT tokens, 24h expiry
    - Tests first (xUnit)
    - 90%+ coverage"
   → Claude follows explicit guidance
   → Fits your architecture
   → Consistent quality
```

**Constraints are not limitations. They're guidance.**

### Quality is Binary

In spec-driven development, quality is not a spectrum:

- Gates pass = Quality ✅
- Gates fail = Not ready ❌

There's no "mostly done" or "good enough." This binary view:
- Removes subjectivity
- Creates clear completion criteria
- Prevents scope creep
- Enables predictable delivery

---

## The Three Pillars

### Pillar 1: Specification (CLAUDE.md)

The specification is a single file that contains everything the AI needs to work effectively on your project.

**Purpose:**
- Provide persistent context across sessions
- Define non-negotiable requirements
- Track project status
- Document decisions and conventions

**Key Principle:** If it's not in CLAUDE.md, Claude doesn't know it.

### Pillar 2: Execution (Stages)

Stages are focused units of delivery with clear boundaries.

**Purpose:**
- Break work into manageable chunks
- Define clear success criteria
- Enable progress tracking
- Create natural review points

**Key Principle:** A stage is done when gates pass and proof is complete.

### Pillar 3: Verification (Quality Gates)

Gates are automated checks that prove completion.

**Purpose:**
- Enforce quality standards
- Remove subjectivity from "done"
- Catch issues before they compound
- Create accountability

**Key Principle:** Gates are non-negotiable. If they fail, the stage isn't complete.

---

## CLAUDE.md Structure

A well-structured CLAUDE.md contains these sections:

### 1. Project Overview

```markdown
## Project Overview

Build [WHAT YOU'RE BUILDING].

**Technology Stack:**
- Language: [e.g., .NET 8, Python 3.12, TypeScript]
- Framework: [e.g., ASP.NET Core, FastAPI, Next.js]
- Database: [e.g., PostgreSQL, MongoDB]
- Testing: [e.g., xUnit, pytest, Vitest]
```

### 2. Non-Negotiable Requirements

```markdown
**Non-Negotiable Requirements:**
- ✅ Test-first development (RED-GREEN-REFACTOR)
- ✅ ≥90% code coverage enforced
- ✅ Zero tolerance for test failures
- ✅ No skipped tests
- ✅ Quality gates must pass before stage completion
```

### 3. Stage Execution Protocol

```markdown
## Stage Execution Protocol

### Every Stage: 3 Commands

\`\`\`bash
# 1. BEFORE: Initialize
./scripts/init-stage.sh --stage X.X --name "Feature Name"

# 2. DURING: Implement with TDD (RED → GREEN → REFACTOR)

# 3. AFTER: Run gates then complete
./scripts/run-quality-gates.sh --stage X.X 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage X.X --name "Feature Name"
\`\`\`
```

### 4. Stage Roadmap

```markdown
## Stage Roadmap

### Stage 1: [Feature Name] ✅ COMPLETE
**Proof:** stage-proofs/stage-1/STAGE_1_PROOF.md

### Stage 2: [Feature Name] 🔴 NOT STARTED
**Goal:** [What you're building]
**Deliverables:**
- [ ] Deliverable 1
- [ ] Deliverable 2
```

### 5. Development Workflow

```markdown
## Development Workflow

### TDD Cycle (RED-GREEN-REFACTOR)

1. **RED**: Write failing test
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Clean up while keeping tests green
```

### 6. Coding Standards

```markdown
## Coding Standards

- [Naming conventions]
- [File organization]
- [Error handling patterns]
- [Documentation requirements]
```

---

## Stage Lifecycle

### Phase 1: BEFORE (Initialization)

**What happens:**
1. Run `init-stage.sh` with stage number and name
2. Script creates `stage-proofs/stage-X.X/` directory
3. Script creates `.stage-state.yaml` (state tracking)
4. Script creates `STAGE_X.X_PROOF.md` (from template)

**State file after init:**
```yaml
stage: "1.0"
name: "User Authentication"
profile: "BACKEND"
phase: "BEFORE"
started_at: "2025-01-15T10:30:00Z"
```

### Phase 2: DURING (Implementation)

**What happens:**
1. Read CLAUDE.md to load context
2. Follow TDD cycle for each feature
3. Update state file as work progresses
4. Track deliverables in proof file

**State file during work:**
```yaml
stage: "1.0"
name: "User Authentication"
phase: "DURING"
started_at: "2025-01-15T10:30:00Z"
deliverables:
  - name: "Login endpoint"
    status: "complete"
  - name: "JWT generation"
    status: "in_progress"
```

### Phase 3: AFTER (Verification)

**What happens:**
1. Run all quality gates
2. All gates must pass
3. Complete proof file (remove all TODOs)
4. Run `complete-stage.sh`
5. Script creates git tag
6. Script updates CHANGELOG.md

**State file after completion:**
```yaml
stage: "1.0"
name: "User Authentication"
phase: "AFTER"
started_at: "2025-01-15T10:30:00Z"
completed_at: "2025-01-17T16:45:00Z"
```

---

## TDD in Practice

### The RED-GREEN-REFACTOR Cycle

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ┌─────────┐     ┌─────────┐     ┌─────────────┐      │
│   │   RED   │ ──→ │  GREEN  │ ──→ │  REFACTOR   │      │
│   │ (Fail)  │     │ (Pass)  │     │ (Improve)   │      │
│   └─────────┘     └─────────┘     └──────┬──────┘      │
│        ↑                                  │             │
│        └──────────────────────────────────┘             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step-by-Step Example

**Feature: Retry policy for HTTP calls**

**1. RED - Write failing test:**
```csharp
[Fact]
public void Should_RetryOnTransientFailure()
{
    // Arrange
    var policy = new RetryPolicy(maxRetries: 3);
    var attemptCount = 0;
    Func<int> operation = () => {
        attemptCount++;
        if (attemptCount < 3) throw new HttpRequestException();
        return 42;
    };

    // Act
    var result = policy.Execute(operation);

    // Assert
    result.Should().Be(42);
    attemptCount.Should().Be(3);
}
```

**Run test:** ❌ FAILS (RetryPolicy doesn't exist)

**2. GREEN - Write minimum code:**
```csharp
public class RetryPolicy
{
    private readonly int _maxRetries;

    public RetryPolicy(int maxRetries) => _maxRetries = maxRetries;

    public T Execute<T>(Func<T> operation)
    {
        var attempts = 0;
        while (true)
        {
            try
            {
                attempts++;
                return operation();
            }
            catch (HttpRequestException) when (attempts < _maxRetries)
            {
                // Retry
            }
        }
    }
}
```

**Run test:** ✅ PASSES

**3. REFACTOR - Improve code:**
```csharp
public class RetryPolicy
{
    private readonly int _maxRetries;
    private readonly TimeSpan _delay;

    public RetryPolicy(int maxRetries, TimeSpan? delay = null)
    {
        _maxRetries = maxRetries;
        _delay = delay ?? TimeSpan.FromMilliseconds(100);
    }

    public T Execute<T>(Func<T> operation)
    {
        for (var attempt = 1; attempt <= _maxRetries; attempt++)
        {
            try
            {
                return operation();
            }
            catch (HttpRequestException) when (attempt < _maxRetries)
            {
                Thread.Sleep(_delay);
            }
        }
        throw new InvalidOperationException("Should not reach here");
    }
}
```

**Run test:** ✅ STILL PASSES

**4. REPEAT** for next feature

### TDD Rules

1. **Never write production code without a failing test**
2. **Write the minimum code to pass the test**
3. **Refactor only when tests are green**
4. **Each test should test one thing**
5. **Tests are first-class code (same quality standards)**

---

## Quality Gates Reference

### Gate 1: No Template Files

**What it checks:** Ensures no auto-generated template files exist (Class1.cs, UnitTest1.cs, etc.)

**Why it matters:** Template files indicate incomplete setup or abandoned code.

**How to pass:** Delete any auto-generated template files.

### Gate 2: Linting Passes

**What it checks:** Code style and formatting (no warnings/errors)

**Why it matters:** Consistent style improves readability and reduces friction.

**How to pass:** Run your linter and fix all issues.

### Gate 3: Build Succeeds

**What it checks:** Clean build with zero warnings and zero errors

**Why it matters:** Warnings often indicate bugs or deprecated usage.

**How to pass:** Treat warnings as errors. Fix all of them.

### Gate 4: Type Safety

**What it checks:** TypeScript/strong typing compliance (no implicit any, etc.)

**Why it matters:** Type safety catches bugs at compile time.

**How to pass:** Enable strict mode and fix all type errors.

### Gate 5: All Tests Pass

**What it checks:** Zero test failures, zero skipped tests

**Why it matters:** Skipped tests are hidden bugs. Failed tests are known bugs.

**How to pass:** Fix or delete every failing/skipped test.

### Gate 6: Coverage ≥90%

**What it checks:** Statement/line coverage meets threshold

**Why it matters:** Low coverage means untested code paths.

**How to pass:** Write tests first (TDD). Coverage follows naturally.

### Gate 7: Security Scan

**What it checks:** Zero known vulnerabilities in dependencies

**Why it matters:** Vulnerable dependencies are attack vectors.

**How to pass:** Update dependencies, use security advisories.

### Gate 8: Proof Complete

**What it checks:** No [TODO] placeholders in proof file

**Why it matters:** Incomplete proof = incomplete documentation.

**How to pass:** Fill in all sections of the proof file.

---

## Context Recovery

### The Problem

AI sessions have limited context. When you start a new session:
- Claude doesn't remember previous work
- You have to re-explain your project
- Time is wasted on context recovery

### The Solution

State files track exactly where you left off:

```yaml
# stage-proofs/stage-2.0/.stage-state.yaml
stage: "2.0"
name: "API Endpoints"
phase: "DURING"
started_at: "2025-01-20T09:00:00Z"
current_task: "Implementing GET /users endpoint"
deliverables:
  - name: "GET /users"
    status: "in_progress"
  - name: "POST /users"
    status: "pending"
  - name: "DELETE /users"
    status: "pending"
```

### Recovery Workflow

1. **Start new session**
2. **Read state file:**
   ```bash
   cat stage-proofs/stage-2.0/.stage-state.yaml
   ```
3. **Tell Claude:**
   "We're continuing Stage 2.0. Read CLAUDE.md and the state file above."
4. **Claude picks up exactly where you left off**

**Recovery time:** ~30 seconds

---

## Proof Files

### Purpose

Proof files serve multiple purposes:
1. **Completion evidence** - Metrics prove the work is done
2. **Historical record** - What was built, when, by whom
3. **Onboarding material** - New team members read proofs to understand history
4. **Retrospective input** - What went well, what didn't

### Structure

```markdown
# Stage X.X Completion Proof

## TL;DR
> One-sentence summary of what was accomplished

## Stage Overview
- **Stage:** X.X
- **Name:** Feature Name
- **Profile:** BACKEND/FRONTEND/FULLSTACK
- **Started:** YYYY-MM-DDTHH:MM:SSZ
- **Completed:** YYYY-MM-DDTHH:MM:SSZ

## Deliverables
- [x] Deliverable 1
- [x] Deliverable 2
- [x] Deliverable 3

## Key Metrics
| Metric | Target | Actual |
|--------|--------|--------|
| Tests Passing | 100% | 45/45 |
| Code Coverage | ≥90% | 94.2% |
| Build Warnings | 0 | 0 |
| Vulnerabilities | 0 | 0 |

## Quality Gates
| Gate | Name | Result |
|------|------|--------|
| 1 | No Template Files | ✅ |
| 2 | Linting Passes | ✅ |
| 3 | Build Succeeds | ✅ |
| 4 | Type Safety | ✅ |
| 5 | All Tests Pass | ✅ |
| 6 | Coverage ≥90% | ✅ |
| 7 | Security Scan | ✅ |
| 8 | Proof Complete | ✅ |

## What Went Well
- TDD caught edge cases early
- Parallel execution reduced build time

## Lessons Learned
- Should have broken into smaller stages
- Need better error messages

## Follow-up Items
- [ ] Add logging for production debugging

---

**Status:** ✅ COMPLETE
```

---

## Scaling the Framework

### For Solo Developers

- Use CLAUDE.md as your project spec
- Stages keep you focused
- Proof files create personal accountability
- Gates ensure you don't skip quality

### For Small Teams (2-5)

- CLAUDE.md is the shared source of truth
- Stages can be assigned to individuals
- Proof files enable async review
- Gates catch issues before merge

### For Larger Teams (5+)

- Split into multiple CLAUDE.md files by domain
- Use stage prefixes by team (e.g., 1.x = Backend, 2.x = Frontend)
- Aggregate proof files for project-level view
- Gates integrated into CI/CD

### Parallel Work

When multiple people work simultaneously:

1. **Use separate stage numbers**
   - Team A: Stages 3.1, 3.2, 3.3
   - Team B: Stages 4.1, 4.2, 4.3

2. **Merge regularly**
   - Complete stage → Merge to main
   - Keep branches short-lived

3. **Coordinate on shared code**
   - CLAUDE.md sections have owners
   - Changes to shared code require discussion

---

## Anti-Patterns

### Anti-Pattern 1: Skipping Gates

❌ **Wrong:**
"Coverage is at 85%, close enough. Let's ship."

✅ **Right:**
Add more tests until coverage hits 90%. Gates are not negotiable.

### Anti-Pattern 2: Empty Proof Files

❌ **Wrong:**
Copy template, leave most sections as [TODO], mark complete.

✅ **Right:**
Fill in every section. Proof is documentation, not checkbox.

### Anti-Pattern 3: Mega-Stages

❌ **Wrong:**
"Stage 1: Build entire application" (6 weeks)

✅ **Right:**
Break into focused stages of 1-2 weeks each.

### Anti-Pattern 4: Tests After Code

❌ **Wrong:**
"Let me just get the feature working, then I'll add tests."

✅ **Right:**
Write failing test first. Always.

### Anti-Pattern 5: Stale CLAUDE.md

❌ **Wrong:**
CLAUDE.md created in week 1, never updated.

✅ **Right:**
Update stage status as you complete work. CLAUDE.md is living documentation.

### Anti-Pattern 6: Context Dump

❌ **Wrong:**
"Claude, here's our entire codebase and all requirements and everything we've ever done..."

✅ **Right:**
Keep CLAUDE.md focused. Link to detailed docs when needed.

### Anti-Pattern 7: Manual Gates

❌ **Wrong:**
"I checked manually and coverage looks good."

✅ **Right:**
Run automated gate scripts. Automation doesn't forget or lie.

---

## Conclusion

Spec-driven development is a framework for productive human-AI collaboration. It's not about adding process—it's about removing friction.

**The Three Pillars:**
1. **Specification** - CLAUDE.md provides context
2. **Execution** - Stages provide structure
3. **Verification** - Gates provide proof

**The Core Loop:**
```
BEFORE → DURING → AFTER → BEFORE → ...
(init)   (TDD)    (gate)   (next stage)
```

**The Result:**
- Consistent quality
- Predictable delivery
- Zero context loss
- Objective completion

**Start small. Try one stage. See the results.**
