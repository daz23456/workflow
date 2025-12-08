namespace WorkflowGateway.Models;

/// <summary>
/// Response model for task impact analysis.
/// </summary>
public class TaskImpactResponse
{
    /// <summary>
    /// Name of the task being analyzed.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// List of workflows affected by changes to this task.
    /// </summary>
    public List<string> AffectedWorkflows { get; set; } = new();

    /// <summary>
    /// Whether the proposed change is breaking.
    /// </summary>
    public bool IsBreaking { get; set; }

    /// <summary>
    /// Reason for the breaking change.
    /// </summary>
    public string? BreakingReason { get; set; }

    /// <summary>
    /// Workflows that are blocking the change.
    /// </summary>
    public List<string> BlockedWorkflows { get; set; } = new();

    /// <summary>
    /// Impact level (None, Low, Medium, High).
    /// </summary>
    public string ImpactLevel { get; set; } = "None";

    /// <summary>
    /// Suggested actions to address the impact.
    /// </summary>
    public List<string> SuggestedActions { get; set; } = new();

    /// <summary>
    /// Whether the change can proceed.
    /// </summary>
    public bool CanProceed => BlockedWorkflows.Count == 0;
}

/// <summary>
/// Response model for task lifecycle state.
/// </summary>
public class TaskLifecycleResponse
{
    /// <summary>
    /// Name of the task.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Current lifecycle state (Active, Superseded, Deprecated).
    /// </summary>
    public string State { get; set; } = "Active";

    /// <summary>
    /// Name of the task that supersedes this one.
    /// </summary>
    public string? SupersededBy { get; set; }

    /// <summary>
    /// Date when the task will be fully deprecated.
    /// </summary>
    public DateTime? DeprecationDate { get; set; }

    /// <summary>
    /// Whether the task is blocked.
    /// </summary>
    public bool IsBlocked { get; set; }
}

/// <summary>
/// Request model to supersede a task.
/// </summary>
public class SupersedeTaskRequest
{
    /// <summary>
    /// Name of the new task version that supersedes this one.
    /// </summary>
    public string NewTaskName { get; set; } = string.Empty;
}

/// <summary>
/// Request model to deprecate a task.
/// </summary>
public class DeprecateTaskRequest
{
    /// <summary>
    /// Date when the task will be fully deprecated.
    /// </summary>
    public DateTime DeprecationDate { get; set; }
}
