# Objection Handling Guide

Common objections to spec-driven development and how to address them.

---

## "This is too much process"

### The Objection
"We're a small team / startup / moving fast. We don't have time for all this process."

### The Response

This isn't process for process's sake. It's **structure that saves time**.

**Time spent without framework:**
- 30+ min/session recovering context
- Hours debugging code that wasn't tested
- Days on rework from inconsistent quality
- Weeks on features that were "almost done"

**Time spent with framework:**
- 30 seconds context recovery (read state file)
- Minutes catching bugs (tests run first)
- Consistent quality (gates enforce standards)
- Clear completion (proof file = done)

**The framework doesn't slow you down. It removes friction.**

---

## "I don't have time to write tests first"

### The Objection
"TDD takes too long. I need to ship now."

### The Response

You're already spending time on bugs. The question is when.

| When Bug Found | Cost |
|----------------|------|
| At commit (TDD) | 5 minutes |
| In code review | 30 minutes |
| In QA | 2 hours |
| In production | 8+ hours (plus reputation damage) |

**TDD isn't extra work. It's work done at the cheapest time.**

Real metrics from production use:
- 90%+ coverage maintained across 26+ stages
- Zero production regressions from tested code
- Refactoring is safe (tests catch mistakes)

---

## "90% coverage is unrealistic"

### The Objection
"90% coverage is aspirational. Real projects can't maintain that."

### The Response

90% is achievable when:
1. Tests are written FIRST (TDD)
2. Quality gates enforce it (can't skip)
3. AI helps write tests (Claude generates test cases)

**The secret:** When you write tests first, coverage is a natural byproduct. You only write code that's already covered.

Projects that struggle with coverage typically:
- Write tests after the fact
- Have no enforcement mechanism
- Allow "we'll add tests later" (they won't)

---

## "CLAUDE.md is just documentation that gets stale"

### The Objection
"Documentation always gets outdated. This will too."

### The Response

CLAUDE.md is different because:

1. **Claude reads it every session** - If it's wrong, you notice immediately
2. **It's the source of truth** - Not a reference doc, THE spec
3. **Stages update it** - Completion status is updated as you work
4. **Proof files link to it** - Creates accountability

Traditional docs get stale because they're separate from the work. CLAUDE.md IS the work.

---

## "We have our own process"

### The Objection
"We already have Jira/Linear/Notion/etc. Why add this?"

### The Response

This framework complements your existing tools. It doesn't replace them.

| Tool | Purpose |
|------|---------|
| Jira/Linear | Track tickets, assign work |
| CLAUDE.md | AI context, constraints, stage definitions |
| Your CI/CD | Run builds and tests |
| Quality gates | Verify stage completion |

**CLAUDE.md is specifically for AI collaboration.** Your other tools don't solve the context loss problem with AI assistants.

---

## "This only works for your tech stack"

### The Objection
"You use .NET. We use Python/Go/Node/etc."

### The Response

The framework is **technology-agnostic**. The principles work everywhere:

| Concept | .NET Version | Your Version |
|---------|--------------|--------------|
| Test runner | `dotnet test` | `pytest` / `go test` / `npm test` |
| Coverage | `coverlet` | `coverage.py` / `go test -cover` / `vitest` |
| Build | `dotnet build` | `make` / `go build` / `npm run build` |
| Linting | `dotnet format` | `ruff` / `golangci-lint` / `eslint` |

Templates are provided for:
- Backend (generic)
- Frontend (TypeScript/React)
- Full-stack

Customize the quality gate commands for your stack.

---

## "AI writes code without tests anyway"

### The Objection
"Claude will just generate code. I can't force it to write tests first."

### The Response

Claude follows explicit instructions. CLAUDE.md says:

```markdown
**Non-Negotiable Requirements:**
- ✅ Test-first development (RED-GREEN-REFACTOR)
- ✅ ≥90% code coverage enforced
```

When Claude reads this, it writes tests first. Try it:

```
You: "Implement a retry policy. Read CLAUDE.md for constraints."

Claude: "I see from CLAUDE.md that TDD is required. Let me start
        with failing tests for the retry logic..."
```

**Claude is remarkably good at following explicit constraints.**

---

## "Quality gates will slow us down"

### The Objection
"Running 8 gates after every change is too slow."

### The Response

Gates run at **stage completion**, not every commit.

A stage is 1-2 weeks of work. Running gates once at the end takes 2-5 minutes.

The alternative? Finding out in production that:
- Coverage dropped to 60%
- A vulnerability was introduced
- The build has warnings

**2 minutes of gates vs. hours of firefighting.**

---

## "We don't need proof files"

### The Objection
"Proof files seem like busywork. The code is the proof."

### The Response

Code is NOT proof of:
- What requirements were met
- What coverage was achieved
- When the work was completed
- What decisions were made

Proof files provide:
- **Audit trail** - When was this done? What was the result?
- **Onboarding** - New devs read proofs to understand history
- **Accountability** - Metrics don't lie
- **Retrospectives** - What went well? What didn't?

```markdown
## Stage 3.0 Completion Proof
- Tests: 45/45 passing
- Coverage: 94.2%
- Completed: 2025-01-15

## What Went Well
- TDD caught 3 edge cases early

## Lessons Learned
- Should have broken this into smaller stages
```

**Proof files are not busywork. They're institutional memory.**

---

## "This assumes I use Claude Code"

### The Objection
"I use Copilot / Cursor / something else."

### The Response

The framework works with any AI coding assistant:

1. **CLAUDE.md** works because AI reads project files
2. **Stages** are a human workflow concept
3. **Quality gates** are just commands (any CI can run them)
4. **Proof files** are markdown (universal)

The principles apply regardless of which AI you use:
- Provide context (CLAUDE.md)
- Enforce quality (gates)
- Verify completion (proofs)

---

## "My team won't adopt this"

### The Objection
"I like this but my team won't follow it."

### The Response

Start small:

1. **Try it yourself** for 2-3 stages
2. **Show the results** (coverage, completion time, no regressions)
3. **Share the proof files** (metrics speak louder than opinions)
4. **Offer to help** one teammate try it

Adoption happens when people see results, not when they're told to follow a process.

---

## "What if the gates fail?"

### The Objection
"What do we do when gates fail? Just skip them?"

### The Response

**Never skip gates.** If a gate fails, you have two options:

1. **Fix the issue** (preferred)
   - Coverage too low? Add tests
   - Build warnings? Fix them
   - Vulnerability found? Patch it

2. **Adjust expectations** (rare, requires justification)
   - Document why the exception is acceptable
   - Get team agreement
   - Add a follow-up item to address it

Skipping gates defeats the purpose. The whole point is that gates are non-negotiable.

---

## Summary: The Real Objection

Most objections boil down to one fear:

> "This will slow me down."

The truth is the opposite. The framework **removes friction**:

- No more context recovery
- No more quality surprises
- No more "is it done?" debates
- No more rework from skipped tests

**Try it for one stage. The results speak for themselves.**
