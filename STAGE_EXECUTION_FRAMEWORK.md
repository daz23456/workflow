# Stage Execution Framework

## Execution Protocol

For each stage, we follow this systematic process:

### BEFORE Starting:
1. **Stage Declaration**
   - Stage number and name
   - Duration estimate
   - Dependencies (what must be completed first)

2. **Objectives Statement**
   - What we will build (specific deliverables)
   - Why it matters (value to the project)
   - How it fits into the larger system

3. **Success Criteria**
   - Specific, measurable outcomes
   - Test coverage targets
   - Performance benchmarks (if applicable)

### DURING Execution:
1. **Strict TDD**: RED → GREEN → REFACTOR for every feature
2. **Progress Tracking**: Update checklist as tasks complete
3. **Quality Gates**: All tests pass, coverage ≥90%

### AFTER Completion:
1. **Create Stage Proof File**
   - Copy `STAGE_PROOF_TEMPLATE.md` to `STAGE_X_PROOF.md` (where X = stage number)
   - Fill in ALL sections with actual results:
     - Test output (all tests passing)
     - Coverage report (≥90%)
     - Build verification (0 warnings)
     - Working demonstrations
     - Deliverables checklist

2. **Integration Verification**
   - Code compiles without warnings
   - All dependencies resolved
   - CI pipeline green (if configured)
   - All tests passing (0 failures)

3. **Update CHANGELOG.md**
   - Add stage completion entry with date
   - Include summary of what was built
   - Include test count, coverage percentage
   - Include commit reference

4. **Create Stage Completion Commit**
   - Stage ALL code, tests, and proof files
   - Use commit message format (see below)
   - Include test results summary in commit message
   - Commit and push

5. **Tag the Commit**
   ```bash
   git tag -a stage-X-complete -m "Stage X: [Name] - [Tests] tests, [Coverage]% coverage"
   git push --tags
   ```

6. **Stage Sign-Off**
   - Deliverables checklist: ✅ ALL items complete
   - Quality metrics met: ≥90% coverage, 0 test failures
   - Proof file created and committed
   - CHANGELOG.md updated
   - Commit tagged
   - Get explicit approval to proceed to next stage

---

## Stage Completion Commit Message Format

```
✅ Stage X Complete: [Stage Name]

## Stage Summary
- Duration: [actual time]
- Tests: [N passing / 0 failing]
- Coverage: [X.X%]
- Deliverables: [N/N completed]

## What Was Built
1. [Deliverable 1]
2. [Deliverable 2]
...

## Success Criteria Met
✅ All tests passing: [N tests, 0 failures]
✅ Code coverage: [X.X%] (target: ≥90%)
✅ Build: 0 warnings
✅ All deliverables: [N/N] complete

## Value Delivered
[1-2 sentence summary of what this enables]

## Proof
See STAGE_X_PROOF.md for complete results.

## Ready for Next Stage
All quality gates passed. CHANGELOG.md updated.

---
🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Stage 1: Foundation (Week 1, Days 1-2)

### 📋 STAGE DECLARATION

**Stage:** 1 - Foundation
**Duration:** 2 days
**Dependencies:** None (starting from scratch)

### 🎯 OBJECTIVES

#### What We Will Build:
1. **Project Structure**
   - .NET 8 solution with WorkflowCore library
   - Test project with xUnit, Moq, FluentAssertions
   - All NuGet dependencies configured

2. **Schema Models** (Task 1.2)
   - `SchemaDefinition` - JSON Schema representation
   - `PropertyDefinition` - Schema property with nested support
   - Full serialization/deserialization support

3. **CRD Models** (Task 1.3)
   - `WorkflowTaskResource` - Kubernetes CRD for tasks
   - `WorkflowTaskSpec` - Task specification with schemas
   - `HttpRequestDefinition` - HTTP task configuration

4. **Schema Parser** (Task 1.4)
   - `ISchemaParser` interface
   - `SchemaParser` implementation using JsonSchema.Net
   - Convert SchemaDefinition to JsonSchema objects

5. **Type Compatibility Checker** (Task 1.5)
   - `ITypeCompatibilityChecker` interface
   - `TypeCompatibilityChecker` with recursive validation
   - `CompatibilityResult` with detailed error reporting

6. **Workflow Models** (Task 1.6)
   - `WorkflowResource` - Kubernetes CRD for workflows
   - `WorkflowSpec` - Workflow definition with tasks
   - `WorkflowTaskStep` - Individual task in workflow

7. **Error Message Standards** (Task 1.7)
   - `ErrorMessageBuilder` static class
   - Standardized error methods with suggested fixes
   - Consistent error formatting

#### Why It Matters (Value to Project):

**1. Type Safety Foundation**
- Prevents runtime errors by catching type mismatches at design time
- Reduces debugging time and production incidents
- **Value**: Users can't deploy workflows with incompatible task chains

**2. Schema Validation Core**
- Ensures data integrity throughout the workflow
- Validates inputs before execution
- **Value**: Garbage in = rejected at the door, not propagated

**3. Developer Experience**
- Clear, consistent error messages guide users to solutions
- Suggested fixes reduce friction
- **Value**: Developers succeed faster, less support burden

**4. Kubernetes-Native Design**
- CRDs allow declarative workflow definition
- Fits naturally into K8s ecosystem
- **Value**: Familiar patterns for K8s users, GitOps-ready

**5. Testability from Day One**
- Every component has interfaces
- TDD ensures quality
- **Value**: Confidence in changes, safe refactoring, regression protection

#### How It Fits Into Larger System:

```
┌─────────────────────────────────────────────────────┐
│ Stage 1: FOUNDATION (What we're building now)       │
│                                                      │
│  ┌──────────────┐      ┌─────────────────┐         │
│  │ Schema Models│──────│Type Compatibility│         │
│  │ + Parser     │      │Checker           │         │
│  └──────┬───────┘      └────────┬─────────┘         │
│         │                       │                   │
│         └───────────┬───────────┘                   │
│                     │                               │
│              ┌──────▼──────┐                        │
│              │ CRD Models  │                        │
│              │ (Task + WF) │                        │
│              └─────────────┘                        │
└─────────────────────────────────────────────────────┘
                      │
                      │ Used by ↓
                      │
┌─────────────────────▼─────────────────────────────┐
│ Stage 2: Schema Validator                         │
│ (validates data against schemas)                  │
└───────────────────────────────────────────────────┘
                      │
                      │ Used by ↓
                      │
┌─────────────────────▼─────────────────────────────┐
│ Stage 3: Template Parser + Workflow Validator     │
│ (parses {{templates}}, validates workflows)       │
└───────────────────────────────────────────────────┘
                      │
                      │ Used by ↓
                      │
┌─────────────────────▼─────────────────────────────┐
│ Stage 4: Execution Graph Builder                  │
│ (builds dependency graph, detects cycles)         │
└───────────────────────────────────────────────────┘
                      │
                      │ Used by ↓
                      │
┌─────────────────────▼─────────────────────────────┐
│ Later Stages: Operator, Gateway, Executor, UI     │
└───────────────────────────────────────────────────┘
```

**Foundation Impact**: Everything else builds on these models and validators. If Stage 1 is solid, the entire system is solid.

### ✅ SUCCESS CRITERIA

#### Must Achieve:
1. **All Tests Passing**
   - SchemaDefinitionTests: 3 tests passing
   - WorkflowTaskResourceTests: 1 test passing
   - SchemaParserTests: 2 tests passing
   - TypeCompatibilityCheckerTests: 4 tests passing
   - WorkflowResourceTests: 1 test passing
   - ErrorMessageBuilderTests: 3 tests passing
   - **Total: 14 tests, 0 failures**

2. **Code Coverage**
   - Line coverage ≥ 90%
   - Branch coverage ≥ 85%
   - Coverage report generated

3. **Build Quality**
   - `dotnet build` succeeds with 0 warnings
   - All dependencies resolved
   - Solution structure matches specification

4. **Functionality**
   - SchemaDefinition serializes/deserializes correctly
   - Type checker detects mismatches (string vs integer)
   - Type checker validates nested objects recursively
   - Type checker validates array item types
   - Error messages include suggested fixes
   - CRDs can be deserialized from YAML

#### Deliverables Checklist:
- [ ] Solution file created: `WorkflowOperator.sln`
- [ ] WorkflowCore project created with all dependencies
- [ ] WorkflowCore.Tests project created with test dependencies
- [ ] `SchemaDefinition.cs` implemented
- [ ] `PropertyDefinition.cs` implemented
- [ ] `WorkflowTaskResource.cs` implemented
- [ ] `HttpRequestDefinition.cs` implemented
- [ ] `SchemaParser.cs` implemented with interface
- [ ] `SchemaParseException.cs` implemented
- [ ] `TypeCompatibilityChecker.cs` implemented with interface
- [ ] `CompatibilityResult.cs` implemented
- [ ] `WorkflowResource.cs` implemented
- [ ] `WorkflowSpec.cs` implemented
- [ ] `WorkflowTaskStep.cs` implemented
- [ ] `ErrorMessageBuilder.cs` implemented
- [ ] All 14 tests written and passing
- [ ] Coverage report showing ≥90%

### 📊 PROOF OF ACHIEVEMENT (To be completed after execution)

#### Test Results:
```
[To be filled with actual test output]
dotnet test --logger "console;verbosity=detailed"
```

#### Coverage Report:
```
[To be filled with coverage report]
dotnet test --collect:"XPlat Code Coverage"
reportgenerator -reports:coverage/**/coverage.cobertura.xml -targetdir:coverage/report
```

#### Build Output:
```
[To be filled with build output]
dotnet build --configuration Release
```

#### File Structure Verification:
```
[To be filled with directory tree]
tree src/ tests/
```

#### Demonstration:
```
[To be filled with code examples showing:]
1. Schema serialization working
2. Type compatibility checking working
3. Error messages with suggestions
4. YAML deserialization working
```

---

## Ready to Execute?

When you're ready, I will:

1. ✅ Execute Stage 1 following strict TDD
2. ✅ Track progress with todo list
3. ✅ Run all tests after each implementation
4. ✅ Generate proof of achievement at the end
5. ✅ Verify all success criteria are met
6. ✅ Provide comprehensive stage sign-off

**Shall we begin Stage 1: Foundation?**
