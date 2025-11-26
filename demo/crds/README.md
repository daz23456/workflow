# ⚠️ DEPRECATED: This directory is no longer maintained

## New Location

Please use the following directories instead:

- **Tasks:** `/demo/tasks/` - All WorkflowTask CRD definitions
- **Workflows:** `/demo/workflows/` - All Workflow CRD definitions

## Migration Guide

The CRDs in this directory have been reorganized for better clarity:

### Old Structure (DEPRECATED)
```
demo/crds/
├── workflow-*.yaml          (mixed with tasks)
├── task-*.yaml             (mixed with workflows)
└── transform-*.yaml        (mixed naming)
```

### New Structure (CURRENT)
```
demo/
├── tasks/                   ← All WorkflowTask definitions
│   ├── task-fetch-*.yaml
│   └── task-transform-*.yaml
└── workflows/              ← All Workflow definitions
    ├── workflow-ecommerce-analytics.yaml
    └── workflow-user-activity-analysis.yaml
```

## Why the Change?

1. **Better Organization** - Separate tasks from workflows for clarity
2. **Consistent Naming** - All tasks prefixed with `task-`, all workflows with `workflow-`
3. **Easier Discovery** - Clear directory structure matches the domain model
4. **Demo Focus** - `/demo/tasks/` and `/demo/workflows/` contain the curated demo examples

## Files in This Directory

This directory is kept for **reference only**. All files here are **deprecated** and may be out of date.

For the latest, maintained versions, please see:
- `/demo/tasks/` - Active task definitions
- `/demo/workflows/` - Active workflow definitions

## Usage

To use the demo, apply the new directories:

```bash
# Apply all tasks
kubectl apply -f demo/tasks/

# Apply all workflows
kubectl apply -f demo/workflows/
```

See `/demo/README.md` for the complete quick start guide.
