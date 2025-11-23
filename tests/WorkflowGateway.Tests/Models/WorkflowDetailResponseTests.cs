using FluentAssertions;
using WorkflowCore.Models;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Models;

public class WorkflowDetailResponseTests
{
    [Fact]
    public void WorkflowDetailResponse_ShouldInitializeWithDefaultValues()
    {
        // Act
        var response = new WorkflowDetailResponse();

        // Assert
        response.Name.Should().Be(string.Empty);
        response.Namespace.Should().Be("default");
        response.InputSchema.Should().BeNull();
        response.OutputSchema.Should().BeNull();
        response.Tasks.Should().NotBeNull();
        response.Tasks.Should().BeEmpty();
        response.Endpoints.Should().NotBeNull();
    }

    [Fact]
    public void WorkflowDetailResponse_ShouldAllowSettingProperties()
    {
        // Arrange
        var inputSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["userId"] = new PropertyDefinition { Type = "string" }
            }
        };

        var outputSchema = new Dictionary<string, object>
        {
            ["result"] = "success"
        };

        var task = new WorkflowTaskStep
        {
            Id = "task-1",
            TaskRef = "fetch-user"
        };

        var endpoints = new WorkflowEndpoints
        {
            Execute = "/api/v1/workflows/test/execute",
            Test = "/api/v1/workflows/test/test",
            Details = "/api/v1/workflows/test"
        };

        // Act
        var response = new WorkflowDetailResponse
        {
            Name = "test-workflow",
            Namespace = "production",
            InputSchema = inputSchema,
            OutputSchema = outputSchema,
            Tasks = new List<WorkflowTaskStep> { task },
            Endpoints = endpoints
        };

        // Assert
        response.Name.Should().Be("test-workflow");
        response.Namespace.Should().Be("production");
        response.InputSchema.Should().NotBeNull();
        response.InputSchema!.Type.Should().Be("object");
        response.OutputSchema.Should().NotBeNull();
        response.OutputSchema!["result"].Should().Be("success");
        response.Tasks.Should().HaveCount(1);
        response.Tasks[0].Id.Should().Be("task-1");
        response.Endpoints.Execute.Should().Be("/api/v1/workflows/test/execute");
    }

    [Fact]
    public void WorkflowDetailResponse_ShouldDefaultToDefaultNamespace()
    {
        // Act
        var response = new WorkflowDetailResponse
        {
            Name = "simple-workflow"
        };

        // Assert
        response.Namespace.Should().Be("default");
    }

    [Fact]
    public void WorkflowEndpoints_ShouldInitializeWithDefaultValues()
    {
        // Act
        var endpoints = new WorkflowEndpoints();

        // Assert
        endpoints.Execute.Should().Be(string.Empty);
        endpoints.Test.Should().Be(string.Empty);
        endpoints.Details.Should().Be(string.Empty);
    }

    [Fact]
    public void WorkflowEndpoints_ShouldAllowSettingProperties()
    {
        // Act
        var endpoints = new WorkflowEndpoints
        {
            Execute = "/api/v1/workflows/user-enrichment/execute",
            Test = "/api/v1/workflows/user-enrichment/test",
            Details = "/api/v1/workflows/user-enrichment"
        };

        // Assert
        endpoints.Execute.Should().Be("/api/v1/workflows/user-enrichment/execute");
        endpoints.Test.Should().Be("/api/v1/workflows/user-enrichment/test");
        endpoints.Details.Should().Be("/api/v1/workflows/user-enrichment");
    }

    [Fact]
    public void WorkflowDetailResponse_ShouldAllowNullSchemas()
    {
        // Act
        var response = new WorkflowDetailResponse
        {
            Name = "no-schema-workflow",
            InputSchema = null,
            OutputSchema = null
        };

        // Assert
        response.InputSchema.Should().BeNull();
        response.OutputSchema.Should().BeNull();
    }
}
