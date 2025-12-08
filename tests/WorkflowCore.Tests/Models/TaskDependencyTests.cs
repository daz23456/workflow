using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for TaskDependency model - tracks which workflows depend on which tasks.
/// </summary>
public class TaskDependencyTests
{
    [Fact]
    public void TaskDependency_ShouldHaveTaskName()
    {
        var dependency = new TaskDependency
        {
            TaskName = "get-user"
        };

        dependency.TaskName.Should().Be("get-user");
    }

    [Fact]
    public void TaskDependency_ShouldHaveDependentWorkflows()
    {
        var dependency = new TaskDependency
        {
            TaskName = "get-user",
            DependentWorkflows = new List<string> { "user-profile", "user-notifications" }
        };

        dependency.DependentWorkflows.Should().HaveCount(2);
        dependency.DependentWorkflows.Should().Contain("user-profile");
    }

    [Fact]
    public void TaskDependency_ShouldTrackUsedFields()
    {
        var dependency = new TaskDependency
        {
            TaskName = "get-user",
            UsedFields = new Dictionary<string, List<string>>
            {
                ["user-profile"] = new List<string> { "id", "name", "email" },
                ["user-notifications"] = new List<string> { "id", "email" }
            }
        };

        dependency.UsedFields.Should().ContainKey("user-profile");
        dependency.UsedFields["user-profile"].Should().Contain("email");
    }

    [Fact]
    public void TaskDependency_HasDependents_ShouldReturnTrueWhenWorkflowsExist()
    {
        var dependency = new TaskDependency
        {
            TaskName = "get-user",
            DependentWorkflows = new List<string> { "user-profile" }
        };

        dependency.HasDependents.Should().BeTrue();
    }

    [Fact]
    public void TaskDependency_HasDependents_ShouldReturnFalseWhenEmpty()
    {
        var dependency = new TaskDependency
        {
            TaskName = "orphan-task",
            DependentWorkflows = new List<string>()
        };

        dependency.HasDependents.Should().BeFalse();
    }
}
