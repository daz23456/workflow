# WorkflowOperator

**Kubernetes operator for workflow and task Custom Resource Definitions (CRDs)**

## Purpose

WorkflowOperator is a Kubernetes operator built with KubeOps 8.x that manages WorkflowTask and Workflow custom resources. It provides fail-fast validation through admission webhooks, automatic reconciliation of resource status, and ensures that invalid workflows cannot be deployed to the cluster.

## Scope

This operator focuses on **resource management and validation** within a Kubernetes cluster. It does NOT execute workflows - that responsibility belongs to WorkflowGateway. Instead, it ensures that all deployed resources are valid, type-safe, and ready for execution.

### What's Included

- Custom Resource Definitions (CRDs) for WorkflowTask and Workflow
- Validating admission webhooks for fail-fast validation at `kubectl apply` time
- Resource controllers for status reconciliation
- Real-time validation of schemas, templates, and dependencies
- Breaking change detection for task schema evolution

### What's NOT Included

- Workflow execution (see WorkflowGateway)
- HTTP requests or external API calls
- Workflow state storage (execution history)
- User interface or REST API

## Key Components

### Controllers (`Controllers/`)

#### WorkflowTaskController
Reconciles WorkflowTask custom resources:
- Initializes status when new tasks are created
- Updates status on configuration changes
- Validates task type (currently supports "http")
- Ensures task has required request definition

```csharp
public class WorkflowTaskController : IResourceController<WorkflowTaskResource>
{
    public Task ReconcileAsync(WorkflowTaskResource resource);
    public Task DeletedAsync(WorkflowTaskResource resource);
}
```

#### WorkflowController
Reconciles Workflow custom resources:
- Initializes status (Phase: "Ready", ExecutionCount: 0)
- Preserves execution history during updates
- Maintains LastExecuted timestamp
- Handles null/empty phase values

```csharp
public class WorkflowController : IResourceController<WorkflowResource>
{
    public Task ReconcileAsync(WorkflowResource resource);
    public Task DeletedAsync(WorkflowResource resource);
}
```

### Validation Webhooks (`Webhooks/`)

#### WorkflowTaskValidationWebhook
Validates WorkflowTask resources at apply-time:
- **Type validation**: Ensures task type is specified and supported
- **HTTP task validation**:
  - Request definition is present
  - HTTP method is valid (GET, POST, PUT, DELETE, PATCH)
  - URL is not empty or whitespace
- **Schema validation**: InputSchema and OutputSchema are valid JSON Schemas

Returns `AdmissionResult.Deny(message)` with helpful error messages for invalid resources.

```csharp
public class WorkflowTaskValidationWebhook : IValidationWebhook<WorkflowTaskResource>
{
    public Task<AdmissionResult> ValidateAsync(WorkflowTaskResource resource);
}
```

**Example Error Messages:**
```
Task type is required
Unsupported task type 'custom'. Supported types: http
HTTP tasks must have a request definition
Invalid HTTP method 'INVALID'. Allowed: GET, POST, PUT, DELETE, PATCH
HTTP tasks must have a URL
```

#### WorkflowValidationWebhook
Validates Workflow resources at apply-time:
- **Task validation**: All tasks have valid IDs and task references
- **Template validation**: All templates (`{{input.x}}`, `{{tasks.y.output.z}}`) are syntactically correct
- **Dependency validation**: No circular dependencies between tasks
- **Type compatibility**: Task outputs are compatible with downstream task inputs
- **Reference validation**: All `taskRef` values reference existing WorkflowTask resources

Returns detailed error messages with property paths and suggested fixes.

```csharp
public class WorkflowValidationWebhook : IValidationWebhook<WorkflowResource>
{
    public Task<AdmissionResult> ValidateAsync(WorkflowResource resource);
}
```

**Example Error Messages:**
```
Circular dependency detected: task-a → task-b → task-a
Template 'tasks.nonexistent.output.x' references unknown task 'nonexistent'
Task 'fetch-orders' expects input type 'integer' but task 'fetch-user' outputs 'string'
Invalid template syntax: '{{input.}' - missing property name
```

### Custom Resource Definitions

See `deploy/crds/` for the complete CRD definitions:

- **WorkflowTask CRD** (`workflowtasks.workflow.example.com`)
- **Workflow CRD** (`workflows.workflow.example.com`)

## Getting Started

### Prerequisites

- Kubernetes cluster (v1.28+)
- .NET 8 SDK (for development)
- kubectl configured
- KubeOps CLI (optional, for CRD generation)

### Deploying the Operator

```bash
# Apply CRDs
kubectl apply -f deploy/crds/workflowtask-crd.yaml
kubectl apply -f deploy/crds/workflow-crd.yaml

# Deploy operator
kubectl apply -f deploy/operator-deployment.yaml

# Verify deployment
kubectl get pods -n workflow-operator
kubectl logs -n workflow-operator -l app=workflow-operator
```

### Creating WorkflowTasks

```yaml
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: fetch-user
  namespace: default
spec:
  type: http
  inputSchema:
    type: object
    properties:
      userId:
        type: string
    required:
      - userId
  outputSchema:
    type: object
    properties:
      name:
        type: string
      email:
        type: string
  request:
    method: GET
    url: "https://api.example.com/users/{{input.userId}}"
    headers:
      Authorization: "Bearer {{input.token}}"
```

```bash
kubectl apply -f fetch-user-task.yaml
# Webhook validates task configuration
# Controller reconciles and sets status.phase = "Ready"

kubectl get workflowtask fetch-user -o yaml
```

### Creating Workflows

```yaml
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: user-enrichment
  namespace: default
spec:
  input:
    userId:
      type: string
      required: true
  tasks:
    - id: fetch-user
      taskRef: fetch-user
      input:
        userId: "{{input.userId}}"

    - id: fetch-orders
      taskRef: fetch-orders
      input:
        userId: "{{input.userId}}"
        userEmail: "{{tasks.fetch-user.output.email}}"
```

```bash
kubectl apply -f user-enrichment-workflow.yaml
# Webhook validates:
#   ✓ Templates are syntactically correct
#   ✓ No circular dependencies
#   ✓ All taskRefs exist
#   ✓ Type compatibility
# Controller reconciles and sets status.phase = "Ready"

kubectl get workflow user-enrichment -o yaml
```

### Validation Examples

#### Invalid Task (Rejected by Webhook)

```yaml
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: invalid-task
spec:
  type: http
  # Missing request definition
```

```bash
kubectl apply -f invalid-task.yaml
# Error: admission webhook "workflowtask-validation" denied the request:
# HTTP tasks must have a request definition
```

#### Invalid Workflow (Circular Dependency)

```yaml
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: circular-workflow
spec:
  tasks:
    - id: task-a
      taskRef: some-task
      input:
        data: "{{tasks.task-b.output.value}}"

    - id: task-b
      taskRef: some-task
      input:
        data: "{{tasks.task-a.output.value}}"
```

```bash
kubectl apply -f circular-workflow.yaml
# Error: admission webhook "workflow-validation" denied the request:
# Circular dependency detected: task-a → task-b → task-a
```

## Architecture

### Operator Lifecycle

1. **Startup**:
   - Register CRDs
   - Register controllers
   - Register admission webhooks
   - Start watch loops

2. **Resource Applied** (`kubectl apply`):
   - Admission webhook validates resource
   - If valid: resource is created/updated
   - If invalid: request is rejected with helpful error

3. **Reconciliation**:
   - Controller receives notification of change
   - Updates resource status
   - Re-queues on error

4. **Resource Deleted** (`kubectl delete`):
   - Controller's `DeletedAsync` method is called
   - Cleanup logic executes (if any)

### Validation Flow

```
kubectl apply
    ↓
Admission Webhook (ValidateAsync)
    ↓
Valid? → NO → Return AdmissionResult.Deny(message)
    ↓           ↓
   YES     kubectl shows error
    ↓
Resource created/updated
    ↓
Controller ReconcileAsync
    ↓
Status updated
```

## Testing

WorkflowOperator has >90% code coverage with comprehensive unit tests:

```bash
# Run tests
cd tests/WorkflowOperator.Tests
dotnet test

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run mutation tests
dotnet stryker --config-file ../../stryker-config-workflowoperator.json
```

### Test Categories

- **Controller Tests**: Reconciliation behavior, status updates
- **Webhook Tests**: Validation logic, error messages
- **Model Tests**: Status and admission result models

## Design Decisions

### Why Fail-Fast Validation?

Validating at `kubectl apply` time (instead of at execution time) provides:
- **Immediate feedback**: Developers know instantly if a workflow is invalid
- **No runtime surprises**: Invalid workflows never reach the execution engine
- **Better developer experience**: Clear error messages at design time
- **Reduced operational burden**: No need to monitor for failed executions due to configuration errors

### Why Separate Controllers and Webhooks?

- **Controllers**: Manage resource lifecycle and status
- **Webhooks**: Enforce validation rules and prevent invalid state

This separation of concerns ensures:
- Webhooks reject invalid resources before they're created
- Controllers only work with valid resources
- Status updates are independent of validation logic

### Why Not Execute Workflows in the Operator?

The operator's responsibility is **resource management**, not **workflow execution**:
- Operators should be lightweight and focused on Kubernetes resource lifecycle
- Workflow execution is a complex, stateful operation better suited to a dedicated service
- This separation allows scaling execution independently from resource management
- Testing and deployment are simpler with clear boundaries

## Dependencies

- **KubeOps 8.x**: Kubernetes operator framework
- **WorkflowCore**: Domain models and validation services

### Test Dependencies

- **xUnit**: Test framework
- **Moq**: Mocking framework
- **FluentAssertions**: Fluent assertion library

## Future Enhancements

- Schema evolution protection (detect breaking changes)
- Workflow versioning support
- Multi-tenancy with namespace isolation
- Metrics and health checks
- Leader election for high availability

## Related Projects

- **WorkflowCore**: Shared domain models and services
- **WorkflowGateway**: Workflow execution API
- **WorkflowUI**: Web UI for workflow management

## Contributing

All contributions must follow TDD:
1. Write failing test first (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while keeping tests green (REFACTOR)

Maintain >90% code coverage and >80% mutation score.

## Troubleshooting

### Webhook Not Called

```bash
# Check webhook configuration
kubectl get validatingwebhookconfigurations

# Check operator logs
kubectl logs -n workflow-operator -l app=workflow-operator

# Verify webhook service is running
kubectl get svc -n workflow-operator
```

### Controller Not Reconciling

```bash
# Check operator is running
kubectl get pods -n workflow-operator

# Check for errors in logs
kubectl logs -n workflow-operator -l app=workflow-operator --tail=100

# Verify CRDs are registered
kubectl get crds | grep workflow
```

### Resource Status Not Updating

```bash
# Force reconciliation by updating annotation
kubectl annotate workflowtask fetch-user reconcile="$(date +%s)"

# Check controller logs
kubectl logs -n workflow-operator -l app=workflow-operator | grep fetch-user
```
