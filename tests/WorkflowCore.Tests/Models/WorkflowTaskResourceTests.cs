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
        resource.Spec.Request.Url.Should().Contain("{{input.userId}}");
    }

    [Fact]
    public void HttpRequestDefinition_ShouldSetAllProperties()
    {
        // Arrange & Act
        var request = new HttpRequestDefinition
        {
            Method = "POST",
            Url = "https://api.example.com/users",
            Headers = new Dictionary<string, string> { ["Authorization"] = "Bearer token" },
            Body = "{\"name\": \"John\"}"
        };

        // Assert
        request.Method.Should().Be("POST");
        request.Url.Should().Contain("api.example.com");
        request.Headers.Should().ContainKey("Authorization");
        request.Body.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void WorkflowTaskSpec_ShouldSetAllProperties()
    {
        // Arrange & Act
        var spec = new WorkflowTaskSpec
        {
            Type = "http",
            InputSchema = new SchemaDefinition { Type = "object" },
            OutputSchema = new SchemaDefinition { Type = "object" },
            Request = new HttpRequestDefinition { Method = "GET", Url = "http://test.com" },
            Timeout = "30s"
        };

        // Assert
        spec.Type.Should().Be("http");
        spec.InputSchema.Should().NotBeNull();
        spec.OutputSchema.Should().NotBeNull();
        spec.Request.Should().NotBeNull();
        spec.Timeout.Should().Be("30s");
    }

    [Fact]
    public void WorkflowTaskStep_ShouldSetAllProperties()
    {
        // Arrange & Act
        var step = new WorkflowTaskStep
        {
            Id = "step1",
            TaskRef = "task-ref",
            Input = new Dictionary<string, string> { ["key"] = "value" },
            Condition = "{{tasks.previous.output.success}}"
        };

        // Assert
        step.Id.Should().Be("step1");
        step.TaskRef.Should().Be("task-ref");
        step.Input.Should().ContainKey("key");
        step.Condition.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void WorkflowTaskResource_ShouldInitializeWithDefaultValues()
    {
        // Act
        var resource = new WorkflowTaskResource();

        // Assert
        resource.ApiVersion.Should().Be(string.Empty);
        resource.Kind.Should().Be(string.Empty);
        resource.Metadata.Should().NotBeNull();
        resource.Spec.Should().NotBeNull();
        resource.Status.Should().BeNull();
    }

    [Fact]
    public void ResourceMetadata_ShouldInitializeWithDefaultValues()
    {
        // Act
        var metadata = new ResourceMetadata();

        // Assert
        metadata.Name.Should().Be(string.Empty);
        metadata.Namespace.Should().Be(string.Empty);
    }

    [Fact]
    public void ResourceMetadata_ShouldAllowSettingProperties()
    {
        // Act
        var metadata = new ResourceMetadata
        {
            Name = "test-resource",
            Namespace = "production"
        };

        // Assert
        metadata.Name.Should().Be("test-resource");
        metadata.Namespace.Should().Be("production");
    }

    [Fact]
    public void WorkflowTaskSpec_ShouldInitializeWithDefaultValues()
    {
        // Act
        var spec = new WorkflowTaskSpec();

        // Assert
        spec.Type.Should().Be(string.Empty);
        spec.InputSchema.Should().BeNull();
        spec.OutputSchema.Should().BeNull();
        spec.Request.Should().BeNull();
        spec.Timeout.Should().BeNull();
    }

    [Fact]
    public void HttpRequestDefinition_ShouldInitializeWithDefaultValues()
    {
        // Act
        var request = new HttpRequestDefinition();

        // Assert
        request.Method.Should().Be(string.Empty);
        request.Url.Should().Be(string.Empty);
        request.Headers.Should().BeNull();
        request.Body.Should().BeNull();
    }

    [Fact]
    public void WorkflowTaskStatus_ShouldInitializeWithDefaultValues()
    {
        // Act
        var status = new WorkflowTaskStatus();

        // Assert
        status.UsageCount.Should().Be(0);
        status.LastUpdated.Should().Be(default(DateTime));
    }

    [Fact]
    public void WorkflowTaskStatus_ShouldAllowSettingProperties()
    {
        // Arrange
        var now = DateTime.UtcNow;

        // Act
        var status = new WorkflowTaskStatus
        {
            UsageCount = 150,
            LastUpdated = now
        };

        // Assert
        status.UsageCount.Should().Be(150);
        status.LastUpdated.Should().Be(now);
    }
}
