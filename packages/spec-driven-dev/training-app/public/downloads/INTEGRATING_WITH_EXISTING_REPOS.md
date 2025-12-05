# Integrating Spec-Driven Development with Existing Repos

> **You don't have to start from scratch.** Here's how to add spec-driven development to a project that's already in progress.

## Overview

Adding spec-driven development to an existing repo takes about **30 minutes** and doesn't require refactoring existing code. You're adding structure going forward, not rewriting history.

---

## Step 1: Add the Framework Files (5 min)

Copy these files to your project root:

```
your-project/
├── CLAUDE.md                        # Your project spec (create this)
├── STAGE_EXECUTION_FRAMEWORK.md     # The execution protocol
├── STAGE_PROOF_TEMPLATE.md          # Proof file template
└── scripts/
    ├── init-stage.sh
    ├── run-quality-gates.sh
    └── complete-stage.sh
```

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

---

## Step 2: Create Your CLAUDE.md (15 min)

Start with this template and customize for your project:

```markdown
# CLAUDE.md - [Your Project Name]

## Project Overview

[2-3 sentences about what this project does]

**Technology Stack:**
- [Your language/framework]
- [Your database]
- [Your testing framework]
- [Other key dependencies]

**Non-Negotiable Requirements:**
- Test-first development for new features (RED-GREEN-REFACTOR)
- ≥90% coverage for new code
- [Your team's specific requirements]

---

## Stage Execution Protocol

**Read `STAGE_EXECUTION_FRAMEWORK.md` for the full protocol.**

---

## Current State

**Existing codebase:** [Brief description]
**Test coverage:** [Current %]
**Known tech debt:** [Brief list]

---

## Stage Roadmap

### Stage 1.0: [Your Next Feature] 🔴 NOT STARTED
**Goal:** [What you're building]

**Deliverables:**
- [ ] Deliverable 1
- [ ] Deliverable 2

**Success Criteria:**
- New code has tests
- Coverage ≥90% for new files
- Quality gates pass

---

## Architecture Notes

[Key architectural decisions Claude should know about]

### Project Structure
\`\`\`
src/
├── [folder]/ - [purpose]
├── [folder]/ - [purpose]
└── [folder]/ - [purpose]
\`\`\`

### Key Patterns
- [Pattern 1 and where it's used]
- [Pattern 2 and where it's used]

### Things to Avoid
- [Anti-pattern or legacy approach to avoid]
- [Files/areas that shouldn't be touched]

---

## Context Recovery

\`\`\`bash
cat stage-proofs/stage-X.X/.stage-state.yaml
\`\`\`

Then: "Read CLAUDE.md and the state file. Continue Stage X.X."
```

---

## Step 3: Decide Your Coverage Strategy (5 min)

You have three options for handling existing code:

### Option A: New Code Only (Recommended Start)
- Apply TDD and 90% coverage to NEW code only
- Existing code stays as-is
- Gradually improve coverage over time

```markdown
**Non-Negotiable Requirements:**
- ≥90% coverage for NEW files and functions
- Existing code: maintain current coverage, don't decrease
```

### Option B: Touch It, Test It
- Any file you modify must have tests added
- Coverage requirement applies to modified files

```markdown
**Non-Negotiable Requirements:**
- ≥90% coverage for any file modified in this stage
- Don't modify files unless you're adding tests
```

### Option C: Full Retrofit (Big Investment)
- Add tests to existing code as separate stages
- Stage 1: Add tests to Module A
- Stage 2: Add tests to Module B
- Then continue with new features

```markdown
### Stage 1.0: Retrofit Tests for Auth Module 🔴
**Goal:** Add test coverage to existing authentication code

**Deliverables:**
- [ ] Unit tests for AuthService
- [ ] Integration tests for login flow
- [ ] Coverage ≥90% for src/auth/
```

---

## Step 4: Configure Quality Gates (5 min)

Adjust gate thresholds for your situation:

### For Gradual Adoption

Edit `scripts/run-quality-gates.sh` to focus on new code:

```bash
# Gate 6: Coverage - check only new/modified files
COVERAGE_THRESHOLD=90
COVERAGE_SCOPE="--changedSince=main"  # Or your base branch
```

### For Legacy Codebases

You might need to:
- Skip certain gates initially (document why)
- Set lower thresholds and increase over time
- Exclude legacy directories from coverage checks

```bash
# Example: Exclude legacy code from coverage
COVERAGE_EXCLUDE="--exclude=src/legacy/**"
```

---

## Step 5: Initialize Your First Stage (2 min)

Pick your first feature and initialize:

```bash
./scripts/init-stage.sh --stage 1.0 --name "Your Feature" --profile BACKEND
```

This creates:
- `stage-proofs/stage-1.0/` directory
- State tracking file
- Proof file template

---

## Common Scenarios

### Scenario: Adding a Feature to Legacy Code

```markdown
### Stage 2.0: User Preferences API 🔴 NOT STARTED

**Context:** Adding to existing user module (low test coverage)

**Approach:**
1. Add tests for existing UserService methods we'll use
2. TDD for new PreferencesService
3. Integration tests for new endpoints

**Deliverables:**
- [ ] Tests for UserService.getById() and .update()
- [ ] PreferencesService with full TDD
- [ ] GET/PUT /api/users/{id}/preferences endpoints
- [ ] ≥90% coverage for new code
```

### Scenario: Fixing a Bug

```markdown
### Stage 1.5: Fix Payment Retry Bug 🔴 NOT STARTED

**Bug:** Payments fail silently after 3rd retry

**Approach:**
1. Write failing test that reproduces bug
2. Fix the bug
3. Verify test passes

**Deliverables:**
- [ ] Test case reproducing the bug
- [ ] Fix in PaymentService.processWithRetry()
- [ ] Regression test to prevent recurrence
```

### Scenario: Refactoring

```markdown
### Stage 3.0: Extract Notification Service 🔴 NOT STARTED

**Goal:** Move notification logic from OrderService to dedicated service

**Approach:**
1. Write characterization tests for current behavior
2. Extract NotificationService
3. Verify all tests still pass
4. Add new tests for edge cases

**Deliverables:**
- [ ] Characterization tests for current notification behavior
- [ ] NotificationService extracted
- [ ] OrderService updated to use new service
- [ ] No behavior changes (all tests green)
```

---

## What About Existing Tests?

### If You Have Tests
- Great! Keep them running
- Add them to quality gates
- New code follows TDD; existing tests stay as-is

### If You Have Few/No Tests
- Don't try to retrofit everything at once
- Start with: "new code gets tests"
- Add tests to old code when you touch it
- Consider dedicated "test retrofit" stages for critical paths

### If Tests Are Flaky
- Fix or quarantine flaky tests before starting
- Flaky tests break the feedback loop
- One stage could be: "Stabilize test suite"

---

## Tips for Success

### DO:
✅ Start small - pick one feature for your first stage
✅ Document your existing architecture in CLAUDE.md
✅ Be explicit about what coverage rules apply where
✅ Update CLAUDE.md as you learn more about the codebase
✅ Use stages to gradually improve test coverage

### DON'T:
❌ Try to retrofit tests for everything at once
❌ Set unrealistic coverage targets for legacy code
❌ Skip documenting architectural decisions
❌ Forget to update CLAUDE.md after each stage

---

## Example: Real Integration

Here's a real CLAUDE.md for an existing e-commerce API:

```markdown
# CLAUDE.md - ShopAPI

## Project Overview

REST API for e-commerce platform. In production since 2021.
~50k lines of code, mixed test coverage.

**Technology Stack:**
- Node.js 18 with Express
- TypeScript 5.x
- PostgreSQL 14 + Prisma ORM
- Jest for testing (currently ~45% coverage)
- Redis for caching

**Non-Negotiable Requirements:**
- TDD for all new code
- ≥90% coverage for new files
- Maintain existing coverage (don't decrease)
- All new endpoints need integration tests

---

## Current State

**Test coverage:** 45% overall
**Critical paths covered:** Auth, Checkout, Payments
**Known gaps:** Inventory, Recommendations, Admin

**Tech debt:**
- OrderService is 2000 lines (needs splitting)
- No tests for recommendation engine
- Caching logic duplicated in 5 places

---

## Stage Roadmap

### Stage 1.0: Wishlist Feature 🟡 IN PROGRESS
**Goal:** Let users save items to a wishlist

### Stage 2.0: Inventory Alerts 🔴 NOT STARTED
**Goal:** Notify users when wishlist items are back in stock

### Stage 3.0: Refactor OrderService 🔴 NOT STARTED
**Goal:** Split into Order, Fulfillment, and Invoice services

---

## Architecture Notes

### Project Structure
\`\`\`
src/
├── controllers/  - Express route handlers
├── services/     - Business logic
├── repositories/ - Database access (Prisma)
├── middleware/   - Auth, validation, error handling
└── utils/        - Shared utilities
\`\`\`

### Key Patterns
- Repository pattern for data access
- Service layer for business logic
- Controllers are thin (validation + delegation)

### Things to Avoid
- Don't add logic to controllers
- Don't bypass repositories for DB access
- Don't add to OrderService (it's getting split)
```

---

## Quick Start Checklist

1. [ ] Copy framework files to your project
2. [ ] Create CLAUDE.md with your project details
3. [ ] Document current state (coverage, tech debt)
4. [ ] Decide coverage strategy (new only vs touch-it-test-it)
5. [ ] Configure quality gates for your situation
6. [ ] Initialize your first stage
7. [ ] Tell Claude to read CLAUDE.md and start

**Time to integrate:** ~30 minutes

---

**You don't need a greenfield project. Start where you are, apply the framework to what's next, and gradually improve the codebase over time.**
