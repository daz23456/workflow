using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Services;

namespace WorkflowGateway.Tests.Services;

/// <summary>
/// Tests for KubernetesTaskDependencyTracker - Kubernetes-aware task dependency tracking
/// with O(1) inverted index lookups.
/// </summary>
public class KubernetesTaskDependencyTrackerTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;

    public KubernetesTaskDependencyTrackerTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_ThrowsArgumentNullException_WhenDiscoveryServiceIsNull()
    {
        // Act & Assert
        var act = () => new KubernetesTaskDependencyTracker(null!);
        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("discoveryService");
    }

    [Fact]
    public void Constructor_CreatesInstance_WithValidDiscoveryService()
    {
        // Act
        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Assert
        tracker.Should().NotBeNull();
    }

    #endregion

    #region GetAffectedWorkflows Tests

    [Fact]
    public void GetAffectedWorkflows_ReturnsEmptyList_WhenTaskNotFound()
    {
        // Arrange
        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource>());

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetAffectedWorkflows("nonexistent-task");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void GetAffectedWorkflows_ReturnsWorkflows_WhenTaskHasDependents()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("user-registration", new[] { "validate-user", "create-user" }),
            CreateWorkflow("user-login", new[] { "validate-user", "generate-token" })
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetAffectedWorkflows("validate-user");

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain("user-registration");
        result.Should().Contain("user-login");
    }

    [Fact]
    public void GetAffectedWorkflows_ReturnsSingleWorkflow_WhenTaskUsedOnce()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("order-processing", new[] { "validate-order", "process-payment" }),
            CreateWorkflow("user-registration", new[] { "validate-user", "create-user" })
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetAffectedWorkflows("validate-order");

        // Assert
        result.Should().HaveCount(1);
        result.Should().Contain("order-processing");
    }

    [Fact]
    public void GetAffectedWorkflows_IsCaseInsensitive()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("user-registration", new[] { "Validate-User" })
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetAffectedWorkflows("validate-user");

        // Assert
        result.Should().HaveCount(1);
        result.Should().Contain("user-registration");
    }

    #endregion

    #region GetTasksInWorkflow Tests

    [Fact]
    public void GetTasksInWorkflow_ReturnsEmptyList_WhenWorkflowNotFound()
    {
        // Arrange
        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource>());

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetTasksInWorkflow("nonexistent-workflow");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void GetTasksInWorkflow_ReturnsTasks_ForKnownWorkflow()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("user-registration", new[] { "validate-user", "create-user", "send-email" })
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetTasksInWorkflow("user-registration");

        // Assert
        result.Should().HaveCount(3);
        result.Should().Contain("validate-user");
        result.Should().Contain("create-user");
        result.Should().Contain("send-email");
    }

    [Fact]
    public void GetTasksInWorkflow_ReturnsDistinctTasks_WhenDuplicatesExist()
    {
        // Arrange - workflow with same task used multiple times
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "retry-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "validate-user" },
                    new() { Id = "step2", TaskRef = "validate-user" }, // Duplicate
                    new() { Id = "step3", TaskRef = "create-user" }
                }
            }
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetTasksInWorkflow("retry-workflow");

        // Assert
        result.Should().HaveCount(2); // Distinct tasks only
        result.Should().Contain("validate-user");
        result.Should().Contain("create-user");
    }

    #endregion

    #region GetDependency Tests

    [Fact]
    public void GetDependency_ReturnsNull_WhenNoWorkflowsUseTask()
    {
        // Arrange
        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource>());

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetDependency("orphan-task");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetDependency_ReturnsDependency_WhenWorkflowsExist()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("workflow-a", new[] { "shared-task" }),
            CreateWorkflow("workflow-b", new[] { "shared-task" })
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetDependency("shared-task");

        // Assert
        result.Should().NotBeNull();
        result!.TaskName.Should().Be("shared-task");
        result.DependentWorkflows.Should().HaveCount(2);
        result.DependentWorkflows.Should().Contain("workflow-a");
        result.DependentWorkflows.Should().Contain("workflow-b");
        result.LastUpdated.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    #endregion

    #region No-op Method Tests

    [Fact]
    public void RegisterDependency_DoesNotThrow()
    {
        // Arrange
        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act & Assert - Should not throw
        var act = () => tracker.RegisterDependency("task", "workflow");
        act.Should().NotThrow();
    }

    [Fact]
    public void UnregisterDependency_DoesNotThrow()
    {
        // Arrange
        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act & Assert - Should not throw
        var act = () => tracker.UnregisterDependency("task", "workflow");
        act.Should().NotThrow();
    }

    [Fact]
    public void RegisterFieldUsage_DoesNotThrow()
    {
        // Arrange
        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act & Assert - Should not throw
        var act = () => tracker.RegisterFieldUsage("task", "workflow", new[] { "field1", "field2" });
        act.Should().NotThrow();
    }

    [Fact]
    public void GetWorkflowsUsingField_ReturnsEmptyList()
    {
        // Arrange
        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetWorkflowsUsingField("task", "field");

        // Assert - Not supported in K8s tracker
        result.Should().BeEmpty();
    }

    #endregion

    #region Index Rebuild Tests

    [Fact]
    public void Index_HandlesMultipleWorkflowsWithSameTask()
    {
        // Arrange - Multiple workflows using the same task
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("wf1", new[] { "common-task", "task-a" }),
            CreateWorkflow("wf2", new[] { "common-task", "task-b" }),
            CreateWorkflow("wf3", new[] { "common-task", "task-c" }),
            CreateWorkflow("wf4", new[] { "common-task", "task-d" }),
            CreateWorkflow("wf5", new[] { "common-task", "task-e" })
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var result = tracker.GetAffectedWorkflows("common-task");

        // Assert
        result.Should().HaveCount(5);
        result.Should().Contain(new[] { "wf1", "wf2", "wf3", "wf4", "wf5" });
    }

    [Fact]
    public void Index_HandlesWorkflowWithNoTasks()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "empty-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>()
            }
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var tasks = tracker.GetTasksInWorkflow("empty-workflow");

        // Assert
        tasks.Should().BeEmpty();
    }

    [Fact]
    public void Index_HandlesTasksWithNullTaskRef()
    {
        // Arrange - Workflow with some null TaskRefs (inline tasks)
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "mixed-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "external-task" },
                    new() { Id = "step2", TaskRef = null }, // Inline task
                    new() { Id = "step3", TaskRef = "" },   // Empty string
                    new() { Id = "step4", TaskRef = "another-task" }
                }
            }
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        var tracker = new KubernetesTaskDependencyTracker(_discoveryServiceMock.Object);

        // Act
        var tasks = tracker.GetTasksInWorkflow("mixed-workflow");

        // Assert - Only non-null, non-empty TaskRefs
        tasks.Should().HaveCount(2);
        tasks.Should().Contain("external-task");
        tasks.Should().Contain("another-task");
    }

    #endregion

    #region Helper Methods

    private static WorkflowResource CreateWorkflow(string name, string[] taskRefs)
    {
        var tasks = taskRefs.Select((taskRef, index) => new WorkflowTaskStep
        {
            Id = $"step{index + 1}",
            TaskRef = taskRef
        }).ToList();

        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = name },
            Spec = new WorkflowSpec
            {
                Tasks = tasks
            }
        };
    }

    #endregion
}
