namespace WorkflowCore.Models;

/// <summary>
/// Represents a persisted task execution record (part of a workflow execution).
/// </summary>
public class TaskExecutionRecord
{
    /// <summary>
    /// Unique identifier for the task execution record.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Foreign key to the parent ExecutionRecord.
    /// </summary>
    public Guid ExecutionId { get; set; }

    /// <summary>
    /// Task identifier from the workflow definition.
    /// </summary>
    public string? TaskId { get; set; }

    /// <summary>
    /// Task reference name from the workflow.
    /// </summary>
    public string? TaskRef { get; set; }

    /// <summary>
    /// Status of the task execution (e.g., "Succeeded", "Failed", "Running").
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// JSON snapshot of the task output.
    /// </summary>
    public string? Output { get; set; }

    /// <summary>
    /// JSON array of error messages encountered during execution.
    /// </summary>
    public string? Errors { get; set; }

    /// <summary>
    /// Duration of the task execution. Null if still running.
    /// </summary>
    public TimeSpan? Duration { get; set; }

    /// <summary>
    /// Number of retry attempts made for this task.
    /// </summary>
    public int RetryCount { get; set; } = 0;

    /// <summary>
    /// Timestamp when the task execution started (UTC).
    /// </summary>
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when the task execution completed (UTC). Null if still running.
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Navigation property to the parent ExecutionRecord.
    /// </summary>
    public ExecutionRecord? ExecutionRecord { get; set; }
}
