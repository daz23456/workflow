# Quick Start: Your First Stage in 30 Minutes

This guide will get you from zero to your first completed stage.

## Prerequisites

- A project with tests configured (any language/framework)
- Claude Code installed
- 30 minutes

## Step 1: Copy the Framework (2 minutes)

```bash
# Copy CLAUDE.md to your project root
cp CLAUDE.md /path/to/your/project/

# Copy scripts
cp -r scripts /path/to/your/project/

# Make scripts executable
chmod +x /path/to/your/project/scripts/*.sh
```

## Step 2: Customize CLAUDE.md (10 minutes)

Open CLAUDE.md and update these sections:

### Project Overview
```markdown
## Project Overview

Build [YOUR PROJECT DESCRIPTION].

**Technology Stack:**
- [Your language/framework]
- [Your test framework]
- [Your other dependencies]
```

### Stage Roadmap
```markdown
## Stage Roadmap

### Stage 1: [Your First Feature] 🔴 NOT STARTED
**Goal:** [What you're building]
**Deliverables:**
- [ ] Deliverable 1
- [ ] Deliverable 2
- [ ] Deliverable 3

**Success Criteria:**
- All tests passing
- Coverage ≥90%
- Quality gates pass
```

### Non-Negotiable Requirements
Keep these as-is or adjust coverage target:
```markdown
## Non-Negotiable Requirements

- ✅ Test-first development (RED-GREEN-REFACTOR)
- ✅ ≥90% code coverage enforced
- ✅ Zero tolerance for test failures
- ✅ No skipped tests
```

## Step 3: Initialize Your First Stage (2 minutes)

```bash
cd /path/to/your/project

# Create stage directory and proof file
./scripts/init-stage.sh --stage 1.0 --name "Your First Feature" --profile BACKEND
```

This creates:
- `stage-proofs/stage-1.0/` directory
- `.stage-state.yaml` tracking file
- `STAGE_1.0_PROOF.md` template

## Step 4: Work with Claude Code (15 minutes)

### Start a Session

Open Claude Code in your project and say:

> "We're starting Stage 1.0. Read CLAUDE.md for context on the project and methodology."

Claude will read your spec and understand:
- Your technology stack
- Your quality requirements
- What you're building

### Build with TDD

Tell Claude what to build:

> "Let's implement [first deliverable]. Start with failing tests."

Claude will:
1. **RED**: Write failing tests first
2. **GREEN**: Implement code to pass
3. **REFACTOR**: Clean up while keeping tests green

### Example Interaction

```
You: "Implement a User class with name and email validation"

Claude: "I'll start with failing tests for the User class...

        [Writes UserTests with validation scenarios]

        Tests written and failing (RED). Now implementing...

        [Writes User class]

        All tests passing (GREEN). Current coverage: 95%.
        Ready to continue?"
```

## Step 5: Complete the Stage (1 minute)

When all deliverables are done:

```bash
# Run quality gates
./scripts/run-quality-gates.sh --stage 1.0 1 2 3 4 5 6 7 8

# Complete and tag
./scripts/complete-stage.sh --stage 1.0 --name "Your First Feature"
```

## What Just Happened?

You successfully:
1. ✅ Set up spec-driven development in your project
2. ✅ Gave Claude Code the context it needs
3. ✅ Built a feature using TDD
4. ✅ Verified quality with gates
5. ✅ Created an audit trail with proof files

## Next Steps

1. **Add more stages** to your roadmap
2. **Customize quality gates** for your stack
3. **Read the full methodology** in `docs/METHODOLOGY.md`

## Context Recovery

Lost your session? Recover in seconds:

```bash
cat stage-proofs/stage-1.0/.stage-state.yaml
```

Then tell Claude:

> "Continuing Stage 1.0. Check .stage-state.yaml for where we left off."

## Troubleshooting

### Claude isn't following TDD
Make sure CLAUDE.md includes:
```markdown
## Non-Negotiable Requirements
- ✅ Test-first development (RED-GREEN-REFACTOR)
```

### Quality gates failing
Check specific gate failures:
```bash
./scripts/run-quality-gates.sh --stage 1.0 1  # Run gate 1 only
```

### Session lost context
Use the state file:
```bash
cat stage-proofs/stage-1.0/.stage-state.yaml
```

---

**Time to first stage: ~30 minutes**

You're now doing spec-driven development!
