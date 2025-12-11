# Future Stages - Detailed Specifications

**Created:** 2025-12-07
**Updated:** 2025-12-10
**Purpose:** Detailed implementation specifications for advanced/future stages
**Related:** See `CLAUDE.md` for project overview, `ROADMAP.md` for active stages (29-32), and `COMPLETED_STAGES_ARCHIVE.md` for completed stage details

---

## Stage 11: Cloud Deployment & Production Hardening (TDD)

**Status:** Not Started

### Deliverables

1. **Helm Charts**
   - Operator deployment
   - Gateway deployment
   - PostgreSQL (or cloud DB)

2. **Cloud E2E Tests**
   - Deploy to GKE (Google Kubernetes Engine)
   - Deploy to AKS (Azure Kubernetes Service)
   - Full E2E workflow tests in cloud

3. **Production Hardening**
   - Security scanning
   - Resource limits and quotas
   - High availability configuration

---

## Stage 14: Workflow Optimization Engine (TDD)

**Status:** ✅ Complete (14.1-14.4) - See `stage-proofs/stage-14.4/`

*Scope:* Automated workflow analysis and optimization with correctness verification
*Deliverables:* 5
*Tests:* ~40-45 tests
*Dependencies:* Stages 7.8 (Execution History), 7.9 (Traces), 9.6.1 (Transform DSL)
*Value:* "Your workflows, but faster" - automatic performance tuning with safety guarantees

*Philosophy:* Use execution history as a regression test suite. Propose optimizations, replay past executions, verify outputs match. No guessing - only provably-safe changes.

*Trigger Mode:* Smart hybrid scheduling - automatic prioritization (slowest workflows first, cooldown periods, execution frequency) plus on-demand user trigger.

### Substages

#### 14.1: Static Workflow Analyzer
- Parse workflow and build optimization graph
- Detect optimization candidates:
  - Filter-before-map reordering (reduce data volume early)
  - Redundant transform elimination (select ignoring mapped fields)
  - Dead task detection (outputs never used downstream)
  - Parallel promotion (sequential tasks with no real dependency)
  - Transform fusion (multiple maps → single map)
- Calculate theoretical performance impact
- Tests for each optimization pattern detection

#### 14.2: Transform Equivalence Checker
- Algebraic rules for transform operations:
  - `filter(A) → filter(B)` = `filter(A && B)` (filter fusion)
  - `map(f) → map(g)` = `map(g ∘ f)` (map composition)
  - `filter → map` vs `map → filter` (commutativity check)
  - `limit(N) → filter` vs `filter → limit(N)` (may differ!)
- Identify safe vs unsafe reorderings
- Generate equivalence proofs for audit trail
- Tests for algebraic properties

#### 14.3: Historical Replay Engine
- Fetch past N executions for a workflow
- Execute both original and optimized versions
- Deep comparison of outputs (structural equality)
- Handle non-deterministic tasks (timestamps, random IDs)
- Report: match rate, timing delta, confidence score
- Tests for replay accuracy and edge cases

#### 14.4: Optimization Suggestions API
- `GET /api/v1/workflows/{name}/optimizations`
- Returns list of suggested optimizations with confidence scores
- `POST /api/v1/workflows/{name}/optimizations/{id}/apply` - apply suggestion
- `POST /api/v1/workflows/{name}/optimizations/{id}/test` - run more replays
- Tests for API contracts and edge cases

#### 14.5: Optimization Dashboard (UI)
- Visual diff: original vs optimized workflow graph
- Performance comparison chart (before/after timing)
- Confidence indicator based on replay results
- One-click apply with rollback option
- History of applied optimizations
- Tests for UI components

### Optimization Types

| Type | Detection | Validation | Risk |
|------|-----------|------------|------|
| Filter-first | Static | Replay | Low |
| Dead task removal | Static | Replay | Low |
| Transform fusion | Algebraic | Replay | Low |
| Parallel promotion | Dependency analysis | Replay | Medium |
| Task reordering | Dependency analysis | Replay | Medium |

### TDD Targets
- 40+ tests across analyzer, replay engine, and API
- Property-based tests for algebraic equivalence
- Integration tests with real execution history
- Maintain ≥90% coverage

### Success Metrics
- Optimization detection rate: Find opportunities in 60%+ of workflows
- Correctness: 0 false positives (never suggest breaking change)
- Average speedup: 1.5x+ for workflows with optimizations
- Adoption: 40% of suggestions applied within 7 days

**Value:** **Automatic performance tuning with zero risk** - every suggestion is proven safe!

---

## Stage 15: MCP Server for External Workflow Consumption (TDD)

**Status:** ✅ Complete (15.1-15.5) - See `stage-proofs/stage-15.5/`

*Scope:* Enable external chatbots and AI assistants to discover and execute workflows via Model Context Protocol
*Deliverables:* 5 substages
*Tests:* ~50 tests
*Dependencies:* Stages 7 (API Gateway), 9.2 (Templates), 14 (Optimization Engine)
*Package:* `packages/workflow-mcp-consumer` (new, separate from Stage 13)
*Value:* "Let any chatbot use your workflows" - democratize workflow access beyond internal users

*Philosophy:* External users (via chatbots) should be able to explore, understand, and invoke workflows without reading documentation. The MCP server provides rich metadata that enables LLMs to reason about which workflow to use and how to use it.

*Key Distinction from Stage 13:* Stage 13 is about *creating* workflows (internal, developer-focused). Stage 15 is about *consuming* existing workflows (external, end-user focused via chatbots).

### Substages

#### Stage 15.1: Backend Metadata Enrichment
- Add `categories`, `tags`, `examples` fields to WorkflowSpec
- Structured `MissingInputsResult` response (field names, types, descriptions)
- New endpoint: `POST /api/v1/workflows/{name}/validate-input`
- Update existing APIs to expose enriched metadata
- Profile: `BACKEND_DOTNET`, Gates: 1-8
- Tests: 20+

#### Stage 15.2: MCP Tools for Workflow Discovery
- `list_workflows` - All workflows with rich metadata (categories, tags, input summary, stats)
- `search_workflows` - Query by keywords/intent with ranked matches
- `get_workflow_details` - Full schema, examples, required inputs
- `autoExecute` mode: returns bestMatch with confidence, extractedInputs, canAutoExecute
- Profile: `FRONTEND_TS`, Gates: 1-8, 15
- Tests: 18+

#### Stage 15.3: MCP Tool for Workflow Execution
- `execute_workflow` - Execute with structured error responses
- Success: executionId, output, duration, task results
- Validation failure: missingInputs, invalidInputs, suggestedPrompt
- Execution failure: failedTask, errorMessage, partialOutput
- Profile: `FRONTEND_TS`, Gates: 1-8, 15
- Tests: 10+

#### Stage 15.4: MCP Resources & Prompts
- Resources: `workflow://{name}`, `workflow://{name}/schema`
- Prompts: `discover-workflow`, `execute-workflow`, `troubleshoot-execution`
- Profile: `FRONTEND_TS`, Gates: 1-8
- Tests: 10+

#### Stage 15.5: Integration & Documentation
- Claude Desktop configuration example
- Streamable HTTP transport for web-based chatbots
- README, tool reference, troubleshooting docs
- E2E integration tests (full discover → execute flow)
- Profile: `FRONTEND_TS`, Gates: 1-8, 15
- Tests: 5+

### Execution Modes (Feature Flag)

| Mode | Behavior |
|------|----------|
| `autoExecute: false` | Show ranked options, user confirms, gather inputs interactively |
| `autoExecute: true` | Auto-select best match if confidence ≥0.8 AND all inputs available |

### Example Interaction (Auto-Execute Mode)
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

### TDD Targets
- 50+ tests across all substages
- E2E tests for full discover → execute flow
- Test autoExecute mode: confidence thresholds, input extraction, fallback
- Maintain ≥90% coverage

### Success Metrics
- Workflow discovery accuracy: >90%
- Input validation clarity: 100% (always includes description)
- Execution success rate: >95% (after valid input)
- Response latency (discovery): <500ms
- Response latency (execution): <5s (p95)

**Value:** **Any chatbot can now be a workflow executor** - democratize access beyond technical users!

---

## Stage 33: Blast Radius Analysis (TDD)

**Status:** ✅ Complete (33.1-33.3) - See `stage-proofs/stage-33.3/`

*Scope:* Transitive dependency analysis for task changes - show complete cascade impact when replacing/modifying tasks
*Deliverables:* 3 substages
*Tests:* ~40 tests
*Dependencies:* ITaskDependencyTracker (existing)
*Value:* "Know exactly what breaks" - see all affected workflows and tasks before making changes

### Problem Statement

Current `/impact` endpoint only shows direct dependents (workflows using Task A). When replacing a task, you need to see:
- All workflows using the task (depth 1)
- All other tasks in those workflows (depth 1)
- All workflows using THOSE tasks (depth 2)
- And so on...

### API Design

```http
GET /api/v1/tasks/{taskName}/blast-radius?depth=2&format=both
```

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `depth` | `1`, `2`, `3`, `unlimited` | `1` | How many levels to traverse |
| `format` | `flat`, `graph`, `both` | `both` | Response format |

### Response Structure

```json
{
  "taskName": "get-user",
  "analysisDepth": 2,
  "truncatedAtDepth": false,
  "summary": {
    "totalAffectedWorkflows": 5,
    "totalAffectedTasks": 8,
    "affectedWorkflows": ["wf-1", "wf-2"],
    "affectedTasks": ["task-a", "task-b"],
    "byDepth": [
      { "depth": 1, "workflows": ["wf-1", "wf-2"], "tasks": ["task-a"] },
      { "depth": 2, "workflows": ["wf-3"], "tasks": ["task-b", "task-c"] }
    ]
  },
  "graph": {
    "nodes": [
      { "id": "task:get-user", "name": "get-user", "type": "task", "depth": 0, "isSource": true },
      { "id": "workflow:order-flow", "name": "order-flow", "type": "workflow", "depth": 1 }
    ],
    "edges": [
      { "source": "task:get-user", "target": "workflow:order-flow", "relationship": "usedBy" }
    ]
  }
}
```

### Substages

#### 33.1: Blast Radius Service
**Focus**: Core algorithm with BFS traversal and cycle detection
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~15

##### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowCore/Models/BlastRadiusResult.cs` | Internal result model |
| `src/WorkflowCore/Services/IBlastRadiusAnalyzer.cs` | Service interface |
| `src/WorkflowCore/Services/BlastRadiusAnalyzer.cs` | Core algorithm |
| `tests/WorkflowCore.Tests/Services/BlastRadiusAnalyzerTests.cs` | Unit tests |

##### Algorithm: BFS with Cycle Detection

```
ComputeBlastRadius(taskName, maxDepth):
  visited = { taskName }
  currentLevel = [taskName]

  for depth 1..maxDepth:
    nextLevel = []
    level = { workflows: [], tasks: [] }

    for each task in currentLevel:
      for each workflow using task (from ITaskDependencyTracker):
        if workflow not visited:
          mark visited, add to level.workflows
          for each task in workflow.spec.tasks:
            if task not visited:
              mark visited, add to level.tasks, add to nextLevel

    record level
    if nextLevel empty: break
    currentLevel = nextLevel

  return aggregated result
```

Key features:
- **Cycle detection**: HashSet of visited nodes prevents infinite loops
- **Depth limiting**: Stops at specified depth, sets `truncatedAtDepth` flag
- **BFS traversal**: Ensures correct depth attribution

#### 33.2: Blast Radius API
**Focus**: REST endpoint with query parameters
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~10

##### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowGateway/Models/BlastRadiusResponse.cs` | API response models |
| `tests/WorkflowGateway.Tests/Controllers/BlastRadiusEndpointTests.cs` | Controller tests |

##### Modified Files
| File | Changes |
|------|---------|
| `src/WorkflowGateway/Controllers/TaskImpactController.cs` | Add `/blast-radius` endpoint |
| `src/WorkflowGateway/Program.cs` | Register `IBlastRadiusAnalyzer` |

### Test Scenarios

```
Scenario: Simple Chain
  Task A → Workflow 1 → Task B → Workflow 2 → Task C

  depth=1: { workflows: [W1], tasks: [B] }
  depth=2: { workflows: [W1, W2], tasks: [B, C] }

Scenario: Diamond
  Task A → Workflow 1 → Task B
  Task A → Workflow 2 → Task B

  Task B should only appear once (deduplicated)

Scenario: Cycle
  Task A → Workflow 1 → Task B → Workflow 2 → Task A

  Should terminate, not infinite loop
```

#### 33.3: Blast Radius UI
**Focus**: Visual display of blast radius on task detail page
**Profile**: `FRONTEND_TS`, Gates 1-8, 14, 15
**Tests**: ~15

##### New Files
| File | Purpose |
|------|---------|
| `src/workflow-ui/components/tasks/blast-radius-panel.tsx` | Main panel component |
| `src/workflow-ui/components/tasks/blast-radius-graph.tsx` | Interactive graph visualization |
| `src/workflow-ui/components/tasks/blast-radius-summary.tsx` | Flat summary list |
| `src/workflow-ui/lib/api/blast-radius.ts` | API client hook |

##### UI Features
- Collapsible "Blast Radius" section on task detail page
- Depth selector (1, 2, 3, unlimited)
- Toggle between graph view and list view
- Click nodes to navigate to affected workflows/tasks
- Export affected items list

### TDD Targets
- 40+ tests across service, API, and UI
- Cycle detection verified
- Depth limiting verified
- Maintain ≥90% coverage

### Success Metrics
- Response time: <500ms for depth=3
- Accuracy: 100% of affected items discovered
- No infinite loops on cyclic dependencies

**Value:** **Complete impact visibility** - never break a workflow unknowingly again!

---

## Stage 43: Workflow & Task Label Management System

**Status:** Not Started

*Scope:* Enable users to organize workflows and tasks using tags (free-form) and categories (predefined) with filtering, bulk operations, AI suggestions, and analytics
*Deliverables:* 5 substages
*Tests:* ~135 tests
*Dependencies:* Stage 15 (MCP Consumer), existing tags/categories fields in WorkflowSpec/WorkflowTaskSpec
*Value:* "Find what you need, organize at scale" - categorization and discovery for large workflow libraries

### Current State

**Already Exists (K8s CRDs + Models):**
- `WorkflowSpec.Tags: List<string>?` and `WorkflowSpec.Categories: List<string>?`
- `WorkflowTaskSpec.Tags: List<string>?` and `WorkflowTaskSpec.Category: string?`
- MCP Consumer `list_workflows` tool with basic category/tag filtering

**Missing:**
- PostgreSQL persistence for efficient querying
- API endpoints for label filtering and management
- MCP tools for bulk operations and AI suggestions
- UI for filtering, editing, bulk ops, and analytics

### Substages

#### 43.1: Backend Label Storage & Sync
- PostgreSQL tables: `WorkflowLabels`, `TaskLabels`, `LabelUsageStats`
- GIN indexes for efficient array queries
- Background sync service (K8s → PostgreSQL, 30s interval)
- `ILabelRepository` with query methods for tag/category filtering
- ~30 tests

#### 43.2: Backend Label API
- Extend `GET /api/v1/workflows` with `?tags=`, `?categories=`, `?matchAllTags=`
- Extend `GET /api/v1/tasks` with `?tags=`, `?category=`
- New endpoints: `GET /api/v1/labels`, `GET /api/v1/labels/stats`
- CRUD: `PATCH /api/v1/workflows/{name}/labels`, `PATCH /api/v1/tasks/{name}/labels`
- Bulk: `POST /api/v1/workflows/labels/bulk`, `POST /api/v1/tasks/labels/bulk`
- ~25 tests

#### 43.3: MCP Label Tools
- Enhanced `list_workflows`: `categories[]`, `anyTags[]`, `excludeTags[]`, `tagPattern`
- Enhanced `list_tasks`: `tags[]`, `anyTags[]`, `excludeTags[]`
- New `list_labels` tool: discover all labels with usage counts
- New `manage_labels` tool: bulk add/remove labels with dry-run
- New `suggest_labels` tool: AI-powered suggestions using LLM
- ~35 tests

#### 43.4: UI Label Filtering
- `TagBadge`, `CategoryBadge` components
- `LabelFilter` component (collapsible filter section)
- Extend `WorkflowFilters` with label filtering
- Display labels in `WorkflowCard` and `TaskCard`
- ~20 tests

#### 43.5: UI Label Management
- `LabelEditor` modal for single item editing
- `BulkLabelEditor` popover for multi-select operations
- `BulkActionBar` floating bar when items selected
- `LabelAnalyticsPanel` dashboard widget
- ~25 tests

### Database Schema

```sql
-- WorkflowLabels (denormalized for query performance)
CREATE TABLE "WorkflowLabels" (
    "Id" UUID PRIMARY KEY,
    "WorkflowName" VARCHAR(255) NOT NULL,
    "Namespace" VARCHAR(255) NOT NULL DEFAULT 'default',
    "Tags" TEXT[] NOT NULL DEFAULT '{}',
    "Categories" TEXT[] NOT NULL DEFAULT '{}',
    "SyncedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "VersionHash" VARCHAR(64),
    CONSTRAINT "UQ_WorkflowLabels_Name_Namespace" UNIQUE ("WorkflowName", "Namespace")
);
CREATE INDEX "IX_WorkflowLabels_Tags" ON "WorkflowLabels" USING GIN ("Tags");
CREATE INDEX "IX_WorkflowLabels_Categories" ON "WorkflowLabels" USING GIN ("Categories");

-- TaskLabels
CREATE TABLE "TaskLabels" (
    "Id" UUID PRIMARY KEY,
    "TaskName" VARCHAR(255) NOT NULL,
    "Namespace" VARCHAR(255) NOT NULL DEFAULT 'default',
    "Category" VARCHAR(255),
    "Tags" TEXT[] NOT NULL DEFAULT '{}',
    "SyncedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "VersionHash" VARCHAR(64),
    CONSTRAINT "UQ_TaskLabels_Name_Namespace" UNIQUE ("TaskName", "Namespace")
);
CREATE INDEX "IX_TaskLabels_Tags" ON "TaskLabels" USING GIN ("Tags");

-- LabelUsageStats (pre-computed analytics)
CREATE TABLE "LabelUsageStats" (
    "Id" UUID PRIMARY KEY,
    "LabelType" VARCHAR(20) NOT NULL,  -- 'Tag' or 'Category'
    "LabelValue" VARCHAR(255) NOT NULL,
    "EntityType" VARCHAR(20) NOT NULL, -- 'Workflow' or 'Task'
    "UsageCount" INTEGER NOT NULL DEFAULT 0,
    "LastUsedAt" TIMESTAMP WITH TIME ZONE,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "UQ_LabelUsageStats" UNIQUE ("LabelType", "LabelValue", "EntityType")
);
```

### MCP Tools Specification

**suggest_labels** - AI-powered suggestions:
```
Analyze workflow and suggest labels based on:
- Domain/business area (orders, payments, users)
- Technical characteristics (http-based, transform-only)
- Lifecycle stage (production, beta, deprecated)
- Complexity level (simple, complex, multi-step)

Return: { suggestions: [{ label, type, confidence, reason }] }
```

### Success Metrics
- Query performance: <50ms for tag/category filtering on 10K+ workflows
- GIN index effectiveness: array queries use index scans
- MCP suggestions: relevant labels with >70% user acceptance rate
- Test coverage: ≥90%

---

## Stage 44: Training Curriculum Expansion

**Status:** Not Started

*Scope:* Expand playground training content to comprehensively cover all workflow features with inspiring, developer-focused lessons
*Deliverables:* 8 new lessons (Lessons 11-18)
*Tests:* Update existing lesson tests + validation for new content
*Dependencies:* Stages 20 (Triggers), 21 (Sub-Workflows), 28 (Circuit Breaker)
*File:* `packages/workflow-ui/src/components/learning/lessons-registry.ts`
*Value:* "Learn by doing, inspired to master" - comprehensive training from basics to production-ready patterns

### Design Philosophy: Inspire While Teaching

Each new lesson includes:
- 💡 **"Why This Makes Your Life Easier"** - Motivating quote showing real developer pain points solved
- **Developer Win** - Concrete benefits and metrics from real-world usage
- **Real-World Scenario** - Practical story showing the feature in action

### Current Coverage (10 Lessons)

| # | Lesson | Features Covered |
|---|--------|------------------|
| 1 | Hello World | Basic structure, metadata, single task |
| 2 | Task Dependencies | Output references, chaining |
| 3 | Parallel Execution | Independent tasks, performance |
| 4 | Template Syntax | Nested access, arrays, complex data |
| 5 | Advanced Features | Output mapping, timeouts |
| 6 | Control Flow | Conditions, if/else |
| 7 | Switch/Case | Multi-branch routing |
| 8 | forEach Loops | Array iteration, maxParallel |
| 9 | Transform DSL | filter, map, sort, limit |
| 10 | OpenAPI Import | CLI tool, task generation |

### New Lessons (8 Total)

#### Lesson 11: Sub-Workflows - Compose & Reuse (Intermediate)
**Duration:** 15 minutes | **Prerequisites:** Lesson 2

💡 *"Write once, use everywhere. That payment validation logic you perfected? Now every workflow that needs it gets the same battle-tested code with zero copy-paste."*

**Topics:** workflowRef vs taskRef, input parameter passing, output aggregation, reusability patterns

---

#### Lesson 12: Schedule Triggers - Automate Execution (Intermediate)
**Duration:** 15 minutes | **Prerequisites:** Lesson 1

💡 *"Stop being the human cron job. That report your boss wants every Monday morning? Set it once, forget it forever."*

**Topics:** Cron expression syntax, timezone configuration, multiple triggers per workflow

---

#### Lesson 13: Execution History - Debug & Analyze (Intermediate)
**Duration:** 15 minutes | **Prerequisites:** Lessons 1-5

💡 *"No more 'it works on my machine' mysteries. Every workflow execution is recorded with full input/output traces."*

**Topics:** Viewing execution history, understanding traces, task-level timing, identifying failure points

---

#### Lesson 14: Retry Policies - Handle Transient Failures (Intermediate)
**Duration:** 15 minutes | **Prerequisites:** Lesson 13

💡 *"Networks are unreliable. APIs have bad days. Instead of waking up to 500 failed orders because of a 2-second hiccup, your workflow just... tries again."*

**Topics:** Retry configuration, exponential backoff, max attempts, transient vs permanent failures

---

#### Lesson 15: Fallback Tasks - Graceful Degradation (Intermediate)
**Duration:** 15 minutes | **Prerequisites:** Lesson 14

💡 *"When Plan A fails, automatically execute Plan B. Your recommendation engine is down? Show popular products instead."*

**Topics:** Fallback task specification, when fallback executes, default value patterns

---

#### Lesson 16: Circuit Breaker - Prevent Cascade Failures (Advanced)
**Duration:** 20 minutes | **Prerequisites:** Lessons 14-15

💡 *"Stop hammering a dead service. If an API fails 5 times in a row, it's probably DOWN - the circuit breaker says 'stop calling it, use fallback instead.'"*

**Topics:** Three-state circuit (Closed, Open, Half-Open), failure threshold, sampling duration, break duration

---

#### Lesson 17: Error Handling Patterns - Production Best Practices (Advanced)
**Duration:** 20 minutes | **Prerequisites:** Lessons 14-16

💡 *"This is where everything clicks. You'll learn WHEN to use each pattern and HOW to combine them. Critical payment path? Retry, no fallback. Product recommendations? Light retry, generous fallback."*

**Topics:** Combining retry + circuit breaker + fallback strategically, error propagation vs containment, timeout strategy

---

#### Lesson 18: Webhook Triggers - Event-Driven Workflows (Advanced)
**Duration:** 20 minutes | **Prerequisites:** Lessons 12, 14-17

💡 *"React to the world in real-time. When Stripe confirms a payment, when GitHub merges a PR - your workflow runs instantly. No polling. No delays."*

**Topics:** Webhook endpoint creation, HMAC signature validation, payload filtering, input mapping, security best practices

---

### Learning Journey Summary

```
Beginner (Lessons 1-5): Build working workflows
Intermediate (Lessons 6-15): Add logic, automation, resilience
Advanced (Lessons 16-18): Production-grade patterns

After completing all 18 lessons, developers can:
✅ Build complex workflows with sub-workflow composition
✅ Automate with schedule and webhook triggers
✅ Debug any failure using execution history
✅ Handle transient failures gracefully with retry
✅ Degrade gracefully with fallback tasks
✅ Prevent cascade failures with circuit breakers
✅ Combine patterns for production-ready systems
```

### Lesson Count Summary

| Category | Current | New | Total |
|----------|---------|-----|-------|
| Beginner | 2 | 0 | 2 |
| Intermediate | 4 | 4 | 8 |
| Advanced | 4 | 4 | 8 |
| **Total** | **10** | **8** | **18** |

**New Total Learning Time:** ~290 minutes (vs current 175 min)

### Success Metrics
- **Completeness:** All major features have training coverage
- **Progression:** Clear learning path from beginner to production-ready
- **Practical:** Each lesson has working code examples
- **Testable:** Each lesson has 5 success criteria checkpoints
- **Inspiring:** Each lesson includes motivation quote, developer win, and real-world scenario

---

## Stage 33: AI-Native Workflows

**Status:** Not Started

*Scope:* Native LLM task type with guardrails, prompt versioning, and intelligent routing
*Deliverables:* 5 substages
*Tests:* ~60 tests
*Dependencies:* Stage 7 (API Gateway)
*Value:* "Every company needs AI in their workflows - make it trivially easy and safe"

### Why This Wins
Every company is integrating LLMs into business processes. Native support with guardrails, token budgets, and prompt versioning makes this the obvious choice over bolting on AI later.

### Substages

#### 33.1: LLM Task Type
- New task type: `type: llm` in WorkflowTaskSpec
- Provider abstraction (OpenAI, Anthropic, Azure OpenAI, local models)
- Configuration: model, temperature, maxTokens, systemPrompt
- Secure API key management via K8s secrets
- ~15 tests

#### 33.2: Prompt Management
- Prompt versioning with history
- Variable interpolation in prompts: `{{input.customerMessage}}`
- Prompt templates library (reusable across workflows)
- A/B testing for prompt variants
- ~12 tests

#### 33.3: Guardrails & Safety
- Token budget per task/workflow
- Content filtering (PII detection, toxicity)
- Output validation against JSON schema
- Rate limiting per model/provider
- Cost tracking per execution
- ~15 tests

#### 33.4: LLM Router Task
- Route based on LLM classification output
- Confidence thresholds for routing decisions
- Fallback routes for low-confidence responses
- Multi-class routing with weighted scores
- ~10 tests

#### 33.5: AI Workflow Templates
- Pre-built templates: sentiment analysis, summarization, entity extraction
- Customer support routing workflow
- Content moderation workflow
- Document processing workflow
- ~8 tests

### Example Workflow
```yaml
apiVersion: workflow.io/v1
kind: Workflow
spec:
  tasks:
    - id: analyze-ticket
      type: llm
      config:
        provider: anthropic
        model: claude-3-haiku
        systemPrompt: "You are a support ticket classifier..."
        maxTokens: 200
      input:
        userMessage: "{{input.ticketBody}}"
      guardrails:
        contentFilter: true
        maxCost: "$0.01"

    - id: route-ticket
      type: llm-router
      input:
        classification: "{{tasks.analyze-ticket.output}}"
      routes:
        - match: "urgency == 'critical'"
          workflow: escalation-workflow
        - match: "category == 'billing'"
          workflow: billing-support
        - default: general-support
```

---

## Stage 34: Cost-Aware Execution

**Status:** Not Started

*Scope:* Track, estimate, budget, and optimize workflow execution costs
*Deliverables:* 4 substages
*Tests:* ~45 tests
*Dependencies:* Stage 7.8 (Execution History)
*Value:* "Know what you're spending before you spend it"

### Why This Wins
Cloud costs are everyone's problem. Show estimated cost before execution, track actual costs, set budgets per workflow/team. Finance teams will mandate this solution.

### Substages

#### 34.1: Cost Tracking Infrastructure
- CostRecord entity (execution_id, task_id, provider, cost_usd, timestamp)
- Cost tracking per external API call
- Provider cost configuration (per-request, per-token, per-GB)
- PostgreSQL storage with aggregation queries
- ~12 tests

#### 34.2: Cost Estimation Engine
- Pre-execution cost estimation based on historical average, input size, task-level cost models
- Display estimate in UI before execution
- API: `GET /api/v1/workflows/{name}/cost-estimate`
- ~12 tests

#### 34.3: Budget Management
- Budget configuration per workflow/namespace/team
- Alert thresholds (warn at 80%, block at 100%)
- Budget periods (daily, weekly, monthly)
- Soft limits (warn) vs hard limits (block)
- API: `GET/PUT /api/v1/budgets`
- ~12 tests

#### 34.4: Cost Dashboard & Reports
- Cost breakdown by workflow, task, provider, team
- Trend analysis (cost over time)
- Anomaly detection (unexpected cost spikes)
- Export for finance systems (CSV, JSON)
- ~9 tests

### Example Configuration
```yaml
spec:
  budget:
    maxCostPerExecution: "$0.50"
    alertThreshold: "$0.30"
    monthlyLimit: "$500"
  tasks:
    - id: call-expensive-api
      taskRef: third-party-enrichment
      costConfig:
        estimatedCost: "$0.05"
        cheaperAlternative: cached-enrichment
```

---

## Stage 35: Marketplace & Pre-Built Connectors

**Status:** Not Started

*Scope:* Curated library of pre-built, tested tasks for common integrations
*Deliverables:* 5 substages
*Tests:* ~70 tests
*Dependencies:* Stage 16 (OpenAPI Import)
*Value:* "Don't build what's already built - use tested connectors"

### Why This Wins
Reduce time-to-value from days to minutes. Community-contributed tasks for Stripe, Twilio, SendGrid, Salesforce with automatic updates.

### Substages

#### 35.1: Connector Package Format
- Standardized package format (manifest.yaml, tasks/, examples/)
- Versioning and dependency management
- Authentication configuration templates
- Documentation generation from package
- ~12 tests

#### 35.2: Core Connectors (Payments & Communication)
- Stripe: charge, refund, subscription, webhook handling
- Twilio: SMS, voice, WhatsApp
- SendGrid: email, templates, tracking
- ~20 tests

#### 35.3: Core Connectors (SaaS & Data)
- Salesforce: CRUD, queries, bulk operations
- Slack: messages, channels, interactive components
- PostgreSQL/MySQL: queries, transactions
- Redis: cache operations
- ~18 tests

#### 35.4: Marketplace API & Registry
- Package registry service, search and discovery
- Version management and updates
- Installation/removal commands
- Usage analytics
- ~12 tests

#### 35.5: Marketplace UI
- Browse and search connectors
- One-click installation
- Configuration wizard for credentials
- Community ratings and reviews
- ~8 tests

### Example Usage
```yaml
tasks:
  - id: charge-customer
    taskRef: marketplace/stripe@2.1.0/create-charge
    input:
      amount: "{{input.totalCents}}"
      currency: "usd"
      customerId: "{{input.stripeCustomerId}}"
```

---

## Stage 36: Visual Time-Travel Debugging

**Status:** Not Started

*Scope:* Interactive debugging with state inspection, replay, and modification
*Deliverables:* 4 substages
*Tests:* ~50 tests
*Dependencies:* Stage 7.8 (Execution History), 7.9 (Traces)
*Value:* "See exactly what happened, then fix it"

### Why This Wins
When things break at 3 AM, engineers need to understand exactly what happened. Not just logs - visual state at every step with the ability to replay with modified inputs.

### Substages

#### 36.1: Enhanced State Capture
- Capture full state at each task boundary
- Input/output snapshots with diff highlighting
- HTTP request/response bodies
- Timing data (queue time, execution time, total time)
- ~15 tests

#### 36.2: Time-Travel UI
- Visual timeline with task markers
- Click any point to see exact state
- Side-by-side comparison (expected vs actual)
- Search within captured state
- ~15 tests

#### 36.3: Replay with Modifications
- "Replay from here" with original inputs
- "Replay with modifications" - edit inputs before replay
- Dry-run mode (no side effects)
- Compare original vs replay outputs
- ~12 tests

#### 36.4: Debugging Workflows
- "Compare with successful execution" - diff failed vs passed
- Automatic anomaly highlighting
- "What changed?" analysis between versions
- Share debug session via URL
- ~8 tests

---

## Stage 37: Collaborative Workflow Development

**Status:** Not Started

*Scope:* Real-time collaboration, comments, approvals, and branching
*Deliverables:* 4 substages
*Tests:* ~55 tests
*Dependencies:* Stage 9.1 (Visual Builder)
*Value:* "Workflows are team artifacts - edit together"

### Why This Wins
Workflows are team artifacts. Solo editing tools lose to collaborative ones. Think Figma for workflows.

### Substages

#### 37.1: Real-Time Collaboration
- WebSocket-based presence (who's viewing/editing)
- Cursor positions for other users
- Conflict resolution (last-write-wins with merge option)
- Lock mechanism for critical sections
- ~15 tests

#### 37.2: Comments & Annotations
- Comments on workflows and individual tasks
- @mentions with notifications
- Threaded discussions, resolution tracking
- Activity feed per workflow
- ~12 tests

#### 37.3: Approval Workflows
- Approval gates for production deployments
- Configurable approval rules (N approvers, specific roles)
- Approval history and audit trail
- Integration with Slack/Teams for notifications
- ~15 tests

#### 37.4: Workflow Branching
- Create branch from production workflow
- Edit without affecting production
- Visual diff between branches
- Merge with conflict detection
- ~13 tests

---

## Stage 38: Zero-Config Observability

**Status:** Not Started

*Scope:* Automatic OpenTelemetry instrumentation, Prometheus metrics, structured logging
*Deliverables:* 4 substages
*Tests:* ~40 tests
*Dependencies:* Stage 7 (API Gateway)
*Value:* "Observability without the setup headache"

### Why This Wins
OpenTelemetry is becoming the standard. Auto-instrument everything so teams don't have to configure anything.

### Substages

#### 38.1: OpenTelemetry Auto-Instrumentation
- Automatic span creation per task
- Trace context propagation through workflows
- Custom attributes (workflow name, task id, etc.)
- Export to any OTLP-compatible backend
- ~12 tests

#### 38.2: Prometheus Metrics
- Built-in `/metrics` endpoint
- Workflow metrics: execution_count, duration_histogram, error_rate
- Task metrics: per-task timing, success rate
- Custom metric labels (workflow, namespace, team)
- ~10 tests

#### 38.3: Structured Logging
- JSON logging with correlation IDs
- Automatic context injection (execution_id, task_id)
- Sensitive data redaction
- Log aggregation-friendly format
- ~10 tests

#### 38.4: Observability Dashboard
- Pre-built Grafana dashboards (auto-generated)
- Service map visualization
- Error tracking and alerting
- SLO/SLI tracking
- ~8 tests

---

## Stage 39: Smart Caching Layer

**Status:** Not Started

*Scope:* Intelligent caching for task outputs with TTL, invalidation, and stale-while-revalidate
*Deliverables:* 3 substages
*Tests:* ~35 tests
*Dependencies:* Stage 7 (API Gateway)
*Value:* "Stop paying for the same data twice"

### Why This Wins
Same API called 1000 times/minute? Cache it. Automatic cache invalidation, stale-while-revalidate patterns. Massive cost and latency reduction.

### Substages

#### 39.1: Task-Level Caching
- Cache configuration per task
- Key generation from input parameters
- TTL configuration (fixed, sliding)
- Cache backends: in-memory, Redis, distributed
- ~15 tests

#### 39.2: Advanced Cache Patterns
- Stale-while-revalidate (serve stale, refresh async)
- Cache warming on schedule
- Conditional caching (only cache successful responses)
- Cache bypass for specific inputs
- ~12 tests

#### 39.3: Cache Management UI
- Cache hit/miss statistics
- Manual cache invalidation
- Cache key browser
- Size and memory usage monitoring
- ~8 tests

### Example Configuration
```yaml
tasks:
  - id: get-exchange-rate
    taskRef: currency-api
    cache:
      enabled: true
      ttl: "5m"
      key: "{{input.fromCurrency}}-{{input.toCurrency}}"
      staleWhileRevalidate: true
```

---

## Stage 40: Compliance & Audit Built-In

**Status:** Not Started

*Scope:* PII handling, audit logging, data retention, and compliance reporting
*Deliverables:* 4 substages
*Tests:* ~50 tests
*Dependencies:* Stage 7.8 (Execution History)
*Value:* "Compliance built-in, not bolted-on"

### Why This Wins
Healthcare, finance, government all need compliance. Build it in so enterprises don't have to retrofit it later.

### Substages

#### 40.1: PII Detection & Handling
- Automatic PII detection in inputs/outputs
- Field-level encryption at rest
- Masking in logs and traces
- Data classification labels
- ~15 tests

#### 40.2: Immutable Audit Logging
- Tamper-evident audit log
- Who did what, when, from where
- Workflow changes with before/after
- Execution audit trail
- ~12 tests

#### 40.3: Data Retention Policies
- Configurable retention per workflow/data type
- Automatic purging with audit trail
- Legal hold support (prevent deletion)
- Data export for subject access requests
- ~12 tests

#### 40.4: Compliance Reporting
- Pre-built reports: SOC2, HIPAA, GDPR
- Evidence collection automation
- Compliance dashboard
- Scheduled report generation
- ~11 tests

### Example Configuration
```yaml
spec:
  compliance:
    framework: ["SOC2", "HIPAA"]
    pii:
      - field: input.email
        classification: PII
        handling: mask-in-logs
      - field: input.ssn
        classification: sensitive
        handling: encrypt-at-rest
    audit:
      retention: "7 years"
      immutable: true
```

---

## Stage 41: Edge Execution

**Status:** Not Started

*Scope:* Run workflows on edge nodes for lower latency
*Deliverables:* 4 substages
*Tests:* ~45 tests
*Dependencies:* Stage 11 (Cloud Deployment)
*Value:* "Latency matters - run close to users"

### Why This Wins
Running in Singapore vs US-East for an Asian user = 200ms vs 800ms. For user-facing workflows, this is the difference between snappy and sluggish.

### Substages

#### 41.1: Edge Node Infrastructure
- Lightweight workflow executor for edge
- State synchronization with central cluster
- Task availability at edge (subset of tasks)
- Health checking and failover
- ~12 tests

#### 41.2: Location-Aware Routing
- Geo-IP based routing
- Latency-based routing (closest node)
- Explicit region preferences
- Fallback to central if edge unavailable
- ~12 tests

#### 41.3: Edge-Compatible Tasks
- Task annotation for edge compatibility
- Data locality requirements
- Edge task limitations (no DB access, etc.)
- Local caching at edge
- ~12 tests

#### 41.4: Edge Monitoring & Management
- Edge node status dashboard
- Performance comparison (edge vs central)
- Edge-specific metrics
- Deployment to edge nodes
- ~9 tests

### Example Configuration
```yaml
spec:
  execution:
    location: closest
    fallback: central
    regions: [us-east-1, eu-west-1, ap-southeast-1]
  tasks:
    - id: validate-request
      edge: true
    - id: update-database
      edge: false
```

---

## Stage 42: Workflow Versioning with Traffic Splitting

**Status:** Not Started

*Scope:* Canary deployments, A/B testing, and automatic rollback for workflows
*Deliverables:* 4 substages
*Tests:* ~45 tests
*Dependencies:* Stage 7.9 (Versioning)
*Value:* "Deploy with confidence - test on real traffic safely"

### Why This Wins
Safe deployments. Test new workflow logic on 10% of traffic, auto-rollback if problems detected. No more "deploy and pray."

### Substages

#### 42.1: Traffic Splitting Infrastructure
- Version-aware routing
- Percentage-based traffic split
- Header-based routing (for testing)
- Sticky sessions (same user, same version)
- ~12 tests

#### 42.2: Canary Deployment
- Automatic canary creation on new version
- Gradual rollout: 1% → 10% → 50% → 100%
- Configurable promotion criteria
- Automatic rollback on error threshold
- ~12 tests

#### 42.3: A/B Testing for Workflows
- Define experiment variants
- Random assignment with persistence
- Metrics comparison between variants
- Statistical significance calculation
- ~12 tests

#### 42.4: Deployment Dashboard
- Version comparison view
- Traffic split visualization
- Error rate by version
- One-click rollback
- Deployment history
- ~9 tests

### Example Configuration
```yaml
spec:
  deployment:
    strategy: canary
    versions:
      v2.1.0:
        traffic: 10%
        promotionCriteria:
          - errorRate: "<1%"
          - p99Latency: "<500ms"
        autoRollback:
          errorRateThreshold: 5%
      v2.0.0:
        traffic: 90%
```

---

## Strategic Roadmap Summary

| Stage | Feature | Impact | Effort | Priority | Rationale |
|-------|---------|--------|--------|----------|-----------|
| 39 | Smart Caching | Very High | Low | **P0 - Do First** | Actually REDUCES costs 50-90%; improves latency; immediate ROI |
| 38 | Zero-Config Observability | Very High | Medium | **P0 - Enterprise Gate** | Enterprises won't adopt without this; OpenTelemetry is table stakes |
| 36 | Time-Travel Debugging | High | Medium | **P1 - Differentiator** | Unique capability; no competitor does this well; sells the platform |
| 35 | Marketplace & Connectors | Very High | High | **P2 - Ecosystem** | Reduces adoption friction; community growth driver |
| 40 | Compliance Built-In | High | Medium | **P2 - Enterprise** | Unlocks healthcare, finance, government verticals |
| 42 | Traffic Splitting | Medium | Medium | **P2 - Safe Deploys** | Canary deployments reduce production risk |
| 34 | Cost-Aware Execution | Medium | Low | **P2 - Attribution** | Nice for cost-by-workflow reporting; users have provider dashboards already |
| 37 | Collaborative Dev | Medium | High | **P3 - Team Features** | Nice-to-have; most teams use Git for collaboration |
| 33 | AI-Native Workflows | Medium | Medium | **P3 - Nice-to-Have** | HTTP tasks already call LLM APIs; MCP covers AI integration |
| 41 | Edge Execution | Medium | High | **P4 - Future** | Complex infrastructure; wait for demand |

### Priority Rationale

**P0 - Must Have for Adoption:**
- **Smart Caching (39):** Doesn't just track costs - actually REDUCES them. Cache API responses, reduce redundant calls by 50-90%. Immediate, measurable ROI. Users see faster workflows AND lower bills.
- **Zero-Config Observability (38):** Enterprise ops teams expect OpenTelemetry traces, Prometheus metrics, structured logs. Without this, platform won't pass enterprise evaluation. This is table stakes, not a feature.

**P1 - Key Differentiator:**
- **Time-Travel Debugging (36):** This is what makes us DIFFERENT. No competitor lets you click on a failed execution, see exact state at each step, and replay with modified inputs. This sells the platform in demos.

**P2 - Growth & Compliance:**
- **Marketplace (35):** Pre-built Stripe, Twilio, SendGrid connectors reduce "time to first workflow" from days to minutes
- **Compliance (40):** PII handling, audit logs unlock regulated industries
- **Traffic Splitting (42):** Safe deployments for production-critical workflows
- **Cost-Aware (34):** Useful for cost attribution by workflow, but users already have cloud billing dashboards and API provider usage pages. Nice-to-have, not blocking adoption.

**P3 - Deprioritized:**
- **Collaborative Dev (37):** Most teams use Git workflows already
- **AI-Native Workflows (33):** HTTP tasks work fine for LLM calls; MCP covers AI use cases

**P4 - Future:**
- **Edge Execution (41):** Wait for clear customer demand

---

**Total Strategic Stages:** 10
**Total Substages:** 41
**Total Tests:** ~495
