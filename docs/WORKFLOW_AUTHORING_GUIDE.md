# Workflow Authoring Guide

A practical guide to creating workflows and tasks, based on real-world learnings and common pitfalls.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Task Definitions](#task-definitions)
3. [Workflow Definitions](#workflow-definitions)
4. [API Usage](#api-usage)
5. [Common Pitfalls](#common-pitfalls)
6. [Debugging Tips](#debugging-tips)

---

## Quick Start

### Minimal Working Task

```yaml
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: task-hello
  namespace: default
spec:
  type: http
  http:
    method: GET
    url: "https://httpbin.org/get"
```

### Minimal Working Workflow

```yaml
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: hello-workflow
  namespace: default
spec:
  description: Minimal workflow example
  input: {}
  tasks:
    - id: hello
      taskRef: task-hello
      input: {}
      timeout: 10s
  output:
    result: "{{tasks.hello.output}}"
```

---

## Task Definitions

### HTTP Task Structure

```yaml
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: task-name
  namespace: default
spec:
  type: http
  http:
    method: GET | POST | PUT | DELETE
    url: "https://api.example.com/endpoint"
    headers:
      Accept: "application/json"
      Content-Type: "application/json"
    body: '{"key": "value"}'  # For POST/PUT
  inputSchema:      # Optional - validates task inputs
    type: object
    properties:
      param1:
        type: string
    required:
      - param1
  outputSchema:     # Optional - documents expected output
    type: object
    properties:
      data:
        type: object
```

### Using Templates in URLs

Templates can interpolate values into URLs:

```yaml
http:
  method: GET
  url: "https://api.example.com/users/{{input.userId}}"
```

**Supported template sources:**
- `{{input.fieldName}}` - From task input
- Direct values in the URL

### Input Schema Best Practices

**Keep it simple.** You don't need full JSON Schema verbosity:

```yaml
# GOOD - Simple and sufficient
inputSchema:
  type: object
  properties:
    city:
      type: string
      description: City name
  required:
    - city

# OVERKILL - Unnecessary verbosity
inputSchema:
  type: object
  properties:
    city:
      type: ["string", "null"]
      description: City name
      minLength: 1
      maxLength: 100
      pattern: "^[a-zA-Z\\s]+$"
  required:
    - city
  additionalProperties: false
```

---

## Workflow Definitions

### Complete Workflow Structure

```yaml
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: my-workflow
  namespace: default
spec:
  description: Human-readable description

  # Workflow-level inputs (passed when executing)
  input:
    param1:
      type: string
      required: true
      description: Description here
    param2:
      type: integer
      required: false
      description: Optional parameter

  # Task definitions
  tasks:
    - id: step-1
      taskRef: task-name
      input:
        key: "{{input.param1}}"
      timeout: 10s

    - id: step-2
      taskRef: another-task
      dependsOn:
        - step-1
      input:
        data: "{{tasks.step-1.output}}"
      timeout: 15s

  # Workflow output (what gets returned)
  output:
    result1: "{{tasks.step-1.output}}"
    result2: "{{tasks.step-2.output}}"
```

### Task Dependencies

Tasks execute in parallel by default. Use `dependsOn` to create sequential execution:

```yaml
tasks:
  # Stage 1: Runs immediately
  - id: fetch-data
    taskRef: task-fetch
    input: {}
    timeout: 10s

  # Stage 2: Runs after fetch-data completes
  - id: process-a
    taskRef: task-process
    dependsOn:
      - fetch-data
    input:
      data: "{{tasks.fetch-data.output}}"
    timeout: 10s

  # Stage 2: Also runs after fetch-data (PARALLEL with process-a)
  - id: process-b
    taskRef: task-process
    dependsOn:
      - fetch-data
    input:
      data: "{{tasks.fetch-data.output}}"
    timeout: 10s

  # Stage 3: Runs after BOTH process-a and process-b complete
  - id: combine
    taskRef: task-combine
    dependsOn:
      - process-a
      - process-b
    input: {}
    timeout: 10s
```

### Parallel Execution Pattern

```
         ┌─────────────┐
         │ fetch-data  │  Stage 1
         └──────┬──────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌─────────────┐ ┌─────────────┐
│  process-a  │ │  process-b  │  Stage 2 (parallel)
└──────┬──────┘ └──────┬──────┘
        │               │
        └───────┬───────┘
                ▼
         ┌─────────────┐
         │   combine   │  Stage 3
         └─────────────┘
```

---

## API Usage

### Executing a Workflow

**CRITICAL: Input must be nested under `input` property**

```bash
# CORRECT
curl -X POST http://localhost:5001/api/v1/workflows/my-workflow/execute \
  -H "Content-Type: application/json" \
  -d '{"input": {"city": "London"}}'

# WRONG - Will fail with "Required properties not present"
curl -X POST http://localhost:5001/api/v1/workflows/my-workflow/execute \
  -H "Content-Type: application/json" \
  -d '{"city": "London"}'
```

### Dry-Run Testing

Test validation without execution:

```bash
curl -X POST http://localhost:5001/api/v1/workflows/my-workflow/test \
  -H "Content-Type: application/json" \
  -d '{"input": {"city": "London"}}'
```

### Test-Execute (Without Deploying)

Test a workflow YAML without applying to Kubernetes:

```bash
curl -X POST http://localhost:5001/api/v1/workflows/test-execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflowYaml": "apiVersion: workflow.example.com/v1\nkind: Workflow\n...",
    "input": {"city": "London"}
  }'
```

---

## Common Pitfalls

### 1. Forgetting to Nest Input

```bash
# WRONG
-d '{"city": "London"}'

# CORRECT
-d '{"input": {"city": "London"}}'
```

**Error:** `Required properties ["city"] are not present`

### 2. Template Syntax Errors

```yaml
# WRONG - Missing braces
input:
  city: "{input.city}"

# WRONG - Wrong reference
input:
  city: "{{inputs.city}}"  # 'inputs' not 'input'

# CORRECT
input:
  city: "{{input.city}}"
```

### 3. Nested Task Output Field Access

The template resolver **DOES support** nested field access (verified by unit tests in `TemplateResolverTests.cs`):

```yaml
# Gets entire output as JSON
output:
  weather: "{{tasks.get-weather.output}}"

# Gets specific nested field - WORKS!
output:
  city: "{{tasks.fetch-user.output.address.city}}"
  name: "{{tasks.fetch-user.output.user.name}}"
  deeplyNested: "{{tasks.fetch-user.output.user.address.city}}"
```

**If you see "Field 'X' not found" errors**, the issue is likely:
- The HTTP response structure doesn't match your expectation (inspect taskDetails.output first)
- The field name has different casing (JSON is case-sensitive)
- The response is an array at the root, not an object

### 4. Kubernetes CRD Output Format

Output must be flat key-value pairs, not nested objects:

```yaml
# WRONG - Nested objects not allowed
output:
  location:
    city: "{{input.city}}"
    country: "UK"

# CORRECT - Flat structure
output:
  locationCity: "{{input.city}}"
  locationCountry: "UK"
```

**Error:** `unknown field "spec.output.location.city"`

### 5. Task Input vs Workflow Input

```yaml
# Workflow input - defined at workflow level
spec:
  input:
    city:
      type: string
      required: true

# Task input - passes data to specific task
tasks:
  - id: get-weather
    taskRef: task-fetch-weather
    input:
      city: "{{input.city}}"  # References WORKFLOW input
```

### 6. Missing Timeout

Always specify timeouts to prevent hanging:

```yaml
tasks:
  - id: slow-task
    taskRef: task-external-api
    timeout: 30s  # ALWAYS include
```

### 7. Gateway Caching

The gateway caches workflows and refreshes every ~30 seconds. After `kubectl apply`:
- Wait 30 seconds, OR
- Restart the gateway

### 8. Circular Dependencies

```yaml
# WRONG - Will be rejected
tasks:
  - id: task-a
    dependsOn: [task-b]
  - id: task-b
    dependsOn: [task-a]
```

**Error:** `Circular dependency detected: task-a -> task-b -> task-a`

---

## Debugging Tips

### 1. Check Workflow Exists in K8s

```bash
kubectl get workflows
kubectl get workflow my-workflow -o yaml
```

### 2. Check Task Exists

```bash
kubectl get workflowtasks
kubectl get workflowtask task-name -o yaml
```

### 3. Use Dry-Run First

Always test with dry-run before executing:

```bash
curl -X POST .../workflows/my-workflow/test \
  -d '{"input": {...}}'
```

### 4. Check Execution Details

After execution, examine `taskDetails` in the response:

```json
{
  "taskDetails": [
    {
      "taskId": "get-weather",
      "success": true,
      "output": {...},
      "startedAt": "2025-11-30T19:00:00Z",
      "completedAt": "2025-11-30T19:00:01Z",
      "errors": []
    }
  ]
}
```

### 5. Examine Failed Task Errors

```bash
curl -s ... | jq '.taskDetails[] | select(.success == false)'
```

### 6. View Execution Trace

```bash
curl http://localhost:5001/api/v1/executions/{execution-id}/trace
```

---

## Working Examples

### Example 1: Weather Lookup

**Task:** `task-fetch-weather.yaml`
```yaml
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: task-fetch-weather
  namespace: default
spec:
  type: http
  http:
    method: GET
    url: "https://wttr.in/{{input.city}}?format=j1"
    headers:
      Accept: "application/json"
  inputSchema:
    type: object
    properties:
      city:
        type: string
    required:
      - city
```

**Workflow:** `workflow-weather.yaml`
```yaml
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: weather-dashboard
  namespace: default
spec:
  description: Get weather for a city
  input:
    city:
      type: string
      required: true
      description: City name (e.g., London, Paris)
  tasks:
    - id: get-weather
      taskRef: task-fetch-weather
      input:
        city: "{{input.city}}"
      timeout: 15s
  output:
    city: "{{input.city}}"
    weather: "{{tasks.get-weather.output}}"
```

**Execute:**
```bash
curl -X POST http://localhost:5001/api/v1/workflows/weather-dashboard/execute \
  -H "Content-Type: application/json" \
  -d '{"input": {"city": "Tokyo"}}'
```

### Example 2: Parallel API Fetches

**Workflow:** Fetch multiple stories in parallel
```yaml
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: hacker-news-top
  namespace: default
spec:
  description: Fetch top HN stories in parallel
  input: {}
  tasks:
    - id: get-top-stories
      taskRef: task-fetch-hn-top-stories
      input: {}
      timeout: 10s

    # These 3 run IN PARALLEL (same dependsOn)
    - id: fetch-story-1
      taskRef: task-fetch-hn-story
      dependsOn: [get-top-stories]
      input:
        storyId: "42547728"
      timeout: 10s

    - id: fetch-story-2
      taskRef: task-fetch-hn-story
      dependsOn: [get-top-stories]
      input:
        storyId: "42547283"
      timeout: 10s

    - id: fetch-story-3
      taskRef: task-fetch-hn-story
      dependsOn: [get-top-stories]
      input:
        storyId: "42546942"
      timeout: 10s

  output:
    story1: "{{tasks.fetch-story-1.output}}"
    story2: "{{tasks.fetch-story-2.output}}"
    story3: "{{tasks.fetch-story-3.output}}"
```

---

## Public APIs for Testing

These free APIs are useful for building demo workflows:

| API | URL Pattern | Use Case |
|-----|-------------|----------|
| wttr.in | `https://wttr.in/{city}?format=j1` | Weather data |
| Hacker News | `https://hacker-news.firebaseio.com/v0/item/{id}.json` | Story details |
| JSONPlaceholder | `https://jsonplaceholder.typicode.com/users/{id}` | Mock user data |
| Cat Facts | `https://catfact.ninja/fact` | Random facts |
| HTTPBin | `https://httpbin.org/get` | Echo requests |
| IP-API | `http://ip-api.com/json/` | Geolocation |

---

## Checklist: Before Deploying a Workflow

- [ ] All referenced tasks exist (`kubectl get workflowtasks`)
- [ ] Input schema matches expected request format
- [ ] All task inputs use correct template syntax (`{{input.x}}`, `{{tasks.y.output}}`)
- [ ] Output uses flat key-value structure (no nesting)
- [ ] All tasks have timeouts
- [ ] No circular dependencies
- [ ] Dry-run test passes
- [ ] API request uses `{"input": {...}}` format
