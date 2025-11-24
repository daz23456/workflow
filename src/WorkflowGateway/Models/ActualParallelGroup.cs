namespace WorkflowGateway.Models;

/// <summary>
/// Represents a group of tasks that actually executed in parallel (overlapping execution windows).
/// </summary>
public class ActualParallelGroup
{
    /// <summary>
    /// When the first task in this parallel group started (UTC).
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// When the last task in this parallel group completed (UTC).
    /// </summary>
    public DateTime CompletedAt { get; set; }

    /// <summary>
    /// Task IDs that executed in parallel (overlapping time windows).
    /// </summary>
    public List<string> TaskIds { get; set; } = new List<string>();
}
