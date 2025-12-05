# create-spec-driven

Interactive CLI to set up a repository for **Spec-Driven Development** with Claude Code and the Stage Execution Framework.

## Quick Start

```bash
# Navigate to your project directory
cd your-project

# Run the CLI
npx create-spec-driven
```

## What It Does

The CLI asks questions about your project and generates:

```
your-project/
├── CLAUDE.md                      # Project specification (Claude reads this)
├── STAGE_EXECUTION_FRAMEWORK.md   # Stage workflow protocol
├── STAGE_PROOF_TEMPLATE.md        # Template for completion proofs
├── scripts/
│   ├── init-stage.sh              # Initialize a new stage
│   ├── run-quality-gates.sh       # Run quality checks
│   └── complete-stage.sh          # Complete and tag a stage
├── .claude/
│   └── settings.json              # Claude Code permissions
└── stage-proofs/                  # Stage completion artifacts
```

## Questions Asked

### Project Basics
- Project name
- Description
- Project type (API, full-stack, frontend, library, CLI)

### Technology Stack
- Primary language (TypeScript, C#, Python, Go, etc.)
- Framework
- Additional technologies

### Testing Strategy
- Test framework
- Coverage target (default: 90%)
- Mutation testing (optional)
- E2E testing (optional)

### Quality Standards
- Non-negotiable requirements (TDD, coverage, linting, security)
- Strict mode (fail-fast on gate failure)

### Initial Stage Planning
- First stage name and goal
- Deliverables
- Future stages overview

### Claude Code Preferences
- AI coding guidelines
- Custom constraints

## After Setup

1. **Review CLAUDE.md** - Customize as needed
2. **Open Claude Code** in the directory
3. **Tell Claude:** "Read CLAUDE.md - we're starting Stage 1"
4. **Follow TDD:** RED → GREEN → REFACTOR
5. **Run gates:** `./scripts/run-quality-gates.sh --stage 1`
6. **Complete:** `./scripts/complete-stage.sh --stage 1 --name "Stage Name"`

## Supported Languages

- TypeScript / JavaScript
- C# (.NET)
- Python
- Go
- Rust
- Java

Each generates appropriate test/build/lint commands in the scripts.

## License

MIT
