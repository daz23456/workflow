using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for TaskDependencyTracker service - tracks workflow dependencies on tasks.
/// </summary>
public class TaskDependencyTrackerTests
{
    private readonly TaskDependencyTracker _tracker;

    public TaskDependencyTrackerTests()
    {
        _tracker = new TaskDependencyTracker();
    }

    [Fact]
    public void RegisterDependency_ShouldTrackWorkflowDependence()
    {
        _tracker.RegisterDependency("get-user", "user-profile-workflow");

        var dependency = _tracker.GetDependency("get-user");

        dependency.Should().NotBeNull();
        dependency!.DependentWorkflows.Should().Contain("user-profile-workflow");
    }

    [Fact]
    public void RegisterDependency_ShouldTrackMultipleWorkflows()
    {
        _tracker.RegisterDependency("get-user", "user-profile-workflow");
        _tracker.RegisterDependency("get-user", "notification-workflow");

        var dependency = _tracker.GetDependency("get-user");

        dependency!.DependentWorkflows.Should().HaveCount(2);
    }

    [Fact]
    public void RegisterDependency_ShouldNotDuplicateWorkflows()
    {
        _tracker.RegisterDependency("get-user", "user-profile-workflow");
        _tracker.RegisterDependency("get-user", "user-profile-workflow");

        var dependency = _tracker.GetDependency("get-user");

        dependency!.DependentWorkflows.Should().HaveCount(1);
    }

    [Fact]
    public void UnregisterDependency_ShouldRemoveWorkflowFromDependents()
    {
        _tracker.RegisterDependency("get-user", "user-profile-workflow");
        _tracker.RegisterDependency("get-user", "notification-workflow");

        _tracker.UnregisterDependency("get-user", "user-profile-workflow");

        var dependency = _tracker.GetDependency("get-user");
        dependency!.DependentWorkflows.Should().NotContain("user-profile-workflow");
        dependency!.DependentWorkflows.Should().Contain("notification-workflow");
    }

    [Fact]
    public void GetAffectedWorkflows_ShouldReturnAllDependents()
    {
        _tracker.RegisterDependency("get-user", "workflow-1");
        _tracker.RegisterDependency("get-user", "workflow-2");
        _tracker.RegisterDependency("get-user", "workflow-3");

        var affected = _tracker.GetAffectedWorkflows("get-user");

        affected.Should().HaveCount(3);
        affected.Should().Contain("workflow-1");
        affected.Should().Contain("workflow-2");
        affected.Should().Contain("workflow-3");
    }

    [Fact]
    public void GetAffectedWorkflows_ShouldReturnEmptyListForUnknownTask()
    {
        var affected = _tracker.GetAffectedWorkflows("unknown-task");

        affected.Should().BeEmpty();
    }

    [Fact]
    public void RegisterFieldUsage_ShouldTrackFieldsUsedByWorkflow()
    {
        _tracker.RegisterDependency("get-user", "user-profile-workflow");
        _tracker.RegisterFieldUsage("get-user", "user-profile-workflow", new[] { "id", "name", "email" });

        var dependency = _tracker.GetDependency("get-user");

        dependency!.UsedFields.Should().ContainKey("user-profile-workflow");
        dependency!.UsedFields["user-profile-workflow"].Should().Contain("email");
    }

    [Fact]
    public void GetWorkflowsUsingField_ShouldReturnWorkflowsThatUseField()
    {
        _tracker.RegisterDependency("get-user", "workflow-1");
        _tracker.RegisterDependency("get-user", "workflow-2");
        _tracker.RegisterFieldUsage("get-user", "workflow-1", new[] { "id", "email" });
        _tracker.RegisterFieldUsage("get-user", "workflow-2", new[] { "id", "name" });

        var workflowsUsingEmail = _tracker.GetWorkflowsUsingField("get-user", "email");

        workflowsUsingEmail.Should().HaveCount(1);
        workflowsUsingEmail.Should().Contain("workflow-1");
    }
}
