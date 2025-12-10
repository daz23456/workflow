# Blast Radius Demo

This example demonstrates the **Blast Radius** feature - showing the downstream impact when a shared task changes.

## The Scenario

The `validate-user` task is a **shared task** used by 4 different workflows:

```
                    ┌─────────────────────┐
                    │    validate-user    │  ← HIGH IMPACT TASK
                    │   (shared by 4)     │
                    └─────────┬───────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│user-registration│   │  user-login   │   │password-reset │   │profile-update │
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │                     │
        ▼                     ▼                     ▼                     ▼
   create-account       verify-password      send-reset-email     update-profile
        │                     │                                           │
        ▼                     ▼                                           ▼
  send-welcome-email    generate-token                           notify-update
```

## Blast Radius Analysis

When viewing the **`validate-user`** task, the blast radius shows:

### Depth 1
- **4 workflows affected:** user-registration, user-login, password-reset, profile-update

### Depth 2 (downstream tasks in those workflows)
- **8 tasks affected:**
  - create-account, send-welcome-email (from user-registration)
  - verify-password, generate-token (from user-login)
  - send-reset-email (from password-reset)
  - update-profile, notify-update (from profile-update)

## Why This Matters

If you need to modify `validate-user`:
- **Breaking change?** You'll affect 4 workflows
- **Schema change?** All 4 workflows need input/output mapping updates
- **Performance issue?** 4 workflows will be impacted
- **Deprecating?** You need to update 4 workflows first

## How to View

1. Start the backend: `cd src/WorkflowGateway && dotnet run`
2. Start the UI: `cd src/workflow-ui && pnpm dev`
3. Navigate to: `http://localhost:3000/tasks/validate-user`
4. Expand the **Blast Radius** panel
5. Try different depths and toggle between List/Graph views

## Files in This Demo

| File | Description |
|------|-------------|
| `01-shared-task-validate-user.yaml` | The shared task used by all workflows |
| `02-workflow-user-registration.yaml` | Uses validate-user for registration |
| `03-workflow-user-login.yaml` | Uses validate-user for authentication |
| `04-workflow-password-reset.yaml` | Uses validate-user for password reset |
| `05-workflow-profile-update.yaml` | Uses validate-user for profile changes |

## Applying to Kubernetes

```bash
kubectl apply -f examples/blast-radius-demo/
```
