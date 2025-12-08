using System.Collections.Concurrent;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// In-memory implementation of task lifecycle management.
/// </summary>
public class TaskLifecycleManager : ITaskLifecycleManager
{
    private readonly ConcurrentDictionary<string, TaskLifecycle> _lifecycles = new();

    /// <inheritdoc />
    public void SetLifecycle(TaskLifecycle lifecycle)
    {
        _lifecycles[lifecycle.TaskName] = lifecycle;
    }

    /// <inheritdoc />
    public TaskLifecycle? GetLifecycle(string taskName)
    {
        return _lifecycles.TryGetValue(taskName, out var lifecycle) ? lifecycle : null;
    }

    /// <inheritdoc />
    public void SupersedeTask(string taskName, string supersededByTaskName)
    {
        if (_lifecycles.TryGetValue(taskName, out var lifecycle))
        {
            lifecycle.State = TaskLifecycleState.Superseded;
            lifecycle.SupersededBy = supersededByTaskName;
            lifecycle.LastUpdated = DateTime.UtcNow;
        }
    }

    /// <inheritdoc />
    public void DeprecateTask(string taskName, DateTime deprecationDate)
    {
        if (_lifecycles.TryGetValue(taskName, out var lifecycle))
        {
            lifecycle.State = TaskLifecycleState.Deprecated;
            lifecycle.DeprecationDate = deprecationDate;
            lifecycle.LastUpdated = DateTime.UtcNow;
        }
    }

    /// <inheritdoc />
    public bool IsTaskBlocked(string taskName)
    {
        if (_lifecycles.TryGetValue(taskName, out var lifecycle))
        {
            return lifecycle.IsBlocked;
        }
        return false;
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetActiveTasks()
    {
        return _lifecycles
            .Where(kvp => kvp.Value.State == TaskLifecycleState.Active)
            .Select(kvp => kvp.Key)
            .ToList();
    }
}
