namespace WorkflowGateway.Models;

/// <summary>
/// Summary information for a workflow execution, typically used in list views.
/// </summary>
public class ExecutionSummary
{
    /// <summary>
    /// Unique identifier for this execution.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Name of the workflow that was executed.
    /// </summary>
    public string? WorkflowName { get; set; }

    /// <summary>
    /// Current status of the execution (Running, Succeeded, Failed, Cancelled).
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// Timestamp when the execution started (UTC).
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// Total duration of execution in milliseconds. Null if still running.
    /// </summary>
    public long? DurationMs { get; set; }

    /// <summary>
    /// Timestamp when the execution completed (UTC). Null if still running.
    /// </summary>
    public DateTime? CompletedAt { get; set; }
}
