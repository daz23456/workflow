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

**Status:** 44 stages/substages complete - Stage 8 SKIPPED (architectural decision)
*Note:* Stage breakdown refined - original 11 stages expanded to focused substages
*Note:* Stage 8 skipped as it's designed for async workflows, not synchronous execution model

Detailed TDD implementation instructions for Stages 1-4 have been archived to `COMPLETED_STAGES_ARCHIVE.md`.
For proof of completion and actual results, see the respective `STAGE_X_PROOF.md` files or `stage-proofs/` directory.

### Stage 1: Foundation ✅
**Status:** Complete  
**Proof:** `STAGE_1_PROOF.md`  
**Metrics:** 21/21 tests, 91.8% coverage, 0 vulnerabilities

**Deliverables:**
- Project structure (.NET 8 solution)
- Schema models (SchemaDefinition, PropertyDefinition)
- CRD models (WorkflowTaskResource, WorkflowResource)
- Schema parser (JsonSchema.Net integration)
- Type compatibility checker (recursive validation)
- Error message standards

### Stage 2: Schema Validation ✅
**Status:** Complete  
**Proof:** `STAGE_2_PROOF.md`  
**Metrics:** 29/29 tests, 91.9% coverage, 0 vulnerabilities

**Deliverables:**
- ValidationResult and ValidationError models
- ISchemaValidator interface
- SchemaValidator implementation (JsonSchema.Net integration)

### Stage 3: Template Validation ✅
**Status:** Complete  
**Proof:** `STAGE_3_PROOF.md`  
**Metrics:** 37/37 tests, 90.9% coverage, 0 vulnerabilities

**Deliverables:**
- TemplateParser service (regex-based parsing)
- TemplateParseResult, TemplateExpression models
- WorkflowValidator service (orchestrates all validations)
- Updated TypeCompatibilityChecker and ErrorMessageBuilder

### Stage 4: Execution Graph ✅
**Status:** Complete  
**Proof:** `STAGE_4_PROOF.md`  
**Metrics:** 41/41 tests, 92.1% coverage, 0 vulnerabilities

**Deliverables:**
- ExecutionGraph model (cycle detection, topological sort)
- ExecutionGraphBuilder service
- Circular dependency detection with clear error messages

### Stage 5: Workflow Execution ✅
**Status:** Complete  
**Proof:** `STAGE_5_PROOF.md`  
**Metrics:** 123/123 tests, 91.7% coverage, 0 vulnerabilities, 74.30% mutation score

**Deliverables:**
- TemplateResolver service (runtime template resolution)
- RetryPolicy service (exponential backoff)
- HttpTaskExecutor service (HTTP execution with retries)
- WorkflowOrchestrator service (dependency-aware execution)
- HttpClientWrapper (testable HTTP client)

### Stage 6: Kubernetes Operator with Validation Webhooks ✅
**Status:** Complete  
**Proof:** `STAGE_6_PROOF.md`  
**Metrics:** 142/142 tests, 91.2% coverage, 0 vulnerabilities

**Deliverables:**
- WorkflowTaskController (reconciles WorkflowTask CRDs)
- WorkflowController (reconciles Workflow CRDs)
- WorkflowTaskValidationWebhook (validates HTTP tasks)
- WorkflowValidationWebhook (validates workflows, templates, dependencies)
- AdmissionResult, WorkflowTaskStatus, WorkflowStatus models

**Value Delivered:** Fail-fast validation at kubectl apply time prevents invalid workflows from deployment.

### Stage 7: API Gateway ✅
**Status:** Complete
**Proof:** `STAGE_7_PROOF.md`
**Metrics:** 51/51 tests, 74.5% coverage, 0 vulnerabilities

**Deliverables:**
- Workflow execution API (POST /api/v1/workflows/{name}/execute)
- Dry-run testing API (POST /api/v1/workflows/{name}/test)
- Workflow management API (GET /api/v1/workflows, GET /api/v1/tasks)
- Dynamic endpoint registration per workflow
- Background workflow discovery service with caching
- Input validation against workflow schemas
- Swagger/OpenAPI documentation

**Value Delivered:** Synchronous workflow execution API with input validation and dry-run testing capability.

### Stage 7.5: Output Mapping & Parallel Execution ✅
**Status:** Complete
**Proof:** `STAGE_7.5_PROOF.md`
**Metrics:** 235/235 tests, 92.6% coverage, 0 vulnerabilities

**Deliverables:**
- Workflow output mapping (expose task outputs as workflow outputs)
- Output mapping validation (at workflow definition time)
- Independent task identification in execution graph
- Parallel task execution with Task.WhenAll()
- Configurable parallelism limits (max concurrent tasks with SemaphoreSlim)
- Per-task timeout support (timeout property + enforcement)
- Timeout string parsing (30s, 5m, 2h, 500ms)
- Performance validation tests (2x+ speedup for parallel execution)

**Value Delivered:** Dramatically faster workflow execution through parallelism, better data flow control through output mapping, and reliability through per-task timeouts.

### Stage 7.9: Execution Trace & Workflow Versioning ✅
**Status:** Complete
**Proof:** `STAGE_7.9_PROOF.md`
**Metrics:** 626/626 tests (34 new tests), 89.6% coverage (WorkflowGateway), 0 vulnerabilities

**Deliverables:**
- Workflow Versioning Service (SHA256 hash-based change detection)
- Automatic version tracking in WorkflowWatcherService
- Workflow versions API endpoint (GET /api/v1/workflows/{name}/versions)
- Execution Trace Service (wait time calculation, dependency resolution)
- Execution trace API endpoint (GET /api/v1/executions/{id}/trace)
- Actual parallel execution detection from timing analysis

**Value Delivered:** Deep debugging capability with execution traces, workflow change tracking for audit/compliance, wait time visibility for bottleneck identification, and parallel execution verification.

### Stage 7.75: Execution Plan & Enhanced Tracing ✅
**Status:** Complete
**Proof:** `STAGE_7.75_PROOF.md`
**Metrics:** 557/557 tests, 96.8% coverage, 0 vulnerabilities

**Deliverables:**
- Enhanced execution plan with parallel group detection
- Template resolution preview in dry-run mode
- Time estimation based on historical data

### Stage 7.8: Execution History & Task Details ✅
**Status:** Complete
**Proof:** `STAGE_7.8_PROOF.md`
**Metrics:** 546/546 tests, 96.8% coverage, 0 vulnerabilities

**Deliverables:**
- Execution ID generation and database persistence
- Task-level details in API responses
- List executions endpoint (GET /api/v1/workflows/{name}/executions)
- Get execution details endpoint (GET /api/v1/executions/{id})

### Stage 7.85: Parallel Groups & Enhanced Execution Plan ✅
**Status:** Complete
**Proof:** `STAGE_7.85_PROOF.md`
**Metrics:** 570/570 tests, 96.8% coverage, 0 vulnerabilities

**Deliverables:**
- Parallel group detection in execution graph
- Enhanced execution plan model with group visualization
- Template resolution preview and time estimation

### Stage 9.1: Visual Workflow Builder ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-9.1/STAGE_9.1_PROOF.md`
**Metrics:** 749/749 tests, 91.53% coverage, 0 vulnerabilities

**Deliverables:**
- React Flow-based workflow canvas
- Drag-and-drop task node library
- Visual dependency management (connect nodes)
- Real-time YAML preview (bidirectional sync)
- Inline validation feedback
- 20+ React component tests + E2E tests with Playwright

**Value Delivered:** 5-minute time to first workflow for non-technical users!

### Stage 9.3: WebSocket API for Workflow Execution ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-9.3/STAGE_9.3_PROOF.md`
**Metrics:** 28/28 tests

**Deliverables:**
- SignalR WebSocket hub for real-time execution events
- Event types: WorkflowStarted, TaskStarted, TaskCompleted, WorkflowCompleted
- Frontend WebSocket client with React hook (useWebSocketWorkflowExecution)
- Connection management (pooling, heartbeat, reconnection)

**Value Delivered:** Real-time workflow execution with push notifications - no polling!

### Stage 9.4: Enhanced Debugging Tools ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-9.4/STAGE_9.4_PROOF.md`
**Metrics:** 135/135 tests (12 E2E), 90.54% coverage, 0 vulnerabilities

**Deliverables:**
- Execution time-travel UI (scrub through timeline)
- Step-through mode with manual approval
- Execution replay from database
- Side-by-side execution comparison
- Visual debugging aids (highlight current task, data flow on edges)
- 8 debugging-specific React components

**Value Delivered:** Reduce debugging time from hours to minutes!

### Stage 9.6.1: Transform DSL Backend Foundation ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-9.6.1/STAGE_9.6.1_PROOF.md`
**Metrics:** 52/52 tests, 93.6% coverage, 0 vulnerabilities

**Deliverables:**
- Transform DSL parser and evaluator
- Operations: map, filter, select, flatten, sort, limit, distinct
- Pipeline composition with chaining
- Schema inference for transform outputs
- Integration with workflow execution

### Stage 10 Phase 1: Performance Benchmarks ✅
**Status:** Complete
**Proof:** `STAGE_10_PROOF.md`
**Metrics:** BenchmarkDotNet results committed

**Deliverables:**
- BenchmarkDotNet integration for critical paths
- Orchestration overhead benchmarks
- Schema validation performance tests
- Template resolution benchmarks
- Baseline metrics established for regression detection

### Stage 9.2: Workflow Templates Library ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-9.2/STAGE_9.2_PROOF.md`
**Metrics:** 1487/1487 tests, 84.08% coverage, 0 vulnerabilities

**Deliverables:**
- Template browser UI with search & filter
- 9 demo templates across 4 categories
- One-click deploy to visual builder
- Template preview (YAML + visual graph)

**Value Delivered:** Reduce time to first workflow from 30 minutes to 2 minutes!

### Stage 9.5: Interactive Documentation ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-9.5/STAGE_9.5_PROOF.md`
**Metrics:** 1552/1552 tests, 84.49% coverage, 0 vulnerabilities

**Deliverables:**
- Inline contextual help system
- Interactive playground with lessons
- Guided tours for first-time users
- Progressive disclosure of features

**Value Delivered:** Self-service onboarding - no hand-holding needed!

### Stage 9.6.2: Transform DSL Frontend Builder ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-9.6.2/STAGE_9.6.2_PROOF.md`
**Metrics:** 120/120 tests + 15 E2E, 84.03% coverage, 0 vulnerabilities

**Deliverables:**
- Visual transform pipeline builder
- Drag-and-drop transform operations
- Live preview of transformation results
- Schema-aware operation suggestions

### Stage 10.2: Observability Dashboard ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-10.2/STAGE_10.2_PROOF.md`
**Metrics:** 3078/3078 tests, 89.6% coverage (Gateway), 0 vulnerabilities

**Deliverables:**
- Backend metrics API (P50/P95/P99 latency, throughput, error rates)
- React dashboard with real-time charts
- Degradation detection and alerting
- NBomber load test suite

**Value Delivered:** Full observability stack for production monitoring!

### Stage 12.1-12.5: Neural Visualization ✅
**Status:** Complete (5 substages)
**Proof:** `stage-proofs/stage-12.5/STAGE_12.5_PROOF.md`
**Metrics:** 62/62 tests, 93.94% coverage, 0 vulnerabilities

**Deliverables:**
- Real-time 3D visualization with Three.js
- Workflow lanes with task checkpoints
- Animated particle flow for executions
- Throughput meter and event feed
- Traffic statistics panel

**Value Delivered:** Stunning real-time visualization for monitoring and demos!

### Stage 13: AI-Powered Workflow Generation ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-13/STAGE_13_PROOF.md`
**Metrics:** 90/90 tests, 93.37% coverage, 0 vulnerabilities

**Deliverables:**
- MCP Server for Claude integration
- list_tasks tool for task discovery
- generate_workflow tool for natural language creation
- validate_workflow tool for verification

**Value Delivered:** Zero-to-workflow in 30 seconds - just describe what you want!

### Stage 16.1: OpenAPI Parser ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-16.1/STAGE_16.1_PROOF.md`
**Metrics:** 44/44 tests, 90.42% coverage, 0 vulnerabilities

**Deliverables:**
- OpenAPI 2.0/3.x auto-detection and parsing
- Schema resolution with $ref handling
- Endpoint extraction with parameters
- CLI integration foundation

### Stage 17.1-17.2: Test API Server ✅
**Status:** Complete (2 substages)
**Proof:** `stage-proofs/stage-17.2/STAGE_17.2_PROOF.md`
**Metrics:** 72/72 tests, 84% coverage, 0 vulnerabilities

**Deliverables:**
- 100+ test endpoints (structural + business domain)
- Delay and failure simulation middleware
- Business domain endpoints (orders, payments, inventory)
- WorkflowTask CRD generation

**Value Delivered:** Comprehensive testing infrastructure for orchestration validation!

### Stage 19.1-19.5: Control Flow ✅
**Status:** Complete (5 substages)
**Proof:** `stage-proofs/stage-19.5/STAGE_19.5_PROOF.md`
**Metrics:** 861/861 tests, 96.7% coverage, 0 vulnerabilities

**Deliverables:**
- Condition evaluator (if/else expressions)
- Switch/case routing
- forEach array iteration with parallel execution
- Nested control flow support ($parent, $root)
- Max nesting depth validation

**Value Delivered:** Enterprise-grade control flow for complex workflows!

### Stage 20.1-20.2: Workflow Triggers ✅
**Status:** Complete (2 substages)
**Proof:** `stage-proofs/stage-20.2/STAGE_20.2_PROOF.md`
**Metrics:** 31/31 tests, 91.2% coverage, 0 vulnerabilities

**Deliverables:**
- Schedule triggers with cron expressions
- Webhook triggers with HMAC validation
- Trigger configuration models
- Timezone support

### Stage 21.1-21.2: Sub-Workflow Composition ✅
**Status:** Complete (2 substages)
**Proof:** `stage-proofs/stage-21.2/STAGE_21.2_PROOF.md`
**Metrics:** 1285/1285 tests, 100% line coverage (new code)

**Deliverables:**
- WorkflowRef resolution (by name/version)
- Sub-workflow execution with context isolation
- Cycle detection and max depth enforcement
- Input/output mapping between workflows

**Value Delivered:** Modular workflow composition for reusability!

### Stage 25-25.1: Local Development CLI ✅
**Status:** Complete (2 substages)
**Proof:** `stage-proofs/stage-25.1/STAGE_25.1_PROOF.md`
**Metrics:** 158+ tests

**Deliverables:**
- CLI framework with Spectre.Console
- init, validate, tasks commands
- OpenAPI import functionality
- Local execution with mock mode

**Value Delivered:** Developer-friendly CLI for local workflow authoring!

### Stage 26: VS Code Extension ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-26/STAGE_26_PROOF.md`
**Metrics:** 48/48 tests, 92.53% coverage, 0 vulnerabilities

**Deliverables:**
- Language Server Protocol (LSP) implementation
- CompletionProvider with property/template completions
- HoverProvider with documentation
- DiagnosticsProvider for real-time validation
- SnippetProvider with 12 code snippets
- VS Code snippets for workflow authoring

**Value Delivered:** IDE integration with IntelliSense and validation!

### Stage 27.1-27.2: Anomaly Detection ✅
**Status:** Complete (2 substages)
**Proof:** `stage-proofs/stage-27.2/STAGE_27.2_PROOF.md`
**Metrics:** 77/77 tests, ~91% coverage, 0 vulnerabilities

**Deliverables:**
- Metrics collection and baseline calculation
- Z-score anomaly detection
- AnomalyEvaluationService for runtime detection
- Trend detection for early warning

**Value Delivered:** Proactive detection of performance issues!

### Stage 28: Circuit Breaker ✅
**Status:** Complete
**Proof:** `stage-proofs/stage-28/STAGE_28_PROOF.md`

**Deliverables:**
- Circuit breaker state machine (Closed/Open/Half-Open)
- Sliding window failure counter
- Fallback task execution
- Integration with orchestrator

**Value Delivered:** Prevent cascade failures with resilience patterns!

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

> **Completed stages (1-7.9):** See "Completed Stages" section above for summaries, and `COMPLETED_STAGES_ARCHIVE.md` for detailed task specifications.

### Stage 8: Workflow State Persistence & Recovery ❌ SKIPPED

**Architectural Decision:** Stage 8 (pause/resume, state recovery) is designed for async workflows but this engine is synchronous with 30s max execution. All valuable features already delivered in Stages 7.8-7.9 (execution history, traces, versioning, retry logic, timeouts).

---

### Week 7-13 (Developer Experience & UI):
**Stage 9: Developer Experience - Make Workflow Creation Effortless**

*Goal:* Transform this POC into a platform where **anyone can create workflows** - from developers to business analysts - without deep technical knowledge.

*Philosophy:* The best orchestration platform is the one developers *want* to use. Focus on exceptional DX (Developer Experience).

**Stage 9.1: Visual Workflow Builder ✅ COMPLETE**
*See Completed Stages section above for details.*

**Stage 9.2: Workflow Templates Library ✅ COMPLETE**
*See Completed Stages section above for details.*

**Stage 9.3: WebSocket API for Workflow Execution ✅ COMPLETE**
*See Completed Stages section above for details.*

**Stage 9.4: Enhanced Debugging Tools ✅ COMPLETE**
*See Completed Stages section above for details.*

**Stage 9.5: Interactive Documentation ✅ COMPLETE**
*See Completed Stages section above for details.*

**Stage 9.6: Transform DSL (Data Transformation Pipeline)**

**Stage 9.6.1: Transform DSL Backend Foundation ✅ COMPLETE**
*See Completed Stages section above for details.*

**Stage 9.6.2: Transform DSL Frontend Builder ✅ COMPLETE**
*See Completed Stages section above for details.*

**Stage 9 Complete!** All 7 substages delivered.

**Success Metrics:**
- Time to First Workflow: <5 minutes (80% of users)
- Template Usage: 70% of workflows start from templates
- User Retention: 80% create 2nd workflow within 1 week
- Visual Builder Performance: <200ms to render workflow graph
- Debugging Efficiency: 5x faster troubleshooting vs log diving
- Test Coverage: ≥90% (non-negotiable)

### Week 9-10 (Performance & Production):
**Stage 10: Performance Testing & Optimization ✅ COMPLETE**

**Phase 1: Performance Benchmarks ✅ COMPLETE**
*See Completed Stages section above for details.*

**Phase 2: Observability Dashboard ✅ COMPLETE (Stage 10.2)**
*See Completed Stages section above for details.*

### Week 11-12 (Cloud Deployment & E2E):
**Stage 11: Cloud Deployment & Production Hardening (TDD)**
1. Helm Charts
   - Operator deployment
   - Gateway deployment
   - PostgreSQL (or cloud DB)
2. Cloud E2E Tests
   - Deploy to GKE (Google Kubernetes Engine)
   - Deploy to AKS (Azure Kubernetes Service)
   - Full E2E workflow tests in cloud
3. Production Hardening
   - Security scanning
   - Resource limits and quotas
   - High availability configuration

### Week 13 (Neural Visualization):
**Stage 12: Real-Time Neural Network Visualization ✅ COMPLETE**
*See Completed Stages section above for details (Stage 12.1-12.5).*

### Week 14+ (AI-Powered Creation):
**Stage 13: AI-Powered Workflow Generation ✅ COMPLETE**
*See Completed Stages section above for details.*

### Week 15+ (Intelligent Optimization):
**Stage 14: Workflow Optimization Engine (TDD)**
*Scope:* Automated workflow analysis and optimization with correctness verification
*Deliverables:* 5
*Tests:* ~40-45 tests
*Dependencies:* Stages 7.8 (Execution History), 7.9 (Traces), 9.6.1 (Transform DSL)
*Value:* "Your workflows, but faster" - automatic performance tuning with safety guarantees

*Philosophy:* Use execution history as a regression test suite. Propose optimizations, replay past executions, verify outputs match. No guessing - only provably-safe changes.

*Trigger Mode:* Smart hybrid scheduling - automatic prioritization (slowest workflows first, cooldown periods, execution frequency) plus on-demand user trigger.

1. **Static Workflow Analyzer**
   - Parse workflow and build optimization graph
   - Detect optimization candidates:
     - Filter-before-map reordering (reduce data volume early)
     - Redundant transform elimination (select ignoring mapped fields)
     - Dead task detection (outputs never used downstream)
     - Parallel promotion (sequential tasks with no real dependency)
     - Transform fusion (multiple maps → single map)
   - Calculate theoretical performance impact
   - Tests for each optimization pattern detection

2. **Transform Equivalence Checker**
   - Algebraic rules for transform operations:
     - `filter(A) → filter(B)` = `filter(A && B)` (filter fusion)
     - `map(f) → map(g)` = `map(g ∘ f)` (map composition)
     - `filter → map` vs `map → filter` (commutativity check)
     - `limit(N) → filter` vs `filter → limit(N)` (may differ!)
   - Identify safe vs unsafe reorderings
   - Generate equivalence proofs for audit trail
   - Tests for algebraic properties

3. **Historical Replay Engine**
   - Fetch past N executions for a workflow
   - Execute both original and optimized versions
   - Deep comparison of outputs (structural equality)
   - Handle non-deterministic tasks (timestamps, random IDs)
   - Report: match rate, timing delta, confidence score
   - Tests for replay accuracy and edge cases

4. **Optimization Suggestions API**
   - `GET /api/v1/workflows/{name}/optimizations`
   - Returns list of suggested optimizations with confidence scores
   - `POST /api/v1/workflows/{name}/optimizations/{id}/apply` - apply suggestion
   - `POST /api/v1/workflows/{name}/optimizations/{id}/test` - run more replays
   - Tests for API contracts and edge cases

5. **Optimization Dashboard (UI)**
   - Visual diff: original vs optimized workflow graph
   - Performance comparison chart (before/after timing)
   - Confidence indicator based on replay results
   - One-click apply with rollback option
   - History of applied optimizations
   - Tests for UI components

**Optimization Types:**

| Type | Detection | Validation | Risk |
|------|-----------|------------|------|
| Filter-first | Static | Replay | Low |
| Dead task removal | Static | Replay | Low |
| Transform fusion | Algebraic | Replay | Low |
| Parallel promotion | Dependency analysis | Replay | Medium |
| Task reordering | Dependency analysis | Replay | Medium |

**TDD Targets:**
- 40+ tests across analyzer, replay engine, and API
- Property-based tests for algebraic equivalence
- Integration tests with real execution history
- Maintain ≥90% coverage

**Success Metrics:**
- Optimization detection rate: Find opportunities in 60%+ of workflows
- Correctness: 0 false positives (never suggest breaking change)
- Average speedup: 1.5x+ for workflows with optimizations
- Adoption: 40% of suggestions applied within 7 days

**Value:** **Automatic performance tuning with zero risk** - every suggestion is proven safe!

### Week 16+ (External Integration):
**Stage 15: MCP Server for External Workflow Consumption (TDD)**
*Scope:* Enable external chatbots and AI assistants to discover and execute workflows via Model Context Protocol
*Deliverables:* 5 substages
*Tests:* ~50 tests
*Dependencies:* Stages 7 (API Gateway), 9.2 (Templates), 14 (Optimization Engine)
*Package:* `packages/workflow-mcp-consumer` (new, separate from Stage 13)
*Value:* "Let any chatbot use your workflows" - democratize workflow access beyond internal users

*Philosophy:* External users (via chatbots) should be able to explore, understand, and invoke workflows without reading documentation. The MCP server provides rich metadata that enables LLMs to reason about which workflow to use and how to use it.

*Key Distinction from Stage 13:* Stage 13 is about *creating* workflows (internal, developer-focused). Stage 15 is about *consuming* existing workflows (external, end-user focused via chatbots).

**Stage 15.1: Backend Metadata Enrichment**
- Add `categories`, `tags`, `examples` fields to WorkflowSpec
- Structured `MissingInputsResult` response (field names, types, descriptions)
- New endpoint: `POST /api/v1/workflows/{name}/validate-input`
- Update existing APIs to expose enriched metadata
- Profile: `BACKEND_DOTNET`, Gates: 1-8
- Tests: 20+

**Stage 15.2: MCP Tools for Workflow Discovery**
- `list_workflows` - All workflows with rich metadata (categories, tags, input summary, stats)
- `search_workflows` - Query by keywords/intent with ranked matches
- `get_workflow_details` - Full schema, examples, required inputs
- `autoExecute` mode: returns bestMatch with confidence, extractedInputs, canAutoExecute
- Profile: `FRONTEND_TS`, Gates: 1-8, 15
- Tests: 18+

**Stage 15.3: MCP Tool for Workflow Execution**
- `execute_workflow` - Execute with structured error responses
- Success: executionId, output, duration, task results
- Validation failure: missingInputs, invalidInputs, suggestedPrompt
- Execution failure: failedTask, errorMessage, partialOutput
- Profile: `FRONTEND_TS`, Gates: 1-8, 15
- Tests: 10+

**Stage 15.4: MCP Resources & Prompts**
- Resources: `workflow://{name}`, `workflow://{name}/schema`
- Prompts: `discover-workflow`, `execute-workflow`, `troubleshoot-execution`
- Profile: `FRONTEND_TS`, Gates: 1-8
- Tests: 10+

**Stage 15.5: Integration & Documentation**
- Claude Desktop configuration example
- Streamable HTTP transport for web-based chatbots
- README, tool reference, troubleshooting docs
- E2E integration tests (full discover → execute flow)
- Profile: `FRONTEND_TS`, Gates: 1-8, 15
- Tests: 5+

**Execution Modes (Feature Flag):**

| Mode | Behavior |
|------|----------|
| `autoExecute: false` | Show ranked options, user confirms, gather inputs interactively |
| `autoExecute: true` | Auto-select best match if confidence ≥0.8 AND all inputs available |

**Example Interaction (Auto-Execute Mode):**
```
User: "Get me the profile for user 3"

LLM: [Calls search_workflows with autoExecute=true, context={userId: "3"}]
     → Gets: bestMatch={workflow: user-profile, confidence: 0.95, canAutoExecute: true}

LLM: [Calls execute_workflow with input={userId: "3"}]
     → Gets: success with profile data

LLM: "Here's the profile for user 3:
     - Name: Clementine Bauch
     - Email: Nathan@yesenia.net"
```

**TDD Targets:**
- 50+ tests across all substages
- E2E tests for full discover → execute flow
- Test autoExecute mode: confidence thresholds, input extraction, fallback
- Maintain ≥90% coverage

**Success Metrics:**
- Workflow discovery accuracy: >90%
- Input validation clarity: 100% (always includes description)
- Execution success rate: >95% (after valid input)
- Response latency (discovery): <500ms
- Response latency (execution): <5s (p95)

**Value:** **Any chatbot can now be a workflow executor** - democratize access beyond technical users!

### Stage 16: OpenAPI Task Generator CLI (Complete Contract Testing Platform)
*Scope:* Auto-generate WorkflowTask CRDs from OpenAPI/Swagger specifications - **replaces PACT testing**
*Deliverables:* 8 substages
*Tests:* ~140 tests
*Dependencies:* Stage 6 (WorkflowTask CRD model)
*Package:* `packages/workflow-cli` (new CLI tool)
*Value:* "Point at an API spec, get all tasks instantly" - eliminate manual task creation

*Philosophy:* Integrating with external APIs shouldn't require manual YAML writing. Import an OpenAPI spec and get production-ready WorkflowTask definitions in seconds. No separate PACT broker needed.

**Stage 16.1: OpenAPI Parser**
- OpenAPI 2.0 (Swagger) and 3.x auto-detection and parsing
- Schema resolution ($ref handling, circular reference detection)
- Endpoint extraction (parameters, request/response schemas, security schemes)
- 18+ tests

**Stage 16.2: Task Generator**
- WorkflowTask CRD generation from endpoints
- Task naming: `operationId` or `{method}-{path}` sanitized
- Input/output schema generation with auth placeholders
- Error mapping configuration (4xx/5xx → normalized error codes)
- 22+ tests

**Stage 16.3: Sample Workflow Generator**
- Workflow scaffolding with task chaining
- Permission check task generation
- Workflow permission validation
- 15+ tests

**Stage 16.4: Version Management & Migrations**
- SHA256 hash-based change detection (`workflow.io/content-hash` label)
- Auto-versioning: breaking changes → `get-user-v2` with `workflow.io/replaces`
- TaskMigration CRD generation with transform suggestions
- Draft/experimental version support
- 14+ tests

**Stage 16.5: CLI Integration**
- `workflow-cli import openapi <source> --base-url <url>` command
- Options: `--prefix`, `--single-file`, `--tags`, `--exclude-tags`, `--group-by-tag`
- Deprecation handling, endpoint filtering
- E2E tests with real OpenAPI specs (Petstore, Stripe)
- 15+ tests

**Stage 16.6: CI/CD Integration & Impact Notifications**
- Pipeline mode (`--ci` flag, non-interactive)
- Exit codes: 0=success, 1=breaking changes, **2=BLOCKED (removal with dependent workflows)**, 3=error
- Task lifecycle: `active` → `superseded` → `deprecated`
- Task removal protection (blocks if workflows depend on it)
- Webhook/email notifications, team subscriptions by task pattern
- Impact Analysis API: `GET /api/v1/tasks/{name}/impact`
- 18+ tests

**Stage 16.7: Field-Level Usage Tracking (PACT Consumer Contracts)**
- WorkflowTaskUsage CRD: track which fields each workflow actually uses
- `requiredFields` in workflow spec (consumer contract declaration)
- Field-level impact analysis (unused field removal = safe, no breaking change)
- `workflow-cli analyze-usage`, `workflow-cli field-impact <task> --field <field>`
- 18+ tests

**Stage 16.8: Contract Verification (PACT Provider States & Interactions)**
- TaskTestScenarios CRD: auto-generated from OpenAPI error responses
- RecordedInteraction CRD: golden file testing
- TaskDeploymentMatrix CRD: environment tracking (dev/staging/prod)
- `workflow-cli can-deploy <task-version> --to <env>`: cross-environment check
- `workflow-cli verify`, `workflow-cli record`, `workflow-cli replay-verify`
- 20+ tests

**Dual Error Response Model:**
```yaml
error:
  originalError:    # Preserve external API's exact response (Stripe, Twilio, etc.)
    status: 400
    body: { error: { type: card_error, code: card_declined, message: "..." }}
  normalizedError:  # Uniform structure for all services
    code: VALIDATION_ERROR
    title: "Payment card declined"
    suggestedAction: "Ask customer to use a different payment method"
```

**PACT Replacement Summary:**
| PACT Feature | Stage 16 Implementation |
|--------------|------------------------|
| Consumer contracts | `requiredFields` + WorkflowTaskUsage |
| Provider verification | OpenAPI import + hash detection |
| Field-level analysis | FieldUsageAnalyzer (unused field = safe) |
| Provider states | TaskTestScenarios (auto-generated) |
| Interaction recording | RecordedInteraction CRD |
| Can I Deploy? | TaskDeploymentMatrix + CLI |
| Webhook notifications | TaskNotificationConfig |
| Breaking change blocking | Exit code 2 (pipeline blocked) |

**Success Metrics:**
- OpenAPI 2.0/3.x: 100% valid specs supported
- CLI response: <5s for 50-endpoint spec
- Field-level precision: 100% (unused field removal = no breaking change)
- Can-I-Deploy: 100% correct deployment recommendations
- Test coverage: ≥90%

**Value:** **Complete PACT replacement with zero broker infrastructure** - contract testing built into the workflow system with automatic field usage tracking!

### Stage 17: Test API Server (Testing Infrastructure)
*Scope:* Standalone HTTP test server with 100 endpoints for orchestration service capability testing
*Deliverables:* 3 substages
*Tests:* ~100 tests
*Dependencies:* Stage 7 (API Gateway), Stage 5 (Workflow Execution)
*Location:* `tests/TestApiServer`
*Value:* "Comprehensive testing infrastructure with real-world scenarios" - validate auto-transforms, error handling, and retry logic

*Philosophy:* A dedicated test server that returns content in various shapes and forms, enabling thorough testing of orchestration capabilities. Mix of structural endpoints (schema testing) and business domain endpoints (real-world scenarios).

**Stage 17.1: Core Infrastructure & Structural Endpoints**
- Project setup (`.NET Minimal API`, test dependencies)
- Middleware: DelayMiddleware, FailureSimulationMiddleware
- Primitive endpoints (10): string, integer, decimal, boolean, guid, datetime, echo, null
- Array endpoints (10): strings, numbers, nested, large (1000/10000 items), mixed types
- 20 WorkflowTask CRDs in `test` namespace
- 25+ tests

**Stage 17.2: Business Domain Endpoints**
- Orders endpoints (15): full order lifecycle, calculate totals, shipping, invoices
- Inventory endpoints (10): product catalog, availability, reservations, pricing
- Payments endpoints (15): process, refund, validate card, auth/capture flow
- Users & Auth endpoints (15): profiles, preferences, login/logout, JWT validation
- Notifications endpoints (10): email, SMS, push, templates, bulk send
- 65 WorkflowTask CRDs in `test` namespace
- 50+ tests

**Stage 17.3: Error Handling, Retry & Sample Workflows**
- Error simulation (10): HTTP status codes 400-503, configurable, random
- Retry endpoints (5): fail-once, fail-n-times, intermittent, slow responses
- FailureStateService, RetryCounterService
- Sample workflows (5):
  - Order processing (create → inventory → payment → notify)
  - User onboarding (register → verify → preferences → welcome)
  - Payment retry (authorize → capture with retry)
  - Bulk notifications (parallel sends)
  - Inventory check (multi-product availability)
- 25+ tests

**Success Metrics:**
- Total endpoints: 100 (structural + business domain)
- WorkflowTask CRDs: 100 in `test` namespace
- Sample workflows: 5 realistic business scenarios
- Test coverage: ≥90%

**Value:** **Comprehensive testing infrastructure** - validate orchestration capabilities against realistic API behavior including failures, timeouts, and complex nested responses!

### Stage 18: Synthetic Health Checks (Proactive Monitoring)
*Scope:* Proactive endpoint health monitoring - replay GET requests from previous executions to verify services are up
*Deliverables:* 2 substages
*Tests:* ~40 tests
*Dependencies:* Stage 7 (API Gateway), Stage 7.8 (Execution History), Stage 10.2 (Dashboard)
*Value:* "Catch broken endpoints before users do" - full end-to-end validation including DB connectivity on target services

*Philosophy:* Don't wait for users to discover that an external API is down. Replay GET requests from the last successful execution using a service account token. This validates the full path: DNS, TLS, service health, database connectivity, and response format.

**Stage 18.1: Backend Health Check Service**
- Configuration for service account token:
  ```yaml
  # appsettings.json
  SyntheticCheck:
    Enabled: true
    IntervalMinutes: 5
    TimeoutSeconds: 10
    ServiceAccountToken: "${HEALTH_CHECK_TOKEN}"  # From env/secret
  ```
- `ISyntheticCheckService` / `SyntheticCheckService`:
  - Find last successful execution for workflow
  - Extract GET requests with resolved URLs from execution history
  - Replay each GET request with service account token
  - Expect 2xx response (full validation)
  - Run checks in parallel (Task.WhenAll)
  - Record: reachable, latencyMs, statusCode, responseValid
- `SyntheticCheckBackgroundService` (IHostedService):
  - Configurable interval (default: 5 min)
  - Check all workflows with execution history
  - Cache results in memory
  - Log warnings on failures
- API endpoints:
  - `POST /api/v1/workflows/{name}/health-check` (run now)
  - `GET /api/v1/workflows/{name}/health-status` (cached result)
  - `GET /api/v1/health/summary` (all workflows overview)
- Profile: `BACKEND_DOTNET`, Gates: 1-8
- 25+ tests

**What gets validated:**
- DNS resolution ✓
- TLS/SSL certificates ✓
- Service is running ✓
- Database connectivity (service can query) ✓
- Response format matches expected ✓

**Stage 18.2: Dashboard Health Widget & UI**
- Health status widget on dashboard:
  - Green/yellow/red indicators per workflow
  - Click for task-level breakdown
  - "Run Check Now" button
- Health summary panel showing:
  - Workflows by health status
  - Last check timestamp
  - Degraded/unhealthy count
- Integration with existing dashboard layout
- Profile: `FRONTEND_TS`, Gates: 1-8, 14, 15
- 15+ tests

**Response Model:**
```json
{
  "workflow": "order-processing",
  "overallHealth": "healthy",
  "tasks": [
    {
      "taskId": "fetch-user",
      "taskRef": "get-user",
      "status": "healthy",
      "checkType": "healthEndpoint",
      "latencyMs": 45,
      "reachable": true
    }
  ],
  "checkedAt": "2024-01-15T10:30:00Z",
  "durationMs": 234
}
```

**TDD Targets:**
- 40+ tests across service, background worker, and UI
- Integration tests with mock HTTP endpoints
- E2E test: trigger check → verify dashboard updates
- Maintain ≥90% coverage

**Success Metrics:**
- Health check latency: <5s for 10-task workflow
- Background check interval: configurable (1-60 min)
- Dashboard update: <1s after check completes
- Zero false positives (reliable connectivity detection)

**Value:** **Proactive failure detection** - know about broken endpoints before your users do!

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