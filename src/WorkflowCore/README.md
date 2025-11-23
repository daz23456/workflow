# WorkflowCore

**Shared domain models and core services for workflow orchestration**

## Purpose

WorkflowCore is the foundational library containing all domain models, interfaces, and core services used across the Workflow Operator ecosystem. It provides type-safe schema validation, template resolution, dependency graph building, and HTTP task execution - all built with strict TDD and >90% test coverage.

## Scope

This library is **infrastructure-agnostic** and contains no dependencies on Kubernetes, ASP.NET Core, or any specific runtime environment. It can be used standalone or integrated into other applications.

### What's Included

- Domain models (WorkflowResource, WorkflowTaskResource, SchemaDefinition)
- Schema validation using JsonSchema.Net
- Type compatibility checking (recursive validation)
- Template parsing and resolution (`{{input.x}}`, `{{tasks.y.output.z}}`)
- Execution graph building with circular dependency detection
- HTTP task execution with configurable retry policies
- Comprehensive error messages with suggested fixes

### What's NOT Included

- Kubernetes operator logic (see WorkflowOperator)
- API endpoints (see WorkflowGateway)
- Database persistence
- User interface components

## Key Components

### Models (`Models/`)

#### Custom Resource Definitions
- **WorkflowTaskResource**: Defines reusable HTTP tasks with input/output schemas
- **WorkflowResource**: Composes tasks into workflows with dependency-based execution
- **ResourceMetadata**: Kubernetes-style metadata (name, namespace, labels)

#### Schema Definitions
- **SchemaDefinition**: JSON Schema representation with properties, types, constraints
- **PropertyDefinition**: Individual property specifications with nested object support

#### Execution Models
- **ExecutionGraph**: Directed acyclic graph (DAG) for task dependencies
- **ExecutionContext**: Runtime context for workflow execution
- **TaskExecutionResult**: Output from individual task execution

#### Validation
- **ValidationResult**: Aggregates validation errors with paths
- **CompatibilityResult**: Type compatibility check results
- **ExecutionGraphResult**: Graph build results with cycle detection

### Services (`Services/`)

#### Schema & Validation
- **SchemaParser** (`ISchemaParser`): Converts SchemaDefinition → JsonSchema
- **SchemaValidator** (`ISchemaValidator`): Validates data against JSON Schema
- **TypeCompatibilityChecker** (`ITypeCompatibilityChecker`): Recursive type compatibility validation

#### Template Processing
- **TemplateParser** (`ITemplateParser`): Parses `{{...}}` templates with regex
- **TemplateResolver** (`ITemplateResolver`): Resolves templates at runtime with context
- **WorkflowValidator** (`IWorkflowValidator`): Orchestrates all workflow validation

#### Execution
- **ExecutionGraphBuilder** (`IExecutionGraphBuilder`): Builds DAG from workflow tasks
- **HttpTaskExecutor** (`IHttpTaskExecutor`): Executes HTTP requests with retries
- **RetryPolicy** (`IRetryPolicy`): Configurable exponential backoff retry logic

## Getting Started

### Installation

```bash
# Add reference from another project
dotnet add reference ../../src/WorkflowCore/WorkflowCore.csproj
```

### Example Usage

#### Schema Validation

```csharp
using WorkflowCore.Models;
using WorkflowCore.Services;

// Create a schema
var schema = new SchemaDefinition
{
    Type = "object",
    Properties = new Dictionary<string, PropertyDefinition>
    {
        ["name"] = new PropertyDefinition { Type = "string" },
        ["age"] = new PropertyDefinition { Type = "integer", Minimum = 0 }
    },
    Required = new List<string> { "name" }
};

// Validate data
var parser = new SchemaParser();
var validator = new SchemaValidator(parser);

var data = new Dictionary<string, object>
{
    ["name"] = "John",
    ["age"] = 30
};

var result = await validator.ValidateAsync(schema, data);
if (!result.IsValid)
{
    foreach (var error in result.Errors)
    {
        Console.WriteLine($"{error.Path}: {error.Message}");
    }
}
```

#### Template Resolution

```csharp
// Parse templates from workflow task input
var parser = new TemplateParser();
var parseResult = parser.Parse("{{input.userId}}");

// Resolve at runtime
var resolver = new TemplateResolver();
var context = new ExecutionContext
{
    Input = new Dictionary<string, object> { ["userId"] = "123" },
    TaskOutputs = new Dictionary<string, Dictionary<string, object>>()
};

var resolved = resolver.Resolve("{{input.userId}}", context);
// Result: "123"
```

#### Execution Graph Building

```csharp
var workflow = new WorkflowResource
{
    Spec = new WorkflowSpec
    {
        Tasks = new List<WorkflowTaskStep>
        {
            new WorkflowTaskStep
            {
                Id = "fetch-user",
                TaskRef = "fetch-user",
                Input = new Dictionary<string, string>
                {
                    ["userId"] = "{{input.userId}}"
                }
            },
            new WorkflowTaskStep
            {
                Id = "fetch-orders",
                TaskRef = "fetch-orders",
                Input = new Dictionary<string, string>
                {
                    ["userId"] = "{{input.userId}}",
                    ["email"] = "{{tasks.fetch-user.output.email}}"
                }
            }
        }
    }
};

var builder = new ExecutionGraphBuilder();
var result = builder.Build(workflow);

if (!result.IsValid)
{
    // Circular dependency detected
    foreach (var error in result.Errors)
    {
        Console.WriteLine(error.Message);
    }
}
else
{
    // Execute in topological order
    var executionOrder = result.Graph!.TopologicalSort();
}
```

#### HTTP Task Execution

```csharp
var taskSpec = new WorkflowTaskSpec
{
    Type = "http",
    Request = new HttpRequestDefinition
    {
        Method = "GET",
        Url = "https://api.example.com/users/{{input.userId}}",
        Headers = new Dictionary<string, string>
        {
            ["Authorization"] = "Bearer {{input.token}}"
        }
    }
};

var context = new ExecutionContext
{
    Input = new Dictionary<string, object>
    {
        ["userId"] = "123",
        ["token"] = "abc..."
    }
};

var httpClient = new HttpClientWrapper(new HttpClient());
var retryPolicy = new RetryPolicy();
var executor = new HttpTaskExecutor(httpClient, new TemplateResolver(), retryPolicy);

var result = await executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

if (result.Success)
{
    Console.WriteLine($"Status: {result.StatusCode}");
    Console.WriteLine($"Output: {JsonSerializer.Serialize(result.Output)}");
}
else
{
    Console.WriteLine($"Error: {result.ErrorMessage}");
    Console.WriteLine($"Retries: {result.RetryCount}");
}
```

## Architecture Principles

### 1. Type Safety First
- All schemas validated using JsonSchema.Net
- Type compatibility checked recursively
- Fail-fast validation at design time

### 2. Immutable Models
- All domain models use init-only properties
- State changes create new instances
- Thread-safe by design

### 3. Dependency Injection Ready
- All services use interfaces
- Constructor injection for dependencies
- Easily mockable for testing

### 4. Comprehensive Error Messages
- Every error includes helpful context
- Suggested fixes where applicable
- Property paths for nested errors

## Testing

WorkflowCore has >90% code coverage with comprehensive unit tests:

```bash
# Run tests
dotnet test

# Run tests with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run mutation tests
cd ../../tests/WorkflowCore.Tests
dotnet stryker --config-file ../../stryker-config-workflowcore.json
```

### Test Categories

- **Model Tests**: Validate domain model behavior
- **Schema Tests**: JSON Schema parsing and validation
- **Template Tests**: Template parsing and resolution
- **Graph Tests**: DAG construction and cycle detection
- **Executor Tests**: HTTP execution with retries and error handling

## Design Patterns

- **Factory Pattern**: SchemaParser creates JsonSchema instances
- **Strategy Pattern**: RetryPolicy configurable strategies
- **Builder Pattern**: ExecutionGraphBuilder constructs complex graphs
- **Template Method**: HttpTaskExecutor orchestrates request flow

## Dependencies

- **JsonSchema.Net 5.x**: JSON Schema validation
- **System.Text.Json**: Serialization (no Newtonsoft)
- **System.Net.Http**: HTTP client

### Test Dependencies

- **xUnit**: Test framework
- **Moq**: Mocking framework
- **FluentAssertions**: Fluent assertion library

## Performance Considerations

- Regex patterns are compiled for template parsing
- JsonSchema instances are cached
- Minimal allocations in hot paths
- Async/await throughout for scalability

## Future Enhancements

- Support for additional task types (SQL, gRPC, etc.)
- Parallel task execution within workflows
- Conditional branching and loops
- Workflow versioning and migration

## Related Projects

- **WorkflowOperator**: Kubernetes operator using WorkflowCore
- **WorkflowGateway**: API gateway for workflow execution
- **WorkflowUI**: Web UI for workflow management

## Contributing

All contributions must follow TDD:
1. Write failing test first (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while keeping tests green (REFACTOR)

Maintain >90% code coverage and >80% mutation score.
