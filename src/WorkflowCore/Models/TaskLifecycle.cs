namespace WorkflowCore.Models;

/// <summary>
/// Represents the lifecycle state of a task.
/// </summary>
public enum TaskLifecycleState
{
    /// <summary>
    /// Task is active and in use.
    /// </summary>
    Active,

    /// <summary>
    /// Task has been superseded by a newer version but is still functional.
    /// </summary>
    Superseded,

    /// <summary>
    /// Task is deprecated and will be removed after deprecation date.
    /// </summary>
    Deprecated
}

/// <summary>
/// Tracks the lifecycle state of a task version.
/// Used for version management and migration planning.
/// </summary>
public class TaskLifecycle
{
    /// <summary>
    /// Name of the task.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Current lifecycle state.
    /// </summary>
    public TaskLifecycleState State { get; set; } = TaskLifecycleState.Active;

    /// <summary>
    /// Name of the task that supersedes this one (if superseded).
    /// </summary>
    public string? SupersededBy { get; set; }

    /// <summary>
    /// Date when the task will be fully deprecated and blocked.
    /// </summary>
    public DateTime? DeprecationDate { get; set; }

    /// <summary>
    /// Returns true if the task is blocked (deprecated and past deprecation date).
    /// </summary>
    public bool IsBlocked => State == TaskLifecycleState.Deprecated
                             && DeprecationDate.HasValue
                             && DeprecationDate.Value < DateTime.UtcNow;

    /// <summary>
    /// Timestamp when the lifecycle was last updated.
    /// </summary>
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}
