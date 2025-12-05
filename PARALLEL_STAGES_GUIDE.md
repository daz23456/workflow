# Parallel Stages Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-05

> **Purpose:** Guide for executing multiple stages simultaneously using Git worktrees to achieve 2-4x faster delivery.

> **Prerequisites:** You should be comfortable with the [Stage Execution Framework](./STAGE_EXECUTION_FRAMEWORK.md) before using parallel execution.

---

## Quick Navigation

- [Why Parallel Stages?](#why-parallel-stages)
- [When to Use (and Not Use)](#-when-to-use-parallel-execution)
- [Git Worktree Setup](#git-worktree-setup)
- [6-Step Workflow](#parallel-execution-workflow-6-steps)
- [Planning for Parallelism](#-how-to-plan-stages-for-parallelism)
- [Common Patterns](#common-parallelism-patterns)
- [Validation Checklist](#validation-checklist)

---

## Why Parallel Stages?

**Benefits:**
- **2-4x faster delivery** - Work on multiple stages simultaneously
- **Context preservation** - Each stage has dedicated environment
- **Independent testing** - Run quality gates in parallel
- **Risk isolation** - Issues in one stage don't block others

**Example Savings:**
```
Sequential:  Stage 9.1 (2 weeks) → Stage 9.2 (1 week) → Stage 9.3 (2 weeks) = 5 weeks
Parallel:    Stage 9.1, 9.2, 9.3 running together = 2 weeks (longest stage)

Savings: 3 weeks (60% faster!)
```

---

## ✅ When to Use Parallel Execution

**USE parallel execution when:**
- ✅ Team size ≥2 (multiple developers working simultaneously)
- ✅ Stages are independent (different modules/features)
- ✅ Stage duration >1 week (overhead worth it)
- ✅ Experienced with framework (not learning)
- ✅ Clear file ownership (no overlapping changes)

## ❌ When NOT to Use Parallel Execution

**DON'T use parallel execution when:**
- ❌ Team size = 1 (no benefit, just overhead)
- ❌ Stages are tightly coupled (shared files, database migrations)
- ❌ POC or learning project (keep it simple)
- ❌ Stage duration less than 3 days (overhead not worth it)
- ❌ First time using this framework (master sequential first)

> **🎓 Start Simple:** New to this framework? Execute stages **sequentially** first (1-2 stages). Add parallelism after you're comfortable with the workflow.

---

## Git Worktree Setup

### What are Worktrees?

Multiple working directories from the same git repository. Each worktree can be on a different branch, allowing parallel development.

### Setup Commands

```bash
# 1. Create main worktree (if not already in one)
cd /path/to/your-project
git worktree list  # Check current worktrees

# 2. Create worktrees for parallel stages
git worktree add ../your-project-stage-9.1 -b stage-9.1
git worktree add ../your-project-stage-9.2 -b stage-9.2
git worktree add ../your-project-stage-10 -b stage-10

# 3. Verify worktrees created
git worktree list
# Output:
# /path/to/your-project                    abc123 [master]
# /path/to/your-project-stage-9.1         def456 [stage-9.1]
# /path/to/your-project-stage-9.2         789ghi [stage-9.2]
```

### Directory Structure

```
/path/to/
├── your-project/              # Main worktree (master branch)
├── your-project-stage-9.1/    # Worktree for Stage 9.1
├── your-project-stage-9.2/    # Worktree for Stage 9.2
└── your-project-stage-10/     # Worktree for Stage 10
```

---

## Stage Independence Guidelines

### ✅ GOOD - Stages Can Run in Parallel

- Different modules (UI Builder vs Template Library)
- Different tech stacks (Backend .NET vs Frontend TypeScript)
- Different layers (Core logic vs API layer)
- Independent features (Authentication vs Dashboard)

### ❌ BAD - Stages Must Run Sequentially

- Dependent stages (Stage 2 depends on Stage 1 models)
- Shared file modifications (both modify same controller)
- Database schema changes (migration conflicts)
- Breaking API changes (one stage changes contract, other consumes it)

---

## Parallel Execution Workflow (6 Steps)

### Step 1: Plan Stage Decomposition (15 min)

```bash
# Before starting, analyze dependencies
# Create dependency graph (see Stage Planning section below)
#
#   Stage 9.1 (Visual Builder)
#        ↓
#   Stage 9.4 (Debugging - depends on 9.1)
#
#   Stage 9.2 (Templates) - INDEPENDENT
#   Stage 9.3 (WebSocket) - INDEPENDENT

# Identify parallel groups:
# Group A: 9.1, 9.2, 9.3 (can run together)
# Group B: 9.4 (waits for 9.1)
```

### Step 2: Create Worktrees (5 min)

```bash
# Create worktree for each parallel stage
git worktree add ../your-project-stage-9.1 -b stage-9.1
git worktree add ../your-project-stage-9.2 -b stage-9.2
git worktree add ../your-project-stage-9.3 -b stage-9.3

# Open each in separate terminal/IDE
code /path/to/your-project-stage-9.1  # VSCode window 1
code /path/to/your-project-stage-9.2  # VSCode window 2
code /path/to/your-project-stage-9.3  # VSCode window 3
```

### Step 3: Execute Stages in Parallel (concurrent)

```bash
# Terminal 1: Stage 9.1
cd /path/to/your-project-stage-9.1
# Run full stage workflow (TDD, quality gates, proof)

# Terminal 2: Stage 9.2
cd /path/to/your-project-stage-9.2
# Run full stage workflow (TDD, quality gates, proof)

# Terminal 3: Stage 9.3
cd /path/to/your-project-stage-9.3
# Run full stage workflow (TDD, quality gates, proof)
```

### Step 4: Complete Stages Independently

```bash
# Each worktree completes independently:
# - Write tests (RED)
# - Implement code (GREEN)
# - Refactor (REFACTOR)
# - Run quality gates
# - Create proof file
# - Commit + tag

# Stage 9.1 completes:
cd /path/to/your-project-stage-9.1
git add .
git commit -m "✅ Stage 9.1 Complete: [Feature Name]"
git tag -a stage-9.1-complete -m "Stage 9.1 complete"
git push origin stage-9.1 --tags
```

### Step 5: Merge in Order (sequential merging)

```bash
# IMPORTANT: Merge stages in dependency order
# Even if 9.3 finishes first, merge 9.1 → 9.2 → 9.3

# 1. Merge Stage 9.1 (no dependencies)
cd /path/to/your-project
git checkout master
git merge stage-9.1 --no-ff -m "Merge Stage 9.1: [Feature Name]"

# 2. Merge Stage 9.2 (no dependencies)
git merge stage-9.2 --no-ff -m "Merge Stage 9.2: [Feature Name]"

# 3. Merge Stage 9.3 (no dependencies)
git merge stage-9.3 --no-ff -m "Merge Stage 9.3: [Feature Name]"

# 4. Push integrated work
git push origin master
```

### Step 6: Cleanup Worktrees

```bash
# After successful merge, remove worktrees
git worktree remove ../your-project-stage-9.1
git worktree remove ../your-project-stage-9.2
git worktree remove ../your-project-stage-9.3

# Delete remote branches (optional)
git push origin --delete stage-9.1 stage-9.2 stage-9.3
```

---

## Artifact Isolation (CRITICAL)

**Each worktree has independent artifacts:**

```bash
# Stage 9.1 artifacts
/path/to/your-project-stage-9.1/stage-proofs/stage-9.1/

# Stage 9.2 artifacts
/path/to/your-project-stage-9.2/stage-proofs/stage-9.2/

# Stage 9.3 artifacts
/path/to/your-project-stage-9.3/stage-proofs/stage-9.3/

# After merge, all artifacts preserved in master:
/path/to/your-project/stage-proofs/
├── stage-9.1/
├── stage-9.2/
└── stage-9.3/
```

**No conflicts** because each stage has its own folder!

---

## 📐 How to Plan Stages for Parallelism

### Stage Decomposition Checklist

**Before planning a large stage (>2 weeks), ask:**

1. **Can this be split into independent features?**
   - ✅ YES: Large feature → Multiple independent sub-features
   - ❌ NO: Tightly coupled logic

2. **Do features touch different files/modules?**
   - ✅ YES: UI components in `/components/`, API in `/api/`, services in `/services/`
   - ❌ NO: All changes in same controller file

3. **Are there clear dependency chains?**
   - ✅ YES: Feature A → Feature B (B depends on A)
   - ❌ NO: Circular dependencies (A needs B, B needs A)

4. **Can each substage deliver value independently?**
   - ✅ YES: Each substage is a complete feature users can interact with
   - ❌ NO: Partial implementation, needs other stages to work

5. **Are substages roughly equal size (1-2 weeks)?**
   - ✅ YES: Balanced workload
   - ❌ NO: One stage is 5 weeks, another is 1 day (imbalanced)

### Stage Sizing Guidelines

**Ideal Substage Size:**
- **1-2 weeks** per substage
- **20-50 tests** per substage
- **500-2000 lines** of code per substage
- **3-8 files** created/modified per substage

---

## Example: Stage Decomposition

### ❌ TOO BIG: Original Stage (6.5 weeks)

```markdown
## Stage 9: User Dashboard Feature (6.5 weeks)

### Deliverables:
1. Dashboard UI Components (2 weeks)
2. Data Visualization Library (1 week)
3. Real-Time Updates via WebSocket (2 weeks)
4. Analytics & Reporting (1.5 weeks)
```

### ✅ REFACTORED: Stage 9.1-9.4 (2 weeks with parallelism)

```markdown
## Stage 9.1: Dashboard UI Components (2 weeks)
**Files:**
- `src/web-ui/app/dashboard/page.tsx`
- `src/web-ui/components/dashboard/widgets.tsx`
- `src/web-ui/components/dashboard/layout.tsx`

**Dependencies:** None
**Parallel Group:** A (can run with 9.2, 9.3)

---

## Stage 9.2: Data Visualization Library (1 week)
**Files:**
- `src/web-ui/lib/charts/index.ts`
- `src/web-ui/components/charts/bar-chart.tsx`
- `docs/charts-usage.md`

**Dependencies:** None
**Parallel Group:** A (can run with 9.1, 9.3)

---

## Stage 9.3: Real-Time WebSocket API (2 weeks)
**Files:**
- `src/api/Hubs/DashboardHub.cs`
- `src/web-ui/lib/stores/websocket-store.ts`

**Dependencies:** Existing API layer (from Stage 7)
**Parallel Group:** A (can run with 9.1, 9.2)

---

## Stage 9.4: Analytics & Reporting (1.5 weeks)
**Files:**
- `src/web-ui/components/analytics/reports.tsx`
- `src/web-ui/components/analytics/filters.tsx`

**Dependencies:** Stage 9.1 (uses Dashboard UI components)
**Parallel Group:** B (sequential, waits for 9.1)
```

**Execution Plan:**
- Week 1-2: Run 9.1, 9.2, 9.3 in parallel (3 worktrees)
- Week 3: Run 9.4 (depends on 9.1)
- Total: 3 weeks vs 6.5 weeks sequential (54% faster!)

---

## Dependency Graph Template

**Create this BEFORE starting any stage:**

```
Stage X Dependency Graph
========================

Independent (Parallel Group A):
- Stage X.1: [Name] - [Duration]
- Stage X.2: [Name] - [Duration]
- Stage X.3: [Name] - [Duration]

Dependent (Parallel Group B):
- Stage X.4: [Name] - [Duration] (depends on X.1)

Execution Timeline:
Week 1-2: X.1, X.2, X.3 (parallel in 3 worktrees)
Week 3:   X.4 (sequential, after X.1 merges)

Total: 3 weeks (vs 6 weeks sequential = 50% faster)
```

---

## Stage Planning Template

**For each substage, document:**

```markdown
## Stage X.Y: [Name]

**Duration:** [1-2 weeks]
**Priority:** [P0 Critical / P1 Important / P2 Nice-to-have]

**Files Created/Modified:**
- `path/to/file1.ts` (new)
- `path/to/file2.cs` (modify)
- `docs/feature.md` (new)

**Dependencies:**
- **Required:** Stage X.Y-1 (needs X.Y-1 models/components)
- **Optional:** None

**Parallel Group:** [A/B/C/Sequential]
**Can run in parallel with:** [X.1, X.2] or [None - must run alone]

**Deliverables:**
- [ ] Feature implementation (X files, ~Y lines)
- [ ] Unit tests (≥90% coverage, ~Z tests)
- [ ] Integration tests (~W tests)
- [ ] Documentation (README, ADRs if needed)
- [ ] Quality gates passed (mandatory + optional)
- [ ] Proof file created

**Value Delivered:**
[1-2 sentences: What can users/developers DO with this substage independently?]

Example: "Developers can build interactive dashboards with drag-and-drop widgets. Dashboards can be saved and exported as JSON."
```

---

## Common Parallelism Patterns

### Pattern 1: Layer-Based (Backend → Frontend)

```
Stage X.1: Data Models + Repository (1 week) - Sequential
    ↓
Stage X.2: API Endpoints (1 week) ┐
Stage X.3: UI Components (1 week) ┘ Parallel

Total: 2 weeks (vs 3 weeks sequential)
```

### Pattern 2: Feature-Based (Independent Features)

```
Stage 9.1: Dashboard UI       ┐
Stage 9.2: Visualization Lib  ├─ All Parallel
Stage 9.3: WebSocket API      ┘

Total: 2 weeks (longest stage) vs 5 weeks sequential
```

### Pattern 3: Tech Stack Parallelism

```
Stage X.1: .NET Backend API     ┐
Stage X.2: TypeScript Frontend  ┘ Parallel

Total: 2 weeks (vs 4 weeks sequential)
```

### Pattern 4: Component Isolation (UI)

```
Stage X.1: Auth Component       ┐
Stage X.2: Dashboard Component  ├─ All Parallel
Stage X.3: Settings Component   ┘

Total: 2 weeks (vs 6 weeks sequential)
```

---

## Validation Checklist

**Before creating worktrees, verify:**

- [ ] **File Ownership:** Each substage has clear, non-overlapping file ownership
- [ ] **Independence:** Each substage can pass quality gates independently
- [ ] **Test Isolation:** No shared test fixtures or mocks between substages
- [ ] **Acyclic Dependencies:** Dependency graph has no circular dependencies
- [ ] **Balanced Sizing:** Substages are similar duration (~1-2 weeks each)
- [ ] **Merge Order:** Clear merge sequence documented (dependency order)
- [ ] **Shared Files:** Coordination plan for package.json, .csproj, etc.
- [ ] **Value Delivery:** Each substage delivers independent user/developer value

**If any checkbox is ❌, refactor the stage plan before proceeding.**

---

## Best Practices

### DO:
- ✅ Plan dependencies upfront (create dependency graph)
- ✅ Keep stages small (1-2 weeks max)
- ✅ Use clear file ownership (no overlapping changes)
- ✅ Merge in dependency order (even if finished out of order)
- ✅ Run quality gates in each worktree independently
- ✅ Commit stage proof files before merging

### DON'T:
- ❌ Modify same files in parallel stages (causes conflicts)
- ❌ Share database migrations across parallel stages
- ❌ Create circular dependencies (Stage A needs B, B needs A)
- ❌ Merge stages out of dependency order
- ❌ Skip quality gates because "it's just a small stage"

---

## Related Documentation

- [Stage Execution Framework](./STAGE_EXECUTION_FRAMEWORK.md) - Main framework and quality gates
- [Quality Gates Reference](./STAGE_EXECUTION_FRAMEWORK.md#-quality-gates-reference) - Detailed gate documentation
- [Stage Proof Template](./STAGE_PROOF_TEMPLATE.md) - Template for completion proofs
