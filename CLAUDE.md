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

## Completed Stages (1-7.9)

**Status:** 8/15 stages complete (53%)** - Stage 8 SKIPPED (architectural decision)
*Note:* Stage breakdown refined - original 11 stages expanded to 16 focused stages
*Note:* Stage 8 skipped as it's designed for async workflows, not synchronous execution model

Detailed TDD implementation instructions for Stages 1-4 have been archived to `COMPLETED_STAGES_ARCHIVE.md`.
For proof of completion and actual results, see the respective `STAGE_X_PROOF.md` files.

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

**Stage 9.1: Visual Workflow Builder (2 weeks) 🔴 P0 - CRITICAL**
*Lower the barrier to entry - anyone can create workflows*

1. **React Flow-Based Editor**
   - Drag-and-drop workflow canvas
   - Task node library (HTTP tasks, WebSocket tasks, custom tasks)
   - Visual dependency management (drag to connect)
   - Real-time YAML preview (bidirectional sync)
   - Inline validation feedback (errors as you type)

2. **User Flow**
   - Create Workflow → Template selector → Canvas
   - Drag tasks → Connect dependencies → Configure
   - Test (dry-run) → Deploy (kubectl apply)

3. **TDD Targets**
   - 30+ React component tests
   - E2E tests with Playwright (full workflow creation flow)
   - Accessibility tests (keyboard navigation, screen readers)
   - Maintain ≥90% coverage

4. **Value:** **5-minute time to first workflow** for non-technical users!

**Stage 9.2: Workflow Templates Library (1 week) 🔴 P0 - CRITICAL**
*Accelerate workflow creation - don't start from scratch*

1. **Template Categories**
   - API Composition (parallel-api-fetch, sequential-pipeline, conditional-branching)
   - Data Processing (etl-pipeline, batch-processing, aggregation)
   - Real-Time (websocket-stream, event-driven, polling)
   - Integrations (slack-notification, github-webhook, payment-processing)

2. **Template Browser UI**
   - Search & filter by category/difficulty
   - Preview (YAML + visual graph)
   - One-click deploy to visual builder
   - Placeholder highlighting for customization

3. **Template Validation**
   - All templates pass schema validation
   - E2E tests for each template
   - Performance benchmarks included

4. **TDD Targets**
   - 20+ template validation tests
   - E2E tests for each template
   - Template browser UI tests
   - Maintain ≥90% coverage

5. **Value:** **Reduce time to first workflow from 30 minutes to 2 minutes!**

**Stage 9.3: WebSocket API for Workflow Execution (2 weeks) 🟡 P1 - IMPORTANT**
*Real-time bidirectional communication for workflow execution*

1. **WebSocket Server Endpoint**
   - `wss://` endpoint for workflow execution
   - Protocol: execute, subscribe, task_started, task_completed, workflow_completed
   - Connection management (pooling, heartbeat, reconnection)

2. **Integration with WorkflowOrchestrator**
   - Emit events to WebSocket clients as tasks complete
   - Broadcast to all subscribed clients
   - Per-execution subscriptions

3. **Frontend WebSocket Client**
   - WorkflowWebSocketClient class
   - React hook: useWebSocketWorkflowExecution
   - Real-time push notifications (no polling)

4. **TDD Targets**
   - 25+ tests for WebSocket handler
   - Integration tests with WebSocket client
   - E2E tests with frontend WebSocket client
   - Connection management tests
   - Maintain ≥90% coverage

5. **Value:** **Real-time workflow execution with push notifications** - no polling needed!

**Stage 9.4: Enhanced Debugging Tools (1.5 weeks) 🟡 P1 - IMPORTANT**
*Make troubleshooting effortless*

1. **Execution Time-Travel UI**
   - Scrub through execution timeline
   - Inspect task state at any point
   - Watch variables change over time
   - Set breakpoints for future runs

2. **Step-Through Mode**
   - Pause execution at each task
   - Inspect inputs/outputs before proceeding
   - Manual approval to continue
   - Skip to specific task

3. **Execution Replay**
   - Load past execution from database
   - See exact inputs/outputs at any moment
   - Compare two executions side-by-side

4. **Visual Debugging Aids**
   - Highlight current task in graph
   - Show data flow (variable values on edges)
   - Error highlighting (red nodes for failed tasks)
   - Execution path visualization

5. **TDD Targets**
   - 30+ React component tests
   - E2E tests for debug scenarios
   - Accessibility tests
   - Maintain ≥90% coverage

6. **Value:** **Reduce debugging time from hours to minutes!**

**Stage 9.5: Interactive Documentation & Learning (1 week) 🟡 P1 - IMPORTANT**
*Make learning self-service*

1. **Inline Contextual Help**
   - Hover over task → Show description, example, schema
   - Help icon on every field → Explains what it does
   - Link to detailed docs for advanced topics

2. **Interactive Playground**
   - Lesson 1: Hello World (first workflow)
   - Lesson 2: Task dependencies
   - Lesson 3: Parallel execution
   - Lesson 4: Template syntax
   - Lesson 5: WebSocket streams

3. **Guided Tours**
   - First-time user interactive tour
   - Tooltips highlight features
   - Progressive disclosure

4. **TDD Targets**
   - 15+ documentation tests (ensure examples work)
   - Accessibility tests for help UI
   - Maintain ≥90% coverage

5. **Value:** **Self-service onboarding - no hand-holding needed!**

**Total Timeline: 6.5 weeks**

**Success Metrics:**
- Time to First Workflow: <5 minutes (80% of users)
- Template Usage: 70% of workflows start from templates
- User Retention: 80% create 2nd workflow within 1 week
- Visual Builder Performance: <200ms to render workflow graph
- Debugging Efficiency: 5x faster troubleshooting vs log diving
- Test Coverage: ≥90% (non-negotiable)

### Week 9-10 (Performance & Production):
**Stage 10: Performance Testing & Optimization (TDD)**
1. Performance Testing
   - BenchmarkDotNet for critical paths
   - Optimize schema validation
   - Optimize template resolution
2. Load Testing with NBomber
   - Concurrent workflow executions
   - Stress test admission webhooks
   - Database performance under load
3. Observability & Real-Time Monitoring Dashboard
   - New Relic integration
   - Distributed tracing
   - Custom metrics and dashboards
   - **System Health Dashboard (UI)**:
     - Platform-wide orchestration overhead (average across all workflows)
     - Execution volume / throughput (requests/sec, trends over time)
     - Error rates by workflow (success/failure breakdown)
     - P50/P95/P99 latency percentiles
     - "Health score" for the platform (composite metric)
   - **Per-Workflow Metrics**:
     - Average execution time and trends
     - Orchestration overhead percentage
     - Task-level bottleneck identification
     - Comparison against historical baseline
   - **Worst Performers Panel**:
     - Top 10 slowest workflows (by avg execution time)
     - Top 10 highest overhead workflows (by orchestration %)
     - Workflows with degrading performance (trend detection)
   - **Alerting & Thresholds**:
     - Configurable alerts (overhead > X%, error rate > Y%)
     - Slack/webhook notifications
     - Anomaly detection (sudden performance degradation)
   - **Historical Analysis**:
     - Time-range selector (1h, 24h, 7d, 30d)
     - Before/after comparison for deployments
     - Export metrics as CSV/JSON

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
**Stage 12: Real-Time Neural Network Visualization (TDD)**
*Scope:* Live 3D visualization of workflow execution as neural network
*Deliverables:* 5
*Tests:* ~30-35 tests
*Dependencies:* Stages 7.8, 7.85, 9 (UI)
*Value:* Stunning real-time visualization for monitoring, demos, and traffic pattern analysis

1. Real-Time Event Streaming (Backend)
   - Add SignalR hub to WorkflowGateway
   - Emit execution events from WorkflowOrchestrator:
     - WorkflowStarted (workflow_name, execution_id, timestamp)
     - TaskStarted (task_id, execution_id, dependencies)
     - TaskCompleted (task_id, status, duration, outputs)
     - SignalFlow (from_task, to_task, execution_id) - dependency activation
     - WorkflowCompleted (execution_id, status, duration)
   - Event aggregation and batching (for high-traffic scenarios)
   - WebSocket connection management and reconnection logic
   - Add tests for event emission and SignalR hub

2. Graph Layout & Positioning Algorithm
   - Automatic node positioning based on ExecutionGraph structure
   - Force-directed layout algorithm (D3.js integration)
   - Cluster similar workflows by domain/namespace
   - Calculate node positions (x, y, z coordinates for 3D)
   - Return graph layout data via API endpoint
   - Tests for layout algorithm with complex graphs

3. 3D Visualization Component (Frontend)
   - Three.js / WebGL-based rendering engine
   - Neurons (tasks): sphere geometries with glow shaders
     - Idle state: dim blue/purple ambient glow
     - Executing: bright pulsing animation
     - Success: green flash then fade to idle
     - Failed: red pulse with persistent red tint
   - Edges (dependencies): line geometries with particle systems
     - Signal flow: animated particles traveling from source to target
     - Width based on call frequency or data volume
   - Camera controls: orbit, zoom, pan
   - Performance optimization: instancing, frustum culling, LOD

4. Animation System & Visual Effects
   - Pulse animation system for task execution (glow intensity curves)
   - Particle system for signal flow along edges
   - Bloom/glow post-processing effects (UnrealBloomPass)
   - Synchronized firing for parallel task groups
   - Heat map overlay showing "hot paths" (frequently-used tasks)
   - Fade-out animation after workflow completion
   - Tests for animation timing and state transitions

5. Advanced Features & Replay Mode
   - Replay past executions at configurable speed (1x, 10x, 100x)
   - Time-lapse view showing network growth over days/weeks
   - Filter by workflow name, status, or time range
   - Performance metrics overlay (execution time, throughput)
   - "Brain growth" visualization (network expands as workflows added)
   - Export visualization as video (for demos/presentations)
   - Integration tests with real SignalR events

**Visual Design Goals:**
- Dark theme with neon/bioluminescent aesthetics
- Organic clustering (workflows form "brain regions")
- Mesmerizing at high traffic (100+ concurrent workflows)
- Educational: understand workflow composition at a glance
- Demo-ready: impressive for presentations and marketing

**Performance Targets:**
- Handle 1000+ req/s with smooth 60fps rendering
- Support 100+ concurrent workflow visualizations
- Sub-100ms latency for event → visualization
- Efficient WebGL rendering (no DOM manipulation)

### Week 14+ (AI-Powered Creation):
**Stage 13: AI-Powered Workflow Generation (TDD)**
*Scope:* Natural language workflow creation via MCP server
*Deliverables:* 5
*Tests:* ~35-40 tests
*Dependencies:* Stages 9.1 (Visual Builder), 9.2 (Templates)
*Value:* "Describe what you want, get a working workflow" - the ultimate DX

*Philosophy:* Users shouldn't need to know YAML syntax, task schemas, or template expressions. They describe their intent; the system figures out the rest.

1. **Task Discovery MCP Tool**
   - `list_tasks(category?, capability?, search?)` → task metadata + schemas
   - `get_task_schema(task_name)` → full input/output schema with examples
   - `search_tasks(natural_language_query)` → semantic search over task descriptions
   - Rich task metadata: descriptions, examples, tags, capabilities
   - Tests for search relevance and schema accuracy

2. **Workflow Generation MCP Tool**
   - `generate_workflow(intent, constraints?)` → YAML workflow definition
   - Intent parsing: extract tasks, dependencies, data flow from natural language
   - Auto-insert transform tasks to bridge schema mismatches
   - Handle parallel vs sequential based on dependency analysis
   - Configurable constraints: max tasks, allowed categories, timeout limits
   - Tests for common patterns (fan-out, pipeline, aggregation)

3. **Validation & Refinement Loop**
   - `validate_workflow(yaml)` → errors with suggested fixes
   - `refine_workflow(yaml, feedback)` → improved YAML based on user feedback
   - Schema compatibility checking with clear error messages
   - Template expression validation
   - Circular dependency detection
   - Tests for error recovery and refinement scenarios

4. **Workflow Execution MCP Tools**
   - `dry_run_workflow(yaml, sample_input)` → execution plan preview
   - `execute_workflow(name, input)` → run and return results
   - `get_execution_status(execution_id)` → real-time status
   - Integration with existing WorkflowGateway APIs
   - Tests for execution lifecycle

5. **Claude Desktop / MCP Integration**
   - MCP server implementation (TypeScript or C#)
   - Claude Desktop configuration examples
   - Interactive workflow building sessions
   - Conversational refinement ("make it faster", "add error handling")
   - Documentation and setup guide

**Example Interaction:**
```
User: "When a new order comes in, fetch the customer details,
       check their credit limit, and if approved, send a
       confirmation email and update inventory"

AI: I'll create a workflow with these tasks:
    1. fetch-customer (from order.customer_id)
    2. check-credit-limit (parallel with inventory check)
    3. check-inventory (parallel with credit check)
    4. send-confirmation-email (depends on both checks passing)
    5. update-inventory (depends on confirmation)

    [Shows generated YAML]

    Want me to deploy this or make changes first?
```

**TDD Targets:**
- 35+ tests across MCP tools
- Integration tests with real Claude API (mocked)
- E2E test: natural language → deployed workflow
- Maintain ≥90% coverage

**Success Metrics:**
- Intent-to-workflow accuracy: >85% on common patterns
- Generation time: <5 seconds for typical workflows
- User satisfaction: 90%+ approve generated workflow on first try
- Adoption: 30% of new workflows created via AI after launch

**Value:** **Zero-to-workflow in 30 seconds** - just describe what you want!

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