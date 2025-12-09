# Workflow Gateway API Reference

Complete API reference for all non-workflow endpoints in the Workflow Gateway.

---

## Table of Contents

1. [Transform DSL](#transform-dsl)
2. [Templates](#templates)
3. [Execution History](#execution-history)
4. [Metrics & Analytics](#metrics--analytics)
5. [Circuit Breakers](#circuit-breakers)
6. [Health Checks](#health-checks)
7. [Task Impact & Lifecycle](#task-impact--lifecycle)
8. [Labels & Organization](#labels--organization)
9. [Optimization Engine](#optimization-engine)
10. [Webhooks & Triggers](#webhooks--triggers)

---

## Transform DSL

Data transformation engine using a composable DSL for select, filter, map, join operations.

### Execute Transform

```http
POST /api/v1/transform
```

Transform input data using the Transform DSL.

**Request:**
```json
{
  "dsl": {
    "operations": [
      { "operation": "filter", "condition": "$.age > 18" },
      { "operation": "select", "fields": ["name", "email"] },
      { "operation": "limit", "count": 10 }
    ]
  },
  "data": [
    { "name": "Alice", "email": "alice@example.com", "age": 25 },
    { "name": "Bob", "email": "bob@example.com", "age": 17 },
    { "name": "Charlie", "email": "charlie@example.com", "age": 30 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Charlie", "email": "charlie@example.com" }
  ]
}
```

**Error Response:**
```json
{
  "success": false,
  "errors": [
    "Invalid filter condition: syntax error at position 5"
  ]
}
```

#### Supported Operations

| Operation | Parameters | Description |
|-----------|------------|-------------|
| `select` | `fields: string[]` | Select specific fields from each record |
| `filter` | `condition: string` | Filter records matching condition |
| `map` | `expression: object` | Transform each record |
| `limit` | `count: number` | Limit output to N records |
| `sort` | `field: string, order: asc|desc` | Sort by field |
| `join` | `source: string, on: string` | Join with another dataset |

---

## Templates

Pre-built workflow templates for common patterns.

### List Templates

```http
GET /api/v1/templates
```

Get all available workflow templates with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `namespace` | string | Filter by namespace |
| `category` | string | Filter by category: `api-composition`, `data-processing`, `real-time`, `integrations` |
| `difficulty` | string | Filter by difficulty: `beginner`, `intermediate`, `advanced` |

**Response:**
```json
{
  "templates": [
    {
      "name": "api-aggregator",
      "category": "api-composition",
      "difficulty": "beginner",
      "description": "Aggregate data from multiple APIs into a single response",
      "tags": ["api", "aggregation", "parallel"],
      "estimatedSetupTime": "5 minutes",
      "taskCount": 3,
      "hasParallelExecution": true
    },
    {
      "name": "etl-pipeline",
      "category": "data-processing",
      "difficulty": "intermediate",
      "description": "Extract, transform, and load data between systems",
      "tags": ["etl", "data", "transformation"],
      "estimatedSetupTime": "15 minutes",
      "taskCount": 5,
      "hasParallelExecution": false
    }
  ],
  "totalCount": 2
}
```

### Get Template Detail

```http
GET /api/v1/templates/{name}
```

Get detailed information about a specific template including YAML definition.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `namespace` | string | Optional namespace (defaults to 'default') |

**Response:**
```json
{
  "metadata": {
    "name": "api-aggregator",
    "category": "api-composition",
    "difficulty": "beginner",
    "description": "Aggregate data from multiple APIs",
    "tags": ["api", "aggregation"],
    "taskCount": 3
  },
  "yamlDefinition": "apiVersion: workflow.io/v1\nkind: Workflow\nmetadata:\n  name: api-aggregator\nspec:\n  tasks:\n    - id: fetch-users\n      taskRef: http-get\n      ...",
  "graph": null
}
```

---

## Execution History

View and analyze past workflow executions.

### List Executions

```http
GET /api/v1/executions/workflows/{workflowName}/list
```

List executions for a specific workflow with pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter by status: `Pending`, `Running`, `Succeeded`, `Failed` |
| `skip` | int | 0 | Number of records to skip |
| `take` | int | 20 | Number of records to return |

**Response:**
```json
{
  "workflowName": "order-processing",
  "executions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "workflowName": "order-processing",
      "status": "Succeeded",
      "startedAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:30:02Z",
      "durationMs": 2150
    }
  ],
  "totalCount": 1,
  "skip": 0,
  "take": 20
}
```

### Get Execution Details

```http
GET /api/v1/executions/{id}
```

Get detailed information about a specific execution including task-level details.

**Response:**
```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "workflowName": "order-processing",
  "status": "Succeeded",
  "startedAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:30:02Z",
  "durationMs": 2150,
  "graphBuildDurationMs": 1,
  "input": {
    "orderId": "ORD-123"
  },
  "tasks": [
    {
      "taskId": "task-1",
      "taskRef": "validate-order",
      "success": true,
      "output": { "isValid": true },
      "errors": [],
      "retryCount": 0,
      "durationMs": 150,
      "startedAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:30:00.150Z"
    }
  ]
}
```

### Get Execution Trace

```http
GET /api/v1/executions/{id}/trace
```

Get a detailed execution trace for debugging and visualization.

**Response:**
```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "workflowName": "order-processing",
  "nodes": [
    {
      "id": "task-1",
      "type": "task",
      "status": "succeeded",
      "startTime": "2024-01-15T10:30:00Z",
      "endTime": "2024-01-15T10:30:00.150Z",
      "durationMs": 150
    }
  ],
  "edges": [
    { "from": "task-1", "to": "task-2" }
  ],
  "timeline": [
    { "time": 0, "event": "workflow_started" },
    { "time": 150, "event": "task_completed", "taskId": "task-1" }
  ]
}
```

---

## Metrics & Analytics

System and workflow performance metrics.

### Get System Metrics

```http
GET /api/v1/metrics/system
```

Get system-wide metrics aggregated across all workflows.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `24h` | Time range: `1h`, `24h`, `7d`, `30d` |

**Response:**
```json
{
  "totalExecutions": 15420,
  "successRate": 98.5,
  "avgDurationMs": 245,
  "p50DurationMs": 180,
  "p95DurationMs": 450,
  "p99DurationMs": 890,
  "errorRate": 1.5,
  "throughputPerMinute": 10.7,
  "activeWorkflows": 23,
  "timeRange": "24h"
}
```

### Get Workflow Metrics

```http
GET /api/v1/metrics/workflows
```

Get metrics for all workflows.

**Response:**
```json
[
  {
    "workflowName": "order-processing",
    "totalExecutions": 5200,
    "successRate": 99.1,
    "avgDurationMs": 320,
    "lastExecuted": "2024-01-15T10:30:00Z"
  },
  {
    "workflowName": "user-sync",
    "totalExecutions": 1200,
    "successRate": 97.5,
    "avgDurationMs": 1500,
    "lastExecuted": "2024-01-15T10:25:00Z"
  }
]
```

### Get Workflow History

```http
GET /api/v1/metrics/workflows/{name}/history
```

Get historical trend data for a specific workflow.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `24h` | Time range: `1h`, `24h`, `7d`, `30d` |

**Response:**
```json
[
  {
    "timestamp": "2024-01-15T10:00:00Z",
    "executionCount": 45,
    "successRate": 100,
    "avgDurationMs": 310,
    "errorCount": 0
  },
  {
    "timestamp": "2024-01-15T11:00:00Z",
    "executionCount": 52,
    "successRate": 98.1,
    "avgDurationMs": 325,
    "errorCount": 1
  }
]
```

### Get Slowest Workflows

```http
GET /api/v1/metrics/slowest
```

Get the slowest workflows by average execution duration.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 10 | Maximum number of workflows to return |

**Response:**
```json
[
  {
    "workflowName": "data-export",
    "avgDurationMs": 5200,
    "p95DurationMs": 8500,
    "executionCount": 150,
    "degradationPercent": 15.5,
    "degradationTrend": "increasing"
  }
]
```

---

## Circuit Breakers

Manage circuit breaker states for downstream services.

### List All Circuits

```http
GET /api/v1/circuits
```

Get the state of all circuit breakers.

**Response:**
```json
{
  "circuits": [
    {
      "serviceName": "payment-service",
      "state": "Closed",
      "failureCount": 0,
      "successCount": 1250,
      "lastFailureAt": null,
      "lastSuccessAt": "2024-01-15T10:30:00Z",
      "circuitOpenedAt": null
    },
    {
      "serviceName": "inventory-service",
      "state": "Open",
      "failureCount": 5,
      "successCount": 890,
      "lastFailureAt": "2024-01-15T10:28:00Z",
      "lastSuccessAt": "2024-01-15T10:25:00Z",
      "circuitOpenedAt": "2024-01-15T10:28:00Z"
    }
  ]
}
```

### Get Circuit State

```http
GET /api/v1/circuits/{serviceName}
```

Get the state of a specific circuit breaker.

**Response:**
```json
{
  "serviceName": "payment-service",
  "state": "Closed",
  "failureCount": 0,
  "successCount": 1250,
  "lastFailureAt": null,
  "lastSuccessAt": "2024-01-15T10:30:00Z",
  "circuitOpenedAt": null,
  "halfOpenSuccessCount": 0,
  "lastStateTransitionAt": "2024-01-15T08:00:00Z"
}
```

### Force Circuit Open

```http
POST /api/v1/circuits/{serviceName}/open
```

Force a circuit breaker to the open state, blocking all requests.

**Response:**
```json
{
  "success": true,
  "message": "Circuit for 'payment-service' has been forced open.",
  "circuit": {
    "serviceName": "payment-service",
    "state": "Open",
    "circuitOpenedAt": "2024-01-15T10:35:00Z"
  }
}
```

### Force Circuit Closed

```http
POST /api/v1/circuits/{serviceName}/close
```

Force a circuit breaker to the closed state, allowing all requests.

**Response:**
```json
{
  "success": true,
  "message": "Circuit for 'payment-service' has been forced closed.",
  "circuit": {
    "serviceName": "payment-service",
    "state": "Closed",
    "failureCount": 0
  }
}
```

### Reset Circuit

```http
POST /api/v1/circuits/{serviceName}/reset
```

Reset a circuit breaker, clearing all state.

**Response:**
```json
{
  "success": true,
  "message": "Circuit for 'payment-service' has been reset.",
  "circuit": {
    "serviceName": "payment-service",
    "state": "Closed",
    "failureCount": 0,
    "successCount": 0
  }
}
```

### Circuit Breaker Health

```http
GET /api/v1/circuits/health
```

Check the health of the circuit breaker subsystem.

**Response (Healthy):**
```json
{
  "status": "healthy"
}
```

**Response (Unhealthy - 503):**
```json
{
  "status": "unhealthy",
  "error": "Circuit breaker state store is unavailable"
}
```

---

## Health Checks

Synthetic health checks for workflows and their dependencies.

### Run Health Check

```http
POST /api/v1/workflows/{name}/health-check
```

Run a health check for a specific workflow immediately.

**Response:**
```json
{
  "workflowName": "order-processing",
  "overallHealth": "Healthy",
  "tasks": [
    {
      "taskId": "task-1",
      "taskRef": "validate-order",
      "status": "Healthy",
      "url": "http://order-service/validate",
      "latencyMs": 45,
      "reachable": true,
      "statusCode": 200,
      "errorMessage": null
    },
    {
      "taskId": "task-2",
      "taskRef": "check-inventory",
      "status": "Degraded",
      "url": "http://inventory-service/check",
      "latencyMs": 850,
      "reachable": true,
      "statusCode": 200,
      "errorMessage": "Response time exceeds threshold (500ms)"
    }
  ],
  "checkedAt": "2024-01-15T10:30:00Z",
  "durationMs": 920
}
```

### Get Cached Health Status

```http
GET /api/v1/workflows/{name}/health-status
```

Get the cached health status for a workflow.

**Response:** Same as health check response.

**404 Response:**
```json
{
  "message": "No health status cached for workflow 'order-processing'. Run a health check first."
}
```

### Get Health Summary

```http
GET /api/v1/health/summary
```

Get a summary of health status for all workflows.

**Response:**
```json
{
  "totalWorkflows": 15,
  "healthyCount": 12,
  "degradedCount": 2,
  "unhealthyCount": 1,
  "unknownCount": 0,
  "workflows": [
    {
      "workflowName": "order-processing",
      "overallHealth": "Healthy",
      "tasks": [...],
      "checkedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "generatedAt": "2024-01-15T10:35:00Z"
}
```

#### Health States

| State | Description |
|-------|-------------|
| `Healthy` | All dependencies responsive within thresholds |
| `Degraded` | Dependencies responsive but slow or intermittent |
| `Unhealthy` | One or more dependencies unreachable |
| `Unknown` | Health status not yet determined |

---

## Task Impact & Lifecycle

Analyze task changes and manage task lifecycle states.

### Get Task Impact

```http
GET /api/v1/tasks/{taskName}/impact
```

Get impact analysis for a task change.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `removedField` | string | Field being removed (optional) |

**Response:**
```json
{
  "taskName": "get-user",
  "affectedWorkflows": ["order-processing", "user-sync", "notification-service"],
  "isBreaking": true,
  "breakingReason": "Removing field 'email' will break 3 workflow(s)",
  "blockedWorkflows": ["order-processing", "user-sync", "notification-service"],
  "impactLevel": "High",
  "suggestedActions": [
    "Create a new task version with -v2 suffix",
    "Notify dependent workflow owners",
    "Coordinate migration with 3 blocked workflow(s)"
  ]
}
```

#### Impact Levels

| Level | Criteria |
|-------|----------|
| `None` | Not a breaking change |
| `Low` | Breaking but no affected workflows |
| `Medium` | Breaking with 1-4 affected workflows |
| `High` | Breaking with 5+ affected workflows |

### Get Task Lifecycle

```http
GET /api/v1/tasks/{taskName}/lifecycle
```

Get lifecycle state for a task.

**Response:**
```json
{
  "taskName": "get-user",
  "state": "Active",
  "supersededBy": null,
  "deprecationDate": null,
  "isBlocked": false
}
```

#### Lifecycle States

| State | Description |
|-------|-------------|
| `Active` | Task is in production use |
| `Deprecated` | Task is marked for removal |
| `Superseded` | Task has been replaced by a newer version |
| `Blocked` | Task cannot be used (breaking issues) |

### Supersede Task

```http
POST /api/v1/tasks/{taskName}/supersede
```

Mark a task as superseded by a newer version.

**Request:**
```json
{
  "newTaskName": "get-user-v2"
}
```

### Deprecate Task

```http
POST /api/v1/tasks/{taskName}/deprecate
```

Mark a task as deprecated with a removal date.

**Request:**
```json
{
  "deprecationDate": "2024-03-01T00:00:00Z"
}
```

---

## Labels & Organization

Manage tags and categories for workflows and tasks.

### Get All Labels

```http
GET /api/v1/labels
```

Get all labels with usage counts.

**Response:**
```json
{
  "tags": [
    { "value": "critical", "workflowCount": 5, "taskCount": 12 },
    { "value": "payments", "workflowCount": 3, "taskCount": 8 },
    { "value": "legacy", "workflowCount": 10, "taskCount": 25 }
  ],
  "categories": [
    { "value": "api-composition", "workflowCount": 8 },
    { "value": "data-processing", "workflowCount": 12 },
    { "value": "integrations", "workflowCount": 5 }
  ]
}
```

### Get Label Statistics

```http
GET /api/v1/labels/stats
```

Get detailed label statistics and analytics.

**Response:**
```json
{
  "totalTags": 25,
  "totalCategories": 8,
  "workflowsWithTags": 42,
  "workflowsWithCategories": 38,
  "tasksWithTags": 85,
  "tasksWithCategories": 72,
  "topTags": [
    { "value": "critical", "workflowCount": 5, "taskCount": 12 }
  ],
  "topCategories": [
    { "value": "data-processing", "workflowCount": 12 }
  ]
}
```

### Update Workflow Labels

```http
PATCH /api/v1/workflows/{name}/labels
```

Update labels for a specific workflow.

**Request:**
```json
{
  "addTags": ["critical", "payments"],
  "removeTags": ["legacy"],
  "addCategories": ["api-composition"],
  "removeCategories": ["experimental"]
}
```

**Response:**
```json
{
  "success": true,
  "entityName": "order-processing",
  "currentTags": ["critical", "payments", "production"],
  "currentCategories": ["api-composition"],
  "message": "Labels updated successfully"
}
```

### Update Task Labels

```http
PATCH /api/v1/tasks/{name}/labels
```

Update labels for a specific task. (Same request/response as workflow labels)

### Bulk Update Workflow Labels

```http
POST /api/v1/workflows/labels/bulk
```

Bulk update labels for multiple workflows.

**Request:**
```json
{
  "entityNames": ["workflow-1", "workflow-2", "workflow-3"],
  "addTags": ["migrated"],
  "removeTags": ["legacy"],
  "addCategories": ["production"],
  "removeCategories": [],
  "dryRun": true
}
```

**Response:**
```json
{
  "success": true,
  "affectedEntities": 3,
  "isDryRun": true,
  "changes": [
    {
      "name": "workflow-1",
      "addedTags": ["migrated"],
      "removedTags": ["legacy"],
      "addedCategories": ["production"],
      "removedCategories": []
    }
  ],
  "message": "Dry run completed - no changes saved"
}
```

### Bulk Update Task Labels

```http
POST /api/v1/tasks/labels/bulk
```

Bulk update labels for multiple tasks. (Same request/response as workflow bulk)

### Get Workflows by Tags

```http
GET /api/v1/workflows/by-tags
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tags` | string | - | Comma-separated tags |
| `matchAllTags` | bool | `false` | Require all tags (AND) vs any tag (OR) |
| `namespace` | string | - | Filter by namespace |

**Example:**
```http
GET /api/v1/workflows/by-tags?tags=critical,payments&matchAllTags=true
```

### Get Workflows by Categories

```http
GET /api/v1/workflows/by-categories
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `categories` | string | Comma-separated categories |
| `namespace` | string | Filter by namespace |

### Get Tasks by Tags

```http
GET /api/v1/tasks/by-tags
```

Same parameters as workflows by tags.

### Get Tasks by Category

```http
GET /api/v1/tasks/by-category
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Single category |
| `namespace` | string | Filter by namespace |

---

## Optimization Engine

Discover and apply workflow optimizations.

### Get Optimization Suggestions

```http
GET /api/v1/workflows/{workflowName}/optimizations
```

Get optimization suggestions for a workflow.

**Response:**
```json
{
  "workflowName": "data-pipeline",
  "suggestions": [
    {
      "id": "opt-1-filter-before-map-task-3",
      "type": "filter-before-map",
      "description": "Move filter operation before map to reduce data volume early",
      "affectedTaskIds": ["task-3"],
      "estimatedImpact": "High",
      "safetyLevel": "Safe"
    },
    {
      "id": "opt-2-dead-task-task-5",
      "type": "dead-task",
      "description": "Task output is never used - can be removed",
      "affectedTaskIds": ["task-5"],
      "estimatedImpact": "Medium",
      "safetyLevel": "Safe"
    },
    {
      "id": "opt-3-parallel-promotion-task-2",
      "type": "parallel-promotion",
      "description": "Task can run in parallel with task-1 (no data dependency)",
      "affectedTaskIds": ["task-2"],
      "estimatedImpact": "High",
      "safetyLevel": "RequiresReview"
    }
  ],
  "analyzedAt": "2024-01-15T10:30:00Z"
}
```

#### Optimization Types

| Type | Description |
|------|-------------|
| `filter-before-map` | Reorder filter before map to reduce data volume |
| `transform-fusion` | Combine multiple transforms into one |
| `dead-task` | Remove tasks whose output is unused |
| `parallel-promotion` | Enable parallel execution where safe |

#### Safety Levels

| Level | Description |
|-------|-------------|
| `Safe` | Can be applied automatically |
| `RequiresReview` | May change behavior - review recommended |
| `Unsafe` | May break existing behavior - requires force flag |

### Test Optimization

```http
POST /api/v1/workflows/{workflowName}/optimizations/{optimizationId}/test
```

Test an optimization by replaying historical executions.

**Request:**
```json
{
  "replayCount": 100,
  "ignoreFields": ["timestamp", "requestId"],
  "dryRun": true
}
```

**Response:**
```json
{
  "optimizationId": "opt-1-filter-before-map-task-3",
  "confidenceScore": 0.98,
  "totalReplays": 100,
  "matchingOutputs": 98,
  "averageTimeDeltaMs": -45.5,
  "mismatches": [
    {
      "executionId": "exec-123",
      "taskRef": "task-3",
      "reason": "Output field 'metadata.processingTime' differs (expected: 120, got: 75)"
    }
  ]
}
```

### Apply Optimization

```http
POST /api/v1/workflows/{workflowName}/optimizations/{optimizationId}/apply
```

Apply an optimization to create an optimized workflow.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `force` | bool | `false` | Force apply unsafe optimizations |

**Response:**
```json
{
  "optimizationId": "opt-1-filter-before-map-task-3",
  "applied": true,
  "optimizedWorkflow": {
    "description": "Data pipeline (optimized: filter-before-map)",
    "tasks": [...]
  }
}
```

**Blocked Response (400):**
```json
{
  "error": "Cannot apply unsafe optimization without force flag",
  "safetyLevel": "Unsafe",
  "hint": "Use ?force=true to apply anyway (not recommended)"
}
```

---

## Webhooks & Triggers

Receive external webhook callbacks to trigger workflows.

### Receive Webhook

```http
POST /api/v1/webhooks/{*path}
```

Receives a webhook callback and triggers the matching workflow.

**Request:**
Any JSON payload from the webhook source.

**Headers:**
| Header | Description |
|--------|-------------|
| `X-Webhook-Signature` | HMAC signature for validation (if secretRef configured) |

**Success Response:**
```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "workflowName": "github-webhook-handler",
  "success": true
}
```

**Error Responses:**

*Workflow not found (404):*
```json
{
  "error": "NotFound",
  "message": "No workflow registered for webhook path: /github/push"
}
```

*Invalid signature (401):*
```json
{
  "error": "Unauthorized",
  "message": "Invalid signature"
}
```

#### Configuring Webhook Triggers

In your workflow definition:

```yaml
apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: github-webhook-handler
spec:
  triggers:
    - type: webhook
      enabled: true
      path: /github/push
      secretRef: github-webhook-secret
      inputMapping:
        repository: "$.payload.repository.full_name"
        branch: "$.payload.ref"
        commit: "$.payload.head_commit.id"
  tasks:
    - id: process-push
      taskRef: handle-github-push
      input:
        repo: "$.input.repository"
        branch: "$.input.branch"
```

#### HMAC Signature Validation

When `secretRef` is configured, the webhook validates the `X-Webhook-Signature` header using HMAC-SHA256:

```
Signature = HMAC-SHA256(request_body, secret)
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "ErrorCode",
  "message": "Human-readable error message"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication failed |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Dependency down |

---

## Rate Limiting

The API implements rate limiting to protect against abuse:

| Tier | Requests/min | Burst |
|------|--------------|-------|
| Standard | 100 | 20 |
| Execute | 30 | 5 |
| Bulk | 10 | 2 |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

## Authentication

Authentication is handled via Kubernetes service accounts or API keys depending on deployment mode.

### In-Cluster (Service Account)
```yaml
Authorization: Bearer <service-account-token>
```

### External (API Key)
```yaml
X-API-Key: <api-key>
```
