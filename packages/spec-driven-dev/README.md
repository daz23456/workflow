# Spec-Driven Development Framework

A structured framework for **human + AI collaboration** that transforms how you build software with Claude Code.

## Quick Start

```bash
# 1. Copy the framework to your project
cp -r packages/spec-driven-dev/* /path/to/your/project/

# 2. Customize CLAUDE.md for your project
# Edit the Stage Roadmap and technology stack sections

# 3. Start your first stage
./scripts/init-stage.sh --stage 1.0 --name "Your First Feature" --profile BACKEND

# 4. Work with Claude Code
# Say: "We're starting Stage 1.0, read CLAUDE.md for context"
```

## What's Included

```
spec-driven-dev/
├── CLAUDE.md                    # Main specification (copy to project root)
├── README.md                    # This file
├── QUICKSTART.md               # 30-minute getting started guide
├── scripts/
│   ├── init-stage.sh           # Initialize a new stage
│   ├── run-quality-gates.sh    # Run quality verification
│   └── complete-stage.sh       # Complete and tag a stage
├── templates/
│   ├── CLAUDE.md.backend       # Template for backend projects
│   ├── CLAUDE.md.frontend      # Template for frontend projects
│   ├── CLAUDE.md.fullstack     # Template for full-stack projects
│   └── STAGE_PROOF_TEMPLATE.md # Proof file template
└── docs/
    ├── WHY_SPEC_DRIVEN.md      # The case for this approach
    ├── OBJECTION_HANDLING.md   # Common objections and responses
    └── METHODOLOGY.md          # Deep reference on the methodology
```

## The Partnership Model

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
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 QUALITY GATES (Verification)            │
│  ✅ Build passes    ✅ Tests pass    ✅ Coverage ≥90%    │
│  ✅ No vulnerabilities    ✅ Proof file complete        │
└─────────────────────────────────────────────────────────┘
```

## Why Use This?

| Problem | Solution |
|---------|----------|
| Claude generates code that doesn't fit your architecture | Context in CLAUDE.md |
| Code works but has no tests | TDD enforced by gates |
| Session resets = lost context | State in `.stage-state.yaml` |
| "Almost done" for weeks | Objective proof files |
| Technical debt accumulates | Quality gates catch it |

## Results from Production Use

- **26+ stages** completed with consistent quality
- **3,900+ tests** written with TDD
- **90%+ coverage** maintained across entire codebase
- **Zero regressions** from tested code

## Stage Execution Protocol

Every stage follows three phases:

### BEFORE: Initialize
```bash
./scripts/init-stage.sh --stage 1.0 --name "Feature Name" --profile BACKEND
```

### DURING: Build with TDD
```
RED → GREEN → REFACTOR → COMMIT → REPEAT
```

### AFTER: Verify and Complete
```bash
./scripts/run-quality-gates.sh --stage 1.0 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 1.0 --name "Feature Name"
```

## Quality Gates

| Gate | What It Checks |
|------|----------------|
| 1 | No template files |
| 2 | Linting passes |
| 3 | Build succeeds |
| 4 | Type safety |
| 5 | All tests pass |
| 6 | Coverage ≥90% |
| 7 | Security scan |
| 8 | Proof file complete |

## Getting Started

See [QUICKSTART.md](./QUICKSTART.md) for a 30-minute guide to your first stage.

## License

MIT
