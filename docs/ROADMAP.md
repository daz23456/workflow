# World-Class Workflow Orchestration Engine - Extended Roadmap

---

# CURRENT TASK: Reach 80% Mutation Score for Services/**

## Status
- **Current Score**: 69.36% (Round 6)
- **Target**: 80%
- **Gap**: ~90 more mutants to kill

## Progress Tracking
| Round | Killed | Survived | Timeout | NoCoverage | Score |
|-------|--------|----------|---------|------------|-------|
| 4 | 541 | 168 | 14 | 119 | 65.91% |
| 5 | 548 | 163 | 15 | 116 | 66.86% |
| 6 | 570 | 170 | 14 | 88 | 69.36% |

## Strategic Approach (Big Strides)

### High-Impact Targets (by surviving mutant count)

| Service | Current Score | Surviving | Priority |
|---------|--------------|-----------|----------|
| **TemplateResolver.cs** | ~41% | ~60 | P0 - Biggest impact |
| **WorkflowOrchestrator.cs** | ~46% | ~50 | P0 - Core logic |
| **WorkflowValidator.cs** | ~78% | ~15 | P1 - Almost there |
| **ConditionEvaluator.cs** | ~80% | ~10 | P2 - Minor cleanup |

### Mutation Patterns to Target

1. **Boundary mutations** (`<` → `<=`, `>` → `>=`)
   - Add tests with exact boundary values
   - Test `length == 2` vs `length < 2` vs `length >= 2`

2. **Boolean negations** (`true` → `false`, `&&` → `||`)
   - Add explicit true/false path tests
   - Test both branches of every condition

3. **Null checks** (`!= null` → `== null`)
   - Add null input tests
   - Add non-null input tests that verify behavior

4. **String mutations** (`""` → `"Stryker"`)
   - Assert on exact string values
   - Test empty string handling

5. **Arithmetic** (`+` → `-`, `*` → `/`)
   - Add numeric calculation tests
   - Verify exact output values

### Execution Plan

1. **TemplateResolver.cs** - Add ~30 tests targeting:
   - `parts.Length` boundary conditions (lines 19, 37, 48)
   - Type-specific handling (int, long, double, float, decimal, bool)
   - JsonElement value kinds (String, Number, True, False, Null, Array, Object)
   - ForEach context resolution paths
   - Error paths and exception throwing

2. **WorkflowOrchestrator.cs** - Add ~25 tests targeting:
   - Task execution order verification
   - Parallel execution paths
   - Error handling and retry logic
   - Timeout enforcement
   - Dependency resolution edge cases

3. **WorkflowValidator.cs** - Add ~10 tests targeting:
   - Remaining validation branches
   - Edge cases in schema validation
   - Template reference validation

4. **ConditionEvaluator.cs** - Add ~5 tests targeting:
   - Operator evaluation edge cases
   - Type coercion paths

### Commands

```bash
# Run Stryker for Services only
dotnet stryker --config-file stryker-config.json 2>&1 | tee /tmp/stryker-round7.log

# View HTML report
open StrykerOutput/*/reports/mutation-report.html

# Run tests
dotnet test tests/WorkflowCore.Tests
```

### Success Criteria
- [ ] Mutation score >= 80%
- [ ] All tests pass
- [ ] No regressions in existing functionality

---

## Vision

Transform this workflow engine into a **truly world-class** orchestration platform with:
- Advanced control flow (forEach, conditions, switch, nesting)
- Workflow triggers & scheduling
- Sub-workflow composition
- Enterprise features (multi-tenancy, secrets, GitOps)
- Developer experience (CLI, VS Code extension)
- Resilience patterns (circuit breakers, dead letter queues)
- Intelligent operations (anomaly detection, cost estimation)

*Future: Async execution mode (fire-and-forget with callbacks)*

---

# Completed Stages

> **Full specifications archived in:** `COMPLETED_STAGES_ARCHIVE.md`
> **Proof files in:** `stage-proofs/stage-X.Y/`

| Stage | Name | Tests | Status |
|-------|------|-------|--------|
| 16 | OpenAPI Task Generator CLI | 248 | ✅ Complete |
| 19 | Control Flow (forEach, conditions, switch) | ~130 | ✅ Complete |
| 20 | Workflow Triggers & Scheduling | ~50 | ✅ Complete |
| 21 | Sub-Workflow Composition | ~60 | ✅ Complete |
| 25 | Local Development CLI | ~55 | ✅ Complete |
| 26 | VS Code Extension | ~50 | ✅ Complete |
| 27 | Anomaly Detection & Alerting | ~70 | ✅ Complete |
| 28 | Circuit Breaker & Resilience | ~44 | ✅ Complete |

---

# Pending Stages

# Stage 29: Event Sourcing & Audit Trail

## Overview

Complete audit trail for compliance and debugging.

## Features

1. **Event Types**
   ```
   WorkflowSubmitted, WorkflowValidated, WorkflowStarted
   TaskScheduled, TaskStarted, TaskCompleted, TaskFailed
   ConditionEvaluated, SwitchMatched, ForEachIteration
   WorkflowCompleted, WorkflowFailed
   SecretAccessed, WebhookReceived
   ```

2. **Event Store**
   - Append-only event log
   - PostgreSQL or EventStoreDB
   - Partitioned by execution ID

3. **Event Replay**
   - Reconstruct any execution state
   - Debug "what happened at time T"
   - Generate reports from events

4. **Compliance Features**
   - Who triggered the workflow
   - What inputs were provided
   - Which tasks accessed secrets
   - Full data lineage

## Event Schema

```json
{
  "eventId": "evt_abc123",
  "eventType": "TaskCompleted",
  "executionId": "exec_xyz789",
  "timestamp": "2024-01-15T10:30:00Z",
  "taskId": "fetch-user",
  "data": {
    "duration": 234,
    "outputKeys": ["userId", "email"],
    "status": "success"
  },
  "actor": {
    "type": "system",
    "identity": "workflow-orchestrator"
  }
}
```

## Substages

### 29.1: Event Model & Store
- Event schema definitions
- PostgreSQL event store
- Append-only writes
- **Tests**: ~25

### 29.2: Event Emission
- Instrumentation in orchestrator
- Event correlation (execution ID)
- Async event publishing
- **Tests**: ~25

### 29.3: Event Replay & Queries
- State reconstruction
- Time-travel queries
- Compliance reports
- **Tests**: ~20

---

# Stage 30: Dead Letter Queue

## Overview

Handle failed workflows gracefully with retry and review capabilities.

## Features

1. **Automatic DLQ Routing**
   - Workflows exceeding retry limits -> DLQ
   - Permanent failures (validation errors) -> DLQ
   - Manual routing via API

2. **DLQ Dashboard**
   - View failed workflows
   - Inspect failure reasons
   - Bulk actions (retry, discard, archive)

3. **Retry Capabilities**
   - Retry with same inputs
   - Retry with modified inputs
   - Retry subset of failed tasks

4. **Failure Analytics**
   - Failure patterns by workflow
   - Root cause categorization
   - Time-to-resolution tracking

## API

```
GET  /api/v1/dlq                           # List DLQ items
GET  /api/v1/dlq/{id}                      # Get DLQ item details
POST /api/v1/dlq/{id}/retry                # Retry execution
POST /api/v1/dlq/{id}/retry-with-input     # Retry with new input
POST /api/v1/dlq/{id}/discard              # Discard (won't retry)
POST /api/v1/dlq/{id}/archive              # Archive for records
POST /api/v1/dlq/bulk-retry                # Bulk retry
```

## Substages

### 30.1: DLQ Data Model & Storage
- `DeadLetterItem` model
- PostgreSQL storage
- Automatic routing logic
- **Tests**: ~20

### 30.2: DLQ API & Operations
- CRUD endpoints
- Retry execution
- Bulk operations
- **Tests**: ~20

### 30.3: DLQ Dashboard (UI)
- DLQ list view
- Failure detail view
- Bulk action UI
- **Tests**: ~15

---

# Stage 31: Error Response Quality Scoring

## Overview

Runtime analysis of task error responses against quality best practices, with star ratings (1-5), improvement suggestions, and documentation links.

## Features

1. **Runtime Error Analysis**
   - Capture error responses (4xx, 5xx) during workflow execution
   - Score against best practices criteria
   - Store scores for historical analysis

2. **Quality Criteria (5-Star System)**
   | Criterion | Star | Description |
   |-----------|------|-------------|
   | Error message | ⭐ | Non-empty, human-readable message |
   | Error code | ⭐ | Machine-readable code (e.g., `VALIDATION_ERROR`) |
   | Appropriate HTTP status | ⭐ | 400 for validation, 404 for not found, etc. |
   | Request ID | ⭐ | Correlation ID for debugging |
   | Actionable suggestion | ⭐ | What user can do to fix it |

3. **Display Locations**
   - **Task Details Page**: Full breakdown with checklist, tips, docs link
   - **Workflow Card**: Average score badge (e.g., "⭐⭐⭐☆☆")
   - **Task Card**: Individual task score badge

4. **Improvement Suggestions**
   - Specific tips per criterion failed
   - Link to error handling best practices docs
   - Examples of good error responses

## Substages

### 31.1: Error Quality Analyzer Service
**Focus**: Backend service to analyze and score error responses
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~25

#### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowCore/Models/ErrorQualityScore.cs` | Score model (criteria, stars, tips) |
| `src/WorkflowCore/Models/ErrorQualityCriteria.cs` | Criteria definitions |
| `src/WorkflowCore/Services/IErrorQualityAnalyzer.cs` | Interface |
| `src/WorkflowCore/Services/ErrorQualityAnalyzer.cs` | Scoring logic |
| `tests/WorkflowCore.Tests/Services/ErrorQualityAnalyzerTests.cs` | Unit tests |

#### Scoring Logic
- Parse error response body for: `message`, `error`, `code`, `errorCode`, `requestId`, `suggestion`, `action`
- Check HTTP status appropriateness (500 for server errors, 400 for validation, etc.)
- Generate improvement tips for missing criteria
- Return star count (0-5) with breakdown

---

### 31.2: Error Quality Persistence
**Focus**: Store and aggregate error quality scores
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~20

#### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowCore/Data/ErrorQualityRecord.cs` | Database entity |
| `src/WorkflowCore/Services/IErrorQualityRepository.cs` | Interface |
| `src/WorkflowCore/Services/ErrorQualityRepository.cs` | EF Core implementation |

#### Modified Files
| File | Changes |
|------|---------|
| `src/WorkflowCore/Data/WorkflowDbContext.cs` | Add ErrorQualityRecords DbSet |
| `src/WorkflowCore/Services/HttpTaskExecutor.cs` | Call analyzer on error responses |

#### API Endpoints
- `GET /api/v1/tasks/{name}/error-quality` - Task's error quality summary
- `GET /api/v1/workflows/{name}/error-quality` - Workflow's average score
- `GET /api/v1/error-quality/trends` - Historical trends

---

### 31.3: Error Quality UI Components
**Focus**: Display scores and suggestions in UI
**Profile**: `FRONTEND_TS`, Gates 1-8, 14, 15, 21
**Tests**: ~25

#### New Files
| File | Purpose |
|------|---------|
| `src/workflow-ui/components/error-quality/star-rating.tsx` | Star display component |
| `src/workflow-ui/components/error-quality/quality-breakdown.tsx` | Criteria checklist |
| `src/workflow-ui/components/error-quality/improvement-tips.tsx` | Tips display |
| `src/workflow-ui/components/error-quality/quality-badge.tsx` | Card badge |

#### Modified Files
| File | Changes |
|------|---------|
| Task details page | Add quality breakdown section |
| Workflow card component | Add quality badge |
| Task card component | Add quality badge |

---

### 31.4: Error Handling Best Practices Docs
**Focus**: Documentation for improving error responses
**Profile**: `MINIMAL`, Gates 1-8
**Tests**: ~5

#### New Files
| File | Purpose |
|------|---------|
| `docs/error-handling-best-practices.md` | Guide for API developers |

#### Content
- Why good error responses matter
- Anatomy of a 5-star error response
- Examples by error type (validation, not found, auth, server error)
- RFC 7807 reference
- Integration with workflow system

---

## Summary

| Substage | Focus | New Files | Tests |
|----------|-------|-----------|-------|
| 31.1 | Error Quality Analyzer | 5 | ~25 |
| 31.2 | Persistence & API | 3 | ~20 |
| 31.3 | UI Components | 4 | ~25 |
| 31.4 | Documentation | 1 | ~5 |
| **Total** | | **13** | **~75** |

**Profile Mix**: BACKEND_DOTNET (31.1, 31.2), FRONTEND_TS (31.3), MINIMAL (31.4)
**Coverage Target**: 90%+

---

# Stage 32: Data Management

## Overview

Comprehensive data management for the workflow engine:
1. **CR Persistence** (32.1-32.3): Sync Workflow/Task CRs to PostgreSQL for fast restarts and rich queries
2. **Data Retention** (32.4-32.6): Configurable cleanup of execution data

## Architecture

```
kubectl apply → K8s etcd (source of truth)
                    ↓
               Operator watches
                    ↓
               PostgreSQL (synced cache)
                    ↓
    ┌───────────────────────────────────────┐
    │ Fast restarts (10k CRs in <5s)        │
    │ Rich queries (search, filter, stats)  │
    │ Retention policies & cleanup          │
    └───────────────────────────────────────┘
```

---

## Part 1: CR Persistence (32.1-32.3)

### Stage 32.1: CR Persistence Layer
**Focus**: Sync Workflow/Task CRs to PostgreSQL on reconcile
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~25

#### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowCore/Data/WorkflowDefinition.cs` | EF entity for Workflow CR |
| `src/WorkflowCore/Data/TaskDefinition.cs` | EF entity for WorkflowTask CR |
| `src/WorkflowCore/Services/ICRPersistenceService.cs` | Interface |
| `src/WorkflowCore/Services/CRPersistenceService.cs` | Sync logic |
| `tests/WorkflowCore.Tests/Services/CRPersistenceServiceTests.cs` | Unit tests |

#### Modified Files
| File | Changes |
|------|---------|
| `src/WorkflowCore/Data/WorkflowDbContext.cs` | Add WorkflowDefinitions, TaskDefinitions DbSets |
| `src/WorkflowOperator/Controllers/WorkflowController.cs` | Call persistence on reconcile |
| `src/WorkflowOperator/Controllers/WorkflowTaskController.cs` | Call persistence on reconcile |

#### Features
- Upsert on reconcile (create or update)
- Delete on CR deletion
- Store full spec as JSON + key fields indexed
- Track sync timestamp and K8s resourceVersion

---

### Stage 32.2: Fast Startup & Delta Sync
**Focus**: Load from PostgreSQL on startup, delta-sync with K8s
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~20

#### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowOperator/Services/StartupSyncService.cs` | Fast startup logic |
| `tests/WorkflowOperator.Tests/Services/StartupSyncServiceTests.cs` | Unit tests |

#### Startup Flow
1. Load all CRs from PostgreSQL (fast, local)
2. List CRs from K8s API with resourceVersion
3. Delta-sync: add missing, update changed, remove deleted
4. Resume normal watch

#### Performance Target
- 10k CRs: <5 seconds startup (vs 30-60s from K8s only)

---

### Stage 32.3: Query API
**Focus**: Rich queries for UI and analytics
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~20

#### API Endpoints
```
GET /api/v1/workflows?search=order&namespace=prod&limit=50
GET /api/v1/workflows/stats          # Count by namespace, by status
GET /api/v1/tasks?usedBy=workflow    # Tasks used by a workflow
GET /api/v1/tasks/unused             # Tasks not referenced by any workflow
```

#### Benefits
- Fast filtering/search (vs K8s label selectors only)
- Cross-resource queries (which workflows use this task?)
- Aggregations (count by namespace, execution stats join)

---

## Part 2: Data Retention (32.4-32.6)

### Retention Hierarchy

```
SystemDefault (30d/14d/7d)
  |
  +-- TenantPolicy (overrides system default)
        |
        +-- WorkflowPolicy (only applies if tenant not set)
```

### YAML Syntax

```yaml
# Tenant-level default
apiVersion: workflow.io/v1
kind: WorkflowTenant
metadata:
  name: acme-corp
spec:
  dataRetention:
    executionHistory: 30d
    taskTraces: 14d
    apiLogs: 7d
    cleanupSchedule: "0 2 * * *"

# Per-workflow override
apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: order-processing
spec:
  dataRetention:
    executionHistory: 90d    # Compliance requirement
    taskTraces: 30d
    apiLogs: 14d
```

---

### Stage 32.4: Retention Configuration Model
**Focus**: Models and hierarchy resolution for retention policies
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~20

#### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowCore/Models/RetentionPolicy.cs` | Retention period configuration |
| `src/WorkflowCore/Models/RetentionScope.cs` | Data type enum (Executions, Traces, ApiLogs) |
| `src/WorkflowCore/Services/IRetentionResolver.cs` | Interface |
| `src/WorkflowCore/Services/RetentionResolver.cs` | Tenant > Workflow hierarchy resolution |
| `tests/WorkflowCore.Tests/Services/RetentionResolverTests.cs` | Unit tests |

#### Key Logic
- Parse duration strings: `7d`, `30d`, `90d`, `1y`
- Resolve: `tenant.dataRetention ?? workflow.dataRetention ?? systemDefault`
- Validate: min 1d, max 7y

---

### Stage 32.5: Cleanup Service
**Focus**: Background service for scheduled data deletion
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~25

#### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowCore/Services/IDataRetentionService.cs` | Interface |
| `src/WorkflowCore/Services/DataRetentionService.cs` | Cleanup orchestration |
| `src/WorkflowCore/Services/DataRetentionBackgroundService.cs` | IHostedService |
| `src/WorkflowCore/Data/RetentionCleanupLog.cs` | Audit trail |
| `tests/WorkflowCore.Tests/Services/DataRetentionServiceTests.cs` | Unit tests |

#### Features
- Batch deletion (1000 records per batch)
- Dry-run mode
- Cleanup audit log
- Soft delete → hard delete after 24h grace period

---

### Stage 32.6: Retention API & Dashboard
**Focus**: API endpoints and UI for managing retention
**Profile**: `BACKEND_DOTNET` + `FRONTEND_TS`, Gates 1-8, 14, 15
**Tests**: ~30

#### API Endpoints
```
GET  /api/v1/retention/status     # Data volume, oldest records
GET  /api/v1/retention/policies   # Active policies
POST /api/v1/retention/cleanup    # Trigger manual cleanup
GET  /api/v1/retention/logs       # Cleanup history
```

#### UI Components
| File | Purpose |
|------|---------|
| `src/workflow-ui/components/settings/retention-policy-editor.tsx` | Edit settings |
| `src/workflow-ui/components/settings/retention-status.tsx` | Storage usage |
| `src/workflow-ui/app/settings/retention/page.tsx` | Settings page |

---

## Summary

| Substage | Focus | Tests |
|----------|-------|-------|
| **Part 1: CR Persistence** | | |
| 32.1 | CR Persistence Layer | ~25 |
| 32.2 | Fast Startup & Delta Sync | ~20 |
| 32.3 | Query API | ~20 |
| **Part 2: Data Retention** | | |
| 32.4 | Retention Configuration | ~20 |
| 32.5 | Cleanup Service | ~25 |
| 32.6 | Retention API & Dashboard | ~30 |
| **Total** | | **~140** |

**Profile Mix**: BACKEND_DOTNET (32.1-32.5), FRONTEND_TS (32.6)
**Coverage Target**: 90%+
**Independence**: Part 1 and Part 2 can be implemented in parallel

---

# Quick Wins (Sprinkle Throughout)

These can be added to existing stages or as mini-stages:

| Feature | Effort | Stage |
|---------|--------|-------|
| Workflow cloning/duplication | 1 day | Add to existing UI |
| Execution diff view | 2 days | Stage 9.4 enhancement |
| Bulk workflow export/import | 1 day | Stage 25 CLI |
| Keyboard shortcuts in builder | 1 day | Stage 9.1 enhancement |
| Workflow tagging & search | 2 days | Add to existing UI |
| Cost estimation per execution | 2 days | Stage 10 enhancement |

---

# Implementation Priority

## Phase 1: Core Control Flow (Complete)
| Stage | Name | Tests | Priority | Status |
|-------|------|-------|----------|--------|
| **19** | Control Flow (forEach, if/else, switch, nesting) | ~130 | P0 | ✅ Complete |

## Phase 2: Core Capabilities (Complete)
| Stage | Name | Tests | Priority | Status |
|-------|------|-------|----------|--------|
| **20** | Triggers & Scheduling | ~80 | P0 | ✅ Complete |
| **21** | Sub-Workflow Composition | ~60 | P0 | ✅ Complete |

## Phase 3: Developer Experience & Reliability
| Stage | Name | Tests | Priority | Status |
|-------|------|-------|----------|--------|
| **17** | Test API Server (17.1-17.3) | 153 | P1 | ✅ Complete |
| **25** | Local Development CLI | ~80 | P1 | ✅ Complete |
| **26** | VS Code Extension | ~50 | P1 | ✅ Complete |
| **28** | Circuit Breaker | ~65 | P1 | ✅ Complete |
| **27** | Anomaly Detection | ~70 | P1 | ✅ Complete |
| **18.1** | Synthetic Health Checks (Backend) | ~25 | P1 | ✅ Complete |
| **18.2** | Synthetic Health Checks (UI) | ~15 | P1 | Pending |
| **32** | Data Management (CR Persistence + Retention) | ~140 | P1 | Pending |
| **30** | Dead Letter Queue | ~55 | P1 | Pending |

## Phase 4: Polish & Enterprise
| Stage | Name | Tests | Priority |
|-------|------|-------|----------|
| **31** | Error Response Quality Scoring | ~75 | P2 |
| **29** | Event Sourcing | ~70 | P2 |
| **22** | Secrets Management | ~65 | P2 |
| **23** | Multi-Tenancy | ~70 | P2 |
| **24** | GitOps Integration | ~50 | P2 |

---

# Grand Total

| Metric | Value |
|--------|-------|
| **New Stages** | 14 (Stage 19-32) |
| **Total Substages** | 48 |
| **Estimated Tests** | ~1060 |
| **Estimated New Files** | ~190 |
| **Coverage Target** | 90%+ per stage |

This roadmap transforms the workflow engine into a **world-class, enterprise-ready orchestration platform** comparable to AWS Step Functions, Temporal, and Apache Airflow - but Kubernetes-native and synchronous-first.

---

# Advanced Stages (33+)

> **Detailed specifications in:** `docs/FUTURE_STAGES.md`

| Stage | Name | Focus | Priority |
|-------|------|-------|----------|
| 11 | Cloud Deployment | Helm charts, GKE/AKS, production hardening | P1 |
| 14 | Optimization Engine | Static analysis, transform equivalence, historical replay | P2 |
| 15 | MCP Consumer | External chatbot workflow discovery & execution | P2 |
| 33 | AI-Native Workflows | LLM task type, prompt management, guardrails | P3 |
| 34 | Cost-Aware Execution | Cost tracking, estimation, budgets | P2 |
| 35 | Marketplace | Pre-built connectors (Stripe, Twilio, etc.) | P2 |
| 36 | Time-Travel Debugging | State capture, replay with modifications | P1 |
| 37 | Collaborative Dev | Real-time editing, comments, approvals | P3 |
| 38 | Zero-Config Observability | OpenTelemetry, Prometheus, structured logs | P0 |
| 39 | Smart Caching | Task-level caching, stale-while-revalidate | P0 |
| 40 | Compliance Built-In | PII handling, audit logs, GDPR/HIPAA | P2 |
| 41 | Edge Execution | Low-latency edge nodes | P4 |
| 42 | Traffic Splitting | Canary deployments, A/B testing | P2 |
| 43 | Label Management | Tags, categories, bulk operations | P2 |
| 44 | Training Curriculum | 8 new lessons (11-18) | P2 |

---

# Ready to Start?

Begin with the next pending stage using the Stage Execution Framework:

```bash
./scripts/init-stage.sh --stage <X.Y> --name "<Stage Name>" --profile <PROFILE>
```
