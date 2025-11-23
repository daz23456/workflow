using FluentAssertions;
using WorkflowGateway.Models;

namespace WorkflowGateway.Tests.Models;

public class ExecutionListResponseTests
{
    [Fact]
    public void ExecutionListResponse_ShouldInitialize_WithDefaultValues()
    {
        // Arrange & Act
        var response = new ExecutionListResponse();

        // Assert
        response.Executions.Should().NotBeNull();
        response.Executions.Should().BeEmpty();
        response.TotalCount.Should().Be(0);
        response.Skip.Should().Be(0);
        response.Take.Should().Be(0);
    }

    [Fact]
    public void ExecutionListResponse_ShouldSet_AllProperties()
    {
        // Arrange
        var executions = new List<ExecutionSummary>
        {
            new ExecutionSummary { Id = Guid.NewGuid(), WorkflowName = "workflow-1", Status = "Succeeded" },
            new ExecutionSummary { Id = Guid.NewGuid(), WorkflowName = "workflow-2", Status = "Running" }
        };

        // Act
        var response = new ExecutionListResponse
        {
            Executions = executions,
            TotalCount = 50,
            Skip = 0,
            Take = 2
        };

        // Assert
        response.Executions.Should().HaveCount(2);
        response.TotalCount.Should().Be(50);
        response.Skip.Should().Be(0);
        response.Take.Should().Be(2);
    }

    [Fact]
    public void ExecutionListResponse_ShouldSupport_Pagination()
    {
        // Arrange
        var executions = new List<ExecutionSummary>
        {
            new ExecutionSummary { Id = Guid.NewGuid(), WorkflowName = "workflow-3" },
            new ExecutionSummary { Id = Guid.NewGuid(), WorkflowName = "workflow-4" },
            new ExecutionSummary { Id = Guid.NewGuid(), WorkflowName = "workflow-5" }
        };

        // Act
        var response = new ExecutionListResponse
        {
            Executions = executions,
            TotalCount = 100,
            Skip = 20,
            Take = 3
        };

        // Assert
        response.Executions.Should().HaveCount(3);
        response.Skip.Should().Be(20);
        response.Take.Should().Be(3);
        response.TotalCount.Should().Be(100);
    }

    [Fact]
    public void ExecutionListResponse_ShouldHandle_EmptyResults()
    {
        // Arrange & Act
        var response = new ExecutionListResponse
        {
            Executions = new List<ExecutionSummary>(),
            TotalCount = 0,
            Skip = 0,
            Take = 50
        };

        // Assert
        response.Executions.Should().BeEmpty();
        response.TotalCount.Should().Be(0);
    }
}
