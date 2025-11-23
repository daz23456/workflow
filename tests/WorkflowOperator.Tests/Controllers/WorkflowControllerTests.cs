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

    [Fact]
    public async Task ReconcileAsync_WithNullMetadata_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = null!,
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.Should().NotBeNull();
        workflow.Status!.Phase.Should().Be("Ready");
    }

    [Fact]
    public async Task ReconcileAsync_WithEmptyPhase_ShouldSetToReady()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test" },
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() },
            Status = new WorkflowStatus
            {
                Phase = "", // Empty phase
                ExecutionCount = 5,
                LastExecuted = DateTime.UtcNow.AddDays(-1)
            }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.Phase.Should().Be("Ready");
        workflow.Status.ExecutionCount.Should().Be(5); // Preserved
    }

    [Fact]
    public async Task ReconcileAsync_WithNullPhase_ShouldSetToReady()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test" },
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() },
            Status = new WorkflowStatus
            {
                Phase = null!, // Null phase
                ExecutionCount = 3,
                LastExecuted = DateTime.UtcNow.AddHours(-2)
            }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.Phase.Should().Be("Ready");
        workflow.Status.ExecutionCount.Should().Be(3);
    }

    [Fact]
    public async Task ReconcileAsync_WithExistingValidPhase_ShouldPreservePhase()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test" },
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() },
            Status = new WorkflowStatus
            {
                Phase = "Running",
                ExecutionCount = 7,
                LastExecuted = DateTime.UtcNow
            }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.Phase.Should().Be("Running"); // Preserved
        workflow.Status.ExecutionCount.Should().Be(7);
    }

    [Fact]
    public async Task ReconcileAsync_CalledMultipleTimes_ShouldNotResetStatus()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "multi-reconcile" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "ref1" }
                }
            }
        };

        // Act - First reconcile
        await controller.ReconcileAsync(workflow);
        workflow.Status!.ExecutionCount = 15; // Simulate executions
        workflow.Status.Phase = "Completed";

        // Act - Second reconcile
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.ExecutionCount.Should().Be(15);
        workflow.Status.Phase.Should().Be("Completed");
    }

    [Fact]
    public async Task ReconcileAsync_WithComplexWorkflow_ShouldInitializeStatus()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "complex-workflow", Namespace = "production" },
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["userId"] = new WorkflowInputParameter { Type = "string", Required = true },
                    ["action"] = new WorkflowInputParameter { Type = "string", Required = false }
                },
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task1",
                        TaskRef = "fetch-user",
                        Input = new Dictionary<string, string>
                        {
                            ["userId"] = "{{input.userId}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task2",
                        TaskRef = "process-data",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task1.output.result}}"
                        }
                    }
                }
            }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.Should().NotBeNull();
        workflow.Status!.Phase.Should().Be("Ready");
        workflow.Status.ExecutionCount.Should().Be(0);
        workflow.Status.LastExecuted.Should().Be(default(DateTime));
    }

    [Fact]
    public async Task ReconcileAsync_WithSingleTask_ShouldInitializeStatus()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "single-task-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "only-task", TaskRef = "simple-task" }
                }
            }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.Should().NotBeNull();
        workflow.Status!.Phase.Should().Be("Ready");
    }

    [Fact]
    public async Task ReconcileAsync_WithNullSpec_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "null-spec" },
            Spec = null!
        };

        // Act
        Func<Task> act = async () => await controller.ReconcileAsync(workflow);

        // Assert
        await act.Should().NotThrowAsync();
        workflow.Status.Should().NotBeNull();
    }

    [Fact]
    public async Task ReconcileAsync_WithMissingNamespace_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "no-namespace" },
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.Should().NotBeNull();
    }

    [Fact]
    public async Task ReconcileAsync_PreservesLastExecutedTimestamp()
    {
        // Arrange
        var controller = new WorkflowController();
        var lastExecutedTime = DateTime.UtcNow.AddDays(-5);
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "preserve-timestamp" },
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() },
            Status = new WorkflowStatus
            {
                Phase = "Ready",
                ExecutionCount = 20,
                LastExecuted = lastExecutedTime
            }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status.LastExecuted.Should().Be(lastExecutedTime);
    }

    [Fact]
    public async Task DeletedAsync_WithNullMetadata_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = null!,
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() }
        };

        // Act
        Func<Task> act = async () => await controller.DeletedAsync(workflow);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task DeletedAsync_WithComplexWorkflow_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "complex-deleted", Namespace = "production" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "t1", TaskRef = "ref1" },
                    new WorkflowTaskStep { Id = "t2", TaskRef = "ref2" },
                    new WorkflowTaskStep { Id = "t3", TaskRef = "ref3" }
                }
            },
            Status = new WorkflowStatus
            {
                Phase = "Failed",
                ExecutionCount = 50,
                LastExecuted = DateTime.UtcNow.AddMinutes(-30)
            }
        };

        // Act
        Func<Task> act = async () => await controller.DeletedAsync(workflow);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task ReconcileAsync_WithDefaultLastExecuted_ShouldKeepDefault()
    {
        // Arrange
        var controller = new WorkflowController();
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "new-workflow" },
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() }
        };

        // Act
        await controller.ReconcileAsync(workflow);

        // Assert
        workflow.Status!.LastExecuted.Should().Be(default(DateTime));
        workflow.Status.ExecutionCount.Should().Be(0);
        workflow.Status.Phase.Should().Be("Ready");
    }
}
