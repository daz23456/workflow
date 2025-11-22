# Stage 7: API Gateway - Implementation Guide (Session 2)

**Status:** Foundation Complete (Models + Tests)
**Progress:** 8/40+ tests passing
**Next Session:** Implement dynamic endpoint system

---

## What's Already Done ✅

### Project Structure
- **WorkflowGateway** - ASP.NET Core Web API project
- **WorkflowGateway.Tests** - xUnit test project
- Dependencies: Swashbuckle.AspNetCore 10.0.1, Moq, FluentAssertions

### Models (7/7 Complete - 8 Tests Passing)
All models implemented with JSON serialization:
1. ✅ `WorkflowExecutionRequest` - Input for execution
2. ✅ `WorkflowExecutionResponse` - Execution results
3. ✅ `WorkflowTestRequest` - Input for dry-run
4. ✅ `WorkflowTestResponse` - Validation results + execution plan
5. ✅ `WorkflowListResponse` - List of workflows
6. ✅ `WorkflowDetailResponse` - Single workflow details
7. ✅ `TaskListResponse` - List of tasks

**Supporting Models:**
- ✅ `ExecutionPlan` - Task order + parallelizable tasks
- ✅ `WorkflowSummary` - Workflow metadata
- ✅ `WorkflowEndpoints` - Dynamic endpoint URLs
- ✅ `TaskSummary` - Task metadata

---

## Architecture Overview

### Key Requirement (User Specified)
**When you upload a Workflow CRD to Kubernetes, that workflow MUST appear as a dedicated endpoint in Swagger UI.**

**Example:**
```bash
kubectl apply -f user-enrichment-workflow.yaml
```

**Within 30 seconds, Swagger shows:**
```
POST /api/v1/user-enrichment/execute
  Request Body: { "userId": "string" }  # From workflow.spec.input

POST /api/v1/user-enrichment/test
  Dry-run validation

GET /api/v1/user-enrichment
  Workflow details
```

**On delete:**
```bash
kubectl delete -f user-enrichment-workflow.yaml
```
Endpoints automatically removed from Swagger within 30 seconds!

---

## Components to Build (Priority Order)

### Phase 1: Discovery & Validation Services

#### 1. WorkflowDiscoveryService (HIGHEST PRIORITY)
**Purpose:** Query Kubernetes for workflows, cache results, detect changes

**File:** `src/WorkflowGateway/Services/WorkflowDiscoveryService.cs`

**Interface:**
```csharp
public interface IWorkflowDiscoveryService
{
    Task<List<WorkflowResource>> DiscoverWorkflowsAsync(string? namespace = null);
    Task<WorkflowResource?> GetWorkflowByNameAsync(string name, string? namespace = null);
    Task<List<WorkflowTaskResource>> DiscoverTasksAsync(string? namespace = null);
    event EventHandler<WorkflowChangedEventArgs>? WorkflowsChanged;
}
```

**Implementation Notes:**
- Use `KubernetesClient` to query Custom Resource Definitions
- Cache workflows with 30-second TTL
- Raise `WorkflowsChanged` event when workflows added/removed
- Thread-safe dictionary for cache

**Tests (6):**
1. DiscoverWorkflows_ShouldQueryKubernetes
2. DiscoverWorkflows_ShouldCacheResults
3. DiscoverWorkflows_ShouldRefreshAfterTTL
4. GetWorkflowByName_ShouldReturnWorkflow
5. GetWorkflowByName_WhenNotFound_ShouldReturnNull
6. WorkflowsChanged_ShouldFireWhenCacheRefreshes

**Test File:** `tests/WorkflowGateway.Tests/Services/WorkflowDiscoveryServiceTests.cs`

---

#### 2. InputValidationService
**Purpose:** Validate user input against workflow input schemas

**File:** `src/WorkflowGateway/Services/InputValidationService.cs`

**Interface:**
```csharp
public interface IInputValidationService
{
    Task<ValidationResult> ValidateAsync(
        WorkflowResource workflow,
        Dictionary<string, object> input);
}
```

**Implementation Notes:**
- Extract `workflow.Spec.Input` schema
- Use `ISchemaValidator` from WorkflowCore (Stage 2)
- Convert workflow input definition to `SchemaDefinition`
- Return field-level validation errors

**Tests (6):**
1. ValidateAsync_WithValidInput_ShouldReturnSuccess
2. ValidateAsync_WithMissingRequiredField_ShouldReturnError
3. ValidateAsync_WithInvalidType_ShouldReturnError
4. ValidateAsync_WithNoInputSchema_ShouldAllowAnyInput
5. ValidateAsync_ShouldUseSchemaValidator
6. ValidateAsync_ShouldReturnFieldLevelErrors

**Test File:** `tests/WorkflowGateway.Tests/Services/InputValidationServiceTests.cs`

---

#### 3. WorkflowExecutionService
**Purpose:** Execute workflows using WorkflowOrchestrator

**File:** `src/WorkflowGateway/Services/WorkflowExecutionService.cs`

**Interface:**
```csharp
public interface IWorkflowExecutionService
{
    Task<WorkflowExecutionResponse> ExecuteAsync(
        WorkflowResource workflow,
        Dictionary<string, object> input,
        CancellationToken cancellationToken = default);
}
```

**Implementation Notes:**
- Use `IWorkflowOrchestrator` from Stage 5
- Enforce timeout (from appsettings, default 30s)
- Convert `WorkflowExecutionResult` to `WorkflowExecutionResponse`
- Track execution time

**Tests (6):**
1. ExecuteAsync_WithValidWorkflow_ShouldReturnResult
2. ExecuteAsync_ShouldUseOrchestrator
3. ExecuteAsync_ShouldEnforceTimeout
4. ExecuteAsync_WithFailure_ShouldReturnError
5. ExecuteAsync_ShouldIncludeExecutionMetrics
6. ExecuteAsync_ShouldCancelOnTimeout

**Test File:** `tests/WorkflowGateway.Tests/Services/WorkflowExecutionServiceTests.cs`

---

### Phase 2: Dynamic Routing (CORE ARCHITECTURE)

#### 4. DynamicEndpointService (CRITICAL COMPONENT)
**Purpose:** Register/unregister ASP.NET Core routes dynamically

**File:** `src/WorkflowGateway/Services/DynamicEndpointService.cs`

**Interface:**
```csharp
public interface IDynamicEndpointService
{
    void RegisterWorkflow(WorkflowResource workflow);
    void UnregisterWorkflow(string workflowName);
    List<string> GetRegisteredEndpoints();
}
```

**Implementation Notes:**
- Use `IEndpointRouteBuilder` to add routes at runtime
- Create 3 endpoints per workflow:
  - `POST /api/v1/{workflow-name}/execute`
  - `POST /api/v1/{workflow-name}/test`
  - `GET /api/v1/{workflow-name}`
- Store endpoint metadata for Swagger generation
- Thread-safe route registration/unregistration

**Key Challenge:** ASP.NET Core routes are typically registered at startup. You need to:
1. Use `IActionDescriptorCollectionProvider` to modify route collection
2. Implement `IActionDescriptorChangeProvider` to notify of changes
3. Create `ActionDescriptor` instances dynamically

**Tests (6):**
1. RegisterWorkflow_ShouldAddThreeEndpoints
2. UnregisterWorkflow_ShouldRemoveAllEndpoints
3. RegisterWorkflow_WithSameName_ShouldUpdateExisting
4. GetRegisteredEndpoints_ShouldReturnAllWorkflows
5. RegisterWorkflow_ShouldBeThreadSafe
6. UnregisterWorkflow_WhenNotExists_ShouldNotThrow

**Test File:** `tests/WorkflowGateway.Tests/Services/DynamicEndpointServiceTests.cs`

---

### Phase 3: Controllers

#### 5. DynamicWorkflowController
**Purpose:** Template controller that handles workflow-specific endpoints

**File:** `src/WorkflowGateway/Controllers/DynamicWorkflowController.cs`

**Structure:**
```csharp
[ApiController]
[Route("api/v1/[controller]")]
public class DynamicWorkflowController : ControllerBase
{
    private readonly IWorkflowDiscoveryService _discovery;
    private readonly IInputValidationService _validation;
    private readonly IWorkflowExecutionService _execution;

    [HttpPost("{workflowName}/execute")]
    public async Task<IActionResult> Execute(
        string workflowName,
        [FromBody] WorkflowExecutionRequest request)
    {
        // Get workflow from discovery
        // Validate input
        // Execute workflow
        // Return response
    }

    [HttpPost("{workflowName}/test")]
    public async Task<IActionResult> Test(
        string workflowName,
        [FromBody] WorkflowTestRequest request)
    {
        // Get workflow
        // Validate input
        // Build execution plan (no execution)
        // Return test response
    }

    [HttpGet("{workflowName}")]
    public async Task<IActionResult> GetDetails(string workflowName)
    {
        // Get workflow
        // Return workflow details
    }
}
```

**Note:** This is NOT tested directly. The dynamic routing tests will verify behavior.

---

#### 6. WorkflowManagementController
**Purpose:** Static endpoints for listing workflows and tasks

**File:** `src/WorkflowGateway/Controllers/WorkflowManagementController.cs`

**Endpoints:**
```csharp
[HttpGet("api/v1/workflows")]
public async Task<WorkflowListResponse> GetWorkflows()

[HttpGet("api/v1/tasks")]
public async Task<TaskListResponse> GetTasks()
```

**Tests (6):**
1. GetWorkflows_ShouldReturnAllWorkflows
2. GetWorkflows_WithNamespace_ShouldFilterByNamespace
3. GetWorkflows_ShouldIncludeEndpointUrls
4. GetTasks_ShouldReturnAllTasks
5. GetTasks_WithNamespace_ShouldFilterByNamespace
6. GetWorkflows_ShouldReturnCachedResults

**Test File:** `tests/WorkflowGateway.Tests/Controllers/WorkflowManagementControllerTests.cs`

---

### Phase 4: Background Service & Swagger

#### 7. WorkflowWatcherService
**Purpose:** Background service that polls Kubernetes and triggers route updates

**File:** `src/WorkflowGateway/Services/WorkflowWatcherService.cs`

**Implementation:**
```csharp
public class WorkflowWatcherService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Poll WorkflowDiscoveryService every 30s
            // Compare with previous state
            // Call DynamicEndpointService to register/unregister
            // Trigger Swagger document regeneration

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
```

**Register in Program.cs:**
```csharp
builder.Services.AddHostedService<WorkflowWatcherService>();
```

**Tests:** Integration test only (verify service starts/stops)

---

#### 8. Swagger Integration
**Purpose:** Generate OpenAPI spec with dynamic workflow endpoints

**Files:**
- `src/WorkflowGateway/Swagger/DynamicSwaggerDocumentFilter.cs`
- `src/WorkflowGateway/Swagger/WorkflowSchemaFilter.cs`

**DynamicSwaggerDocumentFilter:**
```csharp
public class DynamicSwaggerDocumentFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        // Get registered workflows from DynamicEndpointService
        // For each workflow:
        //   - Add POST /api/v1/{name}/execute operation
        //   - Add POST /api/v1/{name}/test operation
        //   - Add GET /api/v1/{name} operation
        //   - Add workflow-specific request/response schemas
    }
}
```

**WorkflowSchemaFilter:**
```csharp
public class WorkflowSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        // Convert WorkflowResource input schemas to OpenAPI schemas
        // Add descriptions from workflow metadata
    }
}
```

**Configure in Program.cs:**
```csharp
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Workflow Gateway API", Version = "v1" });
    c.DocumentFilter<DynamicSwaggerDocumentFilter>();
    c.SchemaFilter<WorkflowSchemaFilter>();
});
```

---

### Phase 5: Configuration & Integration

#### 9. appsettings.json
```json
{
  "Workflow": {
    "ExecutionTimeoutSeconds": 30,
    "DiscoveryCacheTTLSeconds": 30,
    "WatcherIntervalSeconds": 30,
    "Kubernetes": {
      "Namespace": "default",
      "UseInClusterConfig": false
    }
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "WorkflowGateway": "Debug"
    }
  }
}
```

#### 10. Program.cs Configuration
```csharp
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(/* see above */);

// Workflow services
builder.Services.AddSingleton<IWorkflowDiscoveryService, WorkflowDiscoveryService>();
builder.Services.AddSingleton<IDynamicEndpointService, DynamicEndpointService>();
builder.Services.AddScoped<IInputValidationService, InputValidationService>();
builder.Services.AddScoped<IWorkflowExecutionService, WorkflowExecutionService>();

// Background service
builder.Services.AddHostedService<WorkflowWatcherService>();

// WorkflowCore services (from Stage 5)
builder.Services.AddScoped<IWorkflowOrchestrator, WorkflowOrchestrator>();
builder.Services.AddScoped<ISchemaValidator, SchemaValidator>();
// ... other WorkflowCore services

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();
app.Run();
```

---

## Testing Strategy

### Unit Tests (30+ total)
- ✅ Models: 8 tests (DONE)
- WorkflowDiscoveryService: 6 tests
- DynamicEndpointService: 6 tests
- InputValidationService: 6 tests
- WorkflowExecutionService: 6 tests
- WorkflowManagementController: 6 tests

### Integration Tests (Optional for Stage 7)
- End-to-end test with real Kubernetes (can defer to Stage 8)
- Swagger UI manual verification

---

## Implementation Order for Next Session

**Session 2 Recommended Sequence:**

1. **WorkflowDiscoveryService** (TDD)
   - Write 6 tests (RED)
   - Implement with K8s client (GREEN)
   - Add caching and events (REFACTOR)

2. **InputValidationService** (TDD)
   - Write 6 tests (RED)
   - Implement with SchemaValidator integration (GREEN)
   - Add field-level error mapping (REFACTOR)

3. **WorkflowExecutionService** (TDD)
   - Write 6 tests (RED)
   - Implement with Orchestrator integration (GREEN)
   - Add timeout handling (REFACTOR)

4. **DynamicEndpointService** (TDD - COMPLEX)
   - Research ASP.NET Core dynamic routing
   - Write 6 tests (RED)
   - Implement route registration (GREEN)
   - Add thread safety (REFACTOR)

5. **WorkflowManagementController** (TDD)
   - Write 6 tests (RED)
   - Implement endpoints (GREEN)
   - Add filtering (REFACTOR)

6. **DynamicWorkflowController**
   - Implement template controller
   - Wire up services
   - Test manually

7. **WorkflowWatcherService**
   - Implement background polling
   - Wire up to DynamicEndpointService
   - Test startup/shutdown

8. **Swagger Integration**
   - Implement filters
   - Configure in Program.cs
   - Manually verify Swagger UI

9. **Configuration**
   - Update appsettings.json
   - Update Program.cs
   - Add Kubernetes client configuration

10. **Quality Gates & Proof**
    - Run all tests
    - Generate coverage report
    - Create STAGE_7_PROOF.md
    - Update CHANGELOG.md
    - Commit and tag

---

## Key Technical Challenges

### 1. Dynamic Route Registration
**Challenge:** ASP.NET Core routes are typically static at startup

**Solution Options:**
- **Option A:** Use `IActionDescriptorChangeProvider` + `IActionDescriptorCollectionProvider`
- **Option B:** Use minimal APIs with `MapDynamicControllerRoute()`
- **Option C:** Use controller conventions with dynamic route values

**Recommended:** Option A (most flexible, works with Swagger)

### 2. Swagger Document Regeneration
**Challenge:** Swagger docs are typically generated once at startup

**Solution:** Implement `IDocumentFilter` that queries current workflows on each Swagger request

### 3. Kubernetes Client Configuration
**Challenge:** Different config for in-cluster vs local development

**Solution:** Check `UseInClusterConfig` setting, use `KubernetesClientConfiguration`

### 4. Thread Safety
**Challenge:** Background service modifies routes while requests are being handled

**Solution:** Use `ConcurrentDictionary` for workflow cache, lock on route modifications

---

## Success Criteria

### Functional Requirements
- [ ] Upload workflow CRD → appears in Swagger within 30s
- [ ] Delete workflow CRD → removed from Swagger within 30s
- [ ] Each workflow shows its specific input schema in Swagger
- [ ] Execute endpoint works with proper validation
- [ ] Test endpoint returns execution plan without side effects
- [ ] Management endpoints list all workflows/tasks

### Quality Gates (Same as Stage 6)
1. ✅ All tests passing (target: 38+/38+, 0 failures)
2. ✅ Code coverage ≥90%
3. ✅ Clean Release build (0 warnings, 0 errors)
4. ✅ Zero security vulnerabilities
5. ✅ No template files
6. ✅ Proof file complete
7. ⚠️ Mutation testing (recommended, not required)

---

## Files Created So Far

### Source Files (7 models)
- `src/WorkflowGateway/Models/WorkflowExecutionRequest.cs`
- `src/WorkflowGateway/Models/WorkflowExecutionResponse.cs`
- `src/WorkflowGateway/Models/WorkflowTestRequest.cs`
- `src/WorkflowGateway/Models/WorkflowTestResponse.cs`
- `src/WorkflowGateway/Models/WorkflowListResponse.cs`
- `src/WorkflowGateway/Models/WorkflowDetailResponse.cs`
- `src/WorkflowGateway/Models/TaskListResponse.cs`

### Test Files (2 test classes, 8 tests)
- `tests/WorkflowGateway.Tests/Models/WorkflowExecutionRequestTests.cs` (2 tests)
- `tests/WorkflowGateway.Tests/Models/ApiModelsTests.cs` (6 tests)

### Project Files
- `src/WorkflowGateway/WorkflowGateway.csproj`
- `tests/WorkflowGateway.Tests/WorkflowGateway.Tests.csproj`
- `WorkflowOperator.sln` (updated)

---

## Current Test Status

```
WorkflowCore.Tests:      123/123 passing ✅
WorkflowOperator.Tests:   19/19 passing ✅
WorkflowGateway.Tests:     8/8 passing ✅
TOTAL:                   150/150 passing ✅
```

**Coverage:** Not yet measured for Gateway (will be after services are implemented)

---

## Next Steps

**For Next Session:**
1. Start with WorkflowDiscoveryService (foundation for everything else)
2. Implement InputValidationService and WorkflowExecutionService (core logic)
3. Tackle DynamicEndpointService (the most complex component)
4. Wire up controllers and background service
5. Configure Swagger integration
6. Run quality gates and complete stage

**Estimated Time:** 2-3 hours for full implementation + testing + documentation

---

## References

### ASP.NET Core Dynamic Routing
- [IActionDescriptorChangeProvider](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.infrastructure.iactiondescriptorchangeprovider)
- [Dynamic Controller Routing](https://andrewlock.net/controller-activation-and-dependency-injection-in-asp-net-core-mvc/)

### Kubernetes Client
- [KubernetesClient.Models](https://github.com/kubernetes-client/csharp)
- [Custom Resource Definitions](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)

### Swagger/OpenAPI
- [Swashbuckle.AspNetCore](https://github.com/domaindrivendev/Swashbuckle.AspNetCore)
- [IDocumentFilter](https://github.com/domaindrivendev/Swashbuckle.AspNetCore#custom-document-filters)

---

**Session 1 Complete:** Foundation built with solid TDD
**Session 2 Goal:** Complete dynamic endpoint system with Swagger integration
**Stage 7 Target:** Production-ready API Gateway with auto-discovering workflow endpoints
