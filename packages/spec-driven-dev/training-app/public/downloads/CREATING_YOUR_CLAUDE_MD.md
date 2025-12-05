# Creating Your Own CLAUDE.md

> **After completing the training exercises, use this guide to create CLAUDE.md files for your real projects.**

## What is CLAUDE.md?

CLAUDE.md is your **project specification file**. Claude Code reads it automatically at the start of every session, giving it full context about:
- What you're building
- Your technology stack and constraints
- Your quality standards
- Your current progress

**Without CLAUDE.md:** You repeat yourself every session.
**With CLAUDE.md:** Claude picks up exactly where you left off.

---

## The Essential Sections

Every CLAUDE.md should have these sections:

### 1. Project Overview (Required)

```markdown
# CLAUDE.md - [Project Name]

## Project Overview

[2-3 sentences describing what you're building and why]

**Technology Stack:**
- [Language/Framework]
- [Testing framework]
- [Database if applicable]
- [Other key technologies]

**Non-Negotiable Requirements:**
- Test-first development (RED-GREEN-REFACTOR)
- ≥90% code coverage enforced
- [Your specific requirements]
```

### 2. Stage Execution Reference (Required)

```markdown
## Stage Execution Protocol

**Read `STAGE_EXECUTION_FRAMEWORK.md` for the full protocol.**

Quick reference:
\`\`\`bash
# BEFORE: Initialize the stage
./scripts/init-stage.sh --stage X.X --name "Feature Name" --profile BACKEND

# DURING: Build with TDD (RED → GREEN → REFACTOR)

# AFTER: Verify and complete
./scripts/run-quality-gates.sh --stage X.X 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage X.X --name "Feature Name"
\`\`\`
```

### 3. Stage Roadmap (Required)

```markdown
## Stage Roadmap

### Stage 1.0: [First Feature] 🔴 NOT STARTED
**Goal:** [What you're building]

**Deliverables:**
- [ ] Deliverable 1
- [ ] Deliverable 2
- [ ] Deliverable 3

**Success Criteria:**
- All tests passing
- Coverage ≥90%
- Quality gates pass

### Stage 2.0: [Second Feature] 🔴 NOT STARTED
...
```

**Status indicators:**
- 🔴 NOT STARTED
- 🟡 IN PROGRESS
- 🟢 COMPLETE

### 4. Feature Requirements (Recommended)

```markdown
## Feature Requirements

### [Feature Name]

[Description of what the feature does]

\`\`\`typescript
// Interface or API signature
interface Example {
  property: type;
}
\`\`\`

### Behavior

1. Step 1
2. Step 2
3. Step 3

### Test Cases to Cover

- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3
```

### 5. Context Recovery (Recommended)

```markdown
## Context Recovery

If your session resets, recover context:

\`\`\`bash
cat stage-proofs/stage-X.X/.stage-state.yaml
\`\`\`

Then tell Claude: "Read CLAUDE.md and the state file. Continue Stage X.X."
```

---

## Best Practices

### DO:

✅ **Be specific about your tech stack**
```markdown
**Technology Stack:**
- .NET 8 with ASP.NET Core
- xUnit, Moq, FluentAssertions for testing
- PostgreSQL 15 for storage
- System.Text.Json (not Newtonsoft)
```

✅ **List your constraints explicitly**
```markdown
**Non-Negotiable Requirements:**
- Test-first development (RED-GREEN-REFACTOR)
- ≥90% code coverage enforced
- Zero tolerance for test failures
- All public methods must have XML documentation
```

✅ **Keep the stage roadmap updated**
- Mark stages complete as you finish them
- Update status indicators (🔴 → 🟡 → 🟢)
- Add new stages as scope evolves

✅ **Include code examples for APIs**
- Show interfaces, function signatures
- Include expected behavior
- List edge cases to test

### DON'T:

❌ **Don't be vague about requirements**
```markdown
# Bad
Build a good API

# Good
Build a REST API with:
- GET /users - list all users (paginated)
- GET /users/{id} - get user by ID
- POST /users - create user (validates email format)
```

❌ **Don't include implementation details**
- CLAUDE.md is WHAT, not HOW
- Let Claude figure out the implementation
- Focus on requirements and constraints

❌ **Don't forget to update it**
- Stale CLAUDE.md = stale context
- Update after completing stages
- Add learnings and constraints as you discover them

---

## Templates by Project Type

### Backend API (REST/GraphQL)

```markdown
# CLAUDE.md - [API Name]

## Project Overview
REST API for [purpose].

**Technology Stack:**
- [Language] with [Framework]
- [Database]
- [Testing framework]

## Stage Roadmap

### Stage 1.0: Core Models & Database
### Stage 2.0: CRUD Endpoints
### Stage 3.0: Authentication
### Stage 4.0: Authorization
### Stage 5.0: Caching & Performance
```

### Frontend Application

```markdown
# CLAUDE.md - [App Name]

## Project Overview
[Framework] application for [purpose].

**Technology Stack:**
- React/Vue/Angular with TypeScript
- [State management]
- [UI component library]
- [Testing: Jest, Playwright, etc.]

## Stage Roadmap

### Stage 1.0: Project Setup & Design System
### Stage 2.0: Core Components
### Stage 3.0: State Management
### Stage 4.0: API Integration
### Stage 5.0: Authentication UI
```

### CLI Tool

```markdown
# CLAUDE.md - [Tool Name]

## Project Overview
CLI tool that [purpose].

**Technology Stack:**
- [Language]
- [CLI framework: Commander, Cobra, etc.]
- [Testing framework]

## Stage Roadmap

### Stage 1.0: Argument Parsing
### Stage 2.0: Core Commands
### Stage 3.0: Configuration
### Stage 4.0: Output Formatting
```

---

## Example: Complete CLAUDE.md

```markdown
# CLAUDE.md - Task Manager API

## Project Overview

REST API for managing tasks and projects with user authentication.

**Technology Stack:**
- Node.js 20 with Express
- TypeScript 5.x
- PostgreSQL 16
- Prisma ORM
- Jest for testing
- Zod for validation

**Non-Negotiable Requirements:**
- Test-first development (RED-GREEN-REFACTOR)
- ≥90% code coverage enforced
- All endpoints validated with Zod schemas
- JWT authentication required for protected routes

---

## Stage Execution Protocol

**Read `STAGE_EXECUTION_FRAMEWORK.md` for the full protocol.**

---

## Stage Roadmap

### Stage 1.0: Project Setup 🟢 COMPLETE
- Express server with TypeScript
- Prisma schema and migrations
- Jest test setup

### Stage 2.0: Task CRUD 🟡 IN PROGRESS
**Goal:** Implement task creation, reading, updating, deletion

**Deliverables:**
- [ ] POST /tasks - create task
- [ ] GET /tasks - list tasks (with pagination)
- [ ] GET /tasks/:id - get single task
- [ ] PUT /tasks/:id - update task
- [ ] DELETE /tasks/:id - delete task

**Success Criteria:**
- All endpoints have tests
- Coverage ≥90%
- Validation errors return 400 with details

### Stage 3.0: Authentication 🔴 NOT STARTED
### Stage 4.0: Projects & Task Assignment 🔴 NOT STARTED

---

## API Specification

### Task Model

\`\`\`typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /tasks | Create task |
| GET | /tasks | List tasks |
| GET | /tasks/:id | Get task |
| PUT | /tasks/:id | Update task |
| DELETE | /tasks/:id | Delete task |

---

## Context Recovery

\`\`\`bash
cat stage-proofs/stage-2.0/.stage-state.yaml
\`\`\`

Then: "Read CLAUDE.md and the state file. Continue Stage 2.0."
```

---

## Quick Start Checklist

1. [ ] Create `CLAUDE.md` in your project root
2. [ ] Add Project Overview with tech stack
3. [ ] Add Non-Negotiable Requirements
4. [ ] Reference STAGE_EXECUTION_FRAMEWORK.md
5. [ ] Create your Stage Roadmap
6. [ ] Add feature requirements for Stage 1
7. [ ] Include context recovery instructions
8. [ ] Copy the stage execution scripts to `scripts/`

**Time to create:** ~15-30 minutes

---

**Your CLAUDE.md is your project's single source of truth. Keep it updated, and Claude will always know exactly where you are.**
