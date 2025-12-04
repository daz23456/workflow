namespace WorkflowCore.Models;

public class TaskExecutionResult
{
    public bool Success { get; set; }
    public Dictionary<string, object>? Output { get; set; }

    /// <summary>
    /// Indicates whether the task was skipped due to a condition evaluation.
    /// A skipped task has Success=true but WasSkipped=true.
    /// </summary>
    public bool WasSkipped { get; set; }

    /// <summary>
    /// The reason the task was skipped, if WasSkipped is true.
    /// Contains the evaluated condition expression that resulted in false.
    /// </summary>
    public string? SkipReason { get; set; }

    /// <summary>
    /// Legacy error messages (maintained for backward compatibility)
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// Structured error information with full context for debugging and support.
    /// Includes task identification, error classification, service details, and actionable guidance.
    /// </summary>
    public TaskErrorInfo? ErrorInfo { get; set; }

    public int RetryCount { get; set; }
    public TimeSpan Duration { get; set; }

    /// <summary>
    /// Actual timestamp when task execution started (captured by orchestrator)
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// Actual timestamp when task execution completed (captured by orchestrator)
    /// </summary>
    public DateTime CompletedAt { get; set; }
}
