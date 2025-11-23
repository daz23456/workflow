# WorkflowGateway

**API Gateway for synchronous workflow execution**

## Purpose

WorkflowGateway is an ASP.NET Core API that provides synchronous HTTP endpoints for executing workflows defined in Kubernetes. It discovers workflows from the cluster, validates inputs, executes tasks in dependency order, and returns results - all within a single HTTP request/response cycle.

## Scope

This gateway focuses on **workflow execution and discovery**. It does NOT manage Kubernetes resources (that's WorkflowOperator's job). Instead, it watches for deployed workflows and provides a high-performance API for executing them.

### What's Included

- RESTful API for workflow execution
- Real-time workflow discovery from Kubernetes
- Synchronous execution with configurable timeouts
- Input validation against workflow schemas
- Workflow and task listing endpoints
- Health checks and readiness probes

### What's NOT Included

- Kubernetes resource management (see WorkflowOperator)
- Workflow definition/editing UI (see WorkflowUI)
- Long-running/async workflows (scope is synchronous only)
- Workflow execution history persistence (planned for future)

## Key Components

### Services (`Services/`)

#### WorkflowDiscoveryService
Watches Kubernetes for Workflow and WorkflowTask resources:
- Uses Kubernetes client to watch for resource changes
- Maintains in-memory cache of workflows and tasks
- Automatically refreshes on CRD create/update/delete events
- Provides fast lookup by name/namespace

```csharp
public interface IWorkflowDiscoveryService
{
    Task<WorkflowResource?> GetWorkflowAsync(string name, string @namespace = "default");
    Task<WorkflowTaskResource?> GetTaskAsync(string name, string @namespace = "default");
    Task<IEnumerable<WorkflowResource>> ListWorkflowsAsync(string? @namespace = null);
    Task<IEnumerable<WorkflowTaskResource>> ListTasksAsync(string? @namespace = null);
    Task StartWatchingAsync(CancellationToken cancellationToken);
}
```

#### WorkflowExecutionService
Orchestrates workflow execution:
- Validates input against workflow's input schema
- Loads referenced tasks from discovery service
- Builds execution graph with dependency resolution
- Executes tasks in topological order
- Collects and returns outputs

```csharp
public interface IWorkflowExecutionService
{
    Task<WorkflowExecutionResult> ExecuteAsync(
        string workflowName,
        Dictionary<string, object> input,
        string @namespace = "default",
        CancellationToken cancellationToken = default);
}
```

#### WorkflowWatcherService
Background service that starts workflow watching:
- Implements `IHostedService` for ASP.NET Core
- Starts `WorkflowDiscoveryService` on application startup
- Handles graceful shutdown

```csharp
public class WorkflowWatcherService : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken);
    public Task StopAsync(CancellationToken cancellationToken);
}
```

### API Endpoints (`Controllers/`)

#### Workflow Execution API

**POST /api/v1/workflows/{name}/execute**

Execute a workflow synchronously.

Request:
```json
{
  "namespace": "default",
  "input": {
    "userId": "123",
    "action": "enrich"
  }
}
```

Response (200 OK):
```json
{
  "workflowName": "user-enrichment",
  "success": true,
  "outputs": {
    "fetch-user": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "fetch-orders": {
      "orders": [
        {"id": "order-1", "total": 99.99}
      ]
    }
  },
  "executionTimeMs": 245
}
```

Response (400 Bad Request) - Invalid Input:
```json
{
  "workflowName": "user-enrichment",
  "success": false,
  "error": "Input validation failed",
  "validationErrors": [
    {
      "path": "userId",
      "message": "Required property 'userId' is missing"
    }
  ]
}
```

Response (404 Not Found) - Workflow Not Found:
```json
{
  "error": "Workflow 'nonexistent' not found in namespace 'default'"
}
```

Response (500 Internal Server Error) - Execution Error:
```json
{
  "workflowName": "user-enrichment",
  "success": false,
  "error": "Task execution failed: HTTP request to https://api.example.com failed with status 500"
}
```

#### Workflow Discovery API

**GET /api/v1/workflows**

List all workflows in a namespace.

Query Parameters:
- `namespace` (optional): Filter by namespace (default: all namespaces)

Response:
```json
{
  "workflows": [
    {
      "name": "user-enrichment",
      "namespace": "default",
      "taskCount": 2,
      "status": "Ready"
    },
    {
      "name": "order-processing",
      "namespace": "production",
      "taskCount": 5,
      "status": "Ready"
    }
  ]
}
```

**GET /api/v1/workflows/{name}**

Get details of a specific workflow.

Response:
```json
{
  "metadata": {
    "name": "user-enrichment",
    "namespace": "default"
  },
  "spec": {
    "input": {
      "userId": {
        "type": "string",
        "required": true
      }
    },
    "tasks": [
      {
        "id": "fetch-user",
        "taskRef": "fetch-user",
        "input": {
          "userId": "{{input.userId}}"
        }
      }
    ]
  },
  "status": {
    "phase": "Ready",
    "executionCount": 142,
    "lastExecuted": "2025-11-22T10:30:00Z"
  }
}
```

**GET /api/v1/tasks**

List all workflow tasks.

**GET /api/v1/tasks/{name}**

Get details of a specific workflow task.

## Getting Started

### Prerequisites

- .NET 8 SDK
- Kubernetes cluster with WorkflowOperator deployed
- Valid kubeconfig file
- WorkflowTask and Workflow CRDs installed

### Configuration

Create `appsettings.json`:

```json
{
  "Kubernetes": {
    "Namespace": "default",
    "UseInClusterConfig": false,
    "KubeConfigPath": "~/.kube/config"
  },
  "WorkflowExecution": {
    "DefaultTimeoutSeconds": 30,
    "MaxConcurrentExecutions": 100
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "WorkflowGateway": "Debug"
    }
  }
}
```

### Running Locally

```bash
# Ensure kubeconfig is configured
export KUBECONFIG=~/.kube/config

# Run the gateway
cd src/WorkflowGateway
dotnet run

# Gateway starts on https://localhost:5001
```

### Running in Kubernetes

```bash
# Build Docker image
docker build -t workflow-gateway:latest -f src/WorkflowGateway/Dockerfile .

# Push to registry
docker push your-registry/workflow-gateway:latest

# Deploy to cluster
kubectl apply -f deploy/gateway-deployment.yaml

# Verify deployment
kubectl get pods -n workflow-system
kubectl logs -n workflow-system -l app=workflow-gateway
```

## Usage Examples

### Execute a Simple Workflow

```bash
# Create a WorkflowTask (via WorkflowOperator)
kubectl apply -f - <<EOF
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: get-time
spec:
  type: http
  outputSchema:
    type: object
    properties:
      time:
        type: string
  request:
    method: GET
    url: "https://worldtimeapi.org/api/timezone/Etc/UTC"
EOF

# Create a Workflow
kubectl apply -f - <<EOF
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: check-time
spec:
  tasks:
    - id: get-current-time
      taskRef: get-time
EOF

# Execute via Gateway
curl -X POST https://localhost:5001/api/v1/workflows/check-time/execute \
  -H "Content-Type: application/json" \
  -d '{}'

# Response:
# {
#   "workflowName": "check-time",
#   "success": true,
#   "outputs": {
#     "get-current-time": {
#       "time": "2025-11-22T10:30:00.000Z"
#     }
#   },
#   "executionTimeMs": 156
# }
```

### Execute Workflow with Input Validation

```bash
# Execute with valid input
curl -X POST https://localhost:5001/api/v1/workflows/user-enrichment/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "userId": "123"
    }
  }'

# Execute with invalid input (missing required field)
curl -X POST https://localhost:5001/api/v1/workflows/user-enrichment/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {}
  }'

# Response (400 Bad Request):
# {
#   "workflowName": "user-enrichment",
#   "success": false,
#   "error": "Input validation failed",
#   "validationErrors": [
#     {
#       "path": "userId",
#       "message": "Required property 'userId' is missing"
#     }
#   ]
# }
```

### List Available Workflows

```bash
# List all workflows
curl https://localhost:5001/api/v1/workflows

# List workflows in specific namespace
curl https://localhost:5001/api/v1/workflows?namespace=production

# Get specific workflow details
curl https://localhost:5001/api/v1/workflows/user-enrichment
```

## Architecture

### Execution Flow

```
HTTP Request
    ↓
[WorkflowExecutionController]
    ↓
Validate input exists
    ↓
[WorkflowDiscoveryService]
    ↓
Get workflow from cache
    ↓
[WorkflowExecutionService]
    ↓
1. Validate input against workflow schema
2. Load referenced tasks
3. Build execution graph
4. Execute tasks in order
    ↓
[HttpTaskExecutor] (for each task)
    ↓
1. Resolve templates
2. Send HTTP request
3. Parse response
4. Validate output
    ↓
Collect all outputs
    ↓
Return WorkflowExecutionResult
    ↓
HTTP Response
```

### Caching Strategy

- **Workflows and Tasks**: Cached in-memory, updated via Kubernetes watch
- **Execution Graph**: Built on-demand (not cached)
- **HTTP Responses**: Not cached (always fresh)

### Error Handling

1. **Input Validation Errors**: Return 400 Bad Request with detailed validation errors
2. **Workflow Not Found**: Return 404 Not Found
3. **Task Execution Errors**: Return 500 Internal Server Error with error details
4. **Circular Dependencies**: Caught during graph building, return 500
5. **Timeout**: Configurable per-workflow timeout (default 30s)

## Testing

WorkflowGateway has >90% code coverage with comprehensive unit and integration tests:

```bash
# Run unit tests
cd tests/WorkflowGateway.Tests
dotnet test

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run integration tests (requires Kubernetes)
cd tests/WorkflowGateway.IntegrationTests
dotnet test

# Run mutation tests
cd tests/WorkflowGateway.Tests
dotnet stryker --config-file ../../stryker-config-workflowgateway.json
```

### Test Categories

- **Service Tests**: Discovery, execution, watcher services
- **Controller Tests**: API endpoints, request/response handling
- **Integration Tests**: End-to-end with TestContainers and K3s

## Performance Considerations

- **In-Memory Caching**: Workflows and tasks cached for fast lookups
- **Kubernetes Watch**: Real-time updates without polling
- **Async/Await**: Non-blocking I/O throughout
- **Connection Pooling**: HttpClient reused across requests
- **Minimal Allocations**: Object pooling for hot paths

### Benchmarks

Expected performance (single workflow, 3 tasks):
- **Workflow lookup**: <1ms (cached)
- **Graph building**: <5ms
- **HTTP execution**: Depends on external APIs
- **Total overhead**: <10ms (excluding HTTP round-trips)

## Configuration

### Environment Variables

- `KUBERNETES__NAMESPACE`: Default namespace for workflows
- `KUBERNETES__USEINCLUSTERCONFIG`: Use in-cluster config (true/false)
- `ASPNETCORE_URLS`: Listening URLs (default: http://+:5000;https://+:5001)

### appsettings.json

```json
{
  "Kubernetes": {
    "Namespace": "default",
    "UseInClusterConfig": false,
    "KubeConfigPath": "~/.kube/config",
    "WatchTimeoutSeconds": 3600
  },
  "WorkflowExecution": {
    "DefaultTimeoutSeconds": 30,
    "MaxConcurrentExecutions": 100,
    "EnableMetrics": true
  }
}
```

## Dependencies

- **ASP.NET Core 8.0**: Web framework
- **KubernetesClient**: Kubernetes API client
- **WorkflowCore**: Domain models and execution services
- **System.Text.Json**: JSON serialization

### Test Dependencies

- **xUnit**: Test framework
- **Moq**: Mocking framework
- **FluentAssertions**: Fluent assertion library
- **TestContainers**: Docker containers for integration tests

## Future Enhancements

- Execution history persistence (PostgreSQL)
- Async workflow execution with polling endpoints
- Workflow execution metrics and dashboards
- Rate limiting and throttling
- Authentication and authorization
- GraphQL API
- WebSocket streaming for real-time updates

## Related Projects

- **WorkflowCore**: Shared domain models and services
- **WorkflowOperator**: Kubernetes operator for resource management
- **WorkflowUI**: Web UI for workflow management

## Contributing

All contributions must follow TDD:
1. Write failing test first (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while keeping tests green (REFACTOR)

Maintain >90% code coverage and >80% mutation score.

## Troubleshooting

### Gateway Can't Discover Workflows

```bash
# Check kubeconfig is valid
kubectl get workflows

# Check gateway logs
kubectl logs -n workflow-system -l app=workflow-gateway

# Verify RBAC permissions
kubectl auth can-i watch workflows --as=system:serviceaccount:workflow-system:workflow-gateway
```

### Workflow Execution Fails

```bash
# Check workflow is valid
kubectl get workflow user-enrichment -o yaml

# Check referenced tasks exist
kubectl get workflowtask fetch-user

# Check gateway logs for errors
kubectl logs -n workflow-system -l app=workflow-gateway | grep ERROR
```

### Slow Execution Times

```bash
# Check task HTTP endpoints are reachable
curl https://api.example.com/health

# Enable detailed logging
kubectl set env deployment/workflow-gateway -n workflow-system LOGGING__LOGLEVEL__DEFAULT=Debug

# Check execution metrics
curl https://localhost:5001/metrics
```
