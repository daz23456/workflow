namespace WorkflowGateway.Models;

/// <summary>
/// Represents detailed execution information for a single task within a workflow execution.
/// </summary>
public class TaskExecutionDetail
{
    /// <summary>
    /// The unique identifier of the task within the workflow.
    /// </summary>
    public string? TaskId { get; set; }

    /// <summary>
    /// The reference name of the task (e.g., "fetch-user", "send-email").
    /// </summary>
    public string? TaskRef { get; set; }

    /// <summary>
    /// Indicates whether the task executed successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The output data produced by the task, deserialized from JSON.
    /// </summary>
    public Dictionary<string, object>? Output { get; set; }

    /// <summary>
    /// List of error messages encountered during task execution.
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// Number of times the task was retried before succeeding or failing.
    /// </summary>
    public int RetryCount { get; set; }

    /// <summary>
    /// Total duration of task execution in milliseconds.
    /// </summary>
    public long DurationMs { get; set; }

    /// <summary>
    /// Timestamp when the task execution started (UTC).
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// Timestamp when the task execution completed (UTC).
    /// </summary>
    public DateTime CompletedAt { get; set; }
}
