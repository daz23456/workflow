using FluentAssertions;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Models;

public class TaskListResponseTests
{
    [Fact]
    public void TaskListResponse_ShouldInitializeWithDefaultValues()
    {
        // Act
        var response = new TaskListResponse();

        // Assert
        response.Tasks.Should().NotBeNull();
        response.Tasks.Should().BeEmpty();
    }

    [Fact]
    public void TaskListResponse_ShouldAllowAddingTasks()
    {
        // Arrange
        var task1 = new TaskSummary
        {
            Name = "fetch-user",
            Type = "http",
            Namespace = "default"
        };

        var task2 = new TaskSummary
        {
            Name = "fetch-orders",
            Type = "http",
            Namespace = "production"
        };

        // Act
        var response = new TaskListResponse
        {
            Tasks = new List<TaskSummary> { task1, task2 }
        };

        // Assert
        response.Tasks.Should().HaveCount(2);
        response.Tasks[0].Name.Should().Be("fetch-user");
        response.Tasks[1].Name.Should().Be("fetch-orders");
    }

    [Fact]
    public void TaskSummary_ShouldInitializeWithDefaultValues()
    {
        // Act
        var summary = new TaskSummary();

        // Assert
        summary.Name.Should().Be(string.Empty);
        summary.Type.Should().Be(string.Empty);
        summary.Namespace.Should().Be("default");
    }

    [Fact]
    public void TaskSummary_ShouldAllowSettingProperties()
    {
        // Act
        var summary = new TaskSummary
        {
            Name = "validate-input",
            Type = "http",
            Namespace = "staging"
        };

        // Assert
        summary.Name.Should().Be("validate-input");
        summary.Type.Should().Be("http");
        summary.Namespace.Should().Be("staging");
    }

    [Fact]
    public void TaskSummary_ShouldDefaultToDefaultNamespace()
    {
        // Act
        var summary = new TaskSummary
        {
            Name = "process-data",
            Type = "http"
        };

        // Assert
        summary.Namespace.Should().Be("default");
    }
}
