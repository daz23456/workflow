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

# Stage 16: OpenAPI Task Generator CLI ✅ COMPLETE

## Overview

**Status:** All 7 substages complete (16.2-16.8)
**Tests:** 248 new tests
**Coverage:** 90%+
**Completed:** 2025-12-07

Complete PACT replacement with zero broker infrastructure:
- Auto-generate WorkflowTask CRDs from OpenAPI specifications
- Version management with SHA256 hash-based change detection
- CI/CD integration with impact analysis
- Field-level usage tracking (consumer contracts)
- Contract verification with provider states and can-deploy checks

| Substage | Name | Tests |
|----------|------|-------|
| 16.2 | Task Generator | 46 |
| 16.3 | Sample Workflow Generator | 15 |
| 16.4 | Version Management | 14 |
| 16.5 | CLI Integration | 15 |
| 16.6 | CI/CD Integration | 39 |
| 16.7 | Field-Level Usage Tracking | 53 |
| 16.8 | Contract Verification | 66 |

**API Endpoints:**
- `GET /api/v1/tasks/{name}/impact` - Impact analysis
- `GET /api/v1/tasks/{name}/field-usage` - Field usage tracking
- `GET /api/v1/tasks/{name}/field-impact` - Field impact analysis
- `POST /api/v1/contracts/verify` - Contract verification
- `POST /api/v1/contracts/record` - Record interactions
- `GET /api/v1/contracts/can-deploy` - Deployment eligibility check

---

# Stage 19: Control Flow ✅ COMPLETE

## Overview

**Status:** All 5 substages complete
**Tests:** ~130 passing
**Coverage:** 90%+

Add control flow capabilities to the workflow orchestration engine:
- **forEach**: Iterate over arrays with parallel execution
- **if/else conditions**: Skip tasks based on expressions
- **switch/case**: Route to different tasks based on value
- **nesting**: Combine forEach + conditions for complex flows

## YAML Syntax Examples

### forEach (Array Iteration)
```yaml
tasks:
  - id: process-items
    forEach:
      items: "{{input.orderIds}}"      # Array to iterate
      itemVar: "order"                  # Variable name for current item
      maxParallel: 5                    # Concurrency limit (optional)
    taskRef: process-order
    input:
      orderId: "{{forEach.order}}"
      index: "{{forEach.index}}"

output:
  results: "{{tasks.process-items.forEach.outputs}}"      # Array of all outputs
  count: "{{tasks.process-items.forEach.successCount}}"   # Successful iterations
```

### If/Else Conditions
```yaml
tasks:
  - id: check-credit
    taskRef: credit-check
    input:
      customerId: "{{input.customerId}}"

  - id: process-payment
    condition:
      if: "{{tasks.check-credit.output.approved}} == true"
    taskRef: charge-card
    dependsOn: [check-credit]

  - id: send-rejection
    condition:
      if: "{{tasks.check-credit.output.approved}} == false"
    taskRef: send-rejection-email
    dependsOn: [check-credit]
```

### Switch/Case
```yaml
tasks:
  - id: route-payment
    switch:
      value: "{{input.paymentMethod}}"
      cases:
        - match: "stripe"
          taskRef: stripe-charge
        - match: "paypal"
          taskRef: paypal-charge
        - match: "invoice"
          taskRef: create-invoice
      default:
        taskRef: unknown-payment-error
```

### Nested: Condition inside forEach
```yaml
tasks:
  - id: process-orders
    forEach:
      items: "{{input.orders}}"
      itemVar: "order"
      maxParallel: 10
    condition:
      if: "{{forEach.order.status}} == 'pending'"     # Only process pending orders
    taskRef: process-order
    input:
      orderId: "{{forEach.order.id}}"
```

### Nested: forEach inside Condition
```yaml
tasks:
  - id: check-has-items
    taskRef: validate-cart
    input:
      cartId: "{{input.cartId}}"

  - id: process-items
    condition:
      if: "{{tasks.check-has-items.output.hasItems}} == true"
    forEach:
      items: "{{tasks.check-has-items.output.items}}"
      itemVar: "item"
    taskRef: reserve-item
    input:
      itemId: "{{forEach.item.id}}"
    dependsOn: [check-has-items]
```

### Nested forEach (Process Arrays of Arrays)
```yaml
tasks:
  - id: process-departments
    forEach:
      items: "{{input.departments}}"
      itemVar: "dept"
    # Each department has employees - nested forEach
    tasks:                                             # Inline nested tasks!
      - id: process-employees
        forEach:
          items: "{{forEach.dept.employees}}"
          itemVar: "employee"
        taskRef: onboard-employee
        input:
          deptId: "{{forEach.dept.id}}"
          employeeId: "{{forEach.employee.id}}"
```

---

## Substage Breakdown

### Stage 19.1: Condition Evaluation Engine
**Focus**: Build expression evaluator for if/else conditions
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~25-30

#### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowCore/Models/ConditionSpec.cs` | Condition configuration model |
| `src/WorkflowCore/Models/ConditionResult.cs` | Evaluation result model |
| `src/WorkflowCore/Services/IConditionEvaluator.cs` | Interface |
| `src/WorkflowCore/Services/ConditionEvaluator.cs` | Expression parser & evaluator |
| `tests/WorkflowCore.Tests/Services/ConditionEvaluatorTests.cs` | Unit tests |

#### Modified Files
| File | Changes |
|------|---------|
| `src/WorkflowCore/Models/WorkflowResource.cs` | Add `Condition` property to `WorkflowTaskStep` |
| `src/WorkflowCore/Models/TaskExecutionResult.cs` | Add `WasSkipped`, `SkipReason` |
| `src/WorkflowCore/Services/WorkflowOrchestrator.cs` | Evaluate conditions before execution |

#### Expression Syntax
```
Operators: ==, !=, >, <, >=, <=, &&, ||, !
Types: bool, string, number, null
Examples:
  "{{tasks.check.output.approved}} == true"
  "{{input.amount}} > 100 && {{input.amount}} < 1000"
  "{{tasks.fetch.output.status}} != 'error'"
```

---

### Stage 19.2: Switch/Case Implementation
**Focus**: Multi-branch routing based on value
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~20-25

#### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowCore/Models/SwitchSpec.cs` | Switch/case configuration model |
| `src/WorkflowCore/Models/SwitchResult.cs` | Matched case result |
| `src/WorkflowCore/Services/ISwitchEvaluator.cs` | Interface |
| `src/WorkflowCore/Services/SwitchEvaluator.cs` | Case matching logic |
| `tests/WorkflowCore.Tests/Services/SwitchEvaluatorTests.cs` | Unit tests |

#### Modified Files
| File | Changes |
|------|---------|
| `src/WorkflowCore/Models/WorkflowResource.cs` | Add `Switch` property to `WorkflowTaskStep` |
| `src/WorkflowCore/Services/WorkflowOrchestrator.cs` | Execute matched case's taskRef |

#### Behavior
- First matching case wins
- Falls through to `default` if no match
- Error if no match and no default defined

---

### Stage 19.3: forEach Array Iteration
**Focus**: Iterate over arrays with parallel execution
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~30-35

#### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowCore/Models/ForEachSpec.cs` | forEach configuration |
| `src/WorkflowCore/Models/ForEachResult.cs` | Aggregated iteration results |
| `src/WorkflowCore/Services/IForEachExecutor.cs` | Interface |
| `src/WorkflowCore/Services/ForEachExecutor.cs` | Parallel iteration executor |
| `tests/WorkflowCore.Tests/Services/ForEachExecutorTests.cs` | Unit tests |

#### Modified Files
| File | Changes |
|------|---------|
| `src/WorkflowCore/Models/WorkflowResource.cs` | Add `ForEach` property to `WorkflowTaskStep` |
| `src/WorkflowCore/Models/TemplateContext.cs` | Add `ForEachContext` for item/index |
| `src/WorkflowCore/Services/TemplateResolver.cs` | Support `{{forEach.x}}` templates |
| `src/WorkflowCore/Services/WorkflowOrchestrator.cs` | Delegate to ForEachExecutor |

#### Template Patterns
```
{{forEach.order}}                           # Current item (where itemVar="order")
{{forEach.index}}                           # Current iteration index (0-based)
{{tasks.process-items.forEach.outputs}}     # Array of all outputs
{{tasks.process-items.forEach.itemCount}}   # Number of iterations
{{tasks.process-items.forEach.successCount}} # Successful iterations
```

#### ForEachResult Structure
```csharp
public class ForEachResult
{
    public List<Dictionary<string, object>> Outputs { get; set; }
    public int ItemCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<ForEachItemResult> ItemResults { get; set; }
}
```

---

### Stage 19.4: Validation & Integration
**Focus**: Admission validation, error handling, E2E tests
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~20-25

#### Modified Files
| File | Changes |
|------|---------|
| `src/WorkflowOperator/Webhooks/WorkflowValidationWebhook.cs` | Validate control flow syntax |
| `src/WorkflowCore/Services/WorkflowValidator.cs` | Expression syntax validation |

#### New Files
| File | Purpose |
|------|---------|
| `tests/WorkflowCore.IntegrationTests/ControlFlowIntegrationTests.cs` | E2E tests |

#### Validation Rules
1. **Condition.If**: Valid expression syntax, resolvable templates
2. **Switch**: Unique match values, taskRefs exist, warn if no default
3. **ForEach**: Items template valid, itemVar is identifier, maxParallel > 0
4. **Nesting**: Validate max depth (default 3), prevent infinite loops

---

### Stage 19.5: Nested Control Flow
**Focus**: Enable nesting of forEach and conditions
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~30-35

#### Nesting Patterns Supported

| Pattern | Example | Complexity |
|---------|---------|------------|
| Condition inside forEach | Filter items during iteration | Low |
| forEach inside Condition | Conditional iteration | Low |
| Nested forEach | Arrays of arrays | Medium |
| Switch inside forEach | Route each item differently | Medium |
| forEach inside Switch case | Iterate based on route | Medium |

#### Implementation Details

**ControlFlowContext Stack**:
```csharp
public class ControlFlowContext
{
    public Stack<ForEachFrame> ForEachStack { get; } = new();
    public int NestingDepth => ForEachStack.Count;
    public const int MaxNestingDepth = 3;
}

public class ForEachFrame
{
    public string ItemVar { get; set; }
    public object CurrentItem { get; set; }
    public int CurrentIndex { get; set; }
    public string ParentTaskId { get; set; }
}
```

**Template Resolution with Nesting**:
```
{{forEach.order}}              # Current (innermost) forEach item
{{forEach.dept.employees}}     # Outer forEach item property
{{forEach.$parent.order}}      # Explicit parent reference
{{forEach.$root.item}}         # Root-level forEach item
```

#### New Files
| File | Purpose |
|------|---------|
| `src/WorkflowCore/Models/ControlFlowContext.cs` | Nesting state management |
| `src/WorkflowCore/Services/NestedExecutionService.cs` | Recursive execution handler |
| `tests/WorkflowCore.Tests/Services/NestedControlFlowTests.cs` | Nesting test cases |

#### Modified Files
| File | Changes |
|------|---------|
| `src/WorkflowCore/Services/ForEachExecutor.cs` | Support nested forEach via recursion |
| `src/WorkflowCore/Services/TemplateResolver.cs` | Stack-aware template resolution |
| `src/WorkflowCore/Services/WorkflowValidator.cs` | Max depth validation |

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `src/WorkflowCore/Services/WorkflowOrchestrator.cs` | Core execution loop - main integration point |
| `src/WorkflowCore/Models/WorkflowResource.cs` | WorkflowTaskStep model to extend |
| `src/WorkflowCore/Services/TemplateResolver.cs` | Template resolution to extend |
| `src/WorkflowCore/Models/TemplateContext.cs` | Context to extend for forEach |
| `tests/WorkflowCore.Tests/Services/WorkflowOrchestratorTests.cs` | Test patterns to follow |

---

## Execution Commands

```bash
# Initialize stage
./scripts/init-stage.sh --stage 19.1 --name "Condition Evaluation" --profile BACKEND_DOTNET

# Run quality gates
./scripts/run-quality-gates.sh --stage 19.1 1 2 3 4 5 6 7 8

# Complete stage
./scripts/complete-stage.sh --stage 19.1 --name "Condition Evaluation"
```

---

## Summary

| Substage | Focus | New Files | Tests |
|----------|-------|-----------|-------|
| 19.1 | Condition Evaluation Engine | 5 | ~25-30 |
| 19.2 | Switch/Case Implementation | 5 | ~20-25 |
| 19.3 | forEach Array Iteration | 5 | ~30-35 |
| 19.4 | Validation & Integration | 1 | ~20-25 |
| 19.5 | Nested Control Flow | 3 | ~30-35 |
| **Total** | | **19** | **~130** |

**Profile**: BACKEND_DOTNET (Gates 1-8)
**Coverage Target**: 90%+
**Backward Compatible**: Yes - existing workflows unchanged

---

# Stage 20: Workflow Triggers & Scheduling ✅ COMPLETE

**Status:** 2 substages complete
**Proof:** `stage-proofs/stage-20.2/STAGE_20.2_PROOF.md`

## Overview

Enable workflows to be triggered automatically without manual API calls.

## YAML Syntax

```yaml
apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: hourly-report
spec:
  triggers:
    - type: schedule
      cron: "0 * * * *"                    # Every hour
      timezone: "America/New_York"

    - type: webhook
      path: /hooks/order-created
      secretRef: webhook-hmac-secret       # HMAC validation
      filter: "{{payload.type}} == 'order'"

    - type: event
      source: kafka
      topic: orders.created
      consumerGroup: workflow-triggers

  tasks:
    # ... normal task definition
```

## Substages

### 20.1: Schedule Triggers (Cron)
- `TriggerSpec` model with cron expression support
- `ScheduleTriggerService` using Quartz.NET or Hangfire
- Timezone support
- Trigger history tracking
- **Tests**: ~25

### 20.2: Webhook Triggers
- Webhook endpoint registration per workflow
- HMAC signature validation
- Payload filtering with expressions
- Rate limiting per webhook
- **Tests**: ~25

### 20.3: Event-Driven Triggers
- Kafka/RabbitMQ consumer integration
- Event filtering and transformation
- At-least-once delivery guarantees
- Dead letter handling for failed triggers
- **Tests**: ~30

## Key Files
| New File | Purpose |
|----------|---------|
| `src/WorkflowCore/Models/TriggerSpec.cs` | Trigger configuration |
| `src/WorkflowCore/Services/ScheduleTriggerService.cs` | Cron execution |
| `src/WorkflowGateway/Controllers/WebhookController.cs` | Webhook endpoints |
| `src/WorkflowCore/Services/EventTriggerService.cs` | Event consumption |

---

# Stage 21: Sub-Workflow Composition ✅ COMPLETE

**Status:** 2 substages complete
**Proof:** `stage-proofs/stage-21.2/STAGE_21.2_PROOF.md`

## Overview

Call workflows from within workflows for reusability and modularity.

## YAML Syntax

```yaml
tasks:
  - id: process-order
    workflowRef: order-processing-v2      # Call another workflow
    input:
      orderId: "{{input.orderId}}"
      priority: "high"
    timeout: 30s

  - id: notify-customer
    workflowRef: notification-workflow
    input:
      customerId: "{{tasks.process-order.output.customerId}}"
      template: "order-confirmation"
    dependsOn: [process-order]
```

## Features

1. **Workflow References**
   - Reference by name (latest version)
   - Reference by name + version: `order-processing@v2`
   - Namespace-scoped: `billing/invoice-workflow`

2. **Input/Output Mapping**
   - Pass inputs to child workflow
   - Access child workflow outputs via `{{tasks.x.output}}`

3. **Execution Semantics**
   - Synchronous: Parent waits for child completion
   - Timeout inheritance or override
   - Error propagation (child failure = task failure)

4. **Cycle Detection**
   - Prevent A -> B -> A recursive calls
   - Max nesting depth (default: 5)

## Substages

### 21.1: WorkflowRef Resolution
- `WorkflowRefSpec` model
- Version resolution logic
- Namespace scoping
- **Tests**: ~20

### 21.2: Sub-Workflow Execution
- `SubWorkflowExecutor` service
- Context isolation (child gets own TaskOutputs)
- Output extraction
- **Tests**: ~25

### 21.3: Cycle Detection & Limits
- Call stack tracking
- Max depth enforcement
- Clear error messages
- **Tests**: ~15

---

# Stage 22: Secrets Management Integration

## Overview

Secure handling of API keys, tokens, and credentials at runtime.

## YAML Syntax

```yaml
tasks:
  - id: call-stripe
    taskRef: stripe-charge
    input:
      amount: "{{input.amount}}"
    secrets:
      - name: STRIPE_API_KEY
        source: vault                      # HashiCorp Vault
        path: secret/data/stripe
        key: api_key

      - name: DB_PASSWORD
        source: kubernetes                 # K8s Secret
        secretRef: postgres-credentials
        key: password

      - name: API_TOKEN
        source: env                        # Environment variable
        envVar: EXTERNAL_API_TOKEN
```

## Features

1. **Secret Sources**
   - HashiCorp Vault (KV v2)
   - Kubernetes Secrets
   - AWS Secrets Manager
   - Azure Key Vault
   - Environment variables (fallback)

2. **Runtime Injection**
   - Secrets resolved at execution time (not stored in workflow)
   - Template syntax: `{{secrets.STRIPE_API_KEY}}`
   - Automatic masking in logs/traces

3. **Rotation Support**
   - TTL-based caching
   - Automatic refresh on expiry
   - Graceful handling of rotation

## Substages

### 22.1: Secret Resolution Framework
- `ISecretProvider` interface
- `SecretSpec` model
- Provider registry
- **Tests**: ~20

### 22.2: Vault Integration
- HashiCorp Vault client
- Token/AppRole authentication
- KV v2 secrets engine
- **Tests**: ~20

### 22.3: Kubernetes & Cloud Providers
- K8s Secret provider
- AWS Secrets Manager provider
- Masking in execution traces
- **Tests**: ~25

---

# Stage 23: Multi-Tenancy & Resource Quotas

## Overview

Enterprise-grade isolation for multi-tenant deployments.

## Configuration

```yaml
apiVersion: workflow.io/v1
kind: WorkflowTenant
metadata:
  name: acme-corp
spec:
  namespace: acme-workflows

  quotas:
    maxConcurrentWorkflows: 100
    maxConcurrentTasks: 500
    maxWorkflowsPerHour: 1000
    maxExecutionDuration: 5m

  rateLimit:
    requestsPerSecond: 50
    burstSize: 100

  resourceLimits:
    cpu: "4"
    memory: "8Gi"

  allowedTaskRefs:
    - "http-*"                             # Glob patterns
    - "transform-*"
    - "!internal-*"                        # Exclude internal tasks
```

## Features

1. **Namespace Isolation**
   - Workflows scoped to tenant namespace
   - Cross-tenant references blocked
   - Tenant-specific task registries

2. **Resource Quotas**
   - Concurrent workflow limits
   - Concurrent task limits
   - Hourly/daily execution limits
   - Max execution duration

3. **Rate Limiting**
   - Per-tenant API rate limits
   - Sliding window algorithm
   - Graceful degradation (429 responses)

4. **Cost Attribution**
   - Execution time tracking per tenant
   - Task invocation counting
   - Exportable metrics for chargeback

## Substages

### 23.1: Tenant CRD & Isolation
- `WorkflowTenant` CRD
- Namespace scoping enforcement
- Tenant context propagation
- **Tests**: ~25

### 23.2: Quota Enforcement
- Concurrent execution limits
- Rate limiting middleware
- Quota exceeded errors
- **Tests**: ~25

### 23.3: Cost Attribution & Metrics
- Per-tenant metrics
- Usage aggregation
- Export to billing systems
- **Tests**: ~20

---

# Stage 24: GitOps Integration

## Overview

Declarative workflow management via Git repositories.

## Features

1. **ArgoCD Application**
   ```yaml
   apiVersion: argoproj.io/v1alpha1
   kind: Application
   metadata:
     name: workflows
   spec:
     source:
       repoURL: https://github.com/org/workflows
       path: workflows/production
     destination:
       namespace: workflows
     syncPolicy:
       automated:
         prune: true
         selfHeal: true
   ```

2. **Workflow Promotion Pipeline**
   ```
   dev -> staging -> production

   workflows/
   ├── dev/
   │   └── order-processing.yaml
   ├── staging/
   │   └── order-processing.yaml
   └── production/
       └── order-processing.yaml
   ```

3. **PR-Based Changes**
   - Validation on PR (dry-run)
   - Required reviews for production
   - Automatic diff visualization

4. **Drift Detection**
   - Compare cluster state to Git
   - Alert on manual changes
   - Auto-sync or manual approval

## Substages

### 24.1: GitOps-Ready Manifests
- Helm chart for workflows
- Kustomize overlays
- Environment-specific values
- **Tests**: ~15

### 24.2: CI/CD Integration
- GitHub Actions workflow
- GitLab CI pipeline
- Validation checks
- **Tests**: ~15

### 24.3: Drift Detection & Sync
- State comparison service
- Webhook notifications
- ArgoCD health checks
- **Tests**: ~20

---

# Stage 25: Local Development CLI ✅ COMPLETE

**Status:** 2 substages complete
**Proof:** `stage-proofs/stage-25.1/STAGE_25.1_PROOF.md`

## Overview

Developer-friendly CLI for local workflow authoring and testing.

## Commands

```bash
# Scaffold new workflow
workflow init my-workflow --template api-composition

# Validate workflow definition
workflow validate ./my-workflow.yaml

# Execute locally (mock mode)
workflow run ./my-workflow.yaml --input '{"userId": 123}'

# Execute against remote cluster
workflow run my-workflow --remote --input '{"userId": 123}'

# Step-through debugging
workflow debug ./my-workflow.yaml --breakpoint fetch-user

# Watch mode for development
workflow dev ./my-workflow.yaml --watch

# Generate task stubs from OpenAPI
workflow import openapi ./api-spec.yaml --output ./tasks/

# List available tasks
workflow tasks list --filter "http-*"

# View execution history
workflow history my-workflow --limit 10

# Tail execution logs
workflow logs my-workflow --execution abc123 --follow
```

## Features

1. **Local Execution Mode**
   - No Kubernetes required
   - Mock task responses
   - Fast iteration cycle

2. **Interactive Debugger**
   - Breakpoints on tasks
   - Step through execution
   - Inspect context at each step
   - Modify inputs mid-execution

3. **Watch Mode**
   - Auto-reload on file change
   - Instant validation feedback
   - Hot-reload in local mode

4. **Remote Integration**
   - Connect to cluster
   - Execute real workflows
   - Stream logs and events

## Substages

### 25.1: CLI Framework & Core Commands
- CLI structure (Spectre.Console or System.CommandLine)
- `init`, `validate`, `tasks` commands
- Configuration management
- **Tests**: ~25

### 25.2: Local Execution Engine
- Mock task executor
- Local orchestrator
- Input/output display
- **Tests**: ~30

### 25.3: Interactive Debugger
- Breakpoint system
- Step execution
- Context inspection
- **Tests**: ~25

---

# Stage 26: VS Code Extension ✅ COMPLETE

**Status:** Complete
**Proof:** `stage-proofs/stage-26/STAGE_26_PROOF.md`

## Overview

IDE integration for workflow authoring with IntelliSense and validation.

## Features

1. **YAML IntelliSense**
   - Auto-complete for workflow properties
   - Task name suggestions
   - Template expression completion
   - Input schema hints

2. **Real-Time Validation**
   - Inline error highlighting
   - Quick fixes for common issues
   - Schema validation as you type

3. **Task Browser**
   - Side panel with available tasks
   - Task documentation on hover
   - Drag-and-drop into YAML

4. **Execution Integration**
   - "Run Workflow" button
   - Output panel for results
   - Execution history view

5. **Template Helpers**
   - Template expression builder
   - Path auto-complete from task outputs
   - Type hints in templates

## Substages

### 26.1: Language Server Protocol (LSP)
- YAML language server
- Schema validation
- Completion provider
- **Tests**: ~20

### 26.2: VS Code Extension
- Extension scaffolding
- IntelliSense integration
- Error diagnostics
- **Tests**: ~15

### 26.3: Advanced Features
- Task browser panel
- Run/debug integration
- Template helpers
- **Tests**: ~15

---

# Stage 27: Anomaly Detection & Alerting ✅ COMPLETE

**Status:** 2 substages complete
**Proof:** `stage-proofs/stage-27.2/STAGE_27.2_PROOF.md`

## Overview

Proactive detection of performance issues and failures.

## Features

1. **Execution Time Anomaly Detection**
   - Baseline learning (rolling 7-day average)
   - Z-score based detection
   - Alert when >2 standard deviations

2. **Error Rate Monitoring**
   - Per-workflow error rate tracking
   - Spike detection (sudden increase)
   - Pattern recognition (time-of-day, day-of-week)

3. **Predictive Alerts**
   - "This workflow is slowing down" (trend detection)
   - "Error rate increasing" (early warning)
   - "Resource exhaustion imminent" (quota usage)

4. **Alert Channels**
   - Slack integration
   - PagerDuty integration
   - Webhook (generic)
   - Email

## Configuration

```yaml
apiVersion: workflow.io/v1
kind: AlertRule
metadata:
  name: slow-workflow-alert
spec:
  workflow: order-processing
  conditions:
    - type: executionTime
      threshold: 2.0                       # 2x baseline
      windowMinutes: 15
    - type: errorRate
      threshold: 0.05                      # 5% error rate
      windowMinutes: 5

  channels:
    - type: slack
      webhook: ${SLACK_WEBHOOK}
      channel: "#alerts"
    - type: pagerduty
      serviceKey: ${PD_SERVICE_KEY}
      severity: warning
```

## Substages

### 27.1: Metrics Collection & Baseline
- Execution metrics aggregation
- Rolling baseline calculation
- Statistical analysis
- **Tests**: ~25

### 27.2: Anomaly Detection Engine
- Z-score calculation
- Trend detection
- Pattern recognition
- **Tests**: ~25

### 27.3: Alert Routing & Channels
- Alert rule evaluation
- Channel integrations
- Rate limiting (no alert storms)
- **Tests**: ~20

---

# Stage 28: Circuit Breaker & Resilience ✅ COMPLETE

**Status:** Complete (2 substages)

## Overview

Prevent cascade failures with circuit breaker patterns.

## YAML Syntax

```yaml
tasks:
  - id: call-external-api
    taskRef: http-get
    input:
      url: "https://api.example.com/data"

    circuitBreaker:
      failureThreshold: 5                  # Open after 5 failures
      samplingDuration: 60s                # In 60-second window
      breakDuration: 30s                   # Stay open for 30s
      halfOpenRequests: 3                  # Test requests when half-open

    fallback:
      taskRef: get-cached-data             # Execute on circuit open
      input:
        key: "{{input.cacheKey}}"
```

## Features

1. **Circuit States**
   - **Closed**: Normal operation
   - **Open**: Fail fast, execute fallback
   - **Half-Open**: Test if service recovered

2. **Failure Counting**
   - Sliding window algorithm
   - Configurable failure types (5xx, timeout, exception)
   - Exclude expected errors (4xx)

3. **Fallback Tasks**
   - Execute alternative task on open circuit
   - Return cached data
   - Return default value

4. **Per-Task Configuration**
   - Different thresholds per external service
   - Shared circuit state across workflow executions

5. **Manual Circuit Control API**
   - List all circuit states
   - Force open/close circuits
   - Reset circuits
   - Health check endpoint

## Substages

### 28.1: Circuit Breaker Orchestrator Integration ✅
**Proof:** `stage-proofs/stage-28.1/STAGE_28.1_PROOF.md`
**Metrics:** 541/541 tests, 97%+ coverage
- State machine implementation (Closed/Open/Half-Open)
- CircuitBreakerRegistry for managing multiple circuits
- ICircuitStateStore interface (InMemory + Redis)
- Sliding window failure counter
- Fallback task execution in orchestrator
- **Tests**: ~35

### 28.2: Circuit Breaker API ✅
**Proof:** `stage-proofs/stage-28.2/STAGE_28.2_PROOF.md`
**Metrics:** 2105/2105 tests, 100% coverage (stage deliverables)
- CircuitBreakerController with 6 REST endpoints
- GET /api/v1/circuits - List all circuits
- GET /api/v1/circuits/{serviceName} - Get circuit state
- POST /api/v1/circuits/{serviceName}/open - Force open
- POST /api/v1/circuits/{serviceName}/close - Force close
- POST /api/v1/circuits/{serviceName}/reset - Reset circuit
- GET /api/v1/circuits/health - Health check
- **Tests**: ~9

### 28.3: Circuit Breaker Dashboard (Future)
- UI for circuit visualization
- Real-time circuit state monitoring
- **Tests**: ~15

---

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

# Ready to Start?

Begin with **Stage 19.1: Condition Evaluation Engine** using:

```bash
./scripts/init-stage.sh --stage 19.1 --name "Condition Evaluation" --profile BACKEND_DOTNET
```
