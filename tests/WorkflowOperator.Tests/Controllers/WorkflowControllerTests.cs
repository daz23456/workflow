using FluentAssertions;
using WorkflowCore.Models;
using WorkflowOperator.Controllers;
using Xunit;

namespace WorkflowOperator.Tests.Controllers;

public class WorkflowControllerTests
{
    [Fact]
    public async Task ReconcileAsync_WithNewWorkflow_ShouldInitializeStatus()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata
            {
                Name = "user-enrichment",
                Namespace = "default"
            },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "fetch-user", TaskRef = "fetch-user" }
                }
            }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.Should().NotBeNull();
        workflow.Status!.Phase.Should().Be("Ready");
        workflow.Status.LastExecuted.Should().Be(default(DateTime)); // Never executed
        workflow.Status.ExecutionCount.Should().Be(0);
    }

    [Fact]
    public async Task ReconcileAsync_WithUpdatedWorkflow_ShouldPreserveExecutionCount()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() },
            Status = new WorkflowStatus
            {
                Phase = "Ready",
                ExecutionCount = 10,
                LastExecuted = DateTime.UtcNow.AddDays(-1)
            }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.ExecutionCount.Should().Be(10); // Preserved
        workflow.Status.Phase.Should().Be("Ready");
    }

    [Fact]
    public async Task ReconcileAsync_WithInvalidWorkflow_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "invalid" },
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() } // Empty tasks
        };

        // Act
        Func<Task> act = async () => await controller.ReconcileAsync(workflow);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task DeletedAsync_WithWorkflow_ShouldLogDeletion()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "deleted-workflow" },
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() }
        };

        // Act
        Func<Task> act = async () => await controller.DeletedAsync(workflow);

        // Assert
        await act.Should().NotThrowAsync();
    }
}
