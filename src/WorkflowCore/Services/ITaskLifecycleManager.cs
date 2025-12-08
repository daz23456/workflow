using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Manages task version lifecycle states.
/// </summary>
public interface ITaskLifecycleManager
{
    /// <summary>
    /// Set the lifecycle state for a task.
    /// </summary>
    void SetLifecycle(TaskLifecycle lifecycle);

    /// <summary>
    /// Get the lifecycle state for a task.
    /// </summary>
    TaskLifecycle? GetLifecycle(string taskName);

    /// <summary>
    /// Mark a task as superseded by a newer version.
    /// </summary>
    void SupersedeTask(string taskName, string supersededByTaskName);

    /// <summary>
    /// Mark a task as deprecated with a removal date.
    /// </summary>
    void DeprecateTask(string taskName, DateTime deprecationDate);

    /// <summary>
    /// Check if a task is blocked (deprecated past its date).
    /// </summary>
    bool IsTaskBlocked(string taskName);

    /// <summary>
    /// Get all tasks that are currently active.
    /// </summary>
    IReadOnlyList<string> GetActiveTasks();
}
