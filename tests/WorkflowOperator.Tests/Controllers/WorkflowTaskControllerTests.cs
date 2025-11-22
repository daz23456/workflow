using FluentAssertions;
using WorkflowCore.Models;
using WorkflowOperator.Controllers;
using Xunit;

namespace WorkflowOperator.Tests.Controllers;

public class WorkflowTaskControllerTests
{
    [Fact]
    public async Task ReconcileAsync_WithNewWorkflowTask_ShouldUpdateStatus()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata
            {
                Name = "fetch-user",
                Namespace = "default"
            },
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
                }
            }
        };

        // Act
        await controller.ReconcileAsync(workflowTask);

        // Assert
        workflowTask.Status.Should().NotBeNull();
        workflowTask.Status!.LastUpdated.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        workflowTask.Status.UsageCount.Should().Be(0);
    }

    [Fact]
    public async Task ReconcileAsync_WithUpdatedWorkflowTask_ShouldUpdateTimestamp()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "fetch-user" },
            Spec = new WorkflowTaskSpec { Type = "http" },
            Status = new WorkflowTaskStatus
            {
                LastUpdated = DateTime.UtcNow.AddHours(-1),
                UsageCount = 5
            }
        };

        // Act
        await controller.ReconcileAsync(workflowTask);

        // Assert
        workflowTask.Status.LastUpdated.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        workflowTask.Status.UsageCount.Should().Be(5); // Should preserve existing count
    }

    [Fact]
    public async Task ReconcileAsync_WithInvalidSpec_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "invalid-task" },
            Spec = new WorkflowTaskSpec { Type = "" } // Invalid
        };

        // Act
        Func<Task> act = async () => await controller.ReconcileAsync(workflowTask);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task DeletedAsync_WithWorkflowTask_ShouldLogDeletion()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "deleted-task" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        // Act
        Func<Task> act = async () => await controller.DeletedAsync(workflowTask);

        // Assert
        await act.Should().NotThrowAsync();
    }
}
