# Spec-Driven Development Methodology

A structured framework for **human + AI collaboration** that transforms how you build software with Claude Code.

---

## Three Pillars

| Pillar | Purpose | Artifact |
|--------|---------|----------|
| **Specification** | Define what to build, constraints, success criteria | `CLAUDE.md` |
| **Execution** | Structured workflow with checkpoints | Stage Framework |
| **Verification** | Prove quality at every step | Quality Gates |

---

## The Partnership Model

```
┌─────────────────────────────────────────────────────────────┐
│                    YOU (Human)                              │
│  - Define CLAUDE.md (goals, constraints, tech stack)        │
│  - Break work into stages                                   │
│  - Review and guide                                         │
│  - Make architectural decisions                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  CLAUDE CODE (AI)                           │
│  - Reads CLAUDE.md automatically                            │
│  - Writes tests FIRST (TDD enforced)                        │
│  - Implements to pass tests                                 │
│  - Refactors while keeping tests green                      │
│  - Maintains consistency with your architecture             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 QUALITY GATES (Verification)                │
│  - Automated checks prove completion                        │
│  - No subjective "done" - metrics decide                    │
│  - Fail-fast on first failure                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Stage Execution Protocol

Every stage follows three phases: **BEFORE → DURING → AFTER**

### BEFORE: Initialize

```bash
./scripts/init-stage.sh --stage <N> --name "Stage Name" --profile <PROFILE>
```

Creates:
- `stage-proofs/stage-<N>/` directory
- Proof file template
- State tracking file (`.stage-state.yaml`)

### DURING: Build with TDD

```
┌───────────────────────────────────────┐
│  RED → GREEN → REFACTOR → COMMIT      │
│         ↑_____________________↓       │
└───────────────────────────────────────┘
```

1. **RED:** Write a failing test first
2. **GREEN:** Write minimum code to pass
3. **REFACTOR:** Improve while keeping tests green
4. **REPEAT:** Until all deliverables complete

### AFTER: Verify and Complete

```bash
./scripts/run-quality-gates.sh --stage <N>
./scripts/complete-stage.sh --stage <N> --name "Stage Name"
```

---

## Quality Gates

### Complete Gate Reference

| Gate | Name | Description | Fail Condition |
|------|------|-------------|----------------|
| **1** | No Template Files | Ensures boilerplate is removed | `Class1.cs`, `UnitTest1.cs`, `index.ts` templates found |
| **2** | Linting & Code Style | Code follows style guidelines | Any linting errors or warnings |
| **3** | Clean Build | Project compiles without issues | Build errors or warnings |
| **4** | Type Safety | Static type checking passes | TypeScript/mypy type errors |
| **5** | All Tests Pass | Unit tests execute successfully | Any test failure or skip |
| **6** | Code Coverage ≥90% | Sufficient test coverage | Coverage below threshold |
| **7** | Security Scan | No known vulnerabilities | Any CVE in dependencies |
| **8** | Proof File Complete | Documentation is finished | `[TBD]` placeholders remain |
| **9** | Mutation Testing ≥80% | Tests catch code mutations | Mutation score below 80% |
| **10** | Documentation Complete | API docs and README updated | Missing required docs |
| **11** | Integration Tests | Cross-component tests pass | Integration test failures |
| **12** | Performance Regression | No performance degradation | Slower than baseline |
| **13** | API Contract Validation | OpenAPI/schema compliance | Contract violations |
| **14** | Accessibility (a11y) | WCAG compliance testing | Accessibility violations |
| **15** | E2E Testing | End-to-end scenarios pass | E2E test failures |
| **16** | SAST Security | Static security analysis | Security vulnerabilities |
| **21** | Storybook Stories | Component stories exist | Missing stories for components |
| **22** | Screenshot Coverage | Visual regression coverage | Missing required screenshots |

---

## Gate Profiles

Different work requires different verification. Profiles select the appropriate gates automatically.

### BACKEND_DOTNET

For .NET API services and backend business logic.

| Gates | Description |
|-------|-------------|
| 1-8 | Core mandatory gates |
| 9 | Mutation testing (optional) |
| 11 | Integration tests |
| 12 | Performance regression |
| 13 | API contract validation |
| 16 | SAST security scanning |

```bash
./scripts/init-stage.sh --stage 5 --name "User Service" --profile BACKEND_DOTNET
```

### FRONTEND_TS

For TypeScript UI applications with accessibility and E2E requirements.

| Gates | Description |
|-------|-------------|
| 1-8 | Core mandatory gates |
| 14 | Accessibility testing |
| 15 | E2E testing (Playwright/Cypress) |
| 21 | Storybook stories |
| 22 | Screenshot coverage |

```bash
./scripts/init-stage.sh --stage 9.1 --name "Dashboard UI" --profile FRONTEND_TS
```

### FULLSTACK

For full-stack applications combining frontend and backend gates.

| Gates | Description |
|-------|-------------|
| 1-8 | Core mandatory gates |
| 11 | Integration tests |
| 13 | API contract validation |
| 14 | Accessibility testing |
| 15 | E2E testing |
| 21 | Storybook stories |

```bash
./scripts/init-stage.sh --stage 7 --name "Order Flow" --profile FULLSTACK
```

### MINIMAL

For POCs, experiments, and small fixes.

| Gates | Description |
|-------|-------------|
| 1-8 | Core mandatory gates only |

```bash
./scripts/init-stage.sh --stage 0.1 --name "Proof of Concept" --profile MINIMAL
```

### LIBRARY

For shared libraries and packages.

| Gates | Description |
|-------|-------------|
| 1-8 | Core mandatory gates |
| 9 | Mutation testing |
| 10 | Documentation completeness |
| 13 | API contract validation |

```bash
./scripts/init-stage.sh --stage 3 --name "Retry Utility" --profile LIBRARY
```

---

## Gate Details

### Gate 1: No Template Files

**Purpose:** Ensure boilerplate code from `dotnet new` or `npm init` is removed.

**Checks for:**
- `Class1.cs`
- `UnitTest1.cs`
- Default `index.ts` with placeholder content
- `App.tsx` with create-react-app boilerplate

**Why it matters:** Template files indicate incomplete setup and can confuse future developers.

---

### Gate 2: Linting & Code Style

**Purpose:** Enforce consistent code style across the project.

**Tools by language:**
| Language | Tool |
|----------|------|
| TypeScript/JavaScript | ESLint, Prettier |
| C# | dotnet format, StyleCop |
| Python | Ruff, Black, isort |
| Go | golangci-lint |
| Rust | cargo clippy, rustfmt |

**Why it matters:** Consistent style reduces cognitive load and merge conflicts.

---

### Gate 3: Clean Build

**Purpose:** Project compiles without errors or warnings.

**Commands by language:**
| Language | Command |
|----------|---------|
| TypeScript | `tsc --noEmit` |
| C# | `dotnet build --warnaserror` |
| Python | N/A (interpreted) |
| Go | `go build ./...` |
| Rust | `cargo build` |

**Why it matters:** Warnings often become bugs. Treat warnings as errors.

---

### Gate 4: Type Safety

**Purpose:** Static type checking catches errors before runtime.

**Tools:**
| Language | Tool |
|----------|------|
| TypeScript | `tsc --noEmit` |
| Python | `mypy` |
| JavaScript | N/A (use TypeScript) |

**Why it matters:** Type errors caught at compile time are 10x cheaper than runtime errors.

---

### Gate 5: All Tests Pass

**Purpose:** All unit tests execute successfully with no failures or skips.

**Requirements:**
- 0 failures
- 0 skipped tests
- 0 pending tests

**Why it matters:** Skipped tests are technical debt. Every test should run.

---

### Gate 6: Code Coverage ≥90%

**Purpose:** Ensure sufficient test coverage.

**Default threshold:** 90% statement coverage

**Tools:**
| Language | Tool |
|----------|------|
| TypeScript | Vitest, Jest with coverage |
| C# | Coverlet + ReportGenerator |
| Python | pytest-cov |
| Go | go test -cover |

**Why it matters:** Untested code is unknown code. High coverage enables safe refactoring.

---

### Gate 7: Security Scan

**Purpose:** No known vulnerabilities in dependencies.

**Tools:**
| Language | Tool |
|----------|------|
| Node.js | `npm audit --audit-level=high` |
| C# | `dotnet list package --vulnerable` |
| Python | `pip-audit` |
| Go | `govulncheck` |

**Why it matters:** Known vulnerabilities are preventable security incidents.

---

### Gate 8: Proof File Complete

**Purpose:** Documentation of stage completion is finished.

**Checks for:**
- No `[TBD]` placeholders
- All metrics filled in
- All deliverables marked complete/incomplete

**Why it matters:** Proof files create an audit trail and enable context recovery.

---

### Gate 9: Mutation Testing ≥80%

**Purpose:** Verify tests actually catch bugs, not just execute code.

**Tools:**
| Language | Tool |
|----------|------|
| TypeScript | Stryker |
| C# | Stryker.NET |
| Python | mutmut |
| Java | PITest |

**Threshold:** 80% mutation score

**Why it matters:** High coverage with weak assertions gives false confidence.

---

### Gate 10: Documentation Complete

**Purpose:** API documentation and README are up to date.

**Checks:**
- README.md exists and is not empty
- Public APIs have JSDoc/XMLDoc comments
- CHANGELOG.md updated (if applicable)

---

### Gate 11: Integration Tests

**Purpose:** Cross-component integration works correctly.

**Typical tests:**
- Database integration
- External API mocking
- Service-to-service calls

---

### Gate 12: Performance Regression

**Purpose:** No performance degradation from baseline.

**Tools:**
| Language | Tool |
|----------|------|
| C# | BenchmarkDotNet |
| Node.js | Vitest bench |
| Go | go test -bench |

**Why it matters:** Performance regressions compound over time.

---

### Gate 13: API Contract Validation

**Purpose:** API matches OpenAPI/schema specification.

**Checks:**
- Request/response schemas match spec
- Required fields present
- No undocumented endpoints

---

### Gate 14: Accessibility Testing

**Purpose:** UI meets WCAG accessibility standards.

**Tools:**
- axe-core
- Playwright accessibility testing
- jest-axe

**Why it matters:** Accessibility is a legal requirement and good UX.

---

### Gate 15: E2E Testing

**Purpose:** End-to-end user flows work correctly.

**Tools:**
- Playwright
- Cypress
- Selenium

**Why it matters:** Unit tests can pass while user flows are broken.

---

### Gate 16: SAST Security

**Purpose:** Static Application Security Testing for code vulnerabilities.

**Tools:**
| Language | Tool |
|----------|------|
| Multi-language | Semgrep, SonarQube |
| C# | Security Code Scan |
| Python | Bandit |

---

### Gate 21: Storybook Stories

**Purpose:** All UI components have Storybook stories.

**Requirements:**
- Every component in `components/` has a `.stories.tsx` file
- Stories cover main variants and states

**Why it matters:** Stories are living documentation and enable visual testing.

---

### Gate 22: Screenshot Coverage

**Purpose:** Visual regression testing has required screenshots.

**Checks:**
- Screenshots exist for key pages
- Screenshot manifest is complete

---

## Context Recovery

Lost context? Session reset? Recover instantly:

```bash
cat stage-proofs/stage-<N>/.stage-state.yaml
```

Example state file:
```yaml
stage: "5.1"
name: "Retry Logic"
phase: "DURING"
profile: "BACKEND_DOTNET"
started_at: "2025-12-05T10:30:00Z"
current_task: "Implementing exponential backoff"
deliverables:
  - name: "RetryPolicy class"
    status: "complete"
  - name: "Unit tests"
    status: "in_progress"
  - name: "Integration tests"
    status: "pending"
```

Tell Claude: "Read STAGE_EXECUTION_FRAMEWORK.md and the state file. Continue Stage 5.1."

---

## Non-Negotiable Rules

1. **No stage starts without `init-stage.sh`**
2. **Tests are written BEFORE implementation (TDD)**
3. **All gates must pass before completion**
4. **Proof files document everything**
5. **Git tag marks stage completion**

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Code coverage | ≥90% |
| Mutation score | ≥80% |
| Build warnings | 0 |
| Security vulnerabilities | 0 |
| Skipped tests | 0 |
| Context recovery time | <60 seconds |

---

**Quality is enforced, not hoped for. Follow the methodology. Every stage. No exceptions.**
