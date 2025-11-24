namespace WorkflowGateway.Models;

/// <summary>
/// Information about a task's dependencies and when they were satisfied.
/// </summary>
public class DependencyInfo
{
    /// <summary>
    /// Task identifier.
    /// </summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>
    /// List of task IDs this task depends on (direct dependencies).
    /// </summary>
    public List<string> DependsOn { get; set; } = new List<string>();

    /// <summary>
    /// When all dependencies completed and the task became ready to execute (UTC).
    /// Null if the task has no dependencies.
    /// </summary>
    public DateTime? ReadyAt { get; set; }

    /// <summary>
    /// When the task actually started executing (UTC).
    /// </summary>
    public DateTime? StartedAt { get; set; }
}
