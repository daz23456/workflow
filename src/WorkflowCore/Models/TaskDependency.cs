namespace WorkflowCore.Models;

/// <summary>
/// Tracks which workflows depend on a specific task.
/// Used for impact analysis when task changes are detected.
/// </summary>
public class TaskDependency
{
    /// <summary>
    /// Name of the task being tracked.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// List of workflow names that depend on this task.
    /// </summary>
    public List<string> DependentWorkflows { get; set; } = new();

    /// <summary>
    /// Maps workflow name to the list of task output fields it uses.
    /// Used for field-level impact analysis.
    /// </summary>
    public Dictionary<string, List<string>> UsedFields { get; set; } = new();

    /// <summary>
    /// Returns true if any workflows depend on this task.
    /// </summary>
    public bool HasDependents => DependentWorkflows.Count > 0;

    /// <summary>
    /// Timestamp when the dependency was last updated.
    /// </summary>
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}
