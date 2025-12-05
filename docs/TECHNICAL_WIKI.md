# Technical Wiki: Workflow Orchestration Engine

> A deep-dive for engineers evaluating this Kubernetes-native workflow orchestration platform.

---

## 1. Executive Summary

> **What is this?** A Kubernetes-native workflow orchestration engine that transforms your integration architecture from **mudball to hub-and-spoke** — with automation.

```mermaid
graph LR
    subgraph "Before: Mudball"
        A1[Service A] <--> B1[Service B]
        B1 <--> C1[Service C]
        A1 <--> C1
        A1 <--> D1[Service D]
        B1 <--> D1
        C1 <--> D1
    end

    subgraph "After: Hub & Spoke"
        HUB[Workflow<br/>Orchestrator]
        A2[Service A] --> HUB
        B2[Service B] --> HUB
        C2[Service C] --> HUB
        D2[Service D] --> HUB
    end

    style A1 fill:#ff6b6b
    style B1 fill:#ff6b6b
    style C1 fill:#ff6b6b
    style D1 fill:#ff6b6b
    style HUB fill:#51cf66
    style A2 fill:#4dabf7
    style B2 fill:#4dabf7
    style C2 fill:#4dabf7
    style D2 fill:#4dabf7
```

| Mudball | Hub & Spoke |
|---------|-------------|
| N×N integration points | N+1 connections |
| Retry logic in every service | Central retry policy |
| One change = 30 PRs | One change = 1 task update |
| "Works on my machine" | Schema-validated at deploy |
| Debug via log diving | Execution traces + time-travel |

### At a Glance

| Metric | Value | What It Means |
|--------|-------|---------------|
| Total Tests | 3,900+ | Not a toy project |
| Code Coverage | ≥90% | Enforced, not aspirational |
| Mutation Score | ≥80% | Tests actually test things |
| Stages Complete | 22/37 (60%) | Production-ready core |
| Vulnerabilities | 0 | Security-scanned every commit |

### Key Differentiators

- **Fail-fast validation** at `kubectl apply` (not runtime surprises)
- **Visual workflow builder** for non-engineers
- **AI-powered generation** via Claude + MCP
- **3D real-time visualization** of execution
- **Obsessive TDD discipline** from day one

---

## 2. The Problem This Solves

### Copy-Paste Hell

```mermaid
graph TB
    subgraph "Before: Copy-Paste Hell"
        direction TB
        S1[Service A] -->|copy-paste| STRIPE1[Stripe Client]
        S2[Service B] -->|copy-paste| STRIPE2[Stripe Client]
        S3[Service C] -->|copy-paste| STRIPE3[Stripe Client]
        S4[Service D] -->|copy-paste| STRIPE4[Stripe Client]

        S1 -->|copy-paste| RETRY1[Retry Logic]
        S2 -->|copy-paste| RETRY2[Retry Logic]
        S3 -->|copy-paste| RETRY3[Retry Logic]
        S4 -->|copy-paste| RETRY4[Retry Logic]
    end

    style STRIPE1 fill:#ff6b6b
    style STRIPE2 fill:#ff6b6b
    style STRIPE3 fill:#ff6b6b
    style STRIPE4 fill:#ff6b6b
    style RETRY1 fill:#ffa94d
    style RETRY2 fill:#ffa94d
    style RETRY3 fill:#ffa94d
    style RETRY4 fill:#ffa94d
```

**The Pain:**
- 4 services = 4 copies of Stripe client code
- Retry logic duplicated across 50+ microservices
- Provider change (Stripe → Braintree) = touching 30+ codebases
- Bug fix in one = manual copy to all others

### The Solution: Composable Task Library

```mermaid
graph TB
    subgraph "After: Composable Task Library"
        direction TB
        TASK[charge-payment<br/>WorkflowTask CRD]

        W1[order-checkout] --> TASK
        W2[subscription-renewal] --> TASK
        W3[refund-processing] --> TASK
        W4[donation-flow] --> TASK
    end

    style TASK fill:#51cf66
```

**The Win:**
- Platform team builds `charge-payment` task **ONCE**
- 4 workflows reuse it instantly
- Provider migration = update 1 task, test 1 time, deploy 1 PR
- Retry logic built into task, not scattered

---

## 3. Core Capabilities

### 3.1 Schema Validation & Type Safety

- **JsonSchema.Net 5.x** integration for RFC-compliant validation
- **Recursive type compatibility checking** between task outputs → inputs
- **Design-time validation** catches errors before deployment
- Incompatible schemas rejected at `kubectl apply`

```yaml
# Example: Input schema for a payment task
inputSchema:
  type: object
  properties:
    amount:
      type: number
      minimum: 0.01
    currency:
      type: string
      enum: [USD, EUR, GBP]
  required: [amount, currency]
```

### 3.2 Template Expression System

Reference workflow inputs and upstream task outputs:

```yaml
tasks:
  - id: fetch-user
    input:
      userId: "{{input.userId}}"          # From workflow input

  - id: send-email
    input:
      email: "{{tasks.fetch-user.output.email}}"   # From upstream task
      items: "{{tasks.fetch-user.output.orders[0].items}}"  # Array access
```

**Features:**
- Dot notation: `{{input.nested.field}}`
- Array indexing: `{{items[0].name}}`
- Full JSON serialization for object references
- Compile-time template validation

### 3.3 Execution Graph & Parallelism

```mermaid
graph LR
    subgraph "Parallel Group 1"
        A[fetch-user]
        B[fetch-orders]
    end

    subgraph "Parallel Group 2"
        C[process-data]
    end

    subgraph "Parallel Group 3"
        D[send-confirmation]
    end

    A --> C
    B --> C
    C --> D
```

**Features:**
- **Automatic dependency detection** (explicit `dependsOn` + implicit template refs)
- **Cycle detection** with clear error messages showing the cycle path
- **Parallel execution** of independent tasks (2x+ speedup)
- **Configurable parallelism limits** via SemaphoreSlim

### 3.4 HTTP Task Execution

```yaml
apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: charge-payment
spec:
  type: http
  http:
    method: POST
    url: "https://api.stripe.com/v1/charges"
    headers:
      Authorization: "Bearer {{input.apiKey}}"
    body: |
      {
        "amount": {{input.amount}},
        "currency": "{{input.currency}}"
      }
  timeout: "30s"
  inputSchema: { ... }
  outputSchema: { ... }
```

**Features:**
- **Retry policy:** Exponential backoff (100ms → 200ms → 400ms → ... capped at 30s)
- **Per-task timeouts:** `30s`, `5m`, `500ms` syntax
- **Structured error classification:** Timeout, NetworkError, RateLimitError, AuthenticationError, etc.
- **Response handlers:** JSON (default), XML, plain text

### 3.5 Transform DSL

40+ operations for data transformation without code:

```yaml
- id: transform-users
  taskRef: transform
  input:
    source: "{{tasks.fetch-users.output}}"
    pipeline:
      - operation: filter
        field: active
        operator: eq
        value: true
      - operation: map
        mappings:
          userId: id
          fullName: "name"
      - operation: sort
        field: fullName
        order: asc
      - operation: limit
        count: 10
```

**Available Operations:**
- **Data:** select, filter, map, flatMap, flatten, unique, limit, skip, reverse
- **Aggregation:** groupBy, aggregate (sum, avg, count, min, max), join, sortBy
- **Strings:** uppercase, lowercase, trim, split, concat, replace, substring, template
- **Math:** round, floor, ceil, abs, clamp, scale, percentage
- **Random:** randomOne, randomN, shuffle

### 3.6 Real-Time Execution Events

```mermaid
sequenceDiagram
    participant Client
    participant Hub as SignalR Hub
    participant Orch as Orchestrator

    Client->>Hub: Subscribe(executionId)
    Orch->>Hub: WorkflowStarted
    Hub->>Client: WorkflowStarted event

    Orch->>Hub: TaskStarted(task-a)
    Hub->>Client: TaskStarted event

    Orch->>Hub: TaskCompleted(task-a)
    Hub->>Client: TaskCompleted event

    Orch->>Hub: WorkflowCompleted
    Hub->>Client: WorkflowCompleted event
```

**Features:**
- **SignalR WebSocket hub** for push notifications
- **Events:** WorkflowStarted, TaskStarted, TaskCompleted, WorkflowCompleted, SignalFlow
- **Sub-100ms latency** for event delivery
- **Connection pooling** and automatic reconnection
- **No polling required**

### 3.7 Debugging & Observability

| Feature | What It Does |
|---------|--------------|
| **Execution Traces** | Wait time analysis per task, dependency resolution order |
| **Parallelism Detection** | Planned vs actual parallel groups from timing analysis |
| **Time-Travel UI** | Scrub through execution timeline at 1x, 10x, 100x speed |
| **Step-Through Mode** | Pause at each task, manual approval to continue |
| **Execution Comparison** | Side-by-side diff of two executions |
| **Variable Watcher** | Track specific data across task chain |

---

## 4. Why You Should Trust It Won't Break

> **TL;DR:** 3,300+ tests, 90%+ coverage, mutation testing, admission webhooks, and audit trails for every stage. This isn't a "move fast and break things" project.

```mermaid
graph TB
    subgraph "Testing Pyramid"
        E2E[E2E Tests<br/>100+ Playwright]
        INT[Integration Tests<br/>500+]
        UNIT[Unit Tests<br/>3,300+]
    end

    subgraph "Quality Gates"
        COV[Coverage ≥90%]
        MUT[Mutation ≥80%]
        SEC[0 Vulnerabilities]
        BUILD[0 Warnings]
    end

    subgraph "Fail-Fast Validation"
        WEBHOOK[Admission Webhooks]
        SCHEMA[Schema Validation]
        CYCLE[Cycle Detection]
    end

    UNIT --> COV
    UNIT --> MUT
    INT --> SEC
    E2E --> BUILD

    style UNIT fill:#51cf66
    style INT fill:#4dabf7
    style E2E fill:#9775fa
    style COV fill:#ffd43b
    style MUT fill:#ffd43b
    style SEC fill:#ffd43b
    style BUILD fill:#ffd43b
```

### 4.1 Test Coverage & TDD Enforcement

| Metric | Value | Enforcement |
|--------|-------|-------------|
| Unit Tests | 3,300+ | CI blocks on failure |
| Integration Tests | 500+ | CI blocks on failure |
| E2E Tests | 100+ | CI blocks on failure |
| Code Coverage | ≥90% | CI blocks if below |
| Mutation Score | ≥80% | Stryker.NET |

**TDD is Non-Negotiable:**

```mermaid
flowchart LR
    RED[Write Failing Test] --> GREEN[Minimal Code to Pass]
    GREEN --> REFACTOR[Improve While Green]
    REFACTOR --> COMMIT[Commit with Proof]
    COMMIT --> RED

    style RED fill:#ff6b6b
    style GREEN fill:#51cf66
    style REFACTOR fill:#4dabf7
    style COMMIT fill:#9775fa
```

Every feature has tests written **FIRST**. No exceptions.

### 4.2 Quality Gates (8 Mandatory per Stage)

| Gate | What It Checks |
|------|----------------|
| 1 | No template files (Class1.cs, UnitTest1.cs) |
| 2 | Linting passes (0 errors) |
| 3 | Build succeeds (0 warnings, 0 errors) |
| 4 | Type safety (TypeScript only) |
| 5 | All tests pass (0 failures, 0 skipped) |
| 6 | Coverage ≥90% |
| 7 | Security scan (0 vulnerabilities) |
| 8 | Proof file complete (no placeholders) |

### 4.3 Fail-Fast Validation

Errors are caught at **deploy time**, not runtime:

```mermaid
flowchart LR
    subgraph "Deploy Time"
        A[kubectl apply] --> B{Admission Webhook}
        B -->|Schema Invalid| X1[REJECTED]
        B -->|Circular Deps| X2[REJECTED]
        B -->|Missing Task| X3[REJECTED]
        B -->|Type Mismatch| X4[REJECTED]
        B -->|Valid| C[CRD Created]
    end

    subgraph "Discovery"
        C --> D[Operator Watches]
        D --> E[Gateway Cache<br/>30s TTL]
    end

    subgraph "Runtime"
        E --> F[Execute Workflow]
        F --> G{Input Valid?}
        G -->|No| X5[400 Bad Request]
        G -->|Yes| H[Run Tasks]
    end

    style X1 fill:#ff6b6b
    style X2 fill:#ff6b6b
    style X3 fill:#ff6b6b
    style X4 fill:#ff6b6b
    style X5 fill:#ff6b6b
    style C fill:#51cf66
    style H fill:#51cf66
```

**Example: What gets caught at deploy time:**

```yaml
# This workflow would be REJECTED at kubectl apply:
tasks:
  - id: task-a
    dependsOn: [task-b]  # ← Circular!
  - id: task-b
    dependsOn: [task-a]  # ← Error: "Circular dependency: task-a → task-b → task-a"
```

### 4.4 Mutation Testing (Stryker.NET)

Tests aren't just passing — they're **meaningful**:

- Mutants killed: 80%+ score required
- Catches "tests that pass but don't actually verify behavior"
- Runs on every stage completion

### 4.5 Stage Proof Files (Audit Trail)

Every completed stage has a proof file documenting:
- Exact test counts and pass rates
- Coverage percentages
- Build output (warnings, errors)
- Security scan results
- Principal Engineer review with risks identified

See: `stage-proofs/stage-X.Y/STAGE_X.Y_PROOF.md`

### 4.6 Performance Benchmarks

- **BenchmarkDotNet** baselines for critical paths
- **Orchestration overhead** tracked (<5% target)
- **P50/P95/P99 latency** monitoring
- **Automatic alerts** on performance degradation

---

## 5. What Gets Better If You Adopt This

### 5.1 For Platform Teams

| Before | After |
|--------|-------|
| Build HTTP client for every team | Build task library once, 50+ teams reuse |
| Debug retry logic in each service | Central retry policy, one place to fix |
| Provider migration = 30+ PRs | Update one task, test once, deploy once |
| "Works on my machine" integration issues | Schema validation catches at design time |

### 5.2 For Product Teams

| Before | After |
|--------|-------|
| 2 weeks to integrate new API | 5 minutes to compose workflow from tasks |
| Write YAML from scratch | Start from template library |
| Debug via log diving | Time-travel UI, execution traces |
| "Why is this slow?" guessing | Execution trace shows exact bottleneck |

### 5.3 Velocity Improvements

- **First workflow:** <5 minutes (vs 2 weeks)
- **Template reuse:** 70%+ workflows start from templates
- **Debugging time:** 5x faster (traces vs logs)
- **Integration testing:** Built into dry-run mode

### 5.4 Risk Reduction

- **Zero runtime type surprises:** Schema validation at deploy
- **No circular dependency outages:** Detected at `kubectl apply`
- **Provider hot-swap:** 30-second cache TTL
- **Rollback safety:** Workflow versioning with SHA256 hashes

---

## 6. Architecture

```mermaid
graph TB
    subgraph "Developer Experience"
        UI[workflow-ui<br/>React + TypeScript]
        VB[Visual Builder<br/>React Flow]
        DBG[Debugging<br/>Time Travel]
        VIZ[3D Visualization<br/>Three.js]
    end

    subgraph "API Layer"
        GW[WorkflowGateway<br/>ASP.NET Core]
        WS[SignalR Hub<br/>Real-time Events]
        REST[REST API<br/>Execute / Test / Manage]
    end

    subgraph "Core Engine"
        ORCH[WorkflowOrchestrator<br/>Parallel Execution]
        GRAPH[ExecutionGraphBuilder<br/>DAG + Cycle Detection]
        SCHEMA[SchemaValidator<br/>JsonSchema.Net]
        TPL[TemplateResolver<br/>Expression Engine]
        HTTP[HttpTaskExecutor<br/>Retry + Timeout]
    end

    subgraph "Kubernetes"
        OP[WorkflowOperator<br/>KubeOps 8.x]
        WEBHOOK[Admission Webhooks<br/>Fail-Fast Validation]
        CRD1[WorkflowTask CRDs]
        CRD2[Workflow CRDs]
    end

    subgraph "Persistence"
        PG[(PostgreSQL<br/>Execution History)]
    end

    UI --> GW
    VB --> GW
    DBG --> GW
    GW --> ORCH
    GW --> WS
    ORCH --> GRAPH
    ORCH --> HTTP
    HTTP --> TPL
    GRAPH --> SCHEMA
    OP --> CRD1
    OP --> CRD2
    WEBHOOK --> CRD1
    WEBHOOK --> CRD2
    GW --> PG
    OP -.->|discovers| GW
```

### How Workflows Execute

```mermaid
sequenceDiagram
    participant User
    participant Gateway as WorkflowGateway
    participant Orch as Orchestrator
    participant Graph as ExecutionGraph
    participant Exec as HttpTaskExecutor
    participant Hub as SignalR Hub

    User->>Gateway: POST /workflows/order-checkout/execute
    Gateway->>Gateway: Validate input against schema
    Gateway->>Orch: ExecuteAsync(workflow, input)
    Orch->>Graph: Build dependency graph
    Graph-->>Orch: ParallelGroups detected

    Orch->>Hub: WorkflowStarted event

    loop For each ParallelGroup
        par Execute independent tasks
            Orch->>Exec: Execute task A
            Orch->>Exec: Execute task B
        end
        Exec-->>Orch: Task results
        Orch->>Hub: TaskCompleted events
    end

    Orch->>Hub: WorkflowCompleted event
    Orch-->>Gateway: WorkflowExecutionResult
    Gateway-->>User: JSON response with outputs
```

---

## 7. Adoption Path

```mermaid
gantt
    title Adoption Timeline
    dateFormat  YYYY-MM-DD
    section Week 1
    Deploy Operator           :a1, 2024-01-01, 1d
    Create 5 Task CRDs        :a2, after a1, 2d
    First Workflow            :a3, after a2, 1d
    Execute via API           :a4, after a3, 1d
    section Week 2-3
    Deploy UI                 :b1, after a4, 1d
    Team Training             :b2, after b1, 3d
    Dashboards Setup          :b3, after b2, 2d
    section Month 2+
    Build Task Library        :c1, after b3, 14d
    AI Generation (MCP)       :c2, after c1, 7d
    Performance Monitoring    :c3, after c1, 7d
```

### Week 1: Minimal Viable Adoption

1. Deploy operator to existing K8s cluster
2. Create 3-5 WorkflowTask CRDs for common APIs
3. Compose first workflow
4. Execute via REST API

### Week 2-3: Team Onboarding

1. Deploy workflow-ui for visual building
2. Train product teams on template library
3. Set up execution history and dashboards

### Month 2+: Platform Maturity

1. Build comprehensive task library
2. Enable AI-powered workflow generation (MCP)
3. Set up performance monitoring and alerting

### The Reusability Multiplier

```mermaid
graph LR
    subgraph "Platform Team Builds Once"
        T1[charge-payment<br/>Stripe integration]
        T2[send-email<br/>SendGrid wrapper]
        T3[check-inventory<br/>Warehouse API]
        T4[create-shipment<br/>Shippo integration]
    end

    subgraph "Product Teams Compose"
        W1[order-checkout]
        W2[subscription-renewal]
        W3[refund-processing]
        W4[abandoned-cart]
        W5[order-confirmation]
        W6[shipping-notification]
    end

    T1 --> W1
    T1 --> W2
    T1 --> W3
    T2 --> W1
    T2 --> W4
    T2 --> W5
    T2 --> W6
    T3 --> W1
    T3 --> W4
    T4 --> W1
    T4 --> W6

    style T1 fill:#4dabf7
    style T2 fill:#4dabf7
    style T3 fill:#4dabf7
    style T4 fill:#4dabf7
```

**Result:** 4 tasks → 6 workflows. Build once, compose many.

---

## 8. What This Is NOT

| NOT For | IS For |
|---------|--------|
| Long-running jobs (hours/days) | Synchronous calls (max 30 seconds) |
| Async pause/resume workflows | Real-time request/response |
| Replacing Airflow/Prefect/Temporal | Microservice composition |
| Infrastructure orchestration | API orchestration |

**Perfect For:**
- Microservice composition
- Real-time API orchestration
- User-facing synchronous workflows
- Payment/notification/integration pipelines

---

## 9. Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | .NET 8, ASP.NET Core, System.Text.Json |
| Kubernetes | KubeOps 8.x, CRDs, Admission Webhooks |
| Schema | JsonSchema.Net 5.x |
| Database | PostgreSQL 15 |
| Frontend | React 18, TypeScript, React Flow, Three.js |
| Real-time | SignalR (WebSocket) |
| Testing | xUnit, Moq, FluentAssertions, Stryker.NET |
| Performance | BenchmarkDotNet, NBomber |

---

## 10. Current Status

**60% Complete (22/37 stages)**

| Category | Stages | Status |
|----------|--------|--------|
| Core Engine | 1-7.9 | ✅ Complete |
| Developer Experience | 9.1-9.6.1 | ✅ Complete |
| Performance | 10.1-10.2 | ✅ Complete |
| Visualizations | 12.1-12.5 | ✅ Complete |
| AI Generation | 13 | ✅ Complete |
| Optimization Engine | 14 | 🔄 Planned |
| Test Infrastructure | 16-17 | 🔄 Planned |

---

## Quick Links

- **API Docs:** `/swagger` on WorkflowGateway
- **Visual Builder:** `/workflows/new` on workflow-ui
- **Execution History:** `/executions` on workflow-ui
- **3D Visualization:** `/visualization/galaxy` on workflow-ui

---

*Last updated: 2025-12-03*
