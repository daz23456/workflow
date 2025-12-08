using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for TaskLifecycle model - tracks task version lifecycle states.
/// </summary>
public class TaskLifecycleTests
{
    [Fact]
    public void TaskLifecycle_ShouldHaveTaskName()
    {
        var lifecycle = new TaskLifecycle
        {
            TaskName = "get-user"
        };

        lifecycle.TaskName.Should().Be("get-user");
    }

    [Fact]
    public void TaskLifecycle_DefaultState_ShouldBeActive()
    {
        var lifecycle = new TaskLifecycle
        {
            TaskName = "get-user"
        };

        lifecycle.State.Should().Be(TaskLifecycleState.Active);
    }

    [Theory]
    [InlineData(TaskLifecycleState.Active)]
    [InlineData(TaskLifecycleState.Superseded)]
    [InlineData(TaskLifecycleState.Deprecated)]
    public void TaskLifecycle_ShouldSupportAllStates(TaskLifecycleState state)
    {
        var lifecycle = new TaskLifecycle
        {
            TaskName = "get-user",
            State = state
        };

        lifecycle.State.Should().Be(state);
    }

    [Fact]
    public void TaskLifecycle_ShouldTrackSupersededBy()
    {
        var lifecycle = new TaskLifecycle
        {
            TaskName = "get-user",
            State = TaskLifecycleState.Superseded,
            SupersededBy = "get-user-v2"
        };

        lifecycle.SupersededBy.Should().Be("get-user-v2");
    }

    [Fact]
    public void TaskLifecycle_ShouldTrackDeprecationDate()
    {
        var deprecationDate = DateTime.UtcNow.AddMonths(3);
        var lifecycle = new TaskLifecycle
        {
            TaskName = "get-user",
            State = TaskLifecycleState.Deprecated,
            DeprecationDate = deprecationDate
        };

        lifecycle.DeprecationDate.Should().Be(deprecationDate);
    }

    [Fact]
    public void TaskLifecycle_IsBlocked_ShouldReturnTrueWhenDeprecatedPastDate()
    {
        var lifecycle = new TaskLifecycle
        {
            TaskName = "get-user",
            State = TaskLifecycleState.Deprecated,
            DeprecationDate = DateTime.UtcNow.AddDays(-1)
        };

        lifecycle.IsBlocked.Should().BeTrue();
    }
}
