using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for TaskLifecycleManager service - manages task version lifecycle states.
/// </summary>
public class TaskLifecycleManagerTests
{
    private readonly TaskLifecycleManager _manager;

    public TaskLifecycleManagerTests()
    {
        _manager = new TaskLifecycleManager();
    }

    [Fact]
    public void SetLifecycle_ShouldStoreLifecycleState()
    {
        var lifecycle = new TaskLifecycle
        {
            TaskName = "get-user",
            State = TaskLifecycleState.Active
        };

        _manager.SetLifecycle(lifecycle);

        var result = _manager.GetLifecycle("get-user");
        result.Should().NotBeNull();
        result!.State.Should().Be(TaskLifecycleState.Active);
    }

    [Fact]
    public void SupersedeTask_ShouldUpdateStateAndSetSupersededBy()
    {
        _manager.SetLifecycle(new TaskLifecycle { TaskName = "get-user", State = TaskLifecycleState.Active });

        _manager.SupersedeTask("get-user", "get-user-v2");

        var lifecycle = _manager.GetLifecycle("get-user");
        lifecycle!.State.Should().Be(TaskLifecycleState.Superseded);
        lifecycle!.SupersededBy.Should().Be("get-user-v2");
    }

    [Fact]
    public void DeprecateTask_ShouldSetStateAndDeprecationDate()
    {
        _manager.SetLifecycle(new TaskLifecycle { TaskName = "get-user", State = TaskLifecycleState.Active });
        var deprecationDate = DateTime.UtcNow.AddMonths(3);

        _manager.DeprecateTask("get-user", deprecationDate);

        var lifecycle = _manager.GetLifecycle("get-user");
        lifecycle!.State.Should().Be(TaskLifecycleState.Deprecated);
        lifecycle!.DeprecationDate.Should().Be(deprecationDate);
    }

    [Fact]
    public void IsTaskBlocked_ShouldReturnTrueWhenDeprecatedPastDate()
    {
        var pastDate = DateTime.UtcNow.AddDays(-1);
        _manager.SetLifecycle(new TaskLifecycle
        {
            TaskName = "get-user",
            State = TaskLifecycleState.Deprecated,
            DeprecationDate = pastDate
        });

        var isBlocked = _manager.IsTaskBlocked("get-user");

        isBlocked.Should().BeTrue();
    }

    [Fact]
    public void IsTaskBlocked_ShouldReturnFalseWhenActive()
    {
        _manager.SetLifecycle(new TaskLifecycle { TaskName = "get-user", State = TaskLifecycleState.Active });

        var isBlocked = _manager.IsTaskBlocked("get-user");

        isBlocked.Should().BeFalse();
    }

    [Fact]
    public void GetActiveTasks_ShouldReturnOnlyActiveTasks()
    {
        _manager.SetLifecycle(new TaskLifecycle { TaskName = "task-1", State = TaskLifecycleState.Active });
        _manager.SetLifecycle(new TaskLifecycle { TaskName = "task-2", State = TaskLifecycleState.Superseded });
        _manager.SetLifecycle(new TaskLifecycle { TaskName = "task-3", State = TaskLifecycleState.Active });

        var activeTasks = _manager.GetActiveTasks();

        activeTasks.Should().HaveCount(2);
        activeTasks.Should().Contain("task-1");
        activeTasks.Should().Contain("task-3");
    }
}
