# claude.md - Kubernetes-Native Synchronous Workflow Orchestration Engine

## Project Overview

Build a production-grade, enterprise-ready Kubernetes-native workflow orchestration engine for synchronous, user-facing API calls using strict Test-Driven Development (TDD).

**Technology Stack:**
- .NET 8 with ASP.NET Core
- System.Text.Json (single serializer - no Newtonsoft)
- KubeOps 8.x for Kubernetes operator
- JsonSchema.Net 5.x for schema validation
- PostgreSQL 15 for storage
- React 18 + TypeScript for UI
- xUnit, Moq, FluentAssertions for testing
- BenchmarkDotNet, NBomber for performance testing
- New Relic for observability
- GitLab CI for CI/CD

**Non-Negotiable Requirements:**
- ✅ Test-first development (RED-GREEN-REFACTOR)
- ✅ >90% code coverage enforced
- ✅ Performance benchmarks with regression detection
- ✅ Zero tolerance for test failures

---

## Stage Execution Protocol (MANDATORY)

> **📋 CHECKLIST:** `.claude/STAGE_CHECKLIST.md` - the ONLY file you need
> **⚠️ SCRIPTS ARE REQUIRED** - No manual alternatives. If you skip scripts, artifacts go to wrong locations.

### Every Stage: 3 Commands

```bash
# 1. BEFORE: Initialize (creates all files in correct locations)
./scripts/init-stage.sh --stage 9.7 --name "Feature Name" --profile BACKEND_DOTNET

# 2. DURING: Implement with TDD (RED → GREEN → REFACTOR)

# 3. AFTER: Run gates then complete
./scripts/run-quality-gates.sh --stage 9.7 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 9.7 --name "Feature Name"
```

### Gate Profiles

| Profile | Gates | Use For |
|---------|-------|---------|
| `BACKEND_DOTNET` | 1-8 | .NET API/service stages |
| `FRONTEND_TS` | 1-8, 14, 15 | TypeScript UI stages |
| `MINIMAL` | 1-8 | POC, small fixes |

### Parallel Stages (Worktrees)

```bash
./scripts/init-stage.sh --stage 9.7 --name "Feature" --profile BACKEND_DOTNET --worktree
cd ../workflow-stage-9.7
# When done: git checkout master && git merge stage-9.7
```

### Context Recovery

```bash
cat stage-proofs/stage-X/.stage-state.yaml  # Shows phase, progress
./scripts/stage-status.sh --stage X          # Visual summary
```

### ❌ DO NOT (Causes Wrong File Locations)

- ❌ Manually create `stage-proofs/` directories
- ❌ Manually copy proof template
- ❌ Run `run-quality-gates.sh` without `--stage` parameter
- ❌ Manually update CHANGELOG.md
- ❌ Manually create git tags

**Use the scripts. Every time. No exceptions.**

---

## Project Structure
```
workflow-operator/
├── src/
│   ├── WorkflowCore/              # Shared domain
│   │   ├── Models/
│   │   ├── Services/
│   │   └── Interfaces/
│   ├── WorkflowOperator/          # K8s operator
│   ├── WorkflowGateway/           # API gateway
│   ├── WorkflowUI.Backend/        # UI API
│   └── WorkflowUI.Frontend/       # React UI
├── tests/
│   ├── WorkflowCore.Tests/              # Unit tests
│   ├── WorkflowCore.IntegrationTests/   # Integration tests
│   ├── WorkflowCore.PerformanceTests/   # Benchmarks
│   ├── FunctionalTests/                 # E2E functional
│   └── E2ETests/                        # Full system E2E
├── deploy/
│   ├── crds/
│   ├── helm/
│   └── environments/
├── docs/
├── benchmarks/results/
├── CLAUDE.md                            # Main specification (THIS FILE)
├── STAGE_EXECUTION_FRAMEWORK.md         # Stage execution protocol (MANDATORY)
├── STAGE_PROOF_TEMPLATE.md              # Template for stage proof files
├── STAGE_1_PROOF.md                     # Stage 1 completion proof
├── STAGE_2_PROOF.md                     # Stage 2 completion proof
├── ... (one proof file per stage)
├── .gitlab-ci.yml
├── sonar-project.properties
├── Directory.Build.props
└── README.md
```

---

## Completed Stages

**Status:** 73 stages/substages complete - Stage 8 SKIPPED (architectural decision)

For detailed deliverables and TDD instructions, see `COMPLETED_STAGES_ARCHIVE.md`.
For proof of completion, see the respective `STAGE_X_PROOF.md` files or `stage-proofs/` directory.

| Stage | Name | Tests | Coverage | Proof File |
|-------|------|-------|----------|------------|
| 1 | Foundation | 21 | 91.8% | STAGE_1_PROOF.md |
| 2 | Schema Validation | 29 | 91.9% | STAGE_2_PROOF.md |
| 3 | Template Validation | 37 | 90.9% | STAGE_3_PROOF.md |
| 4 | Execution Graph | 41 | 92.1% | STAGE_4_PROOF.md |
| 5 | Workflow Execution | 123 | 91.7% | STAGE_5_PROOF.md |
| 6 | K8s Operator & Webhooks | 142 | 91.2% | STAGE_6_PROOF.md |
| 7 | API Gateway | 51 | 74.5% | STAGE_7_PROOF.md |
| 7.5 | Output Mapping & Parallel | 235 | 92.6% | STAGE_7.5_PROOF.md |
| 7.75 | Execution Plan & Tracing | 557 | 96.8% | STAGE_7.75_PROOF.md |
| 7.8 | Execution History | 546 | 96.8% | STAGE_7.8_PROOF.md |
| 7.85 | Parallel Groups | 570 | 96.8% | STAGE_7.85_PROOF.md |
| 7.9 | Execution Trace & Versioning | 626 | 89.6% | STAGE_7.9_PROOF.md |
| 9.1 | Visual Workflow Builder | 749 | 91.5% | stage-proofs/stage-9.1/ |
| 9.2 | Workflow Templates Library | 1487 | 84.1% | stage-proofs/stage-9.2/ |
| 9.3 | WebSocket API | 28 | - | stage-proofs/stage-9.3/ |
| 9.4 | Enhanced Debugging Tools | 135 | 90.5% | stage-proofs/stage-9.4/ |
| 9.5 | Interactive Documentation | 1552 | 84.5% | stage-proofs/stage-9.5/ |
| 9.6.1 | Transform DSL Backend | 52 | 93.6% | stage-proofs/stage-9.6.1/ |
| 9.6.2 | Transform DSL Frontend | 120 | 84.0% | stage-proofs/stage-9.6.2/ |
| 10 | Performance Benchmarks | - | - | STAGE_10_PROOF.md |
| 10.2 | Observability Dashboard | 3078 | 89.6% | stage-proofs/stage-10.2/ |
| 12.1-12.5 | Neural Visualization | 62 | 93.9% | stage-proofs/stage-12.5/ |
| 13 | AI-Powered Generation | 90 | 93.4% | stage-proofs/stage-13/ |
| 16.1 | OpenAPI Parser | 44 | 90.4% | stage-proofs/stage-16.1/ |
| 17.1-17.3 | Test API Server | 153 | 83.3% | stage-proofs/stage-17.3/ |
| 18.1 | Health Check Service | 1580 | 93.9% | stage-proofs/stage-18.1/ |
| 18.2 | Dashboard Health Widget | 20 | 93.0% | stage-proofs/stage-18.2/ |
| 19.1-19.5 | Control Flow | 861 | 96.7% | stage-proofs/stage-19.5/ |
| 20.1-20.2 | Workflow Triggers | 31 | 91.2% | stage-proofs/stage-20.2/ |
| 21.1-21.4 | Sub-Workflow Composition | 1564 | 100% | stage-proofs/stage-21.4/ |
| 25-25.1 | Local Development CLI | 158 | - | stage-proofs/stage-25.1/ |
| 26 | VS Code Extension | 48 | 92.5% | stage-proofs/stage-26/ |
| 27.1-27.3 | Anomaly Detection & Alerting | 2105 | 98.8% | stage-proofs/stage-27.3/ |
| 28.1 | Circuit Breaker Integration | 541 | 97.0% | stage-proofs/stage-28.1/ |
| 28.2 | Circuit Breaker API | 2105 | 100% | stage-proofs/stage-28.2/ |
| 15.1-15.5 | MCP Consumer (External) | 77 | 98.4% | stage-proofs/stage-15.5/ |
| 14.1-14.4 | Workflow Optimization Engine | - | - | stage-proofs/stage-14.4/ |
| 32.1-32.5 | Workflow & Task Label Management | - | - | stage-proofs/stage-32.5/ |
| 33.2 | Blast Radius API | - | - | stage-proofs/stage-33.2/ |
| 33.3 | Blast Radius UI | 23 | - | stage-proofs/stage-33.3/ |
| 39.1 | Task-Level Caching | 47 | 97% | stage-proofs/stage-39.1/ |

---

## GitLab CI Pipeline

See `.gitlab-ci.yml` for the complete pipeline configuration.

**Key features:**
- Minimum 90% code coverage enforcement
- JUnit test reporting
- Cobertura coverage reporting
- Build only runs after tests pass

---

## Development Workflow

### TDD Cycle (RED-GREEN-REFACTOR)

**For every new feature:**

1. **RED**: Write failing test
```bash
# Create test file
touch tests/WorkflowCore.Tests/Services/NewFeatureTests.cs
# Write test that fails
dotnet test tests/WorkflowCore.Tests
# Test should FAIL
```

2. **GREEN**: Write minimum code to pass
```bash
# Create implementation
touch src/WorkflowCore/Services/NewFeature.cs
# Write minimal implementation
dotnet test tests/WorkflowCore.Tests
# Test should PASS
```

3. **REFACTOR**: Clean up while keeping tests green
```bash
# Improve code quality
dotnet test tests/WorkflowCore.Tests
# Tests should still PASS
```

### Running Tests
```bash
# Run all tests
dotnet test

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run specific test class
dotnet test --filter "FullyQualifiedName~SchemaValidatorTests"

# Run in watch mode (TDD)
dotnet watch test tests/WorkflowCore.Tests

# Generate coverage report
dotnet tool install --global dotnet-reportgenerator-globaltool
reportgenerator -reports:coverage/**/coverage.cobertura.xml -targetdir:coverage/report -reporttypes:Html
```

---

## Performance Testing Setup

See `tests/WorkflowCore.PerformanceTests/` for benchmark implementations.

**Running benchmarks:**
```bash
dotnet run -c Release --project tests/WorkflowCore.PerformanceTests
```

---

## Active Roadmap

> **Completed stages:** See summary table above and `COMPLETED_STAGES_ARCHIVE.md` for details.
> **Future stages:** See `docs/FUTURE_STAGES.md` for detailed specifications.

### Remaining Work

| Stage | Name | Status |
|-------|------|--------|
| 11 | Cloud Deployment & Production Hardening | Not Started |

### Stage 16: OpenAPI Task Generator CLI ✅ COMPLETE
**Completed:** 2025-12-07
**Tests:** 248 new tests across all substages
**Value:** Complete PACT replacement with zero broker infrastructure

| Substage | Name | Tests |
|----------|------|-------|
| 16.2 | Task Generator | 46 |
| 16.3 | Sample Workflow Generator | 15 |
| 16.4 | Version Management | 14 |
| 16.5 | CLI Integration | 15 |
| 16.6 | CI/CD Integration | 39 |
| 16.7 | Field-Level Usage Tracking | 53 |
| 16.8 | Contract Verification | 66 |

### Stage 8: SKIPPED
**Architectural Decision:** Stage 8 (pause/resume, state recovery) is designed for async workflows but this engine is synchronous with 30s max execution. All valuable features already delivered in Stages 7.8-7.9.

---

## Quality Gates (Enforced)

### Every Commit Must:
- [ ] All unit tests pass (100%)
- [ ] Code coverage ≥ 90%
- [ ] No compiler warnings
- [ ] Code formatted (dotnet format)
- [ ] All new code follows TDD (test written first)

### Every Merge Must:
- [ ] All integration tests pass
- [ ] Performance benchmarks show no regression
- [ ] Code review approved
- [ ] All validation features have comprehensive tests:
  - [ ] Schema validation tests
  - [ ] Type compatibility tests
  - [ ] Template parsing tests
  - [ ] Circular dependency detection tests

### Every Deployment Must:
- [ ] All functional tests pass
- [ ] Load tests pass
- [ ] E2E tests pass
- [ ] Security scan passed
- [ ] Validation webhooks tested in staging
- [ ] No workflows can be deployed that fail validation

### Production Readiness Checklist:
- [ ] **Schema Validation**: All inputs/outputs validated against JSON Schema
- [ ] **Type Safety**: Type compatibility checked before workflow deployment
- [ ] **Template Validation**: All templates parsed and validated
- [ ] **Dependency Checking**: Circular dependencies detected and rejected
- [ ] **Error Messages**: All errors include helpful messages and suggested fixes
- [ ] **Admission Webhooks**: Invalid resources rejected at apply-time
- [ ] **Dry-Run Mode**: Users can test workflows without side effects
- [ ] **Breaking Change Detection**: Schema evolution protected
- [ ] **Observability**: All validation failures logged and tracked
- [ ] **Documentation**: Error messages link to docs

---

## Getting Started Checklist

1. **Clone or create repository**
2. **Read `STAGE_EXECUTION_FRAMEWORK.md` in full** ← MANDATORY FIRST STEP
3. **Understand the stage execution protocol (BEFORE, DURING, AFTER)**
4. **Review Stage 1 objectives and success criteria**
5. **Run initial setup:**
```bash
   dotnet new sln -n WorkflowOperator
   dotnet new classlib -n WorkflowCore -o src/WorkflowCore
   dotnet new xunit -n WorkflowCore.Tests -o tests/WorkflowCore.Tests
   dotnet sln add src/WorkflowCore/WorkflowCore.csproj
   dotnet sln add tests/WorkflowCore.Tests/WorkflowCore.Tests.csproj
```

6. **Add dependencies (see Stage 1, Task 1.1)**
7. **Create first test (SchemaDefinitionTests.cs) - RED**
8. **Run test - watch it FAIL**
9. **Implement code to make test PASS - GREEN**
10. **Refactor while keeping tests GREEN**
11. **Commit with passing tests**
12. **Repeat for next feature until stage complete**
13. **Create STAGE_1_PROOF.md with results**
14. **Commit stage completion and tag**

---

## Success Criteria

### Code Quality:
- ✅ Every feature has tests written FIRST
- ✅ All tests pass before committing
- ✅ Code coverage never drops below 90%
- ✅ CI pipeline is always green
- ✅ Performance benchmarks show no regression
- ✅ Zero production incidents from regressions

### Production Readiness:
- ✅ **Impossible to deploy broken workflows**
  - Schema validation catches errors before deployment
  - Type compatibility verified at design time
  - Circular dependencies rejected immediately
- ✅ **Developer Experience is exceptional**
  - Clear, actionable error messages with suggested fixes
  - Dry-run mode for safe testing
  - Real-time validation feedback in UI
- ✅ **Quality is built-in, not bolted on**
  - TDD ensures every feature is testable
  - Validation happens at every stage (design, deploy, runtime)
  - Breaking changes are prevented, not discovered in production
- ✅ **Observability from day one**
  - All validation failures logged and tracked
  - Execution traces show exactly what happened
  - Performance metrics collected continuously

### Key Differentiators:
1. **POC with production-grade quality** - Even prototypes follow strict quality standards
2. **Fail fast** - Errors caught at design time, not runtime
3. **Developer-friendly** - Validation helps users succeed, doesn't block them
4. **Zero surprises** - If it deploys, it works

---

**This is your complete specification. Follow TDD religiously: RED → GREEN → REFACTOR. No exceptions.**

**Remember: We're building a POC, but quality is non-negotiable. Every line of code must be production-ready.**

**⚠️ CRITICAL: Every stage MUST follow the STAGE_EXECUTION_FRAMEWORK.md protocol:**
- **BEFORE**: Review objectives, value, and success criteria in framework
- **DURING**: TDD (RED-GREEN-REFACTOR), progress tracking, quality gates
- **AFTER**: Create STAGE_X_PROOF.md, generate reports, commit with tag, get sign-off

**Files You Must Use:**
- `STAGE_EXECUTION_FRAMEWORK.md` - Read before starting ANY stage
- `STAGE_PROOF_TEMPLATE.md` - Template for proof files
- `STAGE_X_PROOF.md` - Create one for each completed stage
- `CHANGELOG.md` - Updated after each stage completion

**No stage begins without framework review. No stage completes without proof file. No exceptions.**