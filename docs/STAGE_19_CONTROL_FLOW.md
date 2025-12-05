# Stage 19: Control Flow

## Overview

Add control flow capabilities to the workflow orchestration engine:
- **forEach**: Iterate over arrays with parallel execution
- **if/else conditions**: Skip tasks based on expressions
- **switch/case**: Route to different tasks based on value
- **nesting**: Combine forEach + conditions for complex flows

---

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
    tasks:                                             # Inline nested tasks
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

#### Expression Syntax
```
Operators: ==, !=, >, <, >=, <=, &&, ||, !
Types: bool, string, number, null
Examples:
  "{{tasks.check.output.approved}} == true"
  "{{input.amount}} > 100 && {{input.amount}} < 1000"
  "{{tasks.fetch.output.status}} != 'error'"
```

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

---

### Stage 19.2: Switch/Case Implementation
**Focus**: Multi-branch routing based on value
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~20-25

#### Behavior
- First matching case wins
- Falls through to `default` if no match
- Error if no match and no default defined

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

---

### Stage 19.3: forEach Array Iteration
**Focus**: Iterate over arrays with parallel execution
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~30-35

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

---

### Stage 19.4: Validation & Integration
**Focus**: Admission validation, error handling, E2E tests
**Profile**: `BACKEND_DOTNET`, Gates 1-8
**Tests**: ~20-25

#### Validation Rules
1. **Condition.If**: Valid expression syntax, resolvable templates
2. **Switch**: Unique match values, taskRefs exist, warn if no default
3. **ForEach**: Items template valid, itemVar is identifier, maxParallel > 0
4. **Nesting**: Validate max depth (default 3), prevent infinite loops

#### New Files
| File | Purpose |
|------|---------|
| `tests/WorkflowCore.IntegrationTests/ControlFlowIntegrationTests.cs` | E2E tests |

#### Modified Files
| File | Changes |
|------|---------|
| `src/WorkflowOperator/Webhooks/WorkflowValidationWebhook.cs` | Validate control flow syntax |
| `src/WorkflowCore/Services/WorkflowValidator.cs` | Expression syntax validation |

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

#### ControlFlowContext Stack
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

#### Template Resolution with Nesting
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
