using System.Text.Json;
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
  name: user-workflow
  namespace: default
spec:
  tasks:
    - id: fetch-user
      taskRef: fetch-user-task
      input:
        userId: '{{input.userId}}'
    - id: process-user
      taskRef: process-user-task
      input:
        user: '{{tasks.fetch-user.output.body}}'
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
        resource.Metadata.Name.Should().Be("user-workflow");
        resource.Spec.Tasks.Should().HaveCount(2);
        resource.Spec.Tasks[0].Id.Should().Be("fetch-user");
        resource.Spec.Tasks[0].TaskRef.Should().Be("fetch-user-task");
        resource.Spec.Tasks[1].Id.Should().Be("process-user");
        resource.Spec.Tasks[1].Input.Should().ContainKey("user");
    }

    [Fact]
    public void WorkflowResource_ShouldInitializeWithDefaultValues()
    {
        // Act
        var resource = new WorkflowResource();

        // Assert
        resource.ApiVersion.Should().Be(string.Empty);
        resource.Kind.Should().Be(string.Empty);
        resource.Metadata.Should().NotBeNull();
        resource.Spec.Should().NotBeNull();
        resource.Status.Should().BeNull();
    }

    [Fact]
    public void WorkflowSpec_ShouldInitializeWithDefaultValues()
    {
        // Act
        var spec = new WorkflowSpec();

        // Assert
        spec.Input.Should().NotBeNull();
        spec.Input.Should().BeEmpty();
        spec.Tasks.Should().NotBeNull();
        spec.Tasks.Should().BeEmpty();
        spec.Output.Should().BeNull();
    }

    [Fact]
    public void WorkflowInputParameter_ShouldInitializeWithDefaultValues()
    {
        // Act
        var param = new WorkflowInputParameter();

        // Assert
        param.Type.Should().Be(string.Empty);
        param.Required.Should().BeFalse();
        param.Description.Should().BeNull();
        param.Default.Should().BeNull();
    }

    [Fact]
    public void WorkflowInputParameter_ShouldAllowSettingAllProperties()
    {
        // Act
        var param = new WorkflowInputParameter
        {
            Type = "string",
            Required = true,
            Description = "User ID",
            Default = "default-value"
        };

        // Assert
        param.Type.Should().Be("string");
        param.Required.Should().BeTrue();
        param.Description.Should().Be("User ID");
        param.Default.Should().Be("default-value");
    }

    [Fact]
    public void WorkflowTaskStep_ShouldInitializeWithDefaultValues()
    {
        // Act
        var step = new WorkflowTaskStep();

        // Assert
        step.Id.Should().Be(string.Empty);
        step.TaskRef.Should().BeNull(); // Nullable for mutual exclusivity with WorkflowRef
        step.WorkflowRef.Should().BeNull();
        step.Input.Should().NotBeNull();
        step.Input.Should().BeEmpty();
        step.Condition.Should().BeNull();
    }

    [Fact]
    public void WorkflowTaskStep_ShouldAllowSettingAllProperties()
    {
        // Act
        var step = new WorkflowTaskStep
        {
            Id = "fetch-user",
            TaskRef = "fetch-user-task",
            Input = new Dictionary<string, string> { ["userId"] = "{{input.userId}}" },
            Condition = new ConditionSpec { If = "{{input.active}} == true" }
        };

        // Assert
        step.Id.Should().Be("fetch-user");
        step.TaskRef.Should().Be("fetch-user-task");
        step.Input.Should().ContainKey("userId");
        step.Condition.Should().NotBeNull();
        step.Condition!.If.Should().Be("{{input.active}} == true");
    }

    [Fact]
    public void WorkflowStatus_ShouldInitializeWithDefaultValues()
    {
        // Act
        var status = new WorkflowStatus();

        // Assert
        status.Phase.Should().Be("Pending");
        status.ExecutionCount.Should().Be(0);
        status.LastExecuted.Should().Be(default(DateTime));
        status.ValidationErrors.Should().NotBeNull();
        status.ValidationErrors.Should().BeEmpty();
    }

    [Fact]
    public void WorkflowStatus_ShouldAllowSettingAllProperties()
    {
        // Arrange
        var now = DateTime.UtcNow;

        // Act
        var status = new WorkflowStatus
        {
            Phase = "Ready",
            ExecutionCount = 42,
            LastExecuted = now,
            ValidationErrors = new List<string> { "Error 1" }
        };

        // Assert
        status.Phase.Should().Be("Ready");
        status.ExecutionCount.Should().Be(42);
        status.LastExecuted.Should().Be(now);
        status.ValidationErrors.Should().HaveCount(1);
    }

    // ========== DEPENDSON DESERIALIZATION TESTS ==========

    [Fact]
    public void WorkflowResource_ShouldDeserializeDependsOn_FromYaml()
    {
        // Arrange - YAML with explicit dependsOn
        var yaml = @"
apiVersion: workflows.example.com/v1
kind: Workflow
metadata:
  name: dependency-workflow
  namespace: default
spec:
  tasks:
    - id: task-1
      taskRef: fetch-user
    - id: task-2
      taskRef: process-user
      dependsOn:
        - task-1
    - id: task-3
      taskRef: final-task
      dependsOn:
        - task-1
        - task-2
";

        // Act
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        var resource = deserializer.Deserialize<WorkflowResource>(yaml);

        // Assert
        resource.Should().NotBeNull();
        resource.Spec.Tasks.Should().HaveCount(3);

        // task-1 has no dependencies
        resource.Spec.Tasks[0].Id.Should().Be("task-1");
        resource.Spec.Tasks[0].DependsOn.Should().BeNull();

        // task-2 depends on task-1
        resource.Spec.Tasks[1].Id.Should().Be("task-2");
        resource.Spec.Tasks[1].DependsOn.Should().NotBeNull();
        resource.Spec.Tasks[1].DependsOn.Should().ContainSingle().Which.Should().Be("task-1");

        // task-3 depends on both task-1 and task-2
        resource.Spec.Tasks[2].Id.Should().Be("task-3");
        resource.Spec.Tasks[2].DependsOn.Should().NotBeNull();
        resource.Spec.Tasks[2].DependsOn.Should().HaveCount(2);
        resource.Spec.Tasks[2].DependsOn.Should().Contain("task-1");
        resource.Spec.Tasks[2].DependsOn.Should().Contain("task-2");
    }

    [Fact]
    public void WorkflowResource_ShouldDeserializeDependsOn_FromJson()
    {
        // Arrange - JSON like Kubernetes API returns
        // This tests the same format that KubernetesWorkflowClient uses
        var json = @"
{
    ""apiVersion"": ""workflows.example.com/v1"",
    ""kind"": ""Workflow"",
    ""metadata"": {
        ""name"": ""dependency-workflow"",
        ""namespace"": ""default""
    },
    ""spec"": {
        ""tasks"": [
            {
                ""id"": ""task-1"",
                ""taskRef"": ""fetch-user""
            },
            {
                ""id"": ""task-2"",
                ""taskRef"": ""process-user"",
                ""dependsOn"": [""task-1""]
            },
            {
                ""id"": ""task-3"",
                ""taskRef"": ""final-task"",
                ""dependsOn"": [""task-1"", ""task-2""]
            }
        ]
    }
}";

        // Act - Use the same options as KubernetesWorkflowClient
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var resource = JsonSerializer.Deserialize<WorkflowResource>(json, options);

        // Assert
        resource.Should().NotBeNull();
        resource!.Spec.Tasks.Should().HaveCount(3);

        // task-1 has no dependencies
        resource.Spec.Tasks[0].Id.Should().Be("task-1");
        resource.Spec.Tasks[0].DependsOn.Should().BeNull();

        // task-2 depends on task-1 - CRITICAL TEST
        resource.Spec.Tasks[1].Id.Should().Be("task-2");
        resource.Spec.Tasks[1].DependsOn.Should().NotBeNull("JSON dependsOn array should deserialize correctly");
        resource.Spec.Tasks[1].DependsOn.Should().ContainSingle().Which.Should().Be("task-1");

        // task-3 depends on both task-1 and task-2
        resource.Spec.Tasks[2].Id.Should().Be("task-3");
        resource.Spec.Tasks[2].DependsOn.Should().NotBeNull();
        resource.Spec.Tasks[2].DependsOn.Should().HaveCount(2);
        resource.Spec.Tasks[2].DependsOn.Should().Contain("task-1");
        resource.Spec.Tasks[2].DependsOn.Should().Contain("task-2");
    }

    [Fact]
    public void WorkflowTaskStep_DependsOn_ShouldWorkWithJsonPropertyNameCaseInsensitive()
    {
        // Arrange - Test various case formats
        var testCases = new[]
        {
            @"{""id"": ""task"", ""taskRef"": ""ref"", ""dependsOn"": [""dep1""]}",  // camelCase
            @"{""id"": ""task"", ""taskRef"": ""ref"", ""DependsOn"": [""dep1""]}",  // PascalCase
            @"{""id"": ""task"", ""taskRef"": ""ref"", ""DEPENDSON"": [""dep1""]}",  // UPPERCASE
        };

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        foreach (var json in testCases)
        {
            // Act
            var step = JsonSerializer.Deserialize<WorkflowTaskStep>(json, options);

            // Assert
            step.Should().NotBeNull();
            step!.DependsOn.Should().NotBeNull($"Failed for JSON: {json}");
            step.DependsOn.Should().ContainSingle().Which.Should().Be("dep1");
        }
    }

    // ========== CIRCUIT BREAKER DESERIALIZATION TESTS ==========

    [Fact]
    public void WorkflowTaskStep_ShouldDeserializeCircuitBreaker_FromYaml()
    {
        // Arrange
        var yaml = @"
apiVersion: workflows.example.com/v1
kind: Workflow
metadata:
  name: circuit-breaker-workflow
spec:
  tasks:
    - id: external-api-call
      taskRef: http-get
      input:
        url: 'https://api.example.com/data'
      circuitBreaker:
        failureThreshold: 5
        samplingDuration: 60s
        breakDuration: 30s
        halfOpenRequests: 3
";

        // Act
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        var resource = deserializer.Deserialize<WorkflowResource>(yaml);

        // Assert
        resource.Should().NotBeNull();
        resource.Spec.Tasks.Should().HaveCount(1);
        var task = resource.Spec.Tasks[0];
        task.CircuitBreaker.Should().NotBeNull();
        task.CircuitBreaker!.FailureThreshold.Should().Be(5);
        task.CircuitBreaker.SamplingDuration.Should().Be("60s");
        task.CircuitBreaker.BreakDuration.Should().Be("30s");
        task.CircuitBreaker.HalfOpenRequests.Should().Be(3);
    }

    [Fact]
    public void WorkflowTaskStep_ShouldDeserializeFallback_FromYaml()
    {
        // Arrange
        var yaml = @"
apiVersion: workflows.example.com/v1
kind: Workflow
metadata:
  name: fallback-workflow
spec:
  tasks:
    - id: external-api-call
      taskRef: http-get
      fallback:
        taskRef: get-cached-data
        input:
          key: '{{input.cacheKey}}'
";

        // Act
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        var resource = deserializer.Deserialize<WorkflowResource>(yaml);

        // Assert
        resource.Should().NotBeNull();
        resource.Spec.Tasks.Should().HaveCount(1);
        var task = resource.Spec.Tasks[0];
        task.Fallback.Should().NotBeNull();
        task.Fallback!.TaskRef.Should().Be("get-cached-data");
        task.Fallback.Input.Should().ContainKey("key");
        task.Fallback.Input["key"].Should().Be("{{input.cacheKey}}");
    }

    [Fact]
    public void WorkflowTaskStep_ShouldDeserializeCircuitBreakerAndFallback_FromYaml()
    {
        // Arrange - both circuit breaker and fallback configured
        var yaml = @"
apiVersion: workflows.example.com/v1
kind: Workflow
metadata:
  name: resilient-workflow
spec:
  tasks:
    - id: call-external-api
      taskRef: http-get
      input:
        url: 'https://api.example.com/data'
      circuitBreaker:
        failureThreshold: 5
        samplingDuration: 60s
        breakDuration: 30s
        halfOpenRequests: 3
      fallback:
        taskRef: get-cached-data
        input:
          key: '{{input.cacheKey}}'
";

        // Act
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        var resource = deserializer.Deserialize<WorkflowResource>(yaml);

        // Assert
        resource.Should().NotBeNull();
        var task = resource.Spec.Tasks[0];
        task.CircuitBreaker.Should().NotBeNull();
        task.Fallback.Should().NotBeNull();
        task.CircuitBreaker!.FailureThreshold.Should().Be(5);
        task.Fallback!.TaskRef.Should().Be("get-cached-data");
    }

    [Fact]
    public void WorkflowTaskStep_ShouldDeserializeCircuitBreaker_FromJson()
    {
        // Arrange
        var json = @"
{
    ""apiVersion"": ""workflows.example.com/v1"",
    ""kind"": ""Workflow"",
    ""metadata"": { ""name"": ""cb-workflow"" },
    ""spec"": {
        ""tasks"": [
            {
                ""id"": ""api-call"",
                ""taskRef"": ""http-get"",
                ""circuitBreaker"": {
                    ""failureThreshold"": 10,
                    ""samplingDuration"": ""2m"",
                    ""breakDuration"": ""45s"",
                    ""halfOpenRequests"": 5
                },
                ""fallback"": {
                    ""taskRef"": ""cache-fallback"",
                    ""input"": { ""id"": ""{{input.id}}"" }
                }
            }
        ]
    }
}";

        // Act
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var resource = JsonSerializer.Deserialize<WorkflowResource>(json, options);

        // Assert
        resource.Should().NotBeNull();
        var task = resource!.Spec.Tasks[0];
        task.CircuitBreaker.Should().NotBeNull();
        task.CircuitBreaker!.FailureThreshold.Should().Be(10);
        task.CircuitBreaker.SamplingDuration.Should().Be("2m");
        task.CircuitBreaker.BreakDuration.Should().Be("45s");
        task.CircuitBreaker.HalfOpenRequests.Should().Be(5);
        task.Fallback.Should().NotBeNull();
        task.Fallback!.TaskRef.Should().Be("cache-fallback");
    }

    [Fact]
    public void WorkflowTaskStep_CircuitBreakerAndFallback_ShouldDefaultToNull()
    {
        // Act
        var step = new WorkflowTaskStep();

        // Assert
        step.CircuitBreaker.Should().BeNull();
        step.Fallback.Should().BeNull();
    }
}
