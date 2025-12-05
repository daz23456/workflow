# Spec-Driven Development Training Program

## Skip the Slides. Prove It Yourself.

We're not going to lecture you about why this works. **You're going to prove it yourself in 2 hours.**

---

## The Challenge

Complete 3 exercises. Track your own metrics. See if spec-driven development actually delivers.

| Exercise | Time | What You'll Prove |
|----------|------|-------------------|
| [Exercise 1: The Baseline](#exercise-1-the-baseline) | 30 min | How you currently work with AI |
| [Exercise 2: The Spec-Driven Way](#exercise-2-the-spec-driven-way) | 60 min | Same task, with the framework |
| [Exercise 3: Context Recovery](#exercise-3-context-recovery) | 30 min | What happens when you lose context |

**At the end, you'll have hard numbers comparing both approaches.**

---

## Before You Start

### What You Need
- Claude Code (or any AI coding assistant)
- A terminal
- 2 hours of uninterrupted time
- Willingness to track your own metrics honestly

### The Rules
1. **No cheating** - Track real time, real results
2. **Be honest** - The data is for you, not us
3. **Compare fairly** - Same task, different approaches

---

## Exercise 1: The Baseline (30 min)

**Goal:** Establish how you currently work with AI coding assistants.

### The Task
Build a simple retry utility:
- Retry a function up to N times
- Exponential backoff between retries
- Return result on success, throw on final failure
- Include tests

### Instructions

1. **Start a timer**

2. **Open Claude Code and build it however you normally would**
   - No special instructions
   - No framework
   - Just you and Claude

3. **Track these metrics:**

```markdown
## Exercise 1 Results

### Time
- Start time: ____
- End time: ____
- Total: ____ minutes

### Context
- How many times did you re-explain requirements? ____
- Did Claude forget anything you told it earlier? Y/N
- Did you have to correct Claude's approach? Y/N

### Quality
- Does it have tests? Y/N
- What's the test coverage? ____%
- Did tests come before or after the code? ____

### Satisfaction
- Are you confident it works? (1-5): ____
- Would you ship this to production? Y/N
```

4. **Save your code somewhere** (you'll compare it later)

5. **Take a 10 minute break**

---

## Exercise 2: The Spec-Driven Way (60 min)

**Goal:** Build the same thing using spec-driven development.

### Setup (10 min)

1. **Create a fresh directory**
```bash
mkdir retry-exercise && cd retry-exercise
```

2. **Copy the CLAUDE.md template**
```bash
cp /path/to/spec-driven-dev/templates/CLAUDE.md.backend ./CLAUDE.md
```

3. **Customize CLAUDE.md for this exercise:**
```markdown
# CLAUDE.md - Retry Utility

## Project Overview

Build a retry utility with exponential backoff.

**Technology Stack:**
- Language: [Your language]
- Testing: [Your test framework]

**Non-Negotiable Requirements:**
- ✅ Test-first development (RED-GREEN-REFACTOR)
- ✅ ≥90% code coverage enforced
- ✅ Zero tolerance for test failures

## Stage Roadmap

### Stage 1: Retry Utility 🔴 NOT STARTED
**Goal:** Implement retry with exponential backoff
**Deliverables:**
- [ ] Retry function with configurable max attempts
- [ ] Exponential backoff between retries
- [ ] Tests for success, failure, and retry scenarios

**Success Criteria:**
- All tests passing
- Coverage ≥90%
```

4. **Initialize the stage**
```bash
./scripts/init-stage.sh --stage 1.0 --name "Retry Utility" --profile BACKEND
```

### Implementation (40 min)

1. **Start timer**

2. **Open Claude Code and say:**
   > "We're starting Stage 1. Read CLAUDE.md and implement the retry utility. Remember: tests first."

3. **Follow TDD:**
   - Claude writes failing test
   - Claude implements to pass
   - Claude refactors
   - Repeat

4. **When done, run gates:**
```bash
./scripts/run-quality-gates.sh --stage 1.0 1 2 3 4 5 6 7 8
```

### Track These Metrics:

```markdown
## Exercise 2 Results

### Time
- Start time: ____
- End time: ____
- Total: ____ minutes

### Context
- How many times did you re-explain requirements? ____
- Did Claude follow the constraints in CLAUDE.md? Y/N
- Did Claude write tests first? Y/N

### Quality
- Does it have tests? Y/N
- What's the test coverage? ____%
- Did all quality gates pass? Y/N

### Satisfaction
- Are you confident it works? (1-5): ____
- Would you ship this to production? Y/N
```

---

## Exercise 3: Context Recovery (30 min)

**Goal:** Simulate losing context and recovering.

### Part A: Without Framework (15 min)

1. **Close Claude Code completely**
2. **Wait 5 minutes** (simulate context loss)
3. **Open Claude Code fresh**
4. **Try to continue work on Exercise 1's code**

**Track:**
```markdown
## Exercise 3A Results

### Recovery Time
- How long to explain the project context? ____ minutes
- How long until Claude was productive again? ____ minutes

### Accuracy
- Did Claude understand the existing code correctly? Y/N
- Did Claude remember your constraints? Y/N
```

### Part B: With Framework (15 min)

1. **Close Claude Code completely**
2. **Wait 5 minutes**
3. **Open Claude Code fresh**
4. **Say:** "Read the state file and CLAUDE.md, then continue where we left off"
```bash
cat stage-proofs/stage-1.0/.stage-state.yaml
```

**Track:**
```markdown
## Exercise 3B Results

### Recovery Time
- How long to restore context? ____ seconds
- How long until Claude was productive again? ____ seconds

### Accuracy
- Did Claude understand the project? Y/N
- Did Claude follow the same constraints? Y/N
```

---

## Compare Your Results

Fill in this comparison table with your actual data:

| Metric | Without Framework | With Framework | Difference |
|--------|-------------------|----------------|------------|
| Total time | ___ min | ___ min | ___ min |
| Re-explanations needed | ___ | ___ | ___ |
| Tests written first | Y/N | Y/N | - |
| Test coverage | ___% | ___% | ___% |
| Context recovery time | ___ min | ___ sec | ___ faster |
| Confidence (1-5) | ___ | ___ | ___ |
| Production ready | Y/N | Y/N | - |

---

## What Did You Learn?

Answer honestly:

1. **Was the framework worth the setup time?**
   - [ ] Yes, it saved more time than it cost
   - [ ] No, it added overhead without benefit
   - [ ] Mixed - some benefits, some overhead

2. **Would you use this for a real project?**
   - [ ] Yes, definitely
   - [ ] Maybe, for larger projects
   - [ ] No, too much process

3. **What surprised you most?**

   _______________________________________

---

## Next Steps

### If you found value:

1. **Try it on a real task** - Pick something from your backlog
2. **Share your results** - Post your comparison table in #engineering
3. **Complete the certification** - See [CERTIFICATION.md](./CERTIFICATION.md)

### If you're still skeptical:

That's fine. You have data now. Make your own decision.

But consider: the framework cost you ~30 minutes to learn. If it saves you 30 minutes per week on context recovery alone, it pays for itself in week 1.

---

## Quarterly Objective

**Objective:** Evaluate and optionally adopt spec-driven development

**Key Results:**
1. Complete the 3-exercise training program ✅
2. Apply spec-driven methodology to at least one real task
3. Document your findings (comparison metrics)
4. Share learnings with the team

**Success = You made an informed decision based on your own data.**

We're not mandating adoption. We're asking you to try it, measure it, and decide for yourself.
