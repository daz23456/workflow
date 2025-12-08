namespace WorkflowCore.Models;

/// <summary>
/// Impact level of a task change.
/// </summary>
public enum ImpactLevel
{
    /// <summary>
    /// No impact - change is backwards compatible.
    /// </summary>
    None,

    /// <summary>
    /// Low impact - minor changes, few dependents.
    /// </summary>
    Low,

    /// <summary>
    /// Medium impact - breaking change with limited dependents.
    /// </summary>
    Medium,

    /// <summary>
    /// High impact - breaking change with many dependents.
    /// </summary>
    High
}

/// <summary>
/// Represents the impact analysis of a task change.
/// Used to determine if a change can proceed and what actions are needed.
/// </summary>
public class TaskImpactAnalysis
{
    /// <summary>
    /// Name of the task being analyzed.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// List of workflows affected by this task change.
    /// </summary>
    public List<string> AffectedWorkflows { get; set; } = new();

    /// <summary>
    /// Whether the change is breaking (incompatible).
    /// </summary>
    public bool IsBreaking { get; set; }

    /// <summary>
    /// Reason why the change is breaking.
    /// </summary>
    public string? BreakingReason { get; set; }

    /// <summary>
    /// Calculated impact level based on breaking status and dependent count.
    /// </summary>
    public ImpactLevel ImpactLevel
    {
        get
        {
            if (!IsBreaking) return ImpactLevel.None;
            if (AffectedWorkflows.Count == 0) return ImpactLevel.Low;
            if (AffectedWorkflows.Count < 5) return ImpactLevel.Medium;
            return ImpactLevel.High;
        }
    }

    /// <summary>
    /// Suggested actions to address the impact.
    /// </summary>
    public List<string> SuggestedActions { get; set; } = new();

    /// <summary>
    /// Workflows that are blocking the change (cannot proceed without manual intervention).
    /// </summary>
    public List<string> BlockedBy { get; set; } = new();

    /// <summary>
    /// Returns true if the change can proceed (not blocked by any workflows).
    /// </summary>
    public bool CanProceed => BlockedBy.Count == 0;

    /// <summary>
    /// Timestamp when the analysis was performed.
    /// </summary>
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
}
