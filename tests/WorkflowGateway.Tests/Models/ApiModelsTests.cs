using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Models;

public class ApiModelsTests
{
    [Fact]
    public void WorkflowExecutionResponse_ShouldSerializeAndDeserialize()
    {
        // Arrange
        var response = new WorkflowExecutionResponse
        {
            Success = true,
            Output = new Dictionary<string, object> { ["result"] = "success" },
            ExecutedTasks = new List<string> { "task1", "task2" },
            ExecutionTimeMs = 150
        };

        // Act
        var json = JsonSerializer.Serialize(response);
        var deserialized = JsonSerializer.Deserialize<WorkflowExecutionResponse>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Success.Should().BeTrue();
        deserialized.ExecutedTasks.Should().HaveCount(2);
        deserialized.ExecutionTimeMs.Should().Be(150);
    }

    [Fact]
    public void WorkflowTestRequest_ShouldSerializeAndDeserialize()
    {
        // Arrange
        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object> { ["userId"] = "123" }
        };

        // Act
        var json = JsonSerializer.Serialize(request);
        var deserialized = JsonSerializer.Deserialize<WorkflowTestRequest>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Input.Should().ContainKey("userId");
    }

    [Fact]
    public void WorkflowTestResponse_ShouldSerializeAndDeserialize()
    {
        // Arrange
        var response = new WorkflowTestResponse
        {
            Valid = true,
            ExecutionPlan = new ExecutionPlan
            {
                TaskOrder = new List<string> { "task1", "task2" },
                Parallelizable = new List<string> { "task1" }
            }
        };

        // Act
        var json = JsonSerializer.Serialize(response);
        var deserialized = JsonSerializer.Deserialize<WorkflowTestResponse>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Valid.Should().BeTrue();
        deserialized.ExecutionPlan.Should().NotBeNull();
        deserialized.ExecutionPlan!.TaskOrder.Should().HaveCount(2);
    }

    [Fact]
    public void WorkflowListResponse_ShouldSerializeAndDeserialize()
    {
        // Arrange
        var response = new WorkflowListResponse
        {
            Workflows = new List<WorkflowSummary>
            {
                new WorkflowSummary
                {
                    Name = "user-enrichment",
                    Namespace = "default",
                    TaskCount = 2,
                    Endpoint = "/api/v1/user-enrichment/execute"
                }
            }
        };

        // Act
        var json = JsonSerializer.Serialize(response);
        var deserialized = JsonSerializer.Deserialize<WorkflowListResponse>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Workflows.Should().HaveCount(1);
        deserialized.Workflows[0].Name.Should().Be("user-enrichment");
        deserialized.Workflows[0].Endpoint.Should().Contain("execute");
    }

    [Fact]
    public void WorkflowDetailResponse_ShouldSerializeAndDeserialize()
    {
        // Arrange
        var response = new WorkflowDetailResponse
        {
            Name = "user-enrichment",
            Namespace = "default",
            InputSchema = new SchemaDefinition
            {
                Type = "object",
                Properties = new Dictionary<string, PropertyDefinition>
                {
                    ["userId"] = new PropertyDefinition { Type = "string" }
                }
            },
            Tasks = new List<WorkflowTaskStep>
            {
                new WorkflowTaskStep { Id = "task1", TaskRef = "fetch-user" }
            },
            Endpoints = new WorkflowEndpoints
            {
                Execute = "/api/v1/user-enrichment/execute",
                Test = "/api/v1/user-enrichment/test",
                Details = "/api/v1/user-enrichment"
            }
        };

        // Act
        var json = JsonSerializer.Serialize(response);
        var deserialized = JsonSerializer.Deserialize<WorkflowDetailResponse>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Name.Should().Be("user-enrichment");
        deserialized.InputSchema.Should().NotBeNull();
        deserialized.Tasks.Should().HaveCount(1);
        deserialized.Endpoints.Execute.Should().Contain("execute");
    }

    [Fact]
    public void TaskListResponse_ShouldSerializeAndDeserialize()
    {
        // Arrange
        var response = new TaskListResponse
        {
            Tasks = new List<TaskSummary>
            {
                new TaskSummary
                {
                    Name = "fetch-user",
                    Type = "http",
                    Namespace = "default"
                }
            }
        };

        // Act
        var json = JsonSerializer.Serialize(response);
        var deserialized = JsonSerializer.Deserialize<TaskListResponse>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Tasks.Should().HaveCount(1);
        deserialized.Tasks[0].Name.Should().Be("fetch-user");
        deserialized.Tasks[0].Type.Should().Be("http");
    }
}
