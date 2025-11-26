# Schema Validation Report

**Date:** 2025-11-26
**Test Results:** ✅ 11/11 tests passing
**Status:** Schemas validate correctly, but type generation has mismatches

---

## What Was Tested

### 1. Schema Validation Against Real YAMLs ✅
- ✅ `workflow-user-activity-analysis.yaml` validates successfully
- ✅ `workflow-ecommerce-analytics.yaml` validates successfully
- ✅ WorkflowTask YAMLs validate successfully
- ✅ Invalid workflows are correctly rejected

### 2. C# Model Compatibility ✅
- ✅ Field names match between schema and C# `WorkflowResource`
- ✅ Field names match for `WorkflowSpec`
- ✅ Field names match for `WorkflowTaskStep`

### 3. TypeScript Type Generation ✅
- ✅ Generated types compile successfully
- ✅ Types work with actual data

---

## Issues Found

### ❌ Issue 1: Extra Index Signatures in Generated TypeScript

**Problem:** All generated TypeScript interfaces include `[k: string]: any | undefined`

**C# Models:**
```csharp
public class WorkflowResource {
    public string ApiVersion { get; set; }
    public string Kind { get; set; }
    public ResourceMetadata Metadata { get; set; }
    public WorkflowSpec Spec { get; set; }
    public WorkflowStatus? Status { get; set; }
    // NO index signature
}
```

**Generated TypeScript:**
```typescript
export interface Workflow {
  apiVersion: "workflow.example.com/v1";
  kind: "Workflow";
  metadata: ResourceMetadata;
  spec: WorkflowSpec;
  status?: WorkflowStatus;
  [k: string]: any | undefined;  // ❌ NOT IN C# MODEL
}
```

**Impact:** TypeScript allows arbitrary additional properties that C# doesn't accept.

**Root Cause:** JSON Schema doesn't explicitly set `"additionalProperties": false`, so `json-schema-to-typescript` adds index signatures by default.

**Fix:** Add `"additionalProperties": false` to all schema objects.

---

### ❌ Issue 2: Tasks Array Type Mismatch

**Problem:** TypeScript uses tuple type requiring at least 1 element; C# uses regular List.

**C# Model:**
```csharp
public class WorkflowSpec {
    [YamlMember(Alias = "tasks")]
    public List<WorkflowTaskStep> Tasks { get; set; } = new();  // Can be empty
}
```

**Generated TypeScript:**
```typescript
export interface WorkflowSpec {
  tasks: [WorkflowTaskStep, ...WorkflowTaskStep[]];  // ❌ Tuple, requires at least 1
}
```

**Impact:**
- TypeScript enforces "at least 1 task" at compile time
- C# allows empty list (runtime validation may catch it)
- Type mismatch between languages

**Root Cause:** Schema has `"minItems": 1` which json2ts interprets as tuple.

**Fix Options:**
1. Keep tuple if we want compile-time enforcement (TypeScript stricter than C#)
2. Remove `minItems` from schema if empty arrays are valid
3. Use `--strictIndexSignatures=false` flag (but loses other benefits)

**Decision Needed:** Should empty task lists be allowed?

---

### ❌ Issue 3: Default Property Type Too Restrictive

**Problem:** TypeScript restricts `default` to object type only; C# allows any type.

**C# Model:**
```csharp
public class WorkflowInputParameter {
    [YamlMember(Alias = "default")]
    public object? Default { get; set; }  // Can be string, number, bool, object, etc.
}
```

**Generated TypeScript:**
```typescript
export interface WorkflowInputParameter {
  default?: {
    [k: string]: any | undefined;  // ❌ Only allows objects
  };
}
```

**Impact:** TypeScript won't allow primitive defaults like `default: "hello"` or `default: 42`.

**Root Cause:** Schema definition may be incorrect or json2ts inferred wrong type.

**Fix:** Update schema to allow `default` to be any JSON value:
```json
{
  "default": {
    "description": "Default value for the parameter"
    // NO type constraint - allows any JSON value
  }
}
```

---

## Recommended Fixes

### Priority 1: Remove Extra Index Signatures

**Change:** Add `"additionalProperties": false` to all object definitions in schemas.

**Files to Update:**
- `schemas/common-definitions.schema.json`
- `schemas/workflow.schema.json`
- `schemas/workflow-task.schema.json`

**Example:**
```json
{
  "definitions": {
    "ResourceMetadata": {
      "type": "object",
      "properties": { ... },
      "required": ["name", "namespace"],
      "additionalProperties": false  // ← ADD THIS
    }
  }
}
```

### Priority 2: Fix Default Property Type

**Change:** Allow `default` to be any JSON type, not just object.

**File:** `schemas/workflow.schema.json`

**Current (wrong):**
```json
{
  "default": {
    "type": "object",
    "description": "Default value for the parameter"
  }
}
```

**Fixed:**
```json
{
  "default": {
    "description": "Default value for the parameter"
    // NO type constraint
  }
}
```

### Priority 3: Decide on Tasks Array Type

**Options:**

1. **Keep tuple (stricter)**
   - Pro: Catches empty task lists at compile time in TypeScript
   - Con: Type mismatch with C# (but C# should validate at runtime anyway)
   - Action: None

2. **Change to regular array**
   - Pro: Perfect parity with C# `List<>`
   - Con: Empty task lists only caught at runtime/validation
   - Action: Remove `"minItems": 1` from schema

**Recommendation:** Keep tuple for compile-time safety in TypeScript.

---

## Re-Generation Checklist

After making schema fixes:

1. ✅ Update schemas with `"additionalProperties": false`
2. ✅ Fix `default` property type constraint
3. ✅ Decide on `tasks` array type
4. ✅ Run `./build/generate-typescript.sh`
5. ✅ Run tests: `npm test tests/schema-validation.test.ts`
6. ✅ Verify no `[k: string]: any` in generated types
7. ✅ Verify `default` can be primitive types
8. ✅ Commit changes with message: "fix: correct schema definitions for accurate type generation"

---

## Test Output

```
PASS tests/schema-validation.test.ts
  Schema Validation
    Workflow Schema
      ✓ should validate user-activity-analysis.yaml (13 ms)
      ✓ should validate ecommerce-analytics.yaml (3 ms)
      ✓ should reject workflow with missing required fields (1 ms)
      ✓ should reject workflow with invalid apiVersion (1 ms)
    WorkflowTask Schema
      ✓ should validate task-fetch-user.yaml (3 ms)
      ✓ should validate transform task (2 ms)
      ✓ should reject task with invalid type (1 ms)
    C# Model Compatibility
      ✓ should have matching field names between schema and C# WorkflowResource (1 ms)
      ✓ should have matching field names for WorkflowSpec
      ✓ should have matching field names for WorkflowTaskStep
    TypeScript Type Compatibility
      ✓ should compile TypeScript code using generated types (3 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        1.506 s
```

---

## Conclusion

✅ **Validation System Works:** Schemas correctly validate YAML files
✅ **Field Names Match:** C# and TypeScript have identical field names
❌ **Type Generation Issues:** 3 mismatches between C# and generated TypeScript

**Next Step:** Fix schemas and re-generate TypeScript types.
