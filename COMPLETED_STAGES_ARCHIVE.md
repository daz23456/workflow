# Completed Stages Implementation Archive

**Created:** 2025-11-22
**Updated:** 2025-12-01
**Purpose:** Archive of detailed implementation instructions for completed stages
**Status:** 17 stages/substages complete (60% project completion)

This file contains the detailed TDD implementation instructions that were used to build completed stages of the Workflow Orchestration Engine. These stages are now complete and documented in their respective proof files:

### Backend Core (Stages 1-7.9)
- **Stage 1: Foundation** - See `STAGE_1_PROOF.md`
- **Stage 2: Schema Validation** - See `STAGE_2_PROOF.md`
- **Stage 3: Template Validation** - See `STAGE_3_PROOF.md`
- **Stage 4: Execution Graph** - See `STAGE_4_PROOF.md`
- **Stage 5: Workflow Execution** - See `STAGE_5_PROOF.md`
- **Stage 6: Kubernetes Operator** - See `STAGE_6_PROOF.md`
- **Stage 7: API Gateway** - See `STAGE_7_PROOF.md`
- **Stage 7.5: Output Mapping & Parallel Execution** - See `STAGE_7.5_PROOF.md`
- **Stage 7.75: Execution Plan & Enhanced Tracing** - See `STAGE_7.75_PROOF.md`
- **Stage 7.8: Execution History & Task Details** - See `STAGE_7.8_PROOF.md`
- **Stage 7.85: Parallel Groups & Enhanced Execution Plan** - See `STAGE_7.85_PROOF.md`
- **Stage 7.9: Execution Trace & Workflow Versioning** - See `STAGE_7.9_PROOF.md`

### Developer Experience (Stage 9.x)
- **Stage 9.1: Visual Workflow Builder** - See `stage-proofs/stage-9.1/STAGE_9.1_PROOF.md`
- **Stage 9.3: WebSocket API** - See `stage-proofs/stage-9.3/STAGE_9.3_PROOF.md`
- **Stage 9.4: Enhanced Debugging Tools** - See `stage-proofs/stage-9.4/STAGE_9.4_PROOF.md`
- **Stage 9.6.1: Transform DSL Backend** - See `stage-proofs/stage-9.6.1/STAGE_9.6.1_PROOF.md`

### Performance (Stage 10)
- **Stage 10 Phase 1: Performance Benchmarks** - See `STAGE_10_PROOF.md`

**Note:** Stages 1-4 contain full TDD code examples. Stages 5+ contain task specifications only.

---

## Stage 1: Foundation (Week 1, Days 1-2)

### Task 1.1: Project Setup

**Create solution structure:**
```bash
dotnet new sln -n WorkflowOperator
dotnet new classlib -n WorkflowCore -o src/WorkflowCore
dotnet new xunit -n WorkflowCore.Tests -o tests/WorkflowCore.Tests
dotnet sln add src/WorkflowCore/WorkflowCore.csproj
dotnet sln add tests/WorkflowCore.Tests/WorkflowCore.Tests.csproj
cd tests/WorkflowCore.Tests
dotnet add reference ../../src/WorkflowCore/WorkflowCore.csproj
```

**Add dependencies to src/WorkflowCore/WorkflowCore.csproj:**
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="System.Text.Json" Version="8.0.0" />
    <PackageReference Include="JsonSchema.Net" Version="5.5.0" />
    <PackageReference Include="KubeOps" Version="8.1.0" />
    <PackageReference Include="KubernetesClient" Version="13.0.1" />
    <PackageReference Include="YamlDotNet" Version="13.7.1" />
    <PackageReference Include="Serilog" Version="3.1.1" />
  </ItemGroup>
</Project>
```

**Add test dependencies to tests/WorkflowCore.Tests/WorkflowCore.Tests.csproj:**
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
    <PackageReference Include="xUnit" Version="2.6.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.4" />
    <PackageReference Include="Moq" Version="4.20.70" />
    <PackageReference Include="FluentAssertions" Version="6.12.0" />
    <PackageReference Include="coverlet.collector" Version="6.0.0" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\WorkflowCore\WorkflowCore.csproj" />
  </ItemGroup>
</Project>
```

### Task 1.1.1: Remove Template Files (MANDATORY)

**Immediately after creating projects, remove ALL template files:**

```bash
# Remove template class files
rm -f src/WorkflowCore/Class1.cs

# Remove template test files
rm -f tests/WorkflowCore.Tests/UnitTest1.cs

# Verify removal (should return empty)
find . -name "Class1.cs" -o -name "UnitTest1.cs"
```

**Why this is critical:**
- Template files inflate test counts and create inaccurate metrics
- They are not production code and serve no purpose
- Leaving them in violates the "no template files" quality gate
- **This is a BLOCKER for stage completion**

**Verification:**
```bash
git status
# Should show:
# deleted:    src/WorkflowCore/Class1.cs
# deleted:    tests/WorkflowCore.Tests/UnitTest1.cs
```

### Task 1.2: Schema Models (TDD)

**STEP 1: Write failing test FIRST**

Create `tests/WorkflowCore.Tests/Models/SchemaDefinitionTests.cs`:
```csharp
using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class SchemaDefinitionTests
{
    [Fact]
    public void SchemaDefinition_ShouldSerializeToJson()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["userId"] = new PropertyDefinition 
                { 
                    Type = "string",
                    Description = "User identifier"
                }
            },
            Required = new List<string> { "userId" }
        };

        // Act
        var json = JsonSerializer.Serialize(schema);
        var deserialized = JsonSerializer.Deserialize<SchemaDefinition>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Type.Should().Be("object");
        deserialized.Properties.Should().ContainKey("userId");
        deserialized.Required.Should().Contain("userId");
    }

    [Fact]
    public void SchemaDefinition_ShouldValidateRequiredProperties()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer" }
            },
            Required = new List<string> { "name" }
        };

        // Act & Assert
        schema.IsPropertyRequired("name").Should().BeTrue();
        schema.IsPropertyRequired("age").Should().BeFalse();
    }

    [Fact]
    public void PropertyDefinition_ShouldSupportNestedObjects()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["user"] = new PropertyDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["id"] = new PropertyDefinition { Type = "string" },
                        ["email"] = new PropertyDefinition { Type = "string", Format = "email" }
                    }
                }
            }
        };

        // Act
        var userProperty = schema.Properties["user"];

        // Assert
        userProperty.Type.Should().Be("object");
        userProperty.Properties.Should().NotBeNull();
        userProperty.Properties.Should().ContainKey("id");
        userProperty.Properties!["email"].Format.Should().Be("email");
    }
}
```

**Run test - it should FAIL:**
```bash
dotnet test tests/WorkflowCore.Tests
```

**STEP 2: Write minimum implementation to pass tests**

Create `src/WorkflowCore/Models/SchemaDefinition.cs`:
```csharp
using System.Text.Json.Serialization;

namespace WorkflowCore.Models;

public class SchemaDefinition
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("properties")]
    public Dictionary<string, PropertyDefinition> Properties { get; set; } = new();

    [JsonPropertyName("required")]
    public List<string> Required { get; set; } = new();

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    public bool IsPropertyRequired(string propertyName)
    {
        return Required.Contains(propertyName);
    }
}

public class PropertyDefinition
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("format")]
    public string? Format { get; set; }

    [JsonPropertyName("properties")]
    public Dictionary<string, PropertyDefinition>? Properties { get; set; }

    [JsonPropertyName("items")]
    public PropertyDefinition? Items { get; set; }

    [JsonPropertyName("enum")]
    public List<string>? Enum { get; set; }

    [JsonPropertyName("minimum")]
    public int? Minimum { get; set; }

    [JsonPropertyName("maximum")]
    public int? Maximum { get; set; }

    [JsonPropertyName("pattern")]
    public string? Pattern { get; set; }

    [JsonPropertyName("required")]
    public List<string>? Required { get; set; }
}
```

**Run test again - should PASS:**
```bash
dotnet test tests/WorkflowCore.Tests
```

**STEP 3: Refactor if needed (keep tests green)**

### Task 1.3: CRD Models (TDD)

**STEP 1: Write failing test**

Create `tests/WorkflowCore.Tests/Models/WorkflowTaskResourceTests.cs`:
```csharp
using FluentAssertions;
using WorkflowCore.Models;
using Xunit;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace WorkflowCore.Tests.Models;

public class WorkflowTaskResourceTests
{
    [Fact]
    public void WorkflowTaskResource_ShouldDeserializeFromYaml()
    {
        // Arrange
        var yaml = @"
apiVersion: workflows.example.com/v1
kind: WorkflowTask
metadata:
  name: fetch-user
  namespace: default
spec:
  type: http
  inputSchema:
    type: object
    properties:
      userId:
        type: string
    required:
      - userId
  outputSchema:
    type: object
    properties:
      statusCode:
        type: integer
      body:
        type: object
  request:
    method: GET
    url: 'https://api.example.com/users/{{input.userId}}'
";

        // Act
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        var resource = deserializer.Deserialize<WorkflowTaskResource>(yaml);

        // Assert
        resource.Should().NotBeNull();
        resource.ApiVersion.Should().Be("workflows.example.com/v1");
        resource.Kind.Should().Be("WorkflowTask");
        resource.Metadata.Name.Should().Be("fetch-user");
        resource.Spec.Type.Should().Be("http");
        resource.Spec.InputSchema.Should().NotBeNull();
        resource.Spec.OutputSchema.Should().NotBeNull();
        resource.Spec.Request!.Method.Should().Be("GET");
    }
}
```

**Run test - should FAIL**

**STEP 2: Implement models**

Create `src/WorkflowCore/Models/WorkflowTaskResource.cs`:
```csharp
using k8s;
using k8s.Models;
using KubeOps.Operator.Entities;

namespace WorkflowCore.Models;

[KubernetesEntity(Group = "workflows.example.com", ApiVersion = "v1", Kind = "WorkflowTask")]
public class WorkflowTaskResource : CustomKubernetesEntity<WorkflowTaskSpec, WorkflowTaskStatus>
{
}

public class WorkflowTaskSpec
{
    public string Type { get; set; } = string.Empty;
    public SchemaDefinition? InputSchema { get; set; }
    public SchemaDefinition? OutputSchema { get; set; }
    public HttpRequestDefinition? Request { get; set; }
    public string? Timeout { get; set; }
}

public class WorkflowTaskStatus
{
    public int UsageCount { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class HttpRequestDefinition
{
    public string Method { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public Dictionary<string, string>? Headers { get; set; }
    public string? Body { get; set; }
}
```

**Run test - should PASS**

### Task 1.4: Schema Parser (TDD)

**STEP 1: Write failing test**

Create `tests/WorkflowCore.Tests/Services/SchemaParserTests.cs`:
```csharp
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class SchemaParserTests
{
    private readonly ISchemaParser _parser;

    public SchemaParserTests()
    {
        _parser = new SchemaParser();
    }

    [Fact]
    public async Task ParseAsync_WithValidSchema_ShouldReturnJsonSchema()
    {
        // Arrange
        var schemaDefinition = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer", Minimum = 0 }
            },
            Required = new List<string> { "name" }
        };

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
    }

    [Fact]
    public async Task ParseAsync_WithNullSchema_ShouldReturnNull()
    {
        // Act
        var result = await _parser.ParseAsync(null);

        // Assert
        result.Should().BeNull();
    }
}
```

**Run test - should FAIL**

**STEP 2: Implement SchemaParser**

Create `src/WorkflowCore/Services/SchemaParser.cs`:
```csharp
using System.Text.Json;
using Json.Schema;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ISchemaParser
{
    Task<JsonSchema?> ParseAsync(SchemaDefinition? schemaDefinition);
}

public class SchemaParser : ISchemaParser
{
    public Task<JsonSchema?> ParseAsync(SchemaDefinition? schemaDefinition)
    {
        if (schemaDefinition == null)
        {
            return Task.FromResult<JsonSchema?>(null);
        }

        try
        {
            var json = JsonSerializer.Serialize(schemaDefinition);
            var jsonSchema = JsonSchema.FromText(json);
            return Task.FromResult<JsonSchema?>(jsonSchema);
        }
        catch (Exception ex)
        {
            throw new SchemaParseException($"Failed to parse schema: {ex.Message}", ex);
        }
    }
}

public class SchemaParseException : Exception
{
    public SchemaParseException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
```

**Run test - should PASS**

### Task 1.5: Type Compatibility Checker (TDD)

**Purpose:** Validate that task outputs are compatible with downstream task inputs BEFORE deployment.

**STEP 1: Write failing tests**

Create `tests/WorkflowCore.Tests/Services/TypeCompatibilityCheckerTests.cs`:
```csharp
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class TypeCompatibilityCheckerTests
{
    private readonly ITypeCompatibilityChecker _checker;

    public TypeCompatibilityCheckerTests()
    {
        _checker = new TypeCompatibilityChecker();
    }

    [Fact]
    public void CheckCompatibility_WithMatchingTypes_ShouldReturnSuccess()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition { Type = "string" };
        var targetProperty = new PropertyDefinition { Type = "string" };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void CheckCompatibility_WithIncompatibleTypes_ShouldReturnError()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition { Type = "integer" };
        var targetProperty = new PropertyDefinition { Type = "string" };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Type mismatch");
    }

    [Fact]
    public void CheckCompatibility_WithNestedObjects_ShouldValidateRecursively()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["id"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer" }
            }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["id"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "string" } // Type mismatch
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Field.Should().Be("age");
    }

    [Fact]
    public void CheckCompatibility_WithArrays_ShouldValidateItemTypes()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "array",
            Items = new PropertyDefinition { Type = "string" }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "array",
            Items = new PropertyDefinition { Type = "integer" }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors[0].Field.Should().Contain("items");
    }
}
```

**Run test - should FAIL**

**STEP 2: Implement TypeCompatibilityChecker**

Create `src/WorkflowCore/Services/TypeCompatibilityChecker.cs`:
```csharp
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ITypeCompatibilityChecker
{
    CompatibilityResult CheckCompatibility(PropertyDefinition source, PropertyDefinition target);
}

public class TypeCompatibilityChecker : ITypeCompatibilityChecker
{
    public CompatibilityResult CheckCompatibility(PropertyDefinition source, PropertyDefinition target)
    {
        var errors = new List<CompatibilityError>();
        CheckCompatibilityRecursive(source, target, "", errors);

        return new CompatibilityResult
        {
            IsCompatible = errors.Count == 0,
            Errors = errors
        };
    }

    private void CheckCompatibilityRecursive(
        PropertyDefinition source,
        PropertyDefinition target,
        string path,
        List<CompatibilityError> errors)
    {
        // Check basic type compatibility
        if (source.Type != target.Type)
        {
            errors.Add(new CompatibilityError
            {
                Field = path,
                Message = $"Type mismatch: expected '{target.Type}', got '{source.Type}'"
            });
            return;
        }

        // For objects, validate nested properties
        if (source.Type == "object" && source.Properties != null && target.Properties != null)
        {
            foreach (var (key, targetProp) in target.Properties)
            {
                if (!source.Properties.ContainsKey(key))
                {
                    errors.Add(new CompatibilityError
                    {
                        Field = string.IsNullOrEmpty(path) ? key : $"{path}.{key}",
                        Message = $"Missing required property '{key}'"
                    });
                    continue;
                }

                var sourceProp = source.Properties[key];
                var nestedPath = string.IsNullOrEmpty(path) ? key : $"{path}.{key}";
                CheckCompatibilityRecursive(sourceProp, targetProp, nestedPath, errors);
            }
        }

        // For arrays, validate item types
        if (source.Type == "array")
        {
            if (source.Items == null || target.Items == null)
            {
                errors.Add(new CompatibilityError
                {
                    Field = $"{path}.items",
                    Message = "Array items type not defined"
                });
                return;
            }

            CheckCompatibilityRecursive(source.Items, target.Items, $"{path}.items", errors);
        }
    }
}
```

Create `src/WorkflowCore/Models/CompatibilityResult.cs`:
```csharp
namespace WorkflowCore.Models;

public class CompatibilityResult
{
    public bool IsCompatible { get; set; }
    public List<CompatibilityError> Errors { get; set; } = new();
}

public class CompatibilityError
{
    public string? Field { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? SuggestedFix { get; set; }
}
```

**Run test - should PASS**

### Task 1.6: Workflow CRD Models (TDD)

**Purpose:** Define Workflow resources that chain multiple tasks together.

**STEP 1: Write failing test**

Create `tests/WorkflowCore.Tests/Models/WorkflowResourceTests.cs`:
```csharp
using FluentAssertions;
using WorkflowCore.Models;
using Xunit;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace WorkflowCore.Tests.Models;

public class WorkflowResourceTests
{
    [Fact]
    public void WorkflowResource_ShouldDeserializeFromYaml()
    {
        // Arrange
        var yaml = @"
apiVersion: workflows.example.com/v1
kind: Workflow
metadata:
  name: user-enrichment
  namespace: default
spec:
  input:
    userId:
      type: string
      required: true
  tasks:
    - id: fetch-user
      taskRef: fetch-user
      input:
        userId: '{{input.userId}}'
    - id: fetch-orders
      taskRef: fetch-orders
      input:
        userId: '{{tasks.fetch-user.output.id}}'
  output:
    user: '{{tasks.fetch-user.output}}'
    orders: '{{tasks.fetch-orders.output}}'
";

        // Act
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        var resource = deserializer.Deserialize<WorkflowResource>(yaml);

        // Assert
        resource.Should().NotBeNull();
        resource.ApiVersion.Should().Be("workflows.example.com/v1");
        resource.Kind.Should().Be("Workflow");
        resource.Metadata.Name.Should().Be("user-enrichment");
        resource.Spec.Tasks.Should().HaveCount(2);
        resource.Spec.Tasks[0].Id.Should().Be("fetch-user");
        resource.Spec.Tasks[0].TaskRef.Should().Be("fetch-user");
    }
}
```

**Run test - should FAIL**

**STEP 2: Implement Workflow models**

Create `src/WorkflowCore/Models/WorkflowResource.cs`:
```csharp
using KubeOps.Operator.Entities;

namespace WorkflowCore.Models;

[KubernetesEntity(Group = "workflows.example.com", ApiVersion = "v1", Kind = "Workflow")]
public class WorkflowResource : CustomKubernetesEntity<WorkflowSpec, WorkflowStatus>
{
}

public class WorkflowSpec
{
    public Dictionary<string, WorkflowInputParameter> Input { get; set; } = new();
    public List<WorkflowTaskStep> Tasks { get; set; } = new();
    public Dictionary<string, string> Output { get; set; } = new();
    public string? Timeout { get; set; }
}

public class WorkflowInputParameter
{
    public string Type { get; set; } = string.Empty;
    public bool Required { get; set; }
    public string? Description { get; set; }
    public object? Default { get; set; }
}

public class WorkflowTaskStep
{
    public string Id { get; set; } = string.Empty;
    public string TaskRef { get; set; } = string.Empty;
    public Dictionary<string, string> Input { get; set; } = new();
    public string? Condition { get; set; }
    public int? RetryCount { get; set; }
}

public class WorkflowStatus
{
    public string Phase { get; set; } = "Pending";
    public int ExecutionCount { get; set; }
    public DateTime LastExecuted { get; set; }
    public List<string> ValidationErrors { get; set; } = new();
}
```

**Run test - should PASS**

### Task 1.7: Error Message Standards

**Purpose:** Establish consistent, helpful error messages with suggested fixes.

Create `src/WorkflowCore/Models/ErrorMessageBuilder.cs`:
```csharp
namespace WorkflowCore.Models;

public static class ErrorMessageBuilder
{
    public static ValidationError TypeMismatch(
        string taskId,
        string field,
        string expected,
        string actual,
        string? suggestedFix = null)
    {
        return new ValidationError
        {
            TaskId = taskId,
            Field = field,
            Message = $"Type mismatch: expected '{expected}', got '{actual}'",
            SuggestedFix = suggestedFix
        };
    }

    public static ValidationError MissingRequiredField(
        string taskId,
        string field,
        List<string>? availableFields = null)
    {
        var message = $"Required field '{field}' is missing";
        string? suggestion = null;

        if (availableFields?.Any() == true)
        {
            suggestion = $"Available fields: {string.Join(", ", availableFields)}";
        }

        return new ValidationError
        {
            TaskId = taskId,
            Field = field,
            Message = message,
            SuggestedFix = suggestion
        };
    }

    public static ValidationError InvalidTemplate(
        string taskId,
        string field,
        string template,
        string reason)
    {
        return new ValidationError
        {
            TaskId = taskId,
            Field = field,
            Message = $"Invalid template '{template}': {reason}",
            SuggestedFix = "Check template syntax: {{input.field}} or {{tasks.taskId.output.field}}"
        };
    }

    public static ValidationError CircularDependency(
        string workflowId,
        List<string> cyclePath)
    {
        return new ValidationError
        {
            TaskId = workflowId,
            Message = $"Circular dependency detected: {string.Join(" → ", cyclePath)}",
            SuggestedFix = "Remove or reorder task dependencies to break the cycle"
        };
    }
}
```

Create test for ErrorMessageBuilder:

Create `tests/WorkflowCore.Tests/Models/ErrorMessageBuilderTests.cs`:
```csharp
using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class ErrorMessageBuilderTests
{
    [Fact]
    public void TypeMismatch_ShouldCreateValidationError()
    {
        // Act
        var error = ErrorMessageBuilder.TypeMismatch(
            "fetch-orders",
            "input.userId",
            "string",
            "integer",
            "Use tasks.fetch-user.output.id instead of age");

        // Assert
        error.TaskId.Should().Be("fetch-orders");
        error.Field.Should().Be("input.userId");
        error.Message.Should().Contain("Type mismatch");
        error.SuggestedFix.Should().NotBeNull();
    }

    [Fact]
    public void MissingRequiredField_WithAvailableFields_ShouldIncludeSuggestion()
    {
        // Act
        var error = ErrorMessageBuilder.MissingRequiredField(
            "task-1",
            "userId",
            new List<string> { "id", "email", "name" });

        // Assert
        error.Message.Should().Contain("Required field 'userId' is missing");
        error.SuggestedFix.Should().Contain("Available fields: id, email, name");
    }

    [Fact]
    public void CircularDependency_ShouldShowCyclePath()
    {
        // Act
        var error = ErrorMessageBuilder.CircularDependency(
            "workflow-1",
            new List<string> { "task-a", "task-b", "task-c", "task-a" });

        // Assert
        error.Message.Should().Contain("task-a → task-b → task-c → task-a");
        error.SuggestedFix.Should().Contain("break the cycle");
    }
}
```

**Run tests:**
```bash
dotnet test tests/WorkflowCore.Tests
```

### Task 1.X: Security Verification and Quality Gates (MANDATORY - Before Stage Completion)

**IMPORTANT:** Before creating the stage completion commit and tag, you MUST run all quality gates.

**See `STAGE_EXECUTION_FRAMEWORK.md` for complete details. Summary:**

#### 1. Check for Security Vulnerabilities
```bash
# Check for ALL vulnerabilities including transitive dependencies
dotnet list package --vulnerable --include-transitive

# Expected output: "The given project has no vulnerable packages"
```

**If vulnerabilities found:**
1. Note package name, current version, CVE numbers, severity
2. Update vulnerable packages:
   ```bash
   dotnet add src/WorkflowCore package PackageName  # Uses latest version
   ```
3. Verify resolution and document in STAGE_1_PROOF.md
4. Re-run ALL quality gates (dependency updates can break tests)

**Example from Stage 1 security fixes:**
```bash
# Update vulnerable packages
dotnet add src/WorkflowCore package System.Text.Json     # 8.0.0 → 10.0.0
dotnet add src/WorkflowCore package KubernetesClient     # 13.0.1 → 18.0.5
dotnet add src/WorkflowCore package YamlDotNet           # 13.7.1 → 16.3.0

# Verify all resolved
dotnet list package --vulnerable --include-transitive
```

#### 2. Run All Quality Gates
```bash
# Gate 1: Clean Release build (0 warnings, 0 errors)
dotnet clean
dotnet build --configuration Release

# Gate 2: All tests passing (0 failures, 0 skipped)
dotnet test --configuration Release

# Gate 3: Coverage ≥90%
dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage
reportgenerator -reports:./coverage/**/coverage.cobertura.xml -targetdir:./coverage/report -reporttypes:"Html;TextSummary;Cobertura"
grep "Line coverage:" ./coverage/report/Summary.txt

# Gate 4: Zero security vulnerabilities (checked above)

# Gate 5: No template files
find . -name "Class1.cs" -o -name "UnitTest1.cs"  # Should return empty

# Gate 6: Proof file complete (no placeholders)
grep -i -E "\[(TO BE|TBD|TODO)\]" STAGE_*_PROOF.md  # Should return empty
```

**If ANY gate fails:** See "Quality Gate Failure Procedures" in STAGE_EXECUTION_FRAMEWORK.md

#### 3. Fill Out STAGE_1_PROOF.md
- Run each quality gate and copy actual output
- Replace ALL placeholders with actual results
- Verify no `[TO BE VERIFIED]`, `[N/N]`, `[XX%]`, etc. remain
- Check all deliverables are marked `[x]`

#### 4. Update CHANGELOG.md
- Update Stage 1 entry with actual metrics
- Update "Overall Progress" percentage
- Update "Last Updated" date

#### 5. Create Stage Completion Commit
```bash
git add src/ tests/ *.md
git commit -m "$(cat <<'EOF'
✅ Stage 1 Complete: Foundation

## Stage Summary
- Duration: [actual time]
- Tests: [N passing / 0 failing]
- Coverage: [X.X%]
- Deliverables: [N/N completed]

## Success Criteria Met
✅ All tests passing
✅ Code coverage ≥90%
✅ Build: 0 warnings, 0 errors
✅ Security: 0 vulnerabilities

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

#### 6. Create Tag
```bash
git tag -a stage-1-complete -m "Stage 1: Foundation - N tests, XX% coverage, 0 vulnerabilities"
```

**See STAGE_EXECUTION_FRAMEWORK.md for complete 7-step procedure with prerequisites and verification.**

---

## Stage 2: Schema Validation (Week 1, Days 3-5)

### Task 2.1: Schema Validator (TDD)

**STEP 1: Write failing tests**

Create `tests/WorkflowCore.Tests/Services/SchemaValidatorTests.cs`:
```csharp
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class SchemaValidatorTests
{
    private readonly ISchemaValidator _validator;

    public SchemaValidatorTests()
    {
        var parser = new SchemaParser();
        _validator = new SchemaValidator(parser);
    }

    [Fact]
    public async Task ValidateAsync_WithValidData_ShouldReturnSuccess()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer" }
            },
            Required = new List<string> { "name" }
        };

        var data = new Dictionary<string, object>
        {
            ["name"] = "John",
            ["age"] = 30
        };

        // Act
        var result = await _validator.ValidateAsync(schema, data);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateAsync_WithMissingRequiredField_ShouldReturnError()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" }
            },
            Required = new List<string> { "name" }
        };

        var data = new Dictionary<string, object>(); // missing name

        // Act
        var result = await _validator.ValidateAsync(schema, data);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
    }
}
```

**Run test - should FAIL**

**STEP 2: Implement SchemaValidator**

Create `src/WorkflowCore/Services/SchemaValidator.cs`:
```csharp
using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Schema;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ISchemaValidator
{
    Task<ValidationResult> ValidateAsync(SchemaDefinition? schemaDefinition, object data);
}

public class SchemaValidator : ISchemaValidator
{
    private readonly ISchemaParser _parser;

    public SchemaValidator(ISchemaParser parser)
    {
        _parser = parser ?? throw new ArgumentNullException(nameof(parser));
    }

    public async Task<ValidationResult> ValidateAsync(SchemaDefinition? schemaDefinition, object data)
    {
        if (schemaDefinition == null)
        {
            return new ValidationResult { IsValid = true };
        }

        var jsonSchema = await _parser.ParseAsync(schemaDefinition);
        if (jsonSchema == null)
        {
            return new ValidationResult { IsValid = true };
        }

        var dataJson = JsonSerializer.Serialize(data);
        var dataNode = JsonNode.Parse(dataJson);

        var evaluationResult = jsonSchema.Evaluate(dataNode, new EvaluationOptions
        {
            OutputFormat = OutputFormat.List
        });

        if (evaluationResult.IsValid)
        {
            return new ValidationResult { IsValid = true };
        }

        var errors = new List<ValidationError>();
        if (evaluationResult.Details != null)
        {
            foreach (var detail in evaluationResult.Details)
            {
                if (!detail.IsValid && detail.Errors != null)
                {
                    foreach (var (errorKey, errorMessage) in detail.Errors)
                    {
                        errors.Add(new ValidationError
                        {
                            Field = detail.InstanceLocation?.ToString(),
                            Message = errorMessage
                        });
                    }
                }
            }
        }

        return new ValidationResult
        {
            IsValid = false,
            Errors = errors
        };
    }
}
```

Create `src/WorkflowCore/Models/ValidationResult.cs`:
```csharp
namespace WorkflowCore.Models;

public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<ValidationError> Errors { get; set; } = new();
}

public class ValidationError
{
    public string? TaskId { get; set; }
    public string? Field { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? SuggestedFix { get; set; }
}
```

**Run test - should PASS**

---

## Stage 3: Template Validation (Week 2, Days 1-2)

### Task 3.1: Template Parser (TDD)

**Purpose:** Parse and validate template expressions like `{{input.userId}}` and `{{tasks.fetch-user.output.id}}`.

**STEP 1: Write failing tests**

Create `tests/WorkflowCore.Tests/Services/TemplateParserTests.cs`:
```csharp
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class TemplateParserTests
{
    private readonly ITemplateParser _parser;

    public TemplateParserTests()
    {
        _parser = new TemplateParser();
    }

    [Fact]
    public void Parse_WithInputReference_ShouldReturnTemplateExpression()
    {
        // Arrange
        var template = "{{input.userId}}";

        // Act
        var result = _parser.Parse(template);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeTrue();
        result.Expressions.Should().ContainSingle();
        result.Expressions[0].Type.Should().Be(TemplateExpressionType.Input);
        result.Expressions[0].Path.Should().Be("userId");
    }

    [Fact]
    public void Parse_WithTaskOutputReference_ShouldReturnTemplateExpression()
    {
        // Arrange
        var template = "{{tasks.fetch-user.output.id}}";

        // Act
        var result = _parser.Parse(template);

        // Assert
        result.Should().NotBeNull();
        result.Expressions[0].Type.Should().Be(TemplateExpressionType.TaskOutput);
        result.Expressions[0].TaskId.Should().Be("fetch-user");
        result.Expressions[0].Path.Should().Be("id");
    }

    [Fact]
    public void Parse_WithInvalidSyntax_ShouldReturnError()
    {
        // Arrange
        var template = "{{input.userId";  // Missing closing braces

        // Act
        var result = _parser.Parse(template);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Should().Contain("Invalid template syntax");
    }

    [Fact]
    public void Parse_WithMultipleExpressions_ShouldReturnAll()
    {
        // Arrange
        var template = "User {{input.userId}} has {{tasks.fetch-orders.output.orderCount}} orders";

        // Act
        var result = _parser.Parse(template);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Expressions.Should().HaveCount(2);
    }

    [Fact]
    public void Parse_WithNestedPath_ShouldParseCorrectly()
    {
        // Arrange
        var template = "{{tasks.fetch-user.output.address.city}}";

        // Act
        var result = _parser.Parse(template);

        // Assert
        result.Expressions[0].Path.Should().Be("address.city");
    }
}
```

**Run test - should FAIL**

**STEP 2: Implement TemplateParser**

Create `src/WorkflowCore/Services/TemplateParser.cs`:
```csharp
using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ITemplateParser
{
    TemplateParseResult Parse(string template);
}

public class TemplateParser : ITemplateParser
{
    private static readonly Regex TemplateRegex = new(@"\{\{([^}]+)\}\}", RegexOptions.Compiled);

    public TemplateParseResult Parse(string template)
    {
        var expressions = new List<TemplateExpression>();
        var errors = new List<string>();

        var matches = TemplateRegex.Matches(template);

        foreach (Match match in matches)
        {
            var expression = match.Groups[1].Value.Trim();

            try
            {
                var parsed = ParseExpression(expression);
                expressions.Add(parsed);
            }
            catch (Exception ex)
            {
                errors.Add($"Invalid template syntax: {ex.Message}");
            }
        }

        return new TemplateParseResult
        {
            IsValid = errors.Count == 0,
            Expressions = expressions,
            Errors = errors
        };
    }

    private TemplateExpression ParseExpression(string expression)
    {
        var parts = expression.Split('.');

        if (parts.Length < 2)
        {
            throw new ArgumentException($"Invalid expression: {expression}");
        }

        if (parts[0] == "input")
        {
            return new TemplateExpression
            {
                Type = TemplateExpressionType.Input,
                Path = string.Join(".", parts.Skip(1))
            };
        }

        if (parts[0] == "tasks" && parts.Length >= 3 && parts[2] == "output")
        {
            return new TemplateExpression
            {
                Type = TemplateExpressionType.TaskOutput,
                TaskId = parts[1],
                Path = parts.Length > 3 ? string.Join(".", parts.Skip(3)) : ""
            };
        }

        throw new ArgumentException($"Unknown expression type: {expression}");
    }
}
```

Create `src/WorkflowCore/Models/TemplateParseResult.cs`:
```csharp
namespace WorkflowCore.Models;

public class TemplateParseResult
{
    public bool IsValid { get; set; }
    public List<TemplateExpression> Expressions { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}

public class TemplateExpression
{
    public TemplateExpressionType Type { get; set; }
    public string? TaskId { get; set; }
    public string Path { get; set; } = string.Empty;
}

public enum TemplateExpressionType
{
    Input,
    TaskOutput
}
```

**Run test - should PASS**

### Task 3.2: Workflow Validator (TDD)

**Purpose:** Orchestrate all validations for a complete workflow including template resolution and type checking.

**STEP 1: Write failing tests**

Create `tests/WorkflowCore.Tests/Services/WorkflowValidatorTests.cs`:
```csharp
using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class WorkflowValidatorTests
{
    private readonly Mock<ITemplateParser> _templateParserMock;
    private readonly Mock<ITypeCompatibilityChecker> _typeCheckerMock;
    private readonly IWorkflowValidator _validator;

    public WorkflowValidatorTests()
    {
        _templateParserMock = new Mock<ITemplateParser>();
        _typeCheckerMock = new Mock<ITypeCompatibilityChecker>();
        _validator = new WorkflowValidator(_templateParserMock.Object, _typeCheckerMock.Object);
    }

    [Fact]
    public async Task ValidateAsync_WithValidWorkflow_ShouldReturnSuccess()
    {
        // Arrange
        var workflow = CreateValidWorkflow();
        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["fetch-user"] = CreateFetchUserTask()
        };

        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateAsync_WithMissingTaskRef_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateValidWorkflow();
        var tasks = new Dictionary<string, WorkflowTaskResource>(); // Empty - missing task

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Message.Contains("Task reference 'fetch-user' not found"));
    }

    [Fact]
    public async Task ValidateAsync_WithInvalidTemplate_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateValidWorkflow();
        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["fetch-user"] = CreateFetchUserTask()
        };

        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult
            {
                IsValid = false,
                Errors = new List<string> { "Invalid syntax" }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Message.Contains("Invalid syntax"));
    }

    [Fact]
    public async Task ValidateAsync_WithTypeIncompatibility_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-a" },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "task-b",
                        Input = new Dictionary<string, string>
                        {
                            ["userId"] = "{{tasks.task-1.output.age}}"  // Wrong type
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    OutputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["age"] = new PropertyDefinition { Type = "integer" }
                        }
                    }
                }
            },
            ["task-b"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["userId"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{tasks.task-1.output.age}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = "task-1",
                        Path = "age"
                    }
                }
            });

        _typeCheckerMock.Setup(x => x.CheckCompatibility(
            It.Is<PropertyDefinition>(p => p.Type == "integer"),
            It.Is<PropertyDefinition>(p => p.Type == "string")))
            .Returns(new CompatibilityResult
            {
                IsCompatible = false,
                Errors = new List<CompatibilityError>
                {
                    new CompatibilityError { Message = "Type mismatch: expected 'string', got 'integer'" }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Message.Contains("Type mismatch"));
    }

    private WorkflowResource CreateValidWorkflow()
    {
        return new WorkflowResource
        {
            Metadata = new k8s.Models.V1ObjectMeta { Name = "test-workflow" },
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
                    }
                }
            }
        };
    }

    private WorkflowTaskResource CreateFetchUserTask()
    {
        return new WorkflowTaskResource
        {
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                InputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["userId"] = new PropertyDefinition { Type = "string" }
                    }
                },
                OutputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["id"] = new PropertyDefinition { Type = "string" }
                    }
                }
            }
        };
    }
}
```

**Run test - should FAIL**

**STEP 2: Implement WorkflowValidator**

Create `src/WorkflowCore/Services/WorkflowValidator.cs`:
```csharp
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface IWorkflowValidator
{
    Task<ValidationResult> ValidateAsync(
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks);
}

public class WorkflowValidator : IWorkflowValidator
{
    private readonly ITemplateParser _templateParser;
    private readonly ITypeCompatibilityChecker _typeChecker;

    public WorkflowValidator(
        ITemplateParser templateParser,
        ITypeCompatibilityChecker typeChecker)
    {
        _templateParser = templateParser ?? throw new ArgumentNullException(nameof(templateParser));
        _typeChecker = typeChecker ?? throw new ArgumentNullException(nameof(typeChecker));
    }

    public Task<ValidationResult> ValidateAsync(
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks)
    {
        var errors = new List<ValidationError>();

        // Validate all task references exist
        foreach (var step in workflow.Spec.Tasks)
        {
            if (!availableTasks.ContainsKey(step.TaskRef))
            {
                errors.Add(ErrorMessageBuilder.MissingRequiredField(
                    step.Id,
                    "taskRef",
                    availableTasks.Keys.ToList()
                ));
                errors[^1].Message = $"Task reference '{step.TaskRef}' not found";
                continue;
            }

            // Validate templates in inputs
            foreach (var (inputKey, inputTemplate) in step.Input)
            {
                var parseResult = _templateParser.Parse(inputTemplate);
                if (!parseResult.IsValid)
                {
                    errors.AddRange(parseResult.Errors.Select(e =>
                        ErrorMessageBuilder.InvalidTemplate(step.Id, inputKey, inputTemplate, e)));
                    continue;
                }

                // Validate type compatibility
                var task = availableTasks[step.TaskRef];
                if (task.Spec.InputSchema?.Properties?.ContainsKey(inputKey) == true)
                {
                    var targetProperty = task.Spec.InputSchema.Properties[inputKey];

                    foreach (var expr in parseResult.Expressions)
                    {
                        var sourceProperty = ResolveExpressionType(expr, workflow, availableTasks);
                        if (sourceProperty != null)
                        {
                            var compatResult = _typeChecker.CheckCompatibility(sourceProperty, targetProperty);
                            if (!compatResult.IsCompatible)
                            {
                                errors.AddRange(compatResult.Errors.Select(e =>
                                    new ValidationError
                                    {
                                        TaskId = step.Id,
                                        Field = inputKey,
                                        Message = e.Message,
                                        SuggestedFix = e.SuggestedFix
                                    }));
                            }
                        }
                    }
                }
            }
        }

        return Task.FromResult(new ValidationResult
        {
            IsValid = errors.Count == 0,
            Errors = errors
        });
    }

    private PropertyDefinition? ResolveExpressionType(
        TemplateExpression expr,
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks)
    {
        if (expr.Type == TemplateExpressionType.TaskOutput && expr.TaskId != null)
        {
            var taskStep = workflow.Spec.Tasks.FirstOrDefault(t => t.Id == expr.TaskId);
            if (taskStep != null && availableTasks.ContainsKey(taskStep.TaskRef))
            {
                var task = availableTasks[taskStep.TaskRef];
                return GetPropertyAtPath(task.Spec.OutputSchema, expr.Path);
            }
        }

        return null;
    }

    private PropertyDefinition? GetPropertyAtPath(SchemaDefinition? schema, string path)
    {
        if (schema?.Properties == null || string.IsNullOrEmpty(path))
        {
            return null;
        }

        var parts = path.Split('.');
        PropertyDefinition? current = null;

        foreach (var part in parts)
        {
            if (current == null)
            {
                if (!schema.Properties.ContainsKey(part))
                {
                    return null;
                }
                current = schema.Properties[part];
            }
            else
            {
                if (current.Properties == null || !current.Properties.ContainsKey(part))
                {
                    return null;
                }
                current = current.Properties[part];
            }
        }

        return current;
    }
}
```

**Run test - should PASS**

---

## Stage 4: Execution Graph & Circular Dependency Detection (Week 2, Days 3-5)

### Task 4.1: Execution Graph Builder (TDD)

**Purpose:** Build a dependency graph from workflow tasks and detect circular dependencies.

**STEP 1: Write failing tests**

Create `tests/WorkflowCore.Tests/Services/ExecutionGraphBuilderTests.cs`:
```csharp
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class ExecutionGraphBuilderTests
{
    private readonly IExecutionGraphBuilder _builder;

    public ExecutionGraphBuilderTests()
    {
        _builder = new ExecutionGraphBuilder();
    }

    [Fact]
    public void Build_WithLinearWorkflow_ShouldReturnValidGraph()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "ref-2",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-1.output.result}}"
                        }
                    }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Graph.Should().NotBeNull();
        result.Graph!.Nodes.Should().HaveCount(2);
        result.Graph.GetDependencies("task-2").Should().Contain("task-1");
    }

    [Fact]
    public void Build_WithCircularDependency_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-a",
                        TaskRef = "ref-a",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-c.output.result}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-b",
                        TaskRef = "ref-b",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-a.output.result}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-c",
                        TaskRef = "ref-c",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-b.output.result}}"
                        }
                    }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Circular dependency");
    }

    [Fact]
    public void Build_WithParallelTasks_ShouldAllowConcurrentExecution()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "ref-1",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{input.userId}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "ref-2",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{input.orderId}}"
                        }
                    }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Graph!.GetDependencies("task-1").Should().BeEmpty();
        result.Graph.GetDependencies("task-2").Should().BeEmpty();
    }

    [Fact]
    public void GetExecutionOrder_ShouldReturnTopologicalSort()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-3",
                        TaskRef = "ref-3",
                        Input = new Dictionary<string, string>
                        {
                            ["a"] = "{{tasks.task-1.output.x}}",
                            ["b"] = "{{tasks.task-2.output.y}}"
                        }
                    },
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "ref-2" }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);
        var executionOrder = result.Graph!.GetExecutionOrder();

        // Assert
        var task3Index = executionOrder.IndexOf("task-3");
        var task1Index = executionOrder.IndexOf("task-1");
        var task2Index = executionOrder.IndexOf("task-2");

        task1Index.Should().BeLessThan(task3Index);
        task2Index.Should().BeLessThan(task3Index);
    }
}
```

**Run test - should FAIL**

**STEP 2: Implement ExecutionGraphBuilder**

Create `src/WorkflowCore/Services/ExecutionGraphBuilder.cs`:
```csharp
using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface IExecutionGraphBuilder
{
    ExecutionGraphResult Build(WorkflowResource workflow);
}

public class ExecutionGraphBuilder : IExecutionGraphBuilder
{
    private static readonly Regex TaskOutputRegex = new(@"tasks\.([^.]+)\.output", RegexOptions.Compiled);

    public ExecutionGraphResult Build(WorkflowResource workflow)
    {
        var graph = new ExecutionGraph();
        var errors = new List<ValidationError>();

        // Build dependency graph
        foreach (var task in workflow.Spec.Tasks)
        {
            graph.AddNode(task.Id);

            // Extract dependencies from input templates
            foreach (var (_, template) in task.Input)
            {
                var matches = TaskOutputRegex.Matches(template);
                foreach (Match match in matches)
                {
                    var dependencyTaskId = match.Groups[1].Value;
                    graph.AddDependency(task.Id, dependencyTaskId);
                }
            }
        }

        // Detect circular dependencies
        var cycles = graph.DetectCycles();
        if (cycles.Any())
        {
            foreach (var cycle in cycles)
            {
                errors.Add(ErrorMessageBuilder.CircularDependency(
                    workflow.Metadata?.Name ?? "unknown",
                    cycle));
            }
        }

        return new ExecutionGraphResult
        {
            IsValid = errors.Count == 0,
            Graph = errors.Count == 0 ? graph : null,
            Errors = errors
        };
    }
}
```

Create `src/WorkflowCore/Models/ExecutionGraph.cs`:
```csharp
namespace WorkflowCore.Models;

public class ExecutionGraph
{
    private readonly Dictionary<string, HashSet<string>> _dependencies = new();
    public List<string> Nodes => _dependencies.Keys.ToList();

    public void AddNode(string nodeId)
    {
        if (!_dependencies.ContainsKey(nodeId))
        {
            _dependencies[nodeId] = new HashSet<string>();
        }
    }

    public void AddDependency(string nodeId, string dependsOn)
    {
        if (!_dependencies.ContainsKey(nodeId))
        {
            AddNode(nodeId);
        }

        _dependencies[nodeId].Add(dependsOn);
    }

    public List<string> GetDependencies(string nodeId)
    {
        return _dependencies.ContainsKey(nodeId)
            ? _dependencies[nodeId].ToList()
            : new List<string>();
    }

    public List<List<string>> DetectCycles()
    {
        var cycles = new List<List<string>>();
        var visited = new HashSet<string>();
        var recursionStack = new HashSet<string>();
        var currentPath = new List<string>();

        foreach (var node in Nodes)
        {
            if (!visited.Contains(node))
            {
                DetectCyclesRecursive(node, visited, recursionStack, currentPath, cycles);
            }
        }

        return cycles;
    }

    private bool DetectCyclesRecursive(
        string node,
        HashSet<string> visited,
        HashSet<string> recursionStack,
        List<string> currentPath,
        List<List<string>> cycles)
    {
        visited.Add(node);
        recursionStack.Add(node);
        currentPath.Add(node);

        foreach (var dependency in GetDependencies(node))
        {
            if (!visited.Contains(dependency))
            {
                if (DetectCyclesRecursive(dependency, visited, recursionStack, currentPath, cycles))
                {
                    return true;
                }
            }
            else if (recursionStack.Contains(dependency))
            {
                // Cycle detected
                var cycleStartIndex = currentPath.IndexOf(dependency);
                var cycle = currentPath.Skip(cycleStartIndex).ToList();
                cycle.Add(dependency); // Complete the cycle
                cycles.Add(cycle);
                return true;
            }
        }

        currentPath.RemoveAt(currentPath.Count - 1);
        recursionStack.Remove(node);
        return false;
    }

    public List<string> GetExecutionOrder()
    {
        var result = new List<string>();
        var visited = new HashSet<string>();
        var stack = new Stack<string>();

        foreach (var node in Nodes)
        {
            if (!visited.Contains(node))
            {
                TopologicalSortRecursive(node, visited, stack);
            }
        }

        while (stack.Count > 0)
        {
            result.Add(stack.Pop());
        }

        return result;
    }

    private void TopologicalSortRecursive(string node, HashSet<string> visited, Stack<string> stack)
    {
        visited.Add(node);

        foreach (var dependency in GetDependencies(node))
        {
            if (!visited.Contains(dependency))
            {
                TopologicalSortRecursive(dependency, visited, stack);
            }
        }

        stack.Push(node);
    }
}

public class ExecutionGraphResult
{
    public bool IsValid { get; set; }
    public ExecutionGraph? Graph { get; set; }
    public List<ValidationError> Errors { get; set; } = new();
}
```

**Run test - should PASS**

---

## Stage 5: Workflow Execution (Week 3)

**Status:** ✅ Complete - See `STAGE_5_PROOF.md`

### Task Specifications

1. **HTTP Task Executor**
   - HTTP client with retries
   - Template resolution at runtime
   - Response parsing and validation

2. **Workflow Orchestrator**
   - Execute tasks in dependency order
   - Handle parallel execution
   - Collect and pass data between tasks

3. **Error handling and retry logic**

---

## Stage 6: Kubernetes Operator with Validation Webhooks (Week 4)

**Status:** ✅ Complete - See `STAGE_6_PROOF.md`

### Task Specifications

1. **Custom Resource Controllers**
   - WorkflowTask controller
   - Workflow controller
   - Watch for CRD changes

2. **Validating Admission Webhooks**
   - Validate WorkflowTask on apply
   - Validate Workflow on apply
   - Reject invalid resources with helpful errors

3. **Schema Evolution Protection**
   - Detect breaking changes in task schemas
   - Track dependent workflows
   - Prevent breaking updates

---

## Stage 7: API Gateway (Week 5)

**Status:** ✅ Complete - See `STAGE_7_PROOF.md`

### Task Specifications

1. **Workflow Execution API**
   - POST /api/v1/workflows/{name}/execute
   - Input validation against workflow schema
   - Synchronous execution with timeout

2. **Dry-Run & Testing API**
   - POST /api/v1/workflows/{name}/test (dry-run mode)
   - Validation-only execution
   - Return execution plan without side effects

3. **Workflow Management API**
   - GET /api/v1/workflows (list)
   - GET /api/v1/workflows/{name} (get)
   - GET /api/v1/tasks (list tasks)

---

## Stage 7.5: Output Mapping & Parallel Execution (Week 5.5)

**Status:** ✅ Complete - See `STAGE_7.5_PROOF.md`

### Task Specifications

1. **Workflow Output Mapping**
   - Add Output property to WorkflowSpec model
   - Implement output mapping in WorkflowOrchestrator
   - Support nested output expressions (e.g., "{{tasks.fetch-user.output.data.email}}")
   - Validate output mappings at workflow definition time
   - Add comprehensive tests for output mapping edge cases

2. **Parallel Task Execution**
   - Analyze execution graph to identify independent tasks
   - Execute independent tasks in parallel using Task.WhenAll()
   - Maintain dependency ordering for dependent tasks
   - Add configurable parallelism limits (max concurrent tasks)
   - Measure and compare performance vs sequential execution

3. **Task Timeout Support**
   - Add Timeout property to WorkflowTaskSpec model
   - Implement per-task timeout enforcement in WorkflowOrchestrator
   - Handle timeout gracefully with clear error messages
   - Add tests for timeout scenarios and cancellation

---

## Stages 7.75-7.9: Database Integration & API Extensions (Week 5.75-6)

### Stage 7.75: PostgreSQL Integration (Foundation)
**Status:** ✅ Complete

*Scope:* Database setup - foundation for future features

1. **Database Schema Design**
   - ExecutionRecord table (id, workflow_name, status, started_at, completed_at, duration, input_snapshot)
   - TaskExecutionRecord table (execution_id, task_id, task_ref, status, output, errors, duration, retry_count)
   - WorkflowVersion table (workflow_name, version_hash, created_at, definition_snapshot)

2. **DbContext with EF Core Migrations**
   - Configure entity relationships (ExecutionRecord → TaskExecutionRecords)
   - Add indexes for performance (workflow_name, created_at, status)

3. **Repository Pattern**
   - IExecutionRepository interface (SaveExecution, GetExecution, ListExecutions)
   - IWorkflowVersionRepository interface (SaveVersion, GetVersions)

4. **TestContainers Integration Tests**
5. **DI Setup & Health Checks**

### Stage 7.8: Execution History & Task Details
**Status:** ✅ Complete

1. **Generate Execution IDs & Save to Database**
2. **Expose Task-Level Details in API Response**
3. **List Executions Endpoint** - GET /api/v1/workflows/{name}/executions
4. **Get Execution Details Endpoint** - GET /api/v1/executions/{id}

### Stage 7.85: Enhanced Dry-Run Visualization
**Status:** ✅ Complete

1. **Parallel Group Detection**
2. **Enhanced Execution Plan Model**
3. **Template Resolution Preview & Time Estimation**

### Stage 7.9: Execution Trace & Workflow Versioning
**Status:** ✅ Complete - See `STAGE_7.9_PROOF.md`

1. **Execution Trace Endpoint** - GET /api/v1/executions/{id}/trace
2. **Simple Workflow Versioning (Hash-Based Change Detection)**
3. **Workflow Versions Endpoint** - GET /api/v1/workflows/{name}/versions

---
