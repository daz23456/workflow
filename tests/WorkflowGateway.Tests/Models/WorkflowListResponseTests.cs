using FluentAssertions;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Models;

public class WorkflowListResponseTests
{
    [Fact]
    public void WorkflowListResponse_ShouldInitializeWithDefaultValues()
    {
        // Act
        var response = new WorkflowListResponse();

        // Assert
        response.Workflows.Should().NotBeNull();
        response.Workflows.Should().BeEmpty();
    }

    [Fact]
    public void WorkflowListResponse_ShouldAllowAddingWorkflows()
    {
        // Arrange
        var workflow1 = new WorkflowSummary
        {
            Name = "user-enrichment",
            Namespace = "default",
            TaskCount = 3,
            Endpoint = "/api/v1/workflows/user-enrichment"
        };

        var workflow2 = new WorkflowSummary
        {
            Name = "order-processing",
            Namespace = "production",
            TaskCount = 5,
            Endpoint = "/api/v1/workflows/order-processing"
        };

        // Act
        var response = new WorkflowListResponse
        {
            Workflows = new List<WorkflowSummary> { workflow1, workflow2 }
        };

        // Assert
        response.Workflows.Should().HaveCount(2);
        response.Workflows[0].Name.Should().Be("user-enrichment");
        response.Workflows[1].Name.Should().Be("order-processing");
    }

    [Fact]
    public void WorkflowSummary_ShouldInitializeWithDefaultValues()
    {
        // Act
        var summary = new WorkflowSummary();

        // Assert
        summary.Name.Should().Be(string.Empty);
        summary.Namespace.Should().Be("default");
        summary.TaskCount.Should().Be(0);
        summary.Endpoint.Should().Be(string.Empty);
    }

    [Fact]
    public void WorkflowSummary_ShouldAllowSettingProperties()
    {
        // Act
        var summary = new WorkflowSummary
        {
            Name = "data-pipeline",
            Namespace = "staging",
            TaskCount = 7,
            Endpoint = "/api/v1/workflows/data-pipeline"
        };

        // Assert
        summary.Name.Should().Be("data-pipeline");
        summary.Namespace.Should().Be("staging");
        summary.TaskCount.Should().Be(7);
        summary.Endpoint.Should().Be("/api/v1/workflows/data-pipeline");
    }

    [Fact]
    public void WorkflowSummary_ShouldDefaultToDefaultNamespace()
    {
        // Act
        var summary = new WorkflowSummary
        {
            Name = "simple-workflow",
            TaskCount = 1
        };

        // Assert
        summary.Namespace.Should().Be("default");
    }

    [Fact]
    public void WorkflowSummary_ShouldSupportZeroTaskCount()
    {
        // Act
        var summary = new WorkflowSummary
        {
            Name = "empty-workflow",
            TaskCount = 0
        };

        // Assert
        summary.TaskCount.Should().Be(0);
    }
}
