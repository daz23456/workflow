# Code Generation System

## Overview

This project maintains a **single source of truth** for type definitions using **JSON Schema**, with automated code generation for both C# and TypeScript. Additionally, we generate TypeScript API clients from the OpenAPI specification.

**Benefits:**
- ✅ Single source of truth (JSON Schemas)
- ✅ No manual type synchronization
- ✅ Type-safe API clients
- ✅ Automatic documentation
- ✅ CI/CD integration ready

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    SINGLE SOURCE OF TRUTH                     │
│                                                                │
│  schemas/                                                      │
│  ├── common-definitions.schema.json   (Shared types)          │
│  ├── workflow-task.schema.json        (WorkflowTask CRD)      │
│  └── workflow.schema.json             (Workflow CRD)          │
└──────────────────────────────────────────────────────────────┘
                           │
                           │
        ┌──────────────────┴──────────────────┐
        │                                      │
        ▼                                      ▼
┌────────────────┐                  ┌────────────────────┐
│  C# Models     │                  │  TypeScript Types  │
│  (Future)      │                  │  ✅ IMPLEMENTED    │
│                │                  │                    │
│  Generated     │                  │  Generated via     │
│  via           │                  │  json2ts           │
│  NJsonSchema   │                  │                    │
└────────────────┘                  └────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│               OPENAPI SPECIFICATION (Runtime)                 │
│                                                                │
│  WorkflowGateway exposes Swagger/OpenAPI at:                 │
│  http://localhost:5000/swagger/v1/swagger.json               │
│                                                                │
│  Contains:                                                     │
│  - All API endpoints                                          │
│  - Request/response models                                    │
│  - Dynamic workflow endpoints                                 │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │  TypeScript API    │
                  │  Client            │
                  │  ✅ IMPLEMENTED    │
                  │                    │
                  │  Generated via     │
                  │  openapi-typescript│
                  │  -codegen          │
                  └────────────────────┘
```

---

## Generated Packages

### 1. @workflow/types (JSON Schema → TypeScript)

**Source:** `schemas/*.schema.json`
**Output:** `packages/workflow-types/src/generated/`

**Generated Files:**
- `common.ts` - ResourceMetadata, SchemaDefinition, PropertyDefinition
- `workflow-task.ts` - WorkflowTaskResource, HttpRequestDefinition, TransformDefinition
- `workflow.ts` - WorkflowResource, WorkflowSpec, WorkflowTaskStep

**Usage:**
```typescript
import {
  WorkflowResource,
  WorkflowTaskResource,
  SchemaDefinition
} from '@workflow/types';

const workflow: WorkflowResource = {
  apiVersion: 'workflow.example.com/v1',
  kind: 'Workflow',
  metadata: { name: 'my-workflow', namespace: 'default' },
  spec: {
    input: {},
    tasks: []
  }
};
```

### 2. @workflow/api-client (OpenAPI → TypeScript)

**Source:** `build/openapi.json` (from running gateway)
**Output:** `packages/workflow-api-client/src/`

**Generated Files:**
- `models/` - All request/response DTOs
- `services/` - Type-safe API service methods
- `WorkflowApiClient.ts` - Main client class

**Usage:**
```typescript
import { WorkflowApiClient } from '@workflow/api-client';

const client = new WorkflowApiClient({
  BASE: 'http://localhost:5000'
});

// Execute a workflow
const result = await client.dynamicWorkflow.executeWorkflow({
  name: 'user-activity-analysis',
  requestBody: {
    input: { userId: 1 }
  }
});

// List all workflows
const workflows = await client.workflowManagement.listWorkflows();

// Get execution history
const executions = await client.executionHistory.listExecutions({
  name: 'my-workflow',
  status: 'Succeeded',
  skip: 0,
  take: 10
});
```

---

## Build Scripts

### Quick Start

```bash
# Generate everything (requires gateway running)
./build/generate-all.sh

# Generate only TypeScript types from JSON Schemas
./build/generate-typescript.sh

# Generate only API client from OpenAPI (requires gateway running)
./build/generate-openapi-client.sh
```

### Script Details

#### 1. `build/generate-typescript.sh`

Generates TypeScript types from JSON Schemas.

**Requirements:** None (offline)

**Process:**
1. Reads `schemas/*.schema.json`
2. Runs `json2ts` for each schema
3. Outputs to `packages/workflow-types/src/generated/`

**Output Files:**
- `common.ts`
- `workflow-task.ts`
- `workflow.ts`
- `index.ts` (barrel export)

#### 2. `build/generate-openapi-client.sh`

Generates TypeScript API client from OpenAPI spec.

**Requirements:** Gateway must be running at `http://localhost:5000`

**Process:**
1. Downloads `swagger.json` from gateway
2. Runs `openapi-typescript-codegen`
3. Outputs to `packages/workflow-api-client/src/`
4. Creates `package.json` and `tsconfig.json` if missing

**Output Structure:**
```
packages/workflow-api-client/src/
├── core/             # HTTP request handling
├── models/           # Request/response types
├── services/         # API service methods
├── WorkflowApiClient.ts
└── index.ts
```

#### 3. `build/generate-all.sh`

Master script that orchestrates the full generation pipeline.

**Process:**
1. ✅ Generate TypeScript types from schemas (always runs)
2. ✅ Download OpenAPI spec from gateway (requires gateway)
3. ✅ Generate API client (if step 2 succeeds)

**Graceful Degradation:**
If gateway is not running, only schema-based types are generated.

---

## JSON Schemas

### Schema Locations

```
schemas/
├── common-definitions.schema.json
├── workflow-task.schema.json
└── workflow.schema.json
```

### Schema Format

All schemas follow JSON Schema Draft 7 specification:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://workflow.example.com/schemas/workflow.schema.json",
  "title": "Workflow",
  "description": "Kubernetes Custom Resource for Workflow",
  "type": "object",
  "properties": {
    "apiVersion": {
      "type": "string",
      "const": "workflow.example.com/v1"
    },
    ...
  },
  "required": ["apiVersion", "kind", "metadata", "spec"]
}
```

### Schema References

Schemas can reference each other using `$ref`:

```json
{
  "metadata": {
    "$ref": "common-definitions.schema.json#/definitions/ResourceMetadata"
  }
}
```

---

## CI/CD Integration

### GitHub Actions / GitLab CI

```yaml
# .github/workflows/codegen.yml
name: Code Generation

on:
  push:
    paths:
      - 'schemas/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm install -g json-schema-to-typescript
          npm install -g openapi-typescript-codegen

      - name: Generate TypeScript types
        run: ./build/generate-typescript.sh

      - name: Commit generated files
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add packages/workflow-types/src/generated/
          git commit -m "chore: regenerate types from schemas" || true
          git push
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check if schemas changed
if git diff --cached --name-only | grep -q '^schemas/'; then
  echo "📝 Schemas changed, regenerating types..."
  ./build/generate-typescript.sh

  # Stage generated files
  git add packages/workflow-types/src/generated/
fi
```

---

## Troubleshooting

### Gateway Not Running

**Error:**
```
⚠️  Gateway not running at localhost:5000
```

**Solution:**
```bash
# Start the gateway
cd src/WorkflowGateway
dotnet run

# In another terminal, regenerate
./build/generate-all.sh
```

### Schema Validation Errors

**Error:**
```
Error: Invalid JSON Schema at schemas/workflow.schema.json
```

**Solution:**
1. Validate schema at https://www.jsonschemavalidator.net/
2. Check `$ref` paths are correct
3. Ensure all required fields are present

### Type Generation Fails

**Error:**
```
json2ts: command not found
```

**Solution:**
```bash
npm install -g json-schema-to-typescript
```

---

## Future Enhancements

### C# Code Generation (Planned)

**Goal:** Generate C# models from JSON Schemas

**Tool:** NJsonSchema.CodeGeneration.CSharp

**Script:** `build/generate-csharp.csx`

```csharp
using NJsonSchema;
using NJsonSchema.CodeGeneration.CSharp;

var schema = await JsonSchema.FromFileAsync("schemas/workflow.schema.json");
var generator = new CSharpGenerator(schema, new CSharpGeneratorSettings {
    Namespace = "WorkflowCore.Models.Generated",
    ClassStyle = CSharpClassStyle.Poco,
    JsonLibrary = CSharpJsonLibrary.SystemTextJson
});

var code = generator.GenerateFile();
File.WriteAllText("src/WorkflowCore/Models/Generated/Workflow.cs", code);
```

**Benefits:**
- Replace hand-written C# models
- Ensure perfect parity between C# and TypeScript
- Reduce maintenance burden

---

## Best Practices

### 1. Never Edit Generated Files

All files in `generated/` directories are auto-generated. Manual changes will be overwritten.

```
❌ WRONG: Edit packages/workflow-types/src/generated/workflow.ts
✅ CORRECT: Edit schemas/workflow.schema.json, then regenerate
```

### 2. Run Generation After Schema Changes

Always regenerate after modifying schemas:

```bash
# Edit schema
vim schemas/workflow.schema.json

# Regenerate
./build/generate-all.sh

# Commit both
git add schemas/ packages/workflow-types/src/generated/
git commit -m "feat: add new workflow property"
```

### 3. Version Lock Generated Files

Commit generated files to version control to ensure reproducible builds:

```gitignore
# DON'T ignore these
# packages/workflow-types/src/generated/
# packages/workflow-api-client/src/
```

### 4. Document Schema Changes

Add descriptions to schemas for better generated documentation:

```json
{
  "properties": {
    "timeout": {
      "type": "string",
      "description": "Task timeout (e.g., 30s, 5m, 2h)",
      "pattern": "^[0-9]+(ms|s|m|h)$"
    }
  }
}
```

---

## Summary

✅ **JSON Schema as Single Source of Truth**
All type definitions live in `schemas/` directory.

✅ **Automated TypeScript Generation**
Run `./build/generate-typescript.sh` to generate types.

✅ **Automated API Client Generation**
Run `./build/generate-openapi-client.sh` to generate client.

✅ **CI/CD Ready**
Scripts are idempotent and can run in pipelines.

✅ **Type-Safe End-to-End**
From API Gateway → TypeScript Client → React UI, everything is typed.

**Next Steps:**
1. Integrate C# code generation (future enhancement)
2. Add pre-commit hooks for automatic regeneration
3. Set up CI/CD pipeline for schema validation
