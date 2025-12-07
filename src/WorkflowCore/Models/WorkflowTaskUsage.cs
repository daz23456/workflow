namespace WorkflowCore.Models;

/// <summary>
/// Tracks field usage by a specific workflow for a task.
/// This is the consumer contract - what fields the workflow actually uses.
/// </summary>
public class WorkflowTaskUsage
{
    /// <summary>
    /// Name of the task being used.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Name of the workflow using this task.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// Input fields of the task that are used by the workflow.
    /// </summary>
    public HashSet<string> UsedInputFields { get; set; } = new();

    /// <summary>
    /// Output fields of the task that are used by the workflow.
    /// </summary>
    public HashSet<string> UsedOutputFields { get; set; } = new();

    /// <summary>
    /// Whether the workflow uses any fields from this task.
    /// </summary>
    public bool HasFieldUsage => UsedInputFields.Count > 0 || UsedOutputFields.Count > 0;

    /// <summary>
    /// When this usage was last analyzed.
    /// </summary>
    public DateTime LastAnalyzed { get; set; } = DateTime.UtcNow;
}
