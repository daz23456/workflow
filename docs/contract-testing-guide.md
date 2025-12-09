# Contract Testing & Verification Guide

A complete PACT-style contract testing system with zero external infrastructure requirements.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [API Reference](#api-reference)
4. [Developer Guide](#developer-guide)
5. [CI/CD Integration](#cicd-integration)
6. [Internal Architecture](#internal-architecture)

---

## Overview

### What Problem Does This Solve?

In a microservices/workflow architecture, services evolve independently. Without contract testing:

- **Breaking changes go undetected** until runtime failures
- **API drift** between consumers and providers accumulates
- **Deployment fear** slows down releases
- **Integration testing** becomes expensive and brittle

### Our Solution: Zero-Broker Contract Testing

This system provides three complementary capabilities:

| Capability | Purpose | PACT Equivalent |
|------------|---------|-----------------|
| **Field Usage Tracking** | Know which fields are actually used | Consumer contracts |
| **Provider State Testing** | Verify task behavior matches expectations | Provider verification |
| **Deployment Matrix** | Gate releases by environment progression | Can-I-Deploy |
| **Golden File Testing** | Record/replay for regression detection | N/A (bonus feature) |

**Key Advantage**: No broker infrastructure needed. Everything runs in-cluster.

---

## Core Concepts

### 1. Consumer Contracts (Automatic)

Unlike PACT where consumers manually declare contracts, our system **automatically derives contracts** from workflow definitions:

```yaml
# Workflow definition
apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: send-welcome-email
spec:
  tasks:
    - name: get-user
      type: http
      config:
        url: "http://user-service/users/$.input.userId"
    - name: send-email
      type: http
      dependsOn: [get-user]
      config:
        body:
          to: "$.task.get-user.output.email"      # ← Contract: requires 'email' field
          name: "$.task.get-user.output.name"     # ← Contract: requires 'name' field
```

The system parses `$.task.{taskName}.output.{field}` references to build consumer contracts.

### 2. Provider State Testing

Define expected behavior for tasks under specific conditions:

```json
{
  "taskName": "get-user",
  "scenarioName": "user-exists",
  "providerState": "User 123 exists in database",
  "expectedStatusCode": 200,
  "sampleInput": { "userId": "123" },
  "expectedResponseSchema": {
    "type": "object",
    "required": ["id", "email", "name"],
    "properties": {
      "id": { "type": "string" },
      "email": { "type": "string", "format": "email" },
      "name": { "type": "string" }
    }
  },
  "errorScenarios": [
    {
      "statusCode": 404,
      "errorCode": "USER_NOT_FOUND",
      "description": "User does not exist"
    },
    {
      "statusCode": 400,
      "errorCode": "INVALID_USER_ID",
      "description": "User ID format is invalid"
    }
  ]
}
```

### 3. Deployment Matrix

Track which versions are deployed where:

```
Task: get-user
┌─────────────┬─────────────┬─────────────┐
│ Environment │   Version   │  Deployed   │
├─────────────┼─────────────┼─────────────┤
│ dev         │ 2.3.0       │ 2024-01-15  │
│ staging     │ 2.2.0       │ 2024-01-10  │
│ production  │ 2.1.0       │ 2024-01-05  │
└─────────────┴─────────────┴─────────────┘
```

Enforce progression: `dev → staging → production`

### 4. Golden File Testing

Record actual interactions for regression testing:

```json
{
  "taskName": "get-user",
  "interactionId": "abc-123",
  "requestBody": "{\"userId\": \"123\"}",
  "responseBody": "{\"id\": \"123\", \"email\": \"alice@example.com\", \"name\": \"Alice\"}",
  "statusCode": 200,
  "environment": "staging",
  "recordedAt": "2024-01-15T10:30:00Z"
}
```

---

## API Reference

### Field Usage Endpoints

#### Get Field Usage for a Task

```http
GET /api/v1/tasks/{taskName}/field-usage
```

**Response:**
```json
{
  "taskName": "get-user",
  "fields": [
    {
      "fieldName": "email",
      "fieldType": "Output",
      "usedByWorkflows": ["send-welcome-email", "notify-user", "audit-log"],
      "usageCount": 3,
      "isUnused": false
    },
    {
      "fieldName": "address",
      "fieldType": "Output",
      "usedByWorkflows": [],
      "usageCount": 0,
      "isUnused": true
    }
  ]
}
```

#### Get Field Impact Analysis

```http
GET /api/v1/tasks/{taskName}/field-impact?field={fieldName}&type={input|output}
```

**Response:**
```json
{
  "taskName": "get-user",
  "fieldName": "email",
  "fieldType": "Output",
  "isRemovalSafe": false,
  "affectedWorkflows": ["send-welcome-email", "notify-user"]
}
```

#### Analyze Workflow Usage

```http
POST /api/v1/workflows/{workflowName}/analyze-usage
```

**Response:**
```json
{
  "workflowName": "send-welcome-email",
  "taskUsages": [
    {
      "taskName": "get-user",
      "usedInputFields": ["userId"],
      "usedOutputFields": ["email", "name"]
    }
  ]
}
```

### Contract Verification Endpoints

#### Verify a Contract Scenario

```http
POST /api/v1/contracts/verify?taskName={taskName}&scenarioName={scenarioName}
```

**Response:**
```json
{
  "scenarioName": "user-exists",
  "isVerified": true,
  "errors": [],
  "verifiedAt": "2024-01-15T10:30:00Z"
}
```

**Failed Verification:**
```json
{
  "scenarioName": "user-exists",
  "isVerified": false,
  "errors": [
    "Expected status code 200 but got 500",
    "Response missing required field: email"
  ],
  "verifiedAt": "2024-01-15T10:30:00Z"
}
```

#### Record an Interaction

```http
POST /api/v1/contracts/record
```

**Request:**
```json
{
  "taskName": "get-user",
  "requestBody": "{\"userId\": \"123\"}",
  "responseBody": "{\"id\": \"123\", \"email\": \"alice@example.com\"}",
  "statusCode": 200,
  "environment": "staging",
  "headers": {
    "Content-Type": "application/json",
    "X-Request-Id": "req-456"
  }
}
```

**Response:**
```json
{
  "interactionId": "abc-123-def-456",
  "success": true
}
```

### Deployment Matrix Endpoints

#### Check Can-Deploy

```http
GET /api/v1/contracts/can-deploy?taskName={taskName}&version={version}&targetEnv={env}&requiredPriorEnv={priorEnv}
```

**Successful Response:**
```json
{
  "taskName": "get-user",
  "version": "2.2.0",
  "targetEnvironment": "production",
  "canDeploy": true,
  "reason": ""
}
```

**Blocked Response:**
```json
{
  "taskName": "get-user",
  "version": "2.3.0",
  "targetEnvironment": "production",
  "canDeploy": false,
  "reason": "Version 2.3.0 not found in staging environment. Current staging version: 2.2.0"
}
```

#### Get Deployment Matrix

```http
GET /api/v1/contracts/deployments/{taskName}
```

**Response:**
```json
{
  "taskName": "get-user",
  "deployments": [
    {
      "environment": "dev",
      "version": "2.3.0",
      "deployedAt": "2024-01-15T08:00:00Z",
      "isHealthy": true
    },
    {
      "environment": "staging",
      "version": "2.2.0",
      "deployedAt": "2024-01-10T14:30:00Z",
      "isHealthy": true
    },
    {
      "environment": "production",
      "version": "2.1.0",
      "deployedAt": "2024-01-05T09:00:00Z",
      "isHealthy": true
    }
  ]
}
```

#### Record a Deployment

```http
POST /api/v1/contracts/deployments/{taskName}?version={version}&environment={env}
```

**Response:**
```json
{
  "success": true,
  "taskName": "get-user",
  "version": "2.3.0",
  "environment": "staging"
}
```

---

## Developer Guide

### For Workflow Developers

#### 1. Check Before Modifying Tasks

Before changing a task's input/output schema, check what depends on it:

```bash
# See all field usage
curl "http://gateway/api/v1/tasks/get-user/field-usage"

# Check specific field impact
curl "http://gateway/api/v1/tasks/get-user/field-impact?field=email&type=output"
```

#### 2. Register Your Workflow's Usage

After deploying a new workflow, register its field usage:

```bash
curl -X POST "http://gateway/api/v1/workflows/my-new-workflow/analyze-usage"
```

This enables the system to warn others when they might break your workflow.

#### 3. Safe Field Removal Process

```bash
# Step 1: Check if field is unused
curl "http://gateway/api/v1/tasks/get-user/field-impact?field=legacyField&type=output"
# Response: { "isRemovalSafe": true, "affectedWorkflows": [] }

# Step 2: If safe, remove the field from your task

# Step 3: If NOT safe, coordinate with affected workflow owners first
```

### For Task/Service Developers

#### 1. Define Test Scenarios

Create scenarios that define expected behavior:

```bash
# Register a scenario via API or during service startup
curl -X POST "http://gateway/api/v1/contracts/scenarios" \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "payment-service",
    "scenarioName": "successful-charge",
    "providerState": "Customer has valid payment method",
    "expectedStatusCode": 200,
    "sampleInput": { "customerId": "cust-123", "amount": 100 },
    "errorScenarios": [
      { "statusCode": 402, "errorCode": "PAYMENT_FAILED", "description": "Payment declined" },
      { "statusCode": 404, "errorCode": "CUSTOMER_NOT_FOUND", "description": "Customer not found" }
    ]
  }'
```

#### 2. Verify Before Release

```bash
# Verify all scenarios pass
curl -X POST "http://gateway/api/v1/contracts/verify?taskName=payment-service&scenarioName=all"
```

#### 3. Record Golden Files During Testing

Capture real interactions during integration tests:

```bash
# In your test, after calling the service:
curl -X POST "http://gateway/api/v1/contracts/record" \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "payment-service",
    "requestBody": "{\"customerId\": \"cust-123\", \"amount\": 100}",
    "responseBody": "{\"transactionId\": \"tx-456\", \"status\": \"success\"}",
    "statusCode": 200,
    "environment": "staging"
  }'
```

### For Custom Resource Definitions (CRDs)

When deploying tasks as Kubernetes CRDs:

```yaml
apiVersion: workflow.io/v1
kind: Task
metadata:
  name: get-user
  labels:
    version: "2.3.0"
spec:
  type: http
  config:
    url: "http://user-service/users/{userId}"
    method: GET
  inputSchema:
    type: object
    required: [userId]
    properties:
      userId:
        type: string
  outputSchema:
    type: object
    required: [id, email, name]
    properties:
      id:
        type: string
      email:
        type: string
        format: email
      name:
        type: string
      # Adding new optional field is SAFE
      avatar:
        type: string
        format: uri
```

**Safe Changes:**
- Adding optional output fields
- Making required output fields optional (if no consumers require them)
- Adding optional input fields with defaults

**Breaking Changes (will be detected):**
- Removing output fields that consumers use
- Renaming fields
- Changing field types
- Making optional inputs required

---

## CI/CD Integration

### GitLab CI Example

```yaml
stages:
  - test
  - verify-contracts
  - deploy

# Run contract verification before deployment
verify-contracts:
  stage: verify-contracts
  script:
    # Check field usage impact for any changed tasks
    - |
      for task in $(git diff --name-only HEAD~1 | grep 'tasks/' | xargs -I {} basename {} .yaml); do
        echo "Checking contract impact for: $task"
        RESULT=$(curl -s "http://gateway/api/v1/tasks/$task/field-usage")
        echo "$RESULT" | jq '.fields[] | select(.usageCount > 0)'
      done

    # Verify all scenarios pass
    - |
      curl -X POST "http://gateway/api/v1/contracts/verify?taskName=${TASK_NAME}&scenarioName=all" \
        | jq -e '.isVerified == true' || exit 1

deploy-staging:
  stage: deploy
  script:
    # Record the deployment
    - |
      curl -X POST "http://gateway/api/v1/contracts/deployments/${TASK_NAME}?version=${VERSION}&environment=staging"
    # Deploy to staging
    - kubectl apply -f deploy/staging/

deploy-production:
  stage: deploy
  needs: [deploy-staging]
  script:
    # Check can-deploy gate
    - |
      RESULT=$(curl -s "http://gateway/api/v1/contracts/can-deploy?taskName=${TASK_NAME}&version=${VERSION}&targetEnv=production&requiredPriorEnv=staging")
      echo "$RESULT"
      echo "$RESULT" | jq -e '.canDeploy == true' || {
        echo "Deployment blocked: $(echo $RESULT | jq -r '.reason')"
        exit 1
      }
    # Record the deployment
    - |
      curl -X POST "http://gateway/api/v1/contracts/deployments/${TASK_NAME}?version=${VERSION}&environment=production"
    # Deploy to production
    - kubectl apply -f deploy/production/
```

### GitHub Actions Example

```yaml
name: Deploy with Contract Verification

on:
  push:
    branches: [main]

jobs:
  verify-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check Field Usage Impact
        run: |
          IMPACT=$(curl -s "${{ secrets.GATEWAY_URL }}/api/v1/tasks/${{ env.TASK_NAME }}/field-impact?field=email&type=output")
          if echo "$IMPACT" | jq -e '.isRemovalSafe == false'; then
            echo "::error::Breaking change detected!"
            echo "$IMPACT" | jq '.affectedWorkflows'
            exit 1
          fi

      - name: Verify Contracts
        run: |
          curl -X POST "${{ secrets.GATEWAY_URL }}/api/v1/contracts/verify?taskName=${{ env.TASK_NAME }}&scenarioName=all" \
            | jq -e '.isVerified == true'

      - name: Can-I-Deploy Check
        run: |
          curl -s "${{ secrets.GATEWAY_URL }}/api/v1/contracts/can-deploy?taskName=${{ env.TASK_NAME }}&version=${{ env.VERSION }}&targetEnv=production&requiredPriorEnv=staging" \
            | jq -e '.canDeploy == true'

      - name: Deploy
        run: |
          kubectl apply -f deploy/
          curl -X POST "${{ secrets.GATEWAY_URL }}/api/v1/contracts/deployments/${{ env.TASK_NAME }}?version=${{ env.VERSION }}&environment=production"
```

### CLI Integration

Using the workflow CLI:

```bash
# Check changes before commit
workflow check-changes --task get-user --removed-fields legacyField

# Output:
# ✓ Field 'legacyField' is safe to remove (0 consumers)

workflow check-changes --task get-user --removed-fields email

# Output:
# ✗ BLOCKED: Field 'email' is used by 3 workflows:
#   - send-welcome-email
#   - notify-user
#   - audit-log
```

---

## Internal Architecture

### How the Platform Uses This System

#### 1. Workflow Deployment Hook

When a workflow CRD is deployed, the operator automatically:

```
Workflow Applied → Admission Webhook → Analyze Field Usage → Register Contracts
```

```csharp
// In WorkflowOperator
public async Task OnWorkflowCreated(Workflow workflow)
{
    // Analyze which task fields this workflow uses
    var usages = _fieldUsageAnalyzer.AnalyzeWorkflow(workflow);

    // Register consumer contracts
    foreach (var usage in usages)
    {
        _fieldUsageAnalyzer.RegisterUsage(usage);
    }
}
```

#### 2. Task Update Validation

When a task CRD is updated:

```
Task Update → Admission Webhook → Check Breaking Changes → Allow/Deny
```

```csharp
// In TaskAdmissionWebhook
public ValidationResult ValidateTaskUpdate(Task oldTask, Task newTask)
{
    var removedFields = GetRemovedFields(oldTask, newTask);

    foreach (var field in removedFields)
    {
        var impact = _fieldUsageAnalyzer.GetFieldUsageInfo(
            newTask.Name, field, FieldType.Output);

        if (impact.UsageCount > 0)
        {
            return ValidationResult.Denied(
                $"Cannot remove field '{field}' - used by: {string.Join(", ", impact.UsedByWorkflows)}");
        }
    }

    return ValidationResult.Allowed();
}
```

#### 3. Health Dashboard Integration

The UI dashboard shows contract health:

```
┌─────────────────────────────────────────────────────────────┐
│ Contract Health                                              │
├─────────────────────────────────────────────────────────────┤
│ ✓ get-user          3 consumers    All verified             │
│ ✓ payment-service   5 consumers    All verified             │
│ ⚠ inventory-check   2 consumers    1 scenario failing       │
│ ✗ legacy-api        0 consumers    Not verified             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Workflow   │────▶│ Field Usage      │────▶│ Consumer        │
│   Deployment │     │ Analyzer         │     │ Contracts       │
└──────────────┘     └──────────────────┘     └─────────────────┘
                                                      │
┌──────────────┐     ┌──────────────────┐             ▼
│   Task       │────▶│ Contract         │◀────┬──────────────────┐
│   Update     │     │ Validator        │     │ Breaking Change  │
└──────────────┘     └──────────────────┘     │ Detection        │
                                               └──────────────────┘
                                                      │
┌──────────────┐     ┌──────────────────┐             ▼
│   CI/CD      │────▶│ Deployment       │     ┌──────────────────┐
│   Pipeline   │     │ Matrix           │────▶│ Can-I-Deploy     │
└──────────────┘     └──────────────────┘     │ Gate             │
                                               └──────────────────┘
```

---

## Best Practices

### 1. Register Workflows on Deployment

Always analyze and register workflow field usage after deployment:

```bash
# Add to your deployment script
kubectl apply -f workflow.yaml
curl -X POST "http://gateway/api/v1/workflows/${WORKFLOW_NAME}/analyze-usage"
```

### 2. Check Impact Before Task Changes

Never remove or rename fields without checking impact first:

```bash
# Make this a pre-commit hook
workflow check-changes --task $TASK_NAME --diff HEAD~1
```

### 3. Use Deployment Gates

Configure environment progression:

- `dev` → No gates (deploy freely)
- `staging` → Must be in `dev` first
- `production` → Must be in `staging` first AND all contracts verified

### 4. Record Golden Files in Staging

Capture real interactions in staging for regression testing:

```bash
# Run integration tests with recording enabled
RECORD_INTERACTIONS=true pytest tests/integration/
```

### 5. Verify Contracts in CI

Add contract verification to your CI pipeline as a blocking gate:

```yaml
contract-verification:
  script:
    - curl -X POST ".../contracts/verify?taskName=${TASK}&scenarioName=all"
  allow_failure: false  # Block deployment if contracts fail
```

---

## Troubleshooting

### "Field not found" errors

1. Check if the workflow was analyzed: `GET /api/v1/tasks/{task}/field-usage`
2. Re-analyze the workflow: `POST /api/v1/workflows/{workflow}/analyze-usage`

### "Cannot deploy" errors

1. Check deployment matrix: `GET /api/v1/contracts/deployments/{task}`
2. Ensure version is deployed to prior environment first
3. Record the deployment if missing: `POST /api/v1/contracts/deployments/{task}?version=X&environment=Y`

### Contract verification failures

1. Check scenario definition matches current task behavior
2. Update scenarios if task behavior intentionally changed
3. Verify provider state is correctly set up in test environment

---

## Migration from PACT

If you're currently using PACT:

| PACT Concept | This System | Migration |
|--------------|-------------|-----------|
| Consumer test | Workflow definition | Automatic - just deploy workflows |
| Provider verification | `POST /contracts/verify` | Register scenarios, call verify |
| Pact Broker | Built-in storage | Remove broker infrastructure |
| can-i-deploy | `GET /contracts/can-deploy` | Same semantics, different API |
| Webhooks | Kubernetes webhooks | Built into operator |

**Migration steps:**

1. Deploy the workflow gateway with contract endpoints
2. Analyze all existing workflows to register field usage
3. Create scenarios from existing Pact contracts
4. Update CI/CD to use new endpoints
5. Remove Pact Broker infrastructure
