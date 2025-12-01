namespace WorkflowCore.Models;

/// <summary>
/// Represents a persisted workflow execution record.
/// </summary>
public class ExecutionRecord
{
    /// <summary>
    /// Unique identifier for the execution.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Name of the workflow that was executed.
    /// </summary>
    public string? WorkflowName { get; set; }

    /// <summary>
    /// Current status of the execution.
    /// </summary>
    public ExecutionStatus Status { get; set; } = ExecutionStatus.Running;

    /// <summary>
    /// Timestamp when the execution started (UTC).
    /// </summary>
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when the execution completed (UTC). Null if still running.
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Total duration of the execution. Null if still running.
    /// </summary>
    public TimeSpan? Duration { get; set; }

    /// <summary>
    /// Time taken to build the execution graph. Used for performance monitoring.
    /// </summary>
    public TimeSpan? GraphBuildDuration { get; set; }

    /// <summary>
    /// JSON snapshot of the input provided to the workflow.
    /// </summary>
    public string? InputSnapshot { get; set; }

    /// <summary>
    /// Collection of task execution records associated with this workflow execution.
    /// </summary>
    public List<TaskExecutionRecord> TaskExecutionRecords { get; set; } = new();
}
