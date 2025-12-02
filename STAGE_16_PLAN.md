# Stage 16: OpenAPI Task Generator CLI

## Overview

**Scope:** Auto-generate WorkflowTask CRDs from OpenAPI/Swagger specifications
**Deliverables:** 8 substages
**Tests:** ~140 tests
**Dependencies:** Stage 6 (WorkflowTask CRD model)
**Priority:** After Stage 15
**Package:** `packages/workflow-cli` (new CLI tool)
**Value:** "Point at an API spec, get all tasks instantly" - eliminate manual task creation

**Philosophy:** Integrating with external APIs shouldn't require manual YAML writing. Import an OpenAPI spec and get production-ready WorkflowTask definitions in seconds.

---

## Stage Execution Framework Compliance

### Substage Profiles & Gates

| Substage | Profile | Gates | Rationale |
|----------|---------|-------|-----------|
| 16.1 | `FRONTEND_TS` | 1-8 | TypeScript CLI, OpenAPI parsing |
| 16.2 | `FRONTEND_TS` | 1-8 | Task generation logic |
| 16.3 | `FRONTEND_TS` | 1-8 | Sample workflow generation |
| 16.4 | `FRONTEND_TS` | 1-8 | Version management, migrations, draft versions |
| 16.5 | `FRONTEND_TS` | 1-8, 15 | CLI integration + E2E tests |
| 16.6 | `BACKEND_DOTNET` | 1-8 | CI/CD integration, environment matrix, can-i-deploy |
| 16.7 | `BACKEND_DOTNET` | 1-8 | Field-level usage tracking, consumer contracts |
| 16.8 | `BACKEND_DOTNET` | 1-8 | Contract verification, scenario testing, interaction recording |

### Execution Commands

```bash
# Stage 16.1: OpenAPI Parser
./scripts/init-stage.sh --stage 16.1 --name "OpenAPI Parser" --profile FRONTEND_TS
./scripts/run-quality-gates.sh --stage 16.1 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 16.1 --name "OpenAPI Parser"

# Stage 16.2: Task Generator
./scripts/init-stage.sh --stage 16.2 --name "Task Generator" --profile FRONTEND_TS
./scripts/run-quality-gates.sh --stage 16.2 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 16.2 --name "Task Generator"

# Stage 16.3: Sample Workflow Generator
./scripts/init-stage.sh --stage 16.3 --name "Sample Workflow Generator" --profile FRONTEND_TS
./scripts/run-quality-gates.sh --stage 16.3 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 16.3 --name "Sample Workflow Generator"

# Stage 16.4: Version Management & Migrations
./scripts/init-stage.sh --stage 16.4 --name "Version Management" --profile FRONTEND_TS
./scripts/run-quality-gates.sh --stage 16.4 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 16.4 --name "Version Management"

# Stage 16.5: CLI Integration
./scripts/init-stage.sh --stage 16.5 --name "CLI Integration" --profile FRONTEND_TS
./scripts/run-quality-gates.sh --stage 16.5 1 2 3 4 5 6 7 8 15
./scripts/complete-stage.sh --stage 16.5 --name "CLI Integration"

# Stage 16.6: CI/CD & Impact Notifications
./scripts/init-stage.sh --stage 16.6 --name "CI/CD Integration" --profile BACKEND_DOTNET
./scripts/run-quality-gates.sh --stage 16.6 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 16.6 --name "CI/CD Integration"

# Stage 16.7: Field-Level Usage Tracking
./scripts/init-stage.sh --stage 16.7 --name "Field Usage Tracking" --profile BACKEND_DOTNET
./scripts/run-quality-gates.sh --stage 16.7 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 16.7 --name "Field Usage Tracking"

# Stage 16.8: Contract Verification
./scripts/init-stage.sh --stage 16.8 --name "Contract Verification" --profile BACKEND_DOTNET
./scripts/run-quality-gates.sh --stage 16.8 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 16.8 --name "Contract Verification"
```

### Dependencies & Integration

**Dependencies Satisfied (from prior stages):**
- Stage 6: WorkflowTask CRD model structure
- Stage 15.1: Workflow metadata model (categories, tags)

**Enables Future Stages:**
- Stage 17+: API marketplace integration
- Stage 17+: Automatic API version migration

---

## Design Decisions (from user discussion)

| Decision | Choice |
|----------|--------|
| Interface | CLI tool (`workflow-cli import openapi`) |
| Naming (no operationId) | method-path (e.g., `get-users-userid`) |
| Base URL | User provides as CLI parameter |
| Auth handling | Template variables (`{{apiKey}}`, `{{bearerToken}}`) |
| Output format | Both options: `--single-file` or `--split` (default) |
| Sample workflow | Yes, generate example workflow |

---

## CLI Interface

```bash
# Basic usage
workflow-cli import openapi swagger.json --base-url https://api.stripe.com

# With options
workflow-cli import openapi openapi.yaml \
  --base-url https://api.example.com \
  --prefix stripe \
  --output ./generated-tasks \
  --single-file \
  --include-sample-workflow

# From URL
workflow-cli import openapi https://api.example.com/openapi.json \
  --base-url https://api.example.com
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--base-url` | Base URL for all endpoints (required) | - |
| `--prefix` | Prefix for task names | (none) |
| `--output` | Output directory | `./tasks` |
| `--single-file` | Output all tasks to one file | `false` (split) |
| `--include-sample-workflow` | Generate sample workflow | `true` |
| `--dry-run` | Preview without writing files | `false` |
| `--format` | Output format: `yaml` or `json` | `yaml` |
| `--check-existing` | Compare with existing tasks, version if changed | `true` |
| `--existing-dir` | Directory of existing tasks to compare | `./tasks` |

---

## Version Management & Backward Compatibility

### Hash-Based Change Detection

When regenerating tasks from an updated OpenAPI spec:

1. **Compute hash** of new task definition (excluding metadata like timestamps)
2. **Compare** with hash of existing task (stored in label `workflow.io/content-hash`)
3. **If unchanged** → Skip (no regeneration needed)
4. **If changed** → Auto-version and suggest migration

### Auto-Versioning

```yaml
# Original task
metadata:
  name: get-user
  labels:
    workflow.io/content-hash: "abc123..."
    workflow.io/version: "1"

# After API change detected
metadata:
  name: get-user-v2
  labels:
    workflow.io/content-hash: "def456..."
    workflow.io/version: "2"
    workflow.io/replaces: "get-user"
```

### Backward Compatibility Analysis

When a breaking change is detected, analyze and suggest transformations:

| Change Type | Detection | Suggested Transform |
|-------------|-----------|---------------------|
| Field renamed | `userId` → `user_id` | `map: { user_id: "{{userId}}" }` |
| Field removed | `email` removed from output | Warn: workflows using this field will break |
| Field added (required) | New required `apiVersion` | Provide default or prompt user |
| Type changed | `id: number` → `id: string` | `map: { id: "{{toString(id)}}" }` |
| Endpoint removed | `DELETE /user` gone | Warn: task orphaned, mark deprecated |

### CLI Output with Versioning

```
$ workflow-cli import openapi petstore-v2.json --base-url https://petstore.io

🔍 Parsing OpenAPI spec: petstore-v2.json
📊 Comparing with existing tasks in ./tasks/

📝 Generating WorkflowTasks...
   ✓ get-pet (unchanged, skipped)
   ⚠️ create-pet → create-pet-v2 (BREAKING CHANGE)
      - Field renamed: petName → name
      - Suggested transform: map: { name: "{{petName}}" }
   ✓ update-pet (unchanged, skipped)
   ⚠️ delete-pet (REMOVED from API - marking deprecated)

📦 Writing files to ./tasks/
   ✓ tasks/create-pet-v2.yaml
   ✓ migrations/create-pet-v1-to-v2.yaml

⚠️ 1 breaking change detected. Review migrations/create-pet-v1-to-v2.yaml
✅ Generated 1 new task, 1 migration, skipped 2 unchanged
```

### Migration File Example

```yaml
# migrations/create-pet-v1-to-v2.yaml
apiVersion: workflow.io/v1
kind: TaskMigration
metadata:
  name: create-pet-v1-to-v2
spec:
  from: create-pet
  to: create-pet-v2

  inputTransform:
    # Old field → New field mapping
    name: "{{petName}}"
    # New required field with default
    apiVersion: "2.0"

  outputTransform:
    # Restore old field names for backward compat
    petName: "{{name}}"

  breakingChanges:
    - field: petName
      change: renamed
      newName: name
      severity: breaking
```

---

## Permission Enforcement

### Interactive Permission Configuration

During import, the CLI prompts for permission requirements:

```
$ workflow-cli import openapi stripe.json --base-url https://api.stripe.com

🔍 Parsing OpenAPI spec: stripe.json
🔐 Detected security schemes: bearerAuth, apiKey

The following endpoints have security requirements:

  POST /v1/charges (bearerAuth)
  POST /v1/customers (bearerAuth)
  GET /v1/balance (bearerAuth)
  DELETE /v1/customers/{id} (bearerAuth)

? Do you want to enforce permission checks? (Y/n) Y

? Select permission model:
  ❯ Role-based (user must have specific role)
    Scope-based (OAuth scopes)
    Custom (define your own check task)

? Map endpoints to required permissions:
  POST /v1/charges     → [charges:write]
  POST /v1/customers   → [customers:write]
  GET /v1/balance      → [balance:read]
  DELETE /v1/customers → [customers:delete, admin]

✅ Permission configuration saved to ./permissions/stripe-permissions.yaml
```

### Permission Configuration File

```yaml
# permissions/stripe-permissions.yaml
apiVersion: workflow.io/v1
kind: PermissionConfig
metadata:
  name: stripe-permissions
spec:
  model: role-based  # or scope-based, custom

  checkTask: check-user-permissions  # Task to run for permission check

  mappings:
    - task: create-charge
      requires:
        - charges:write

    - task: create-customer
      requires:
        - customers:write

    - task: delete-customer
      requires:
        anyOf:
          - customers:delete
          - admin

    - task: get-balance
      requires:
        - balance:read
```

### Generated Permission Check Task

```yaml
# tasks/check-user-permissions.yaml
apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: check-user-permissions
  labels:
    workflow.io/permission-check: "true"
spec:
  type: http
  description: "Verify user has required permissions"
  http:
    method: POST
    url: "{{permissionsServiceUrl}}/check"
    headers:
      Authorization: "Bearer {{userToken}}"
    body: |
      {
        "userId": "{{userId}}",
        "requiredPermissions": {{requiredPermissions}}
      }
  input:
    userId:
      type: string
      required: true
    userToken:
      type: string
      required: true
    requiredPermissions:
      type: array
      items:
        type: string
      required: true
  output:
    type: object
    properties:
      granted:
        type: boolean
      missingPermissions:
        type: array
        items:
          type: string
```

### Enforced Task Dependencies

Tasks requiring permissions automatically get:

```yaml
# tasks/create-charge.yaml
apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: create-charge
  labels:
    workflow.io/requires-permissions: "charges:write"
spec:
  # ... task definition ...

  # Auto-added by generator:
  permissions:
    requires:
      - charges:write
    checkTask: check-user-permissions
```

### Workflow Validation

When a workflow uses permission-protected tasks, the validator ensures:

1. **Permission check task exists** in the workflow
2. **Dependency is declared** - protected task depends on permission check
3. **Permissions are passed** - required permissions flow to check task

```yaml
# Example: Valid workflow with permissions
apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: charge-customer
spec:
  input:
    userId:
      type: string
      required: true
    userToken:
      type: string
      required: true
    amount:
      type: number
      required: true

  tasks:
    - name: check-permissions
      taskRef: check-user-permissions
      input:
        userId: "{{workflow.input.userId}}"
        userToken: "{{workflow.input.userToken}}"
        requiredPermissions: ["charges:write"]

    - name: create-charge
      taskRef: create-charge
      dependsOn: [check-permissions]
      # Only runs if permissions granted
      condition: "{{tasks.check-permissions.output.granted}} == true"
      input:
        amount: "{{workflow.input.amount}}"

  output:
    chargeId: "{{tasks.create-charge.output.id}}"
```

### Validation Errors

```
$ workflow-cli validate my-workflow.yaml

❌ Validation failed:

  Task 'create-charge' requires permissions: [charges:write]

  Missing:
    - No 'check-user-permissions' task found
    - Task 'create-charge' must depend on permission check

  Suggested fix:
    Add permission check task and dependency:

    tasks:
      - name: check-permissions
        taskRef: check-user-permissions
        input:
          requiredPermissions: ["charges:write"]

      - name: create-charge
        dependsOn: [check-permissions]
        condition: "{{tasks.check-permissions.output.granted}}"
```

### CLI Options for Permissions

| Option | Description | Default |
|--------|-------------|---------|
| `--permissions` | Enable permission configuration prompt | `true` if security schemes detected |
| `--permissions-file` | Path to existing permission config | - |
| `--permission-model` | `role-based`, `scope-based`, `custom` | (prompt) |
| `--skip-permissions` | Skip permission configuration | `false` |

---

## CI/CD Pipeline Integration

### Pipeline Mode

Run the CLI in non-interactive mode for CI/CD pipelines:

```bash
# In deployment pipeline (after API deployment)
workflow-cli import openapi $API_SPEC_URL \
  --base-url $API_BASE_URL \
  --ci \
  --output ./generated-tasks \
  --check-existing \
  --fail-on-breaking
```

### CI/CD Options

| Option | Description | Default |
|--------|-------------|---------|
| `--ci` | Non-interactive mode for pipelines | `false` |
| `--fail-on-breaking` | Exit code 1 if breaking changes detected | `false` |
| `--auto-pr` | Create PR with changes (requires GitHub/GitLab token) | `false` |
| `--pr-title` | Custom PR title | `"chore: Update tasks from OpenAPI"` |
| `--pr-labels` | Labels to add to PR | `["auto-generated"]` |
| `--notify-webhook` | Webhook URL to notify on changes | - |

### GitOps Workflow Example

```yaml
# .github/workflows/sync-api-tasks.yaml
name: Sync API Tasks

on:
  # Trigger when API deploys
  repository_dispatch:
    types: [api-deployed]
  # Or on schedule
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  sync-tasks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Import OpenAPI spec
        run: |
          workflow-cli import openapi ${{ secrets.API_SPEC_URL }} \
            --base-url ${{ secrets.API_BASE_URL }} \
            --ci \
            --output ./tasks \
            --check-existing

      - name: Check for changes
        id: changes
        run: |
          if git diff --quiet ./tasks; then
            echo "changed=false" >> $GITHUB_OUTPUT
          else
            echo "changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Create PR if changed
        if: steps.changes.outputs.changed == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          title: "chore: Update tasks from OpenAPI spec"
          body: |
            Automated task update from OpenAPI specification.

            ## Changes Detected
            $(workflow-cli diff ./tasks --format markdown)

            ## Migration Required
            $(ls migrations/*.yaml 2>/dev/null || echo "None")
          branch: auto/update-api-tasks
          labels: auto-generated, api-sync
```

### Pipeline Output & Exit Codes

| Exit Code | Meaning | Pipeline Action |
|-----------|---------|-----------------|
| 0 | Success, no breaking changes | ✅ Continue |
| 1 | Breaking changes detected (new version) | ⚠️ Warn, optionally fail with `--fail-on-breaking` |
| 2 | Endpoint REMOVED with dependent workflows | ❌ BLOCK - Cannot deprecate |
| 3 | Error (invalid spec, network, etc.) | ❌ Fail |

**Scenario: Breaking change (new contract, old still works)**
```
$ workflow-cli import openapi api.json --ci --fail-on-breaking

🔍 CI Mode: Non-interactive
📊 Comparing with existing tasks...

📝 Changes detected:
   ✓ 3 tasks unchanged
   ⚠️ 1 task updated (non-breaking): get-user
   ⚠️ 1 BREAKING CHANGE: create-order → create-order-v2
      - Required field added: shippingAddress
      - Old version (v1) still available in API

📦 Files written:
   ✓ tasks/get-user.yaml (updated)
   ✓ tasks/create-order-v2.yaml (new version)
   ✓ migrations/create-order-v1-to-v2.yaml

⚠️ BREAKING CHANGES DETECTED - Review migrations/ before merging

Exit code: 1 (use --allow-breaking to pass)
```

**Scenario: Endpoint REMOVED with dependent workflows - PIPELINE BLOCKED**
```
$ workflow-cli import openapi api.json --ci

🔍 CI Mode: Non-interactive
📊 Comparing with existing tasks...

❌ CRITICAL: Endpoint REMOVED from API spec!
   GET /users/{id} - NO LONGER IN SPEC

   Existing task: get-user
   Status: Will become ORPHANED

   ⚠️ DEPENDENT WORKFLOWS FOUND:
   - user-profile-workflow (uses get-user)
   - order-summary-workflow (uses get-user)

🚫 PIPELINE BLOCKED - Cannot proceed with deprecation!

   These workflows will BREAK if this change is deployed.
   Workflows must be migrated BEFORE the API endpoint is removed.

   Required actions:
   1. Keep the API endpoint active (revert API change)
   2. OR migrate all workflows first:
      workflow-cli apply-migration get-user-v1-to-v2 --all-workflows
   3. Then re-run this pipeline after workflows are updated

Exit code: 2 (BLOCKED - dependent workflows exist)
```

**CI/CD Pipeline Integration (blocking on removal)**
```yaml
# .github/workflows/sync-api-tasks.yaml
- name: Import OpenAPI spec
  id: import
  run: |
    workflow-cli import openapi ${{ secrets.API_SPEC_URL }} \
      --base-url ${{ secrets.API_BASE_URL }} \
      --ci \
      --output ./tasks

- name: Check result
  run: |
    if [ "${{ steps.import.outputs.exit_code }}" == "2" ]; then
      echo "❌ BLOCKED: Cannot remove endpoint while workflows depend on it"
      echo "::error::Dependent workflows must be migrated first"
      exit 1
    fi
```

---

## Workflow Impact Notification

### Task Dependency Tracking

Track which workflows use which tasks:

```yaml
# Stored in task metadata (auto-populated by system)
apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: get-user-v2
  labels:
    workflow.io/version: "2"
    workflow.io/replaces: "get-user"
  annotations:
    workflow.io/used-by: "user-profile-workflow,order-summary-workflow"
    workflow.io/usage-count: "2"
```

### Impact Analysis API

```bash
# Query which workflows are affected by a task change
GET /api/v1/tasks/{name}/impact

Response:
{
  "task": "get-user",
  "newVersion": "get-user-v2",
  "affectedWorkflows": [
    {
      "name": "user-profile-workflow",
      "taskReference": "get-user",
      "status": "outdated",
      "migrationAvailable": true,
      "migrationPath": "get-user-v1-to-v2"
    },
    {
      "name": "order-summary-workflow",
      "taskReference": "get-user",
      "status": "outdated",
      "migrationAvailable": true,
      "migrationPath": "get-user-v1-to-v2"
    }
  ],
  "breakingChanges": [
    {
      "field": "email",
      "change": "renamed",
      "from": "email",
      "to": "emailAddress"
    }
  ]
}
```

### Notification Configuration

```yaml
# Notification configuration
apiVersion: workflow.io/v1
kind: TaskNotificationConfig
metadata:
  name: task-update-notifications
spec:
  # Notify when any task is updated
  onTaskUpdate:
    - type: webhook
      url: "https://slack.webhook.url/..."
      template: |
        Task `{{task.name}}` updated to v{{task.version}}.
        Affected workflows: {{affectedWorkflows | join(", ")}}
        Breaking changes: {{breakingChanges | length}}

    - type: email
      to: ["platform-team@company.com"]
      subject: "Task Update: {{task.name}}"

    - type: annotation
      # Add annotation to affected workflows
      annotationKey: "workflow.io/task-update-available"
      annotationValue: "{{task.name}}:{{task.version}}"

  # Specific task subscriptions
  subscriptions:
    - task: "stripe-*"  # Glob pattern
      notify: ["payments-team@company.com"]

    - task: "auth-*"
      notify: ["security-team@company.com"]
      onBreakingChangeOnly: true
```

### Dashboard: Outdated Workflows

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Workflow Health Dashboard                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ⚠️ Outdated Workflows (3)                                        │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│ user-profile-workflow                                            │
│   └─ Uses: get-user (v1) → get-user-v2 available                │
│   └─ Breaking: Yes (email → emailAddress)                        │
│   └─ Migration: ✅ Available                                     │
│   └─ [Apply Migration] [View Diff] [Dismiss]                    │
│                                                                  │
│ order-summary-workflow                                           │
│   └─ Uses: get-user (v1), get-order (v1)                        │
│   └─ Breaking: get-user only                                     │
│   └─ Migration: ✅ Available                                     │
│   └─ [Apply Migration] [View Diff] [Dismiss]                    │
│                                                                  │
│ payment-processor-workflow                                       │
│   └─ Uses: create-charge (v1) → create-charge-v2 available      │
│   └─ Breaking: No (additive only)                                │
│   └─ [Auto-Upgrade] [View Diff] [Dismiss]                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### CLI Commands for Impact Analysis

```bash
# Check impact of a task update
workflow-cli impact get-user-v2

📊 Impact Analysis: get-user → get-user-v2

Affected Workflows: 2
  • user-profile-workflow (BREAKING - migration required)
  • order-summary-workflow (BREAKING - migration required)

Breaking Changes:
  • Field renamed: email → emailAddress
  • Field added (required): phoneNumber

Migration Available: Yes
  migrations/get-user-v1-to-v2.yaml

Suggested Actions:
  1. Review migration: workflow-cli show-migration get-user-v1-to-v2
  2. Test migration: workflow-cli test-migration get-user-v1-to-v2 --workflow user-profile-workflow
  3. Apply migration: workflow-cli apply-migration get-user-v1-to-v2 --workflow user-profile-workflow


# Auto-upgrade non-breaking changes
workflow-cli upgrade-workflows --task get-order-v2 --auto

✅ Auto-upgraded 3 workflows to use get-order-v2 (non-breaking)
   • inventory-check-workflow
   • shipping-estimate-workflow
   • order-history-workflow
```

### Webhook Payload

When tasks are updated, send webhook with full context:

```json
{
  "event": "task.updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "task": {
    "name": "get-user-v2",
    "previousVersion": "get-user",
    "source": "openapi",
    "specUrl": "https://api.example.com/openapi.json"
  },
  "changes": {
    "breaking": true,
    "fields": [
      {"field": "email", "change": "renamed", "to": "emailAddress"},
      {"field": "phoneNumber", "change": "added", "required": true}
    ]
  },
  "impact": {
    "affectedWorkflows": ["user-profile-workflow", "order-summary-workflow"],
    "migrationAvailable": true,
    "migrationPath": "get-user-v1-to-v2"
  }
}
```

---

## Task Lifecycle Management

### Scenario 1: New Version Alongside Existing (Both API v1 & v2 exist)

When the API adds a new version but keeps the old:

```
API State: v1 ✅ working, v2 ✅ new

Result:
  • get-user (v1) → KEPT (still works, API v1 available)
  • get-user-v2 → CREATED (new contract)
  • Workflows using v1 → NOTIFIED: "v2 available, safe to upgrade"
```

**CLI Output:**
```
📝 Changes detected:
   ✓ get-user (v1) - unchanged, still valid
   ✨ get-user-v2 - NEW VERSION available
      API now supports both v1 and v2 contracts

📢 Notification:
   Workflows using get-user can optionally upgrade to get-user-v2
   - user-profile-workflow
   - order-summary-workflow

   Run: workflow-cli upgrade-workflows --task get-user-v2 --preview
```

### Scenario 2: Old Version Being Removed (API v1 deprecated/removed)

When the API removes the old version:

```
API State: v1 ❌ removed, v2 ✅ available

Result:
  • get-user (v1) → MARKED DEPRECATED (workflows must migrate!)
  • get-user-v2 → Already exists or CREATED
  • Workflows using v1 → BLOCKING WARNING: "Must migrate before removal"
```

**CLI Output:**
```
⚠️ BREAKING: Endpoint removed from API
   GET /users/{id} (v1) - NO LONGER IN SPEC

📊 Impact Analysis:
   Task: get-user (v1)
   Status: DEPRECATED - API endpoint no longer exists!

   Workflows still using this task: 2
   - user-profile-workflow ❌ WILL BREAK
   - order-summary-workflow ❌ WILL BREAK

❌ Cannot safely remove task - workflows still depend on it!

Required Actions:
  1. Migrate workflows to get-user-v2:
     workflow-cli apply-migration get-user-v1-to-v2 --all-workflows

  2. After all workflows migrated, remove deprecated task:
     workflow-cli remove-task get-user --force
```

### Task Removal Protection

Tasks can only be removed when no workflows reference them:

```bash
$ workflow-cli remove-task get-user

❌ Cannot remove task: get-user

   Active workflows using this task:
   - user-profile-workflow (line 12: taskRef: get-user)
   - order-summary-workflow (line 8: taskRef: get-user)

   Options:
   1. Migrate workflows first:
      workflow-cli apply-migration get-user-v1-to-v2 --all-workflows

   2. Force remove (DANGEROUS - will break workflows):
      workflow-cli remove-task get-user --force --i-know-this-will-break-things


$ workflow-cli remove-task get-user --after-migration

✅ All workflows migrated to get-user-v2
✅ Task get-user safely removed
✅ Migration file archived: migrations/archive/get-user-v1-to-v2.yaml
```

### Task Status Labels

```yaml
# Active task (current)
metadata:
  labels:
    workflow.io/status: "active"
    workflow.io/version: "2"

# Deprecated task (API removed, workflows still use it)
metadata:
  labels:
    workflow.io/status: "deprecated"
    workflow.io/deprecated-reason: "api-removed"
    workflow.io/successor: "get-user-v2"
  annotations:
    workflow.io/deprecation-warning: "API endpoint removed. Migrate to get-user-v2."
    workflow.io/workflows-blocking-removal: "user-profile-workflow,order-summary-workflow"

# Superseded task (new version exists, old still works)
metadata:
  labels:
    workflow.io/status: "superseded"
    workflow.io/successor: "get-user-v2"
  annotations:
    workflow.io/upgrade-available: "true"
    workflow.io/upgrade-message: "New version available with improved contract."
```

### Dashboard: Task Lifecycle View

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Task Lifecycle Dashboard                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ❌ DEPRECATED (Action Required)                                  │
│ ─────────────────────────────────────────────────────────────── │
│ get-user (v1)                                                    │
│   └─ Status: API endpoint removed!                               │
│   └─ Blocking workflows: 2                                       │
│   └─ Successor: get-user-v2                                      │
│   └─ [Migrate All] [View Affected Workflows]                    │
│                                                                  │
│ ⚠️ SUPERSEDED (Upgrade Available)                                │
│ ─────────────────────────────────────────────────────────────── │
│ create-order (v1)                                                │
│   └─ Status: Newer version available (v2)                        │
│   └─ Using workflows: 3                                          │
│   └─ [Preview Upgrade] [Auto-Upgrade Non-Breaking]              │
│                                                                  │
│ ✅ ACTIVE                                                        │
│ ─────────────────────────────────────────────────────────────── │
│ get-user-v2, create-order-v2, list-products (47 more...)        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Endpoint Filtering & Selection

### Interactive Endpoint Selection

For large APIs, users can select which endpoints to import:

```
$ workflow-cli import openapi stripe.json --base-url https://api.stripe.com

🔍 Parsing OpenAPI spec: stripe.json
   Found 147 endpoints across 12 tags

? How would you like to select endpoints?
  ❯ Import all (147 endpoints)
    Select by tag
    Select individually
    Use filter pattern

? Select tags to import: (Use space to select, enter to confirm)
  ◉ charges (12 endpoints)
  ◉ customers (18 endpoints)
  ◯ subscriptions (24 endpoints)
  ◯ invoices (31 endpoints)
  ◉ payments (8 endpoints)
  ◯ ... (7 more tags)

? Include deprecated endpoints?
  ❯ No, skip deprecated
    Yes, include with warning label

✅ Selected 38 endpoints from 3 tags
```

### CLI Options for Filtering

| Option | Description | Example |
|--------|-------------|---------|
| `--tags` | Import only these tags | `--tags charges,customers` |
| `--exclude-tags` | Exclude these tags | `--exclude-tags internal,admin` |
| `--filter` | Regex filter on paths | `--filter "^/v1/(charges\|customers)"` |
| `--include-deprecated` | Include deprecated endpoints | `--include-deprecated` |
| `--interactive` | Force interactive selection | `--interactive` |
| `--all` | Import all endpoints (skip selection) | `--all` |

---

## Tag-Based Grouping

### Directory Structure by Tag

When using `--group-by-tag`:

```
./tasks/
├── charges/
│   ├── create-charge.yaml
│   ├── get-charge.yaml
│   └── list-charges.yaml
├── customers/
│   ├── create-customer.yaml
│   ├── get-customer.yaml
│   └── delete-customer.yaml
└── payments/
    └── create-payment-intent.yaml

./workflows/
├── charges-sample-workflow.yaml
├── customers-sample-workflow.yaml
└── payments-sample-workflow.yaml
```

### Task Metadata with Tags

```yaml
apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: create-charge
  labels:
    workflow.io/tag: charges
    workflow.io/api: stripe
spec:
  categories:
    - charges
  tags:
    - stripe
    - payments
    - write-operation
```

---

## Error Response Handling

### Dual Error Response Model

Each external API has its own error format (Stripe, Twilio, custom services all differ). We preserve the **original error** AND provide a **normalized error** for consistency:

```yaml
# Error response structure
apiVersion: workflow.io/v1
kind: WorkflowErrorResponse
spec:
  # ORIGINAL - Preserve exactly as received from external API
  originalError:
    status: 400
    headers:
      Content-Type: application/json
      X-Request-Id: req_abc123
    body:
      # Stripe's actual error format
      error:
        type: card_error
        code: card_declined
        message: "Your card was declined."
        param: card_number
        decline_code: insufficient_funds

  # NORMALIZED - Uniform structure for all errors across all services
  normalizedError:
    code: "VALIDATION_ERROR"           # Standard code (see table below)
    category: "client_error"            # client_error, server_error, network_error, timeout
    severity: "error"                   # error, warning, info
    status: 400

    # Human-readable, helpful description
    title: "Payment card declined"
    description: "The customer's card was declined due to insufficient funds."

    # Actionable guidance
    suggestedAction: "Ask customer to use a different payment method or retry with sufficient funds."
    documentationUrl: "https://docs.example.com/errors/card-declined"

    # Context for debugging
    task: "create-charge"
    service: "stripe"
    timestamp: "2024-01-15T10:30:00Z"
    correlationId: "exec-abc123"

    # Field-level errors (if applicable)
    fieldErrors:
      - field: "card_number"
        message: "Card declined"
        code: "card_declined"
```

### Normalized Error Codes

| Code | Description | Typical HTTP Status |
|------|-------------|---------------------|
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `AUTHENTICATION_ERROR` | Invalid/missing credentials | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource doesn't exist | 404 |
| `CONFLICT` | Resource state conflict | 409 |
| `RATE_LIMITED` | Too many requests | 429 |
| `SERVICE_ERROR` | External service failed | 500, 502, 503 |
| `TIMEOUT` | Request timed out | 504 |
| `NETWORK_ERROR` | Connection failed | - |

### Generated Task Error Mapping

```yaml
# Generated from OpenAPI + service-specific knowledge
apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: stripe-create-charge
spec:
  # ... http config ...

  errorMapping:
    # Map service-specific errors to normalized codes
    mappings:
      - match:
          status: 400
          body.error.type: "card_error"
        normalize:
          code: "VALIDATION_ERROR"
          category: "client_error"
          titleTemplate: "Payment card error: {{originalError.body.error.code}}"
          descriptionTemplate: "{{originalError.body.error.message}}"
          suggestedAction: "Check card details or use alternative payment method"

      - match:
          status: 401
        normalize:
          code: "AUTHENTICATION_ERROR"
          category: "client_error"
          title: "Stripe authentication failed"
          suggestedAction: "Verify API key is correct and not expired"

      - match:
          status: 429
        normalize:
          code: "RATE_LIMITED"
          category: "client_error"
          title: "Stripe rate limit exceeded"
          suggestedAction: "Reduce request frequency or implement backoff"
          retryAfter: "{{originalError.headers.Retry-After}}"

      # Default fallback
      - match:
          status: "5xx"
        normalize:
          code: "SERVICE_ERROR"
          category: "server_error"
          title: "Stripe service error"
          suggestedAction: "Retry after a delay. If persistent, check Stripe status page."
```

### Workflow Error Response

```yaml
# What workflows receive on error
tasks:
  - name: charge-customer
    taskRef: stripe-create-charge
    input:
      amount: 1000
      customerId: "{{workflow.input.customerId}}"
    onError:
      - code: "VALIDATION_ERROR"      # Match on normalized code
        action: return
        output:
          success: false
          # Include BOTH error views
          error:
            normalized: "{{error.normalizedError}}"
            original: "{{error.originalError}}"
            # Helpful summary for end users
            userMessage: "{{error.normalizedError.description}}"

      - code: "RATE_LIMITED"
        action: retry
        maxRetries: 3
        backoff: exponential

      - code: "SERVICE_ERROR"
        action: retry
        maxRetries: 2
```

### CLI Output with Error Details

```bash
$ workflow-cli import openapi stripe.json --base-url https://api.stripe.com

📝 Generating error mappings...

Task: stripe-create-charge
  Error responses detected:
    400 → VALIDATION_ERROR (card_error, invalid_request_error)
    401 → AUTHENTICATION_ERROR
    402 → VALIDATION_ERROR (payment required)
    429 → RATE_LIMITED
    5xx → SERVICE_ERROR

  ✓ Generated error mapping with 5 normalized codes
  ✓ Preserved original error schemas for debugging
```

### API Response Example

When a workflow execution fails, the API returns both views:

```json
{
  "executionId": "exec-abc123",
  "status": "failed",
  "failedTask": "charge-customer",

  "error": {
    "originalError": {
      "status": 400,
      "body": {
        "error": {
          "type": "card_error",
          "code": "card_declined",
          "message": "Your card was declined.",
          "decline_code": "insufficient_funds"
        }
      }
    },

    "normalizedError": {
      "code": "VALIDATION_ERROR",
      "category": "client_error",
      "title": "Payment card declined",
      "description": "The customer's card was declined due to insufficient funds.",
      "suggestedAction": "Ask customer to use a different payment method.",
      "task": "charge-customer",
      "service": "stripe"
    }
  }
}
```

### Benefits

| Audience | Benefit |
|----------|---------|
| **Developers** | Original error for debugging, service-specific details intact |
| **Operations** | Normalized codes for alerting, dashboards, SLOs |
| **End Users** | Helpful descriptions and suggested actions |
| **Automation** | Consistent error codes for retry logic, circuit breakers |

---

## Deprecation Handling

### Interactive Deprecation Choice

```
? Include deprecated endpoints?
  ❯ No, skip deprecated (3 endpoints will be skipped)
    Yes, include with warning label
```

### Deprecated Task Labels

If included, deprecated tasks get special labels:

```yaml
apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: get-customer-legacy
  labels:
    workflow.io/deprecated: "true"
    workflow.io/deprecated-since: "2024-01-15"
    workflow.io/replacement: "get-customer-v2"
  annotations:
    workflow.io/deprecation-warning: "This endpoint is deprecated. Use get-customer-v2 instead."
```

### CLI Warning for Deprecated

```
⚠️ Warning: 3 deprecated endpoints included:
   - GET /v1/customers/legacy → Use get-customer-v2
   - POST /v1/charges/create → Use create-charge
   - DELETE /v1/tokens → No replacement available
```

---

## Stage 16.1: OpenAPI Parser

**Goal:** Parse and validate OpenAPI 2.0 (Swagger) and 3.x documents

### Deliverables

1. **OpenAPI Document Loader**
   - Load from file path (JSON/YAML) - handles both `swagger.json` and `openapi.json`
   - Load from URL
   - **Auto-detect format**: Swagger 2.0 vs OpenAPI 3.x
     - Swagger 2.0: `"swagger": "2.0"` field
     - OpenAPI 3.x: `"openapi": "3.0.x"` or `"3.1.x"` field
   - Normalize internally to common model for processing

2. **Schema Resolver**
   - Resolve `$ref` references
   - Inline component schemas
   - Handle circular references
   - **Swagger 2.0 compatibility**:
     - `#/definitions/` → normalize to `#/components/schemas/`
     - `basePath` + `paths` → full URL construction
     - `consumes`/`produces` → Content-Type headers

3. **Endpoint Extractor**
   - Extract all paths and methods
   - Parse parameters (path, query, header, body)
   - Parse request/response schemas
   - Extract security requirements

4. **Security Scheme Extractor**
   - Detect security schemes (bearerAuth, apiKey, oauth2)
   - Map endpoints to their required security schemes
   - Identify which endpoints require authentication

### Critical Files
- `packages/workflow-cli/src/parsers/openapi-loader.ts` (new)
- `packages/workflow-cli/src/parsers/schema-resolver.ts` (new)
- `packages/workflow-cli/src/parsers/endpoint-extractor.ts` (new)

### TDD Approach

```typescript
describe('OpenAPILoader', () => {
  it('should load JSON file')
  it('should load YAML file')
  it('should load from URL')
  it('should auto-detect Swagger 2.0 from "swagger": "2.0" field')
  it('should auto-detect OpenAPI 3.x from "openapi": "3.x.x" field')
  it('should reject invalid OpenAPI documents')
})

describe('Swagger2Normalizer', () => {
  it('should convert #/definitions/ to #/components/schemas/')
  it('should construct URL from basePath + path')
  it('should convert consumes/produces to Content-Type headers')
})

describe('SchemaResolver', () => {
  it('should resolve $ref to components/schemas')
  it('should handle nested $ref')
  it('should detect circular references')
})

describe('EndpointExtractor', () => {
  it('should extract path parameters')
  it('should extract query parameters')
  it('should extract request body schema')
  it('should extract response schema')
  it('should extract security requirements')
  it('should extract error responses (4xx, 5xx)')
  it('should detect deprecated endpoints')
  it('should extract tags for grouping')
})
```

### TDD Targets
- 15+ tests for parsing and validation (including Swagger 2.0 normalization)

### Artifacts
- `stage-proofs/stage-16.1/reports/coverage/`
- `stage-proofs/stage-16.1/reports/test-results/`

---

## Stage 16.2: Task Generator

**Goal:** Generate WorkflowTask CRDs from parsed OpenAPI endpoints

### Deliverables

1. **Task Name Generator**
   - Use `operationId` if present
   - Fall back to `{method}-{path}` (sanitized)
   - Apply optional prefix

2. **Input Schema Generator**
   - Combine path, query, header, body parameters
   - Mark required vs optional
   - Include descriptions from spec

3. **Output Schema Generator**
   - Extract from success response (200/201)
   - Handle multiple response types

4. **HTTP Config Generator**
   - Map method, URL with path params as templates
   - Generate headers with auth placeholders
   - Set default timeout

5. **Task YAML Writer**
   - Generate valid WorkflowTask CRD YAML
   - Support single-file or split output

6. **Permission Label Generator**
   - Add `workflow.io/requires-permissions` label to secured tasks
   - Generate `permissions` spec section with required permissions
   - Reference permission check task

### Mapping Rules

| OpenAPI | WorkflowTask |
|---------|--------------|
| `operationId: getUser` | `metadata.name: get-user` |
| `parameters[in=path]` | URL template: `/users/{{userId}}` |
| `parameters[in=query]` | Input schema + URL query params |
| `parameters[in=header]` | `spec.http.headers` |
| `requestBody.schema` | Input schema (merged) |
| `responses.200.schema` | `spec.output` |
| `security: [bearerAuth]` | `headers.Authorization: Bearer {{bearerToken}}` |

### Example Output

**Input (OpenAPI):**
```yaml
/users/{userId}:
  get:
    operationId: getUser
    parameters:
      - name: userId
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
```

**Output (WorkflowTask):**
```yaml
apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: get-user
  labels:
    generated-from: openapi
    source: petstore-api
spec:
  type: http
  description: "Auto-generated from OpenAPI: getUser"
  http:
    method: GET
    url: "{{baseUrl}}/users/{{userId}}"
    headers:
      Content-Type: application/json
  input:
    userId:
      type: string
      required: true
      description: "Path parameter: userId"
  output:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
      email:
        type: string
```

### Critical Files
- `packages/workflow-cli/src/generators/task-name-generator.ts` (new)
- `packages/workflow-cli/src/generators/input-schema-generator.ts` (new)
- `packages/workflow-cli/src/generators/output-schema-generator.ts` (new)
- `packages/workflow-cli/src/generators/task-generator.ts` (new)
- `packages/workflow-cli/src/writers/yaml-writer.ts` (new)

### TDD Approach

```typescript
describe('TaskNameGenerator', () => {
  it('should use operationId when present')
  it('should generate from method-path when operationId missing')
  it('should sanitize path to valid k8s name')
  it('should apply prefix when provided')
})

describe('InputSchemaGenerator', () => {
  it('should combine path and query params')
  it('should merge request body schema')
  it('should preserve required flags')
})

describe('TaskGenerator', () => {
  it('should generate valid WorkflowTask CRD')
  it('should include auth headers as template variables')
  it('should set baseUrl template in URL')
  it('should generate errorHandling from 4xx/5xx responses')
  it('should add deprecated labels when endpoint is deprecated')
  it('should add tag labels from OpenAPI tags')
})

describe('EndpointFilter', () => {
  it('should filter by tag names')
  it('should exclude by tag names')
  it('should filter by regex pattern')
  it('should exclude deprecated endpoints when flag set')
})
```

### TDD Targets
- 20+ tests for task generation (including filtering, error handling, deprecation)

### Artifacts
- `stage-proofs/stage-16.2/reports/coverage/`
- `stage-proofs/stage-16.2/reports/test-results/`

---

## Stage 16.3: Sample Workflow Generator

**Goal:** Generate example workflow demonstrating generated tasks

### Deliverables

1. **Workflow Scaffolder**
   - Create workflow using 2-3 generated tasks
   - Show data flow between tasks
   - Include comments explaining usage

2. **Dependency Analyzer**
   - Identify tasks that could chain (output → input compatibility)
   - Suggest logical task sequences

3. **Permission Check Task Generator**
   - Generate `check-user-permissions` task if permissions configured
   - Generate `PermissionConfig` CRD with mappings
   - Add permission dependencies to sample workflow

4. **Workflow Permission Validator**
   - Validate workflows use permission-protected tasks correctly
   - Ensure permission check task exists and is a dependency
   - Generate helpful error messages with suggested fixes

### Example Output

```yaml
# Sample workflow generated from: petstore-api
# This demonstrates how to chain the generated tasks
apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: petstore-sample-workflow
  labels:
    generated-from: openapi
spec:
  description: "Sample workflow using petstore-api tasks"
  input:
    userId:
      type: string
      required: true

  tasks:
    - name: get-user
      taskRef: get-user
      input:
        userId: "{{workflow.input.userId}}"

    - name: get-user-orders
      taskRef: get-user-orders
      dependsOn: [get-user]
      input:
        userId: "{{tasks.get-user.output.id}}"

  output:
    user: "{{tasks.get-user.output}}"
    orders: "{{tasks.get-user-orders.output}}"
```

### Critical Files
- `packages/workflow-cli/src/generators/workflow-scaffolder.ts` (new)
- `packages/workflow-cli/src/analyzers/dependency-analyzer.ts` (new)

### TDD Approach

```typescript
describe('WorkflowScaffolder', () => {
  it('should generate valid Workflow CRD')
  it('should chain tasks with data flow')
  it('should include helpful comments')
})

describe('DependencyAnalyzer', () => {
  it('should identify compatible task chains')
  it('should detect shared parameters')
})

describe('PermissionCheckGenerator', () => {
  it('should generate check-user-permissions task')
  it('should generate PermissionConfig CRD')
  it('should add permission dependencies to workflow')
})

describe('WorkflowPermissionValidator', () => {
  it('should fail if permission check missing for protected task')
  it('should fail if dependency on permission check missing')
  it('should pass valid workflow with correct permissions')
  it('should generate helpful fix suggestions')
})
```

### TDD Targets
- 8+ tests for workflow generation
- 7+ tests for permission enforcement

### Artifacts
- `stage-proofs/stage-16.3/reports/coverage/`
- `stage-proofs/stage-16.3/reports/test-results/`

---

## Stage 16.4: Version Management & Migrations

**Goal:** Detect changes, auto-version tasks, and generate migration suggestions

### Deliverables

1. **Task Hash Calculator**
   - Compute SHA256 hash of task definition (excluding timestamps)
   - Store hash in `workflow.io/content-hash` label
   - Compare with existing tasks

2. **Change Detector**
   - Load existing tasks from directory
   - Compare schemas field-by-field
   - Classify changes: added, removed, renamed, type-changed

3. **Version Manager**
   - Auto-increment version when breaking change detected
   - Generate versioned task name (e.g., `get-user-v2`)
   - Track `workflow.io/replaces` lineage

4. **Migration Generator**
   - Analyze breaking changes
   - Generate `TaskMigration` CRD with transforms
   - Suggest input/output mappings for backward compatibility

### Critical Files
- `packages/workflow-cli/src/versioning/hash-calculator.ts` (new)
- `packages/workflow-cli/src/versioning/change-detector.ts` (new)
- `packages/workflow-cli/src/versioning/version-manager.ts` (new)
- `packages/workflow-cli/src/versioning/migration-generator.ts` (new)

### TDD Approach

```typescript
describe('HashCalculator', () => {
  it('should compute consistent hash for same content')
  it('should ignore metadata timestamps in hash')
  it('should detect hash mismatch on change')
})

describe('ChangeDetector', () => {
  it('should detect field renamed')
  it('should detect field removed')
  it('should detect field added (required)')
  it('should detect type changed')
  it('should detect endpoint removed')
})

describe('MigrationGenerator', () => {
  it('should generate input transform for renamed field')
  it('should generate output transform for backward compat')
  it('should warn on breaking changes without transform')
})
```

### TDD Targets
- 12+ tests for versioning and migration

### Artifacts
- `stage-proofs/stage-16.4/reports/coverage/`
- `stage-proofs/stage-16.4/reports/test-results/`

---

## Stage 16.5: CLI Integration

**Goal:** Complete CLI with all commands and E2E testing

### Deliverables

1. **CLI Framework**
   - Commander.js or yargs for argument parsing
   - Help text and usage examples
   - Error handling with helpful messages

2. **Import Command**
   - `workflow-cli import openapi <source> [options]`
   - Progress output during generation
   - Summary of generated files
   - Version comparison output when `--check-existing`

3. **Validation Command**
   - `workflow-cli validate <task-file>` (bonus)
   - Verify generated tasks are valid

4. **E2E Tests**
   - Test with real OpenAPI specs (Petstore, Stripe, etc.)
   - Verify generated YAML is valid
   - Test all CLI options
   - Test version management scenarios

### CLI Output Example (with versioning)

```
$ workflow-cli import openapi petstore-v2.json --base-url https://petstore.io

🔍 Parsing OpenAPI spec: petstore-v2.json
📊 Comparing with existing tasks in ./tasks/

📝 Generating WorkflowTasks...
   ✓ get-pet (unchanged, skipped)
   ⚠️ create-pet → create-pet-v2 (BREAKING CHANGE)
      - Field renamed: petName → name
      - Suggested transform: map: { name: "{{petName}}" }
   ✓ update-pet (unchanged, skipped)
   ⚠️ delete-pet (REMOVED from API - marking deprecated)

📦 Writing files to ./tasks/
   ✓ tasks/create-pet-v2.yaml
   ✓ migrations/create-pet-v1-to-v2.yaml

⚠️ 1 breaking change detected. Review migrations/
✅ Generated 1 new task, 1 migration, skipped 2 unchanged
```

### Critical Files
- `packages/workflow-cli/src/cli.ts` (new)
- `packages/workflow-cli/src/commands/import-openapi.ts` (new)
- `packages/workflow-cli/bin/workflow-cli` (new)

### TDD Approach

```typescript
describe('CLI E2E', () => {
  it('should import Petstore OpenAPI spec')
  it('should generate valid YAML files')
  it('should respect --single-file flag')
  it('should apply --prefix to task names')
  it('should generate sample workflow')
  it('should detect changes and auto-version')
  it('should generate migration files')
  it('should handle errors gracefully')
})
```

### TDD Targets
- 10+ E2E tests with real OpenAPI specs

### Artifacts
- `stage-proofs/stage-16.5/reports/coverage/`
- `stage-proofs/stage-16.5/reports/test-results/`
- `stage-proofs/stage-16.5/reports/playwright/` (E2E)

---

## Stage 16.6: CI/CD Integration & Impact Notifications

**Goal:** Enable automated pipeline integration and workflow impact notifications

### Deliverables

1. **CI Mode for CLI**
   - Non-interactive `--ci` flag for pipeline execution
   - Exit codes: 0 (success), 1 (breaking changes), 2 (error)
   - Machine-readable output format (JSON)
   - `--fail-on-breaking` flag for gated deployments

2. **Task Dependency Tracker**
   - Track which workflows use which tasks
   - Auto-populate `workflow.io/used-by` annotations
   - Query API: `GET /api/v1/tasks/{name}/impact`

3. **Task Lifecycle Manager**
   - Task status: `active`, `superseded`, `deprecated`
   - Safe removal protection (block if workflows depend)
   - `workflow-cli remove-task` with dependency check

4. **Notification Service**
   - Webhook notifications on task changes
   - Email notifications (configurable)
   - Workflow annotation updates
   - Team subscriptions by task pattern (glob)

5. **Impact Analysis API**
   - `GET /api/v1/tasks/{name}/impact` - affected workflows
   - `POST /api/v1/tasks/{name}/notify` - trigger notifications
   - `GET /api/v1/workflows/{name}/outdated-tasks` - upgrade opportunities

### Critical Files
- `src/WorkflowGateway/Services/TaskDependencyTracker.cs` (new)
- `src/WorkflowGateway/Services/TaskLifecycleManager.cs` (new)
- `src/WorkflowGateway/Services/ImpactNotificationService.cs` (new)
- `src/WorkflowGateway/Controllers/TaskImpactController.cs` (new)
- `packages/workflow-cli/src/commands/ci-mode.ts` (new)

### TDD Approach

```typescript
describe('CI Mode', () => {
  it('should run non-interactively with --ci flag')
  it('should exit 1 on breaking changes with --fail-on-breaking')
  it('should output JSON with --format json')
  it('should skip prompts in CI mode')
})

describe('TaskDependencyTracker', () => {
  it('should track workflow → task dependencies')
  it('should update used-by annotation on workflow change')
  it('should return affected workflows for task')
})

describe('TaskLifecycleManager', () => {
  it('should block removal if workflows depend on task')
  it('should allow removal after all workflows migrated')
  it('should mark task as deprecated when API removed')
  it('should mark task as superseded when new version exists')
})

describe('ImpactNotificationService', () => {
  it('should send webhook on task update')
  it('should filter notifications by subscription pattern')
  it('should add annotation to affected workflows')
})
```

### TDD Targets
- 15+ tests for CI/CD and notifications

### Artifacts
- `stage-proofs/stage-16.6/reports/coverage/`
- `stage-proofs/stage-16.6/reports/test-results/`

---

## Stage 16.7: Field-Level Usage Tracking (PACT Consumer Contracts)

**Goal:** Track actual field usage per workflow, enabling field-level impact analysis

### Deliverables

1. **WorkflowTaskUsage CRD**
   - Track which input/output fields each workflow actually uses
   - Auto-populate from template expression parsing
   - Update on workflow execution

2. **Field Usage Analyzer**
   - Parse workflow templates to extract field references
   - Track `{{tasks.taskName.output.fieldName}}` usage
   - Build field dependency graph

3. **Consumer Contract Declaration**
   - `requiredFields` in workflow spec (what workflow NEEDS)
   - Validation against task schema
   - Contract violation detection

4. **Field-Level Impact Analysis**
   - Determine if field change affects workflow
   - "Safe" changes: fields not used by any workflow
   - Precise breaking change detection

### New CRDs

```yaml
# Auto-tracked from workflow execution/parsing
apiVersion: workflow.io/v1
kind: WorkflowTaskUsage
metadata:
  name: user-profile-workflow--get-user
spec:
  workflow: user-profile-workflow
  task: get-user
  lastAnalyzed: 2024-01-15T10:00:00Z

  # Fields actually accessed in workflow templates
  inputFieldsUsed:
    - userId      # {{tasks.get-user.input.userId}}

  outputFieldsUsed:
    - id          # {{tasks.get-user.output.id}}
    - name        # {{tasks.get-user.output.name}}
    - email       # {{tasks.get-user.output.email}}

  # Fields available but NOT used
  outputFieldsIgnored:
    - createdAt
    - updatedAt
    - metadata
    - phoneNumber
```

```yaml
# Consumer contract - workflow declares minimum requirements
apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: user-profile-workflow
spec:
  tasks:
    - name: get-user
      taskRef: get-user
      # CONSUMER CONTRACT - declare what we NEED
      requiredFields:
        input:
          - userId
        output:
          - id
          - name
          - email    # Must have email (or equivalent)
      input:
        userId: "{{workflow.input.userId}}"
```

### CLI Commands

```bash
# Analyze field usage across all workflows
$ workflow-cli analyze-usage

📊 Field Usage Analysis

Task: get-user
  Output fields:
    ✓ id         - used by 5 workflows
    ✓ name       - used by 4 workflows
    ✓ email      - used by 2 workflows
    ○ createdAt  - NOT USED (safe to remove)
    ○ updatedAt  - NOT USED (safe to remove)
    ○ metadata   - NOT USED (safe to remove)


# Check specific field impact
$ workflow-cli field-impact get-user --field email

📊 Field Impact: get-user.output.email

Workflows using this field:
  • user-profile-workflow (line 15: {{tasks.get-user.output.email}})
  • notification-workflow (line 8: {{tasks.get-user.output.email}})

Workflows NOT using this field:
  • order-summary-workflow
  • audit-log-workflow
  • admin-dashboard-workflow

If this field is removed/renamed:
  ❌ 2 workflows would BREAK
  ✅ 3 workflows would be UNAFFECTED
```

### Field-Level Import Analysis

```bash
$ workflow-cli import openapi api-v2.json --ci --field-level

🔍 CI Mode: Field-Level Analysis
📊 Comparing with existing tasks...

📝 Field-Level Changes:

Task: get-user
  Changed fields:
    ⚠️ email → emailAddress (RENAMED)
    ✓ createdAt (REMOVED) - NOT USED by any workflow
    ✓ phoneNumber (ADDED) - optional field

  Workflow impact:
    ❌ user-profile-workflow - BREAKING
       └─ Uses: email (renamed to emailAddress)
       └─ Fix: {{tasks.get-user.output.email}} → {{tasks.get-user.output.emailAddress}}

    ❌ notification-workflow - BREAKING
       └─ Uses: email (renamed to emailAddress)

    ✅ order-summary-workflow - SAFE
       └─ Uses: [id, name] only

    ✅ audit-log-workflow - SAFE
       └─ Uses: [id] only

Summary:
  • 2 workflows affected (email field)
  • 3 workflows safe (don't use changed fields)
  • createdAt removal is SAFE (no workflows use it)

Exit code: 1 (2 workflows affected)
```

### Critical Files
- `src/WorkflowGateway/Services/FieldUsageAnalyzer.cs` (new)
- `src/WorkflowGateway/Services/ConsumerContractValidator.cs` (new)
- `src/WorkflowGateway/Models/WorkflowTaskUsage.cs` (new)
- `packages/workflow-cli/src/analyzers/field-impact-analyzer.ts` (new)

### TDD Approach

```csharp
[Fact]
public void FieldUsageAnalyzer_ShouldExtractOutputFieldsFromTemplates()

[Fact]
public void FieldUsageAnalyzer_ShouldTrackInputFieldUsage()

[Fact]
public void FieldUsageAnalyzer_ShouldIdentifyUnusedFields()

[Fact]
public void ConsumerContractValidator_ShouldDetectMissingRequiredField()

[Fact]
public void ConsumerContractValidator_ShouldPassWhenAllFieldsPresent()

[Fact]
public void FieldImpactAnalyzer_ShouldIdentifyAffectedWorkflows()

[Fact]
public void FieldImpactAnalyzer_ShouldMarkUnusedFieldsAsSafe()

[Fact]
public void FieldImpactAnalyzer_ShouldDetectRenamedFieldImpact()
```

### TDD Targets
- 18+ tests for field usage tracking and consumer contracts

### Artifacts
- `stage-proofs/stage-16.7/reports/coverage/`
- `stage-proofs/stage-16.7/reports/test-results/`

---

## Stage 16.8: Contract Verification (PACT Provider States & Interactions)

**Goal:** Complete PACT replacement with scenario testing and interaction recording

### Deliverables

1. **TaskTestScenarios CRD**
   - Auto-generate test scenarios from OpenAPI responses
   - Provider states (user-exists, user-not-found, unauthorized)
   - Workflow validation against scenarios

2. **RecordedInteraction CRD**
   - Record actual HTTP interactions during execution
   - Replay for verification against new specs
   - Golden file testing

3. **Draft/Experimental Versions**
   - `workflow.io/status: draft` for WIP contracts
   - Explicit opt-in required
   - Won't block pipelines

4. **Environment Deployment Matrix**
   - Track versions deployed per environment
   - "Can I Deploy?" cross-environment check
   - Promotion workflow

### New CRDs

```yaml
# Auto-generated from OpenAPI + error responses
apiVersion: workflow.io/v1
kind: TaskTestScenarios
metadata:
  name: get-user-scenarios
spec:
  task: get-user
  generatedFrom: openapi

  scenarios:
    - name: user-exists
      description: "Happy path - user found"
      providerState: "user 123 exists"
      input:
        userId: "123"
      expectedOutput:
        status: 200
        bodySchema:
          type: object
          required: [id, name, email]

    - name: user-not-found
      description: "User doesn't exist"
      providerState: "user does not exist"
      input:
        userId: "nonexistent"
      expectedOutput:
        status: 404
        body:
          code: "USER_NOT_FOUND"

    - name: unauthorized
      description: "Invalid or missing token"
      providerState: "invalid authentication"
      input:
        userId: "123"
        bearerToken: ""
      expectedOutput:
        status: 401
        body:
          code: "UNAUTHORIZED"

    - name: rate-limited
      description: "Too many requests"
      providerState: "rate limit exceeded"
      input:
        userId: "123"
      expectedOutput:
        status: 429
        headers:
          Retry-After: "60"
```

```yaml
# Recorded during actual workflow execution
apiVersion: workflow.io/v1
kind: RecordedInteraction
metadata:
  name: get-user-interaction-abc123
  labels:
    workflow.io/task: get-user
    workflow.io/workflow: user-profile-workflow
    workflow.io/execution: exec-abc123
spec:
  recordedAt: 2024-01-15T10:30:00Z

  request:
    method: GET
    url: https://api.example.com/users/123
    headers:
      Authorization: "Bearer [REDACTED]"
      Content-Type: application/json

  response:
    status: 200
    duration: 145ms
    headers:
      Content-Type: application/json
    body:
      id: "123"
      name: "John Doe"
      email: "john@example.com"
      createdAt: "2024-01-01T00:00:00Z"

  # Which fields were actually used by workflow
  fieldsAccessed:
    - id
    - name
    - email
```

```yaml
# Environment deployment tracking
apiVersion: workflow.io/v1
kind: TaskDeploymentMatrix
metadata:
  name: get-user-deployments
spec:
  task: get-user

  versions:
    v1:
      status: deprecated
      successor: v2

    v2:
      status: active
      environments:
        dev:
          deployedAt: 2024-01-15T10:00:00Z
          deployedBy: ci-pipeline
        staging:
          deployedAt: 2024-01-14T10:00:00Z
          deployedBy: ci-pipeline
        prod:
          deployedAt: 2024-01-10T10:00:00Z
          deployedBy: release-manager
          workflowsUsing: 5

    v3-draft:
      status: draft
      expiresAt: 2024-02-01T00:00:00Z
      owner: api-team@company.com
```

### CLI Commands

```bash
# Verify workflow handles all scenarios
$ workflow-cli verify user-profile-workflow --scenarios

🧪 Verifying user-profile-workflow against task scenarios...

get-user scenarios:
  ✅ user-exists
     └─ Workflow handles success response correctly

  ⚠️ user-not-found
     └─ WARNING: No error handler for 404!
     └─ Workflow will fail if user doesn't exist
     └─ Suggested: Add onError handler for status 404

  ✅ unauthorized
     └─ Error propagates correctly to workflow output

  ⚠️ rate-limited
     └─ WARNING: No retry logic for 429!
     └─ Suggested: Add retry with backoff

Result: 2 passing, 2 warnings
Recommendation: Add error handlers for edge cases


# Record interactions for golden file testing
$ workflow-cli record user-profile-workflow --input '{"userId": "123"}'

🎬 Recording workflow execution...

Recorded 3 interactions:
  ✓ get-user: GET /users/123 → 200 (145ms)
  ✓ get-orders: GET /users/123/orders → 200 (89ms)
  ✓ get-preferences: GET /users/123/preferences → 200 (67ms)

Saved to: recordings/user-profile-workflow-2024-01-15.yaml

Use for verification:
  workflow-cli replay-verify recordings/user-profile-workflow-2024-01-15.yaml


# Replay recorded interactions against new spec
$ workflow-cli replay-verify recordings/*.yaml --against api-v2.json

🔄 Replaying 47 recorded interactions against api-v2.json...

Results:
  ✅ 43 interactions compatible

  ⚠️ 4 interactions would receive different response:

     get-user-interaction-abc123:
       - response.email → response.emailAddress (field renamed)
       - Workflow user-profile-workflow uses this field!

     get-user-interaction-def456:
       - response.email → response.emailAddress (field renamed)
       - Workflow notification-workflow uses this field!

     get-user-interaction-ghi789:
       - response.createdAt (removed)
       - Workflow audit-log-workflow does NOT use this field ✓

     get-user-interaction-jkl012:
       - response.createdAt (removed)
       - No workflow impact ✓

Summary:
  • 2 workflows would break (email field renamed)
  • 2 interactions affected but no workflow impact


# Can I Deploy query
$ workflow-cli can-deploy get-user-v3 --to prod

🔍 Can I Deploy? get-user-v3 → prod

Current state:
  dev:     get-user-v3 ✅ (deployed 2024-01-15)
  staging: get-user-v3 ✅ (deployed 2024-01-14)
  prod:    get-user-v2 (current)

Compatibility matrix:
  ┌─────────────────────────┬─────┬─────────┬──────┐
  │ Workflow                │ Dev │ Staging │ Prod │
  ├─────────────────────────┼─────┼─────────┼──────┤
  │ user-profile-workflow   │ ✅  │ ✅      │ ❌   │
  │ order-summary-workflow  │ ✅  │ ✅      │ ✅   │
  │ audit-log-workflow      │ ✅  │ ✅      │ ✅   │
  │ notification-workflow   │ ✅  │ ✅      │ ❌   │
  └─────────────────────────┴─────┴─────────┴──────┘

❌ CANNOT DEPLOY to prod

Blockers:
  • user-profile-workflow needs migration (uses email field)
  • notification-workflow needs migration (uses email field)

Required actions:
  1. Migrate affected workflows:
     workflow-cli apply-migration get-user-v2-to-v3 --workflows user-profile-workflow,notification-workflow

  2. Deploy migrated workflows to prod

  3. Re-run: workflow-cli can-deploy get-user-v3 --to prod


# Promote draft to official version
$ workflow-cli promote get-user-v3-draft --to get-user-v3

🚀 Promoting draft version...

Pre-promotion checks:
  ✅ Draft has been tested in dev for 7 days
  ✅ No breaking changes vs v2
  ✅ All scenarios passing
  ⚠️ 2 workflows opted-in to draft

Promotion actions:
  1. Create get-user-v3 from get-user-v3-draft
  2. Update opted-in workflows to use v3
  3. Mark v3-draft as archived
  4. Notify subscribers

Proceed? (y/n) y

✅ Promoted get-user-v3-draft → get-user-v3
✅ Updated 2 workflows to use get-user-v3
✅ Archived draft version
```

### Critical Files
- `src/WorkflowGateway/Services/ScenarioVerifier.cs` (new)
- `src/WorkflowGateway/Services/InteractionRecorder.cs` (new)
- `src/WorkflowGateway/Services/DeploymentMatrixService.cs` (new)
- `src/WorkflowGateway/Models/TaskTestScenarios.cs` (new)
- `src/WorkflowGateway/Models/RecordedInteraction.cs` (new)
- `src/WorkflowGateway/Models/TaskDeploymentMatrix.cs` (new)
- `packages/workflow-cli/src/commands/can-deploy.ts` (new)
- `packages/workflow-cli/src/commands/replay-verify.ts` (new)
- `packages/workflow-cli/src/commands/record.ts` (new)

### TDD Approach

```csharp
[Fact]
public void ScenarioVerifier_ShouldPassWhenWorkflowHandlesAllScenarios()

[Fact]
public void ScenarioVerifier_ShouldWarnWhenErrorHandlerMissing()

[Fact]
public void ScenarioVerifier_ShouldGenerateSuggestedFixes()

[Fact]
public void InteractionRecorder_ShouldRecordRequestAndResponse()

[Fact]
public void InteractionRecorder_ShouldRedactSensitiveHeaders()

[Fact]
public void InteractionRecorder_ShouldTrackFieldsAccessed()

[Fact]
public void ReplayVerifier_ShouldDetectResponseChanges()

[Fact]
public void ReplayVerifier_ShouldIdentifyWorkflowImpact()

[Fact]
public void DeploymentMatrix_ShouldTrackVersionsPerEnvironment()

[Fact]
public void CanIDeploy_ShouldBlockWhenIncompatibleWorkflows()

[Fact]
public void CanIDeploy_ShouldPassWhenAllWorkflowsCompatible()

[Fact]
public void DraftVersion_ShouldRequireExplicitOptIn()

[Fact]
public void DraftVersion_ShouldNotBlockPipeline()
```

### TDD Targets
- 20+ tests for contract verification and interaction recording

### Artifacts
- `stage-proofs/stage-16.8/reports/coverage/`
- `stage-proofs/stage-16.8/reports/test-results/`

---

## PACT Replacement Summary

Stage 16 now provides a complete Contract Testing Platform:

| PACT Feature | Stage 16 Implementation | Substage |
|--------------|------------------------|----------|
| Consumer contracts | `requiredFields` + WorkflowTaskUsage | 16.7 |
| Provider verification | OpenAPI import + hash detection | 16.4 |
| Field-level analysis | FieldUsageAnalyzer | 16.7 |
| Provider states | TaskTestScenarios | 16.8 |
| Interaction recording | RecordedInteraction | 16.8 |
| Replay verification | `workflow-cli replay-verify` | 16.8 |
| Can I Deploy? | TaskDeploymentMatrix + CLI | 16.6, 16.8 |
| Environment tracking | TaskDeploymentMatrix | 16.8 |
| Pending pacts (WIP) | Draft versions | 16.4, 16.8 |
| Webhook notifications | TaskNotificationConfig | 16.6 |
| Breaking change blocking | Exit code 2 | 16.6 |

**Key advantage over PACT:**
> No separate broker infrastructure needed. Contract testing is built into the workflow system with automatic field usage tracking.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| OpenAPI 2.0 support | 100% of valid specs |
| OpenAPI 3.x support | 100% of valid specs |
| Task generation accuracy | 100% valid CRDs |
| CLI response time | <5s for 50-endpoint spec |
| Change detection accuracy | 100% breaking changes detected |
| Migration suggestion rate | >80% of breaking changes have suggested transform |
| Permission detection | 100% of secured endpoints detected |
| Permission validation | 100% of invalid workflows rejected with fix suggestions |
| Pipeline blocking | 100% of removals with dependent workflows blocked (exit code 2) |
| Workflow impact detection | 100% of affected workflows identified |
| Field-level impact precision | 100% accuracy (unused field removal = no breaking change) |
| Error normalization | 100% of errors have both original + normalized response |
| Can-I-Deploy accuracy | 100% correct deployment recommendations |
| Scenario coverage | 100% of OpenAPI error responses generate test scenarios |
| Test coverage | ≥90% |

---

## TDD Targets Summary

| Substage | Tests |
|----------|-------|
| 16.1 OpenAPI Parser | 18+ |
| 16.2 Task Generator + Error Mapping | 22+ |
| 16.3 Sample Workflow + Permissions | 15+ |
| 16.4 Version Management + Draft | 14+ |
| 16.5 CLI Integration | 15+ |
| 16.6 CI/CD, Environment Matrix, Can-I-Deploy | 18+ |
| 16.7 Field-Level Usage + Consumer Contracts | 18+ |
| 16.8 Contract Verification + Interaction Recording | 20+ |
| **Total** | **~140 tests** |

**Coverage Target:** 90%+ overall

---

## Value Delivered

**To the Project:**
> Stage 16 is a **complete Contract Testing Platform** that replaces PACT. It eliminates the friction of integrating external APIs with automatic task generation, field-level impact analysis, and environment-aware deployment control. No separate broker infrastructure needed - contract testing is built into the workflow system.

**To Users:**
> "I imported our Stripe API spec and got 47 ready-to-use tasks in 3 seconds. When Stripe released v2, it detected only 2 of our 5 workflows actually used the changed field - the other 3 were safe. The pipeline ran `can-i-deploy` and told us exactly which workflows to migrate before promoting to prod. When errors happen, I get both Stripe's original error AND a normalized error with suggested actions. What used to take days with PACT now takes minutes - and it's automatic."

**Business Value:**
> - **Replaces PACT** - No broker infrastructure, automatic field usage tracking
> - **Accelerates API integration** - Import spec, get tasks instantly
> - **Precise impact analysis** - Field-level, not task-level (unused field removal = no breaking change)
> - **Safe deployments** - `can-i-deploy` checks all environments before promotion
> - **Dual error responses** - Original for debugging, normalized for consistency
> - **Pipeline integration** - Exit code 2 blocks removal if workflows depend on it
> - **Consumer contracts** - Workflows declare what fields they need
> - **Provider states** - Auto-generated test scenarios from OpenAPI error responses
> - **Interaction recording** - Golden file testing for contract verification
> - **Environment tracking** - Know what's deployed where before promoting
