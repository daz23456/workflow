namespace WorkflowGateway.Models;

/// <summary>
/// Detailed timing information for a single task execution.
/// </summary>
public class TaskTimingDetail
{
    /// <summary>
    /// Task identifier from workflow definition.
    /// </summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>
    /// Task reference name.
    /// </summary>
    public string TaskRef { get; set; } = string.Empty;

    /// <summary>
    /// When the task started executing (UTC).
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// When the task completed executing (UTC).
    /// </summary>
    public DateTime CompletedAt { get; set; }

    /// <summary>
    /// Task execution duration in milliseconds.
    /// </summary>
    public long DurationMs { get; set; }

    /// <summary>
    /// Time the task waited for dependencies to complete (in milliseconds).
    /// Zero if the task has no dependencies.
    /// </summary>
    public long WaitTimeMs { get; set; }

    /// <summary>
    /// List of task IDs this task waited for (dependencies).
    /// </summary>
    public List<string> WaitedForTasks { get; set; } = new List<string>();

    /// <summary>
    /// Number of retry attempts for this task.
    /// </summary>
    public int RetryCount { get; set; }

    /// <summary>
    /// Whether the task completed successfully.
    /// </summary>
    public bool Success { get; set; }
}
