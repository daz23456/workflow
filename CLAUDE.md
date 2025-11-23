# claude.md - Kubernetes-Native Synchronous Workflow Orchestration Engine

## Project Overview

Build a production-grade, enterprise-ready Kubernetes-native workflow orchestration engine for synchronous, user-facing API calls using strict Test-Driven Development (TDD).

**Technology Stack:**
- .NET 8 with ASP.NET Core
- System.Text.Json (single serializer - no Newtonsoft)
- KubeOps 8.x for Kubernetes operator
- JsonSchema.Net 5.x for schema validation
- PostgreSQL 15 for storage
- React 18 + TypeScript for UI
- xUnit, Moq, FluentAssertions for testing
- BenchmarkDotNet, NBomber for performance testing
- New Relic for observability
- GitLab CI for CI/CD

**Non-Negotiable Requirements:**
- ✅ Test-first development (RED-GREEN-REFACTOR)
- ✅ >90% code coverage enforced
- ✅ Performance benchmarks with regression detection
- ✅ Zero tolerance for test failures

---

## Stage Execution Protocol (MANDATORY)

**BEFORE starting ANY stage, you MUST:**
1. Read `STAGE_EXECUTION_FRAMEWORK.md` in full
2. Complete the "BEFORE Starting" section for that stage
3. Review objectives, value to project, and success criteria
4. Get explicit approval to proceed
5. Create a todo list for tracking progress

**DURING stage execution:**
1. Follow strict TDD: RED → GREEN → REFACTOR
2. Update todo list as each task completes
3. Run tests after every implementation
4. Maintain ≥90% code coverage at all times
5. Commit working code frequently

**AFTER completing the stage:**
1. Create `STAGE_X_PROOF.md` file with all results (see STAGE_PROOF_TEMPLATE.md)
2. Include test output, coverage report, and build verification
3. Verify ALL deliverables checklist items are ✅
4. Create stage completion commit with proof file
5. Tag commit as `stage-X-complete`
6. Get explicit sign-off before proceeding to next stage

**🚨 NON-COMPLIANCE = UNACCEPTABLE**
- No stage may begin without completing BEFORE requirements
- No stage may be considered complete without STAGE_X_PROOF.md file
- No next stage may begin without explicit sign-off on current stage
- Framework template: `STAGE_EXECUTION_FRAMEWORK.md`
- Proof template: `STAGE_PROOF_TEMPLATE.md`

**This protocol ensures production-ready quality at every step. No exceptions.**

---

## Project Structure
```
workflow-operator/
├── src/
│   ├── WorkflowCore/              # Shared domain
│   │   ├── Models/
│   │   ├── Services/
│   │   └── Interfaces/
│   ├── WorkflowOperator/          # K8s operator
│   ├── WorkflowGateway/           # API gateway
│   ├── WorkflowUI.Backend/        # UI API
│   └── WorkflowUI.Frontend/       # React UI
├── tests/
│   ├── WorkflowCore.Tests/              # Unit tests
│   ├── WorkflowCore.IntegrationTests/   # Integration tests
│   ├── WorkflowCore.PerformanceTests/   # Benchmarks
│   ├── FunctionalTests/                 # E2E functional
│   └── E2ETests/                        # Full system E2E
├── deploy/
│   ├── crds/
│   ├── helm/
│   └── environments/
├── docs/
├── benchmarks/results/
├── CLAUDE.md                            # Main specification (THIS FILE)
├── STAGE_EXECUTION_FRAMEWORK.md         # Stage execution protocol (MANDATORY)
├── STAGE_PROOF_TEMPLATE.md              # Template for stage proof files
├── STAGE_1_PROOF.md                     # Stage 1 completion proof
├── STAGE_2_PROOF.md                     # Stage 2 completion proof
├── ... (one proof file per stage)
├── .gitlab-ci.yml
├── sonar-project.properties
├── Directory.Build.props
└── README.md
```

---

**📋 EXECUTION CHECKPOINT**

**Before implementing this stage:**
1. ✅ Open and review `STAGE_EXECUTION_FRAMEWORK.md`
2. ✅ Read Stage 1 objectives and understand value to project
3. ✅ Review success criteria (14 tests, ≥90% coverage, 17 deliverables)
4. ✅ Get approval to proceed with Stage 1

**After completing this stage:**
1. ✅ Create `STAGE_1_PROOF.md` with all test results and coverage
2. ✅ Verify all 14 tests passing, 0 failures
3. ✅ Verify coverage ≥90%
4. ✅ Commit with message: "✅ Stage 1 Complete: Foundation"
5. ✅ Tag commit: `git tag -a stage-1-complete -m "Stage 1 complete"`
6. ✅ Get sign-off before proceeding to Stage 2

---


## Completed Stages (1-7)

**Status:** 7/11 stages complete (64%)

Detailed TDD implementation instructions for Stages 1-4 have been archived to `COMPLETED_STAGES_ARCHIVE.md`.  
For proof of completion and actual results, see the respective `STAGE_X_PROOF.md` files.

### Stage 1: Foundation ✅
**Status:** Complete  
**Proof:** `STAGE_1_PROOF.md`  
**Metrics:** 21/21 tests, 91.8% coverage, 0 vulnerabilities

**Deliverables:**
- Project structure (.NET 8 solution)
- Schema models (SchemaDefinition, PropertyDefinition)
- CRD models (WorkflowTaskResource, WorkflowResource)
- Schema parser (JsonSchema.Net integration)
- Type compatibility checker (recursive validation)
- Error message standards

### Stage 2: Schema Validation ✅
**Status:** Complete  
**Proof:** `STAGE_2_PROOF.md`  
**Metrics:** 29/29 tests, 91.9% coverage, 0 vulnerabilities

**Deliverables:**
- ValidationResult and ValidationError models
- ISchemaValidator interface
- SchemaValidator implementation (JsonSchema.Net integration)

### Stage 3: Template Validation ✅
**Status:** Complete  
**Proof:** `STAGE_3_PROOF.md`  
**Metrics:** 37/37 tests, 90.9% coverage, 0 vulnerabilities

**Deliverables:**
- TemplateParser service (regex-based parsing)
- TemplateParseResult, TemplateExpression models
- WorkflowValidator service (orchestrates all validations)
- Updated TypeCompatibilityChecker and ErrorMessageBuilder

### Stage 4: Execution Graph ✅
**Status:** Complete  
**Proof:** `STAGE_4_PROOF.md`  
**Metrics:** 41/41 tests, 92.1% coverage, 0 vulnerabilities

**Deliverables:**
- ExecutionGraph model (cycle detection, topological sort)
- ExecutionGraphBuilder service
- Circular dependency detection with clear error messages

### Stage 5: Workflow Execution ✅
**Status:** Complete  
**Proof:** `STAGE_5_PROOF.md`  
**Metrics:** 123/123 tests, 91.7% coverage, 0 vulnerabilities, 74.30% mutation score

**Deliverables:**
- TemplateResolver service (runtime template resolution)
- RetryPolicy service (exponential backoff)
- HttpTaskExecutor service (HTTP execution with retries)
- WorkflowOrchestrator service (dependency-aware execution)
- HttpClientWrapper (testable HTTP client)

### Stage 6: Kubernetes Operator with Validation Webhooks ✅
**Status:** Complete  
**Proof:** `STAGE_6_PROOF.md`  
**Metrics:** 142/142 tests, 91.2% coverage, 0 vulnerabilities

**Deliverables:**
- WorkflowTaskController (reconciles WorkflowTask CRDs)
- WorkflowController (reconciles Workflow CRDs)
- WorkflowTaskValidationWebhook (validates HTTP tasks)
- WorkflowValidationWebhook (validates workflows, templates, dependencies)
- AdmissionResult, WorkflowTaskStatus, WorkflowStatus models

**Value Delivered:** Fail-fast validation at kubectl apply time prevents invalid workflows from deployment.

---

## GitLab CI Pipeline

Create `.gitlab-ci.yml`:
```yaml
stages:
  - test
  - build

variables:
  MINIMUM_COVERAGE: "90"

test:unit:
  stage: test
  image: mcr.microsoft.com/dotnet/sdk:8.0
  script:
    - dotnet restore
    - dotnet test tests/WorkflowCore.Tests 
        --configuration Release 
        --logger "junit;LogFilePath=test-results.xml"
        --collect:"XPlat Code Coverage"
        --results-directory ./coverage
    
    - dotnet tool install --global dotnet-reportgenerator-globaltool
    - export PATH="$PATH:$HOME/.dotnet/tools"
    - reportgenerator 
        -reports:./coverage/**/coverage.cobertura.xml 
        -targetdir:./coverage/report 
        -reporttypes:"Html;TextSummary;Cobertura"
    
    - |
      COVERAGE=$(grep -oP 'Line coverage: \K[0-9.]+' ./coverage/report/Summary.txt)
      echo "Coverage: $COVERAGE%"
      if (( $(echo "$COVERAGE < $MINIMUM_COVERAGE" | bc -l) )); then
        echo "ERROR: Coverage $COVERAGE% is below minimum $MINIMUM_COVERAGE%"
        exit 1
      fi
  
  coverage: '/Line coverage: \d+\.\d+%/'
  artifacts:
    reports:
      junit: tests/WorkflowCore.Tests/test-results.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/report/Cobertura.xml
    paths:
      - coverage/report/
    expire_in: 30 days

build:
  stage: build
  image: mcr.microsoft.com/dotnet/sdk:8.0
  script:
    - dotnet build --configuration Release
  dependencies:
    - test:unit
  only:
    - main
```

---

## Development Workflow

### TDD Cycle (RED-GREEN-REFACTOR)

**For every new feature:**

1. **RED**: Write failing test
```bash
# Create test file
touch tests/WorkflowCore.Tests/Services/NewFeatureTests.cs
# Write test that fails
dotnet test tests/WorkflowCore.Tests
# Test should FAIL
```

2. **GREEN**: Write minimum code to pass
```bash
# Create implementation
touch src/WorkflowCore/Services/NewFeature.cs
# Write minimal implementation
dotnet test tests/WorkflowCore.Tests
# Test should PASS
```

3. **REFACTOR**: Clean up while keeping tests green
```bash
# Improve code quality
dotnet test tests/WorkflowCore.Tests
# Tests should still PASS
```

### Running Tests
```bash
# Run all tests
dotnet test

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run specific test class
dotnet test --filter "FullyQualifiedName~SchemaValidatorTests"

# Run in watch mode (TDD)
dotnet watch test tests/WorkflowCore.Tests

# Generate coverage report
dotnet tool install --global dotnet-reportgenerator-globaltool
reportgenerator -reports:coverage/**/coverage.cobertura.xml -targetdir:coverage/report -reporttypes:Html
```

---

## Performance Testing Setup

Create `tests/WorkflowCore.PerformanceTests/WorkflowCore.PerformanceTests.csproj`:
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="BenchmarkDotNet" Version="0.13.11" />
    <ProjectReference Include="..\..\src\WorkflowCore\WorkflowCore.csproj" />
  </ItemGroup>
</Project>
```

Create `tests/WorkflowCore.PerformanceTests/Benchmarks/SchemaValidationBenchmarks.cs`:
```csharp
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowCore.PerformanceTests.Benchmarks;

[MemoryDiagnoser]
public class SchemaValidationBenchmarks
{
    private ISchemaValidator _validator = null!;
    private SchemaDefinition _schema = null!;
    private Dictionary<string, object> _validData = null!;

    [GlobalSetup]
    public void Setup()
    {
        var parser = new SchemaParser();
        _validator = new SchemaValidator(parser);
        
        _schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer" }
            }
        };

        _validData = new Dictionary<string, object>
        {
            ["name"] = "John",
            ["age"] = 30
        };
    }

    [Benchmark]
    public async Task<ValidationResult> ValidateSchema()
    {
        return await _validator.ValidateAsync(_schema, _validData);
    }
}

public class Program
{
    public static void Main(string[] args)
    {
        BenchmarkRunner.Run<SchemaValidationBenchmarks>();
    }
}
```

---

## Next Steps

### Week 1 (COMPLETE - Foundation & Validation):
**Stage 1: Foundation**
- ✅ Task 1.1: Project Setup
- ✅ Task 1.2: Schema Models (SchemaDefinition, PropertyDefinition)
- ✅ Task 1.3: CRD Models (WorkflowTaskResource)
- ✅ Task 1.4: Schema Parser
- ✅ Task 1.5: Type Compatibility Checker
- ✅ Task 1.6: Workflow CRD Models
- ✅ Task 1.7: Error Message Standards

**Stage 2: Schema Validation**
- ✅ Task 2.1: Schema Validator with ValidationResult

### Week 2 (Template & Execution Graph):
**Stage 3: Template Validation**
- ✅ Task 3.1: Template Parser ({{input.x}}, {{tasks.y.output.z}})
- ✅ Task 3.2: Workflow Validator (orchestrates all validations)

**Stage 4: Execution Graph**
- ✅ Task 4.1: Execution Graph Builder
- ✅ Circular dependency detection
- ✅ Topological sort for execution order

### Week 3 (Workflow Execution Engine):
**Stage 5: Workflow Execution (TDD)**
1. HTTP Task Executor
   - HTTP client with retries
   - Template resolution at runtime
   - Response parsing and validation
2. Workflow Orchestrator
   - Execute tasks in dependency order
   - Handle parallel execution
   - Collect and pass data between tasks
3. Error handling and retry logic

### Week 4 (Kubernetes Operator):
**Stage 6: Kubernetes Operator with Validation Webhooks (TDD)**
1. Custom Resource Controllers
   - WorkflowTask controller
   - Workflow controller
   - Watch for CRD changes
2. Validating Admission Webhooks
   - Validate WorkflowTask on apply
   - Validate Workflow on apply
   - Reject invalid resources with helpful errors
3. Schema Evolution Protection
   - Detect breaking changes in task schemas
   - Track dependent workflows
   - Prevent breaking updates

### Week 5 (API Gateway):
**Stage 7: API Gateway (TDD)** ✅
1. Workflow Execution API
   - POST /api/v1/workflows/{name}/execute
   - Input validation against workflow schema
   - Synchronous execution with timeout
2. Dry-Run & Testing API
   - POST /api/v1/workflows/{name}/test (dry-run mode)
   - Validation-only execution
   - Return execution plan without side effects
3. Workflow Management API
   - GET /api/v1/workflows (list)
   - GET /api/v1/workflows/{name} (get)
   - GET /api/v1/tasks (list tasks)

### Week 5.5 (Workflow Orchestration Enhancements):
**Stage 7.5: Output Mapping & Parallel Execution (TDD)**
1. Workflow Output Mapping
   - Add Output property to WorkflowSpec model
   - Implement output mapping in WorkflowOrchestrator (currently returns empty dictionary)
   - Support nested output expressions (e.g., "{{tasks.fetch-user.output.data.email}}")
   - Validate output mappings at workflow definition time
   - Add comprehensive tests for output mapping edge cases
2. Parallel Task Execution
   - Analyze execution graph to identify independent tasks
   - Execute independent tasks in parallel using Task.WhenAll()
   - Maintain dependency ordering for dependent tasks
   - Add configurable parallelism limits (max concurrent tasks)
   - Measure and compare performance vs sequential execution
3. Task Timeout Support
   - Add Timeout property to WorkflowTaskSpec model
   - Implement per-task timeout enforcement in WorkflowOrchestrator
   - Handle timeout gracefully with clear error messages
   - Add tests for timeout scenarios and cancellation

### Week 5.75 (API Gateway Extensions):
**Stage 7.75: Execution History & Enhanced Dry-Run (TDD)**
1. Execution History Endpoints
   - GET /api/v1/workflows/{name}/executions - List all executions for a workflow
   - GET /api/v1/executions/{id} - Get detailed execution info with task results
   - GET /api/v1/workflows/{name}/versions - List workflow version history
   - GET /api/v1/workflows/{name}/versions/{version} - Get specific version details
   - POST /api/v1/executions/{id}/resume - Resume a paused workflow execution
2. Enhanced Dry-Run Visualization
   - Return execution plan as directed graph (nodes: tasks, edges: dependencies)
   - Include resolved template values in execution plan
   - Estimate execution time based on task count and historical data
   - Show parallel execution groups visually
   - Validate all templates without executing HTTP calls
3. Execution Trace Endpoints
   - GET /api/v1/executions/{id}/trace - Get detailed execution trace
   - Include timing for each task (start, end, duration)
   - Show dependency resolution order
   - Include template resolution details

### Week 6 (Database Integration & State Management):
**Stage 8: PostgreSQL Integration & Workflow State (TDD)**
1. Database Schema Design
   - workflow_executions table (id, workflow_name, status, started_at, completed_at, duration)
   - workflow_execution_tasks table (execution_id, task_id, status, output, errors, duration)
   - workflow_versions table (workflow_name, version, definition, created_at)
   - workflow_audit_log table (workflow_name, action, changed_by, changed_at, changes)
2. Execution History Storage
   - Save workflow execution state at workflow start
   - Update execution state as each task completes
   - Store task outputs and errors in database
   - Record total execution duration
   - Add queries for execution history retrieval
3. Workflow State Persistence & Recovery
   - Implement workflow pause capability (save state mid-execution)
   - Implement workflow resume from saved state
   - Handle partial execution recovery after failures
   - Add state migration for workflow definition changes
4. Workflow Versioning
   - Track workflow definition versions automatically
   - Store version metadata (author, timestamp, changelog)
   - Implement version comparison and diff
   - Prevent breaking changes to active workflows
   - Add rollback capability for workflow definitions
5. Integration Tests with TestContainers
   - Full stack tests (Operator + Gateway + Postgres)
   - Test workflow execution with database persistence
   - Test state recovery and resume scenarios
   - Validate version tracking and migration
   - Test with real Kubernetes resources

### Week 7-8 (UI):
**Stage 9: UI Backend & Frontend (TDD)**
1. UI Backend API
   - Workflow builder endpoints
   - Real-time validation API
   - Execution monitoring
2. React Frontend
   - Visual workflow builder with drag-drop
   - Real-time validation feedback
   - Execution history viewer
3. Component & E2E tests with Playwright

### Week 9-10 (Performance & Production):
**Stage 10: Performance Testing & Optimization (TDD)**
1. Performance Testing
   - BenchmarkDotNet for critical paths
   - Optimize schema validation
   - Optimize template resolution
2. Load Testing with NBomber
   - Concurrent workflow executions
   - Stress test admission webhooks
   - Database performance under load
3. Observability
   - New Relic integration
   - Distributed tracing
   - Custom metrics and dashboards

### Week 11-12 (Cloud Deployment & E2E):
**Stage 11: Cloud Deployment & Production Hardening (TDD)**
1. Helm Charts
   - Operator deployment
   - Gateway deployment
   - PostgreSQL (or cloud DB)
2. Cloud E2E Tests
   - Deploy to GKE (Google Kubernetes Engine)
   - Deploy to AKS (Azure Kubernetes Service)
   - Full E2E workflow tests in cloud
3. Production Hardening
   - Security scanning
   - Resource limits and quotas
   - High availability configuration

---

## Quality Gates (Enforced)

### Every Commit Must:
- [ ] All unit tests pass (100%)
- [ ] Code coverage ≥ 90%
- [ ] No compiler warnings
- [ ] Code formatted (dotnet format)
- [ ] All new code follows TDD (test written first)

### Every Merge Must:
- [ ] All integration tests pass
- [ ] Performance benchmarks show no regression
- [ ] Code review approved
- [ ] All validation features have comprehensive tests:
  - [ ] Schema validation tests
  - [ ] Type compatibility tests
  - [ ] Template parsing tests
  - [ ] Circular dependency detection tests

### Every Deployment Must:
- [ ] All functional tests pass
- [ ] Load tests pass
- [ ] E2E tests pass
- [ ] Security scan passed
- [ ] Validation webhooks tested in staging
- [ ] No workflows can be deployed that fail validation

### Production Readiness Checklist:
- [ ] **Schema Validation**: All inputs/outputs validated against JSON Schema
- [ ] **Type Safety**: Type compatibility checked before workflow deployment
- [ ] **Template Validation**: All templates parsed and validated
- [ ] **Dependency Checking**: Circular dependencies detected and rejected
- [ ] **Error Messages**: All errors include helpful messages and suggested fixes
- [ ] **Admission Webhooks**: Invalid resources rejected at apply-time
- [ ] **Dry-Run Mode**: Users can test workflows without side effects
- [ ] **Breaking Change Detection**: Schema evolution protected
- [ ] **Observability**: All validation failures logged and tracked
- [ ] **Documentation**: Error messages link to docs

---

## Getting Started Checklist

1. **Clone or create repository**
2. **Read `STAGE_EXECUTION_FRAMEWORK.md` in full** ← MANDATORY FIRST STEP
3. **Understand the stage execution protocol (BEFORE, DURING, AFTER)**
4. **Review Stage 1 objectives and success criteria**
5. **Run initial setup:**
```bash
   dotnet new sln -n WorkflowOperator
   dotnet new classlib -n WorkflowCore -o src/WorkflowCore
   dotnet new xunit -n WorkflowCore.Tests -o tests/WorkflowCore.Tests
   dotnet sln add src/WorkflowCore/WorkflowCore.csproj
   dotnet sln add tests/WorkflowCore.Tests/WorkflowCore.Tests.csproj
```

6. **Add dependencies (see Stage 1, Task 1.1)**
7. **Create first test (SchemaDefinitionTests.cs) - RED**
8. **Run test - watch it FAIL**
9. **Implement code to make test PASS - GREEN**
10. **Refactor while keeping tests GREEN**
11. **Commit with passing tests**
12. **Repeat for next feature until stage complete**
13. **Create STAGE_1_PROOF.md with results**
14. **Commit stage completion and tag**

---

## Success Criteria

### Code Quality:
- ✅ Every feature has tests written FIRST
- ✅ All tests pass before committing
- ✅ Code coverage never drops below 90%
- ✅ CI pipeline is always green
- ✅ Performance benchmarks show no regression
- ✅ Zero production incidents from regressions

### Production Readiness:
- ✅ **Impossible to deploy broken workflows**
  - Schema validation catches errors before deployment
  - Type compatibility verified at design time
  - Circular dependencies rejected immediately
- ✅ **Developer Experience is exceptional**
  - Clear, actionable error messages with suggested fixes
  - Dry-run mode for safe testing
  - Real-time validation feedback in UI
- ✅ **Quality is built-in, not bolted on**
  - TDD ensures every feature is testable
  - Validation happens at every stage (design, deploy, runtime)
  - Breaking changes are prevented, not discovered in production
- ✅ **Observability from day one**
  - All validation failures logged and tracked
  - Execution traces show exactly what happened
  - Performance metrics collected continuously

### Key Differentiators:
1. **POC with production-grade quality** - Even prototypes follow strict quality standards
2. **Fail fast** - Errors caught at design time, not runtime
3. **Developer-friendly** - Validation helps users succeed, doesn't block them
4. **Zero surprises** - If it deploys, it works

---

**This is your complete specification. Follow TDD religiously: RED → GREEN → REFACTOR. No exceptions.**

**Remember: We're building a POC, but quality is non-negotiable. Every line of code must be production-ready.**

**⚠️ CRITICAL: Every stage MUST follow the STAGE_EXECUTION_FRAMEWORK.md protocol:**
- **BEFORE**: Review objectives, value, and success criteria in framework
- **DURING**: TDD (RED-GREEN-REFACTOR), progress tracking, quality gates
- **AFTER**: Create STAGE_X_PROOF.md, generate reports, commit with tag, get sign-off

**Files You Must Use:**
- `STAGE_EXECUTION_FRAMEWORK.md` - Read before starting ANY stage
- `STAGE_PROOF_TEMPLATE.md` - Template for proof files
- `STAGE_X_PROOF.md` - Create one for each completed stage
- `CHANGELOG.md` - Updated after each stage completion

**No stage begins without framework review. No stage completes without proof file. No exceptions.**