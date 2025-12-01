namespace WorkflowGateway.Models;

/// <summary>
/// Detailed response model for a single workflow execution, including all task execution details.
/// </summary>
public class DetailedWorkflowExecutionResponse
{
    /// <summary>
    /// Unique identifier for this execution.
    /// </summary>
    public Guid ExecutionId { get; set; }

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
    /// Timestamp when the execution completed (UTC). Null if still running.
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Total duration of execution in milliseconds. Null if still running.
    /// </summary>
    public long? DurationMs { get; set; }

    /// <summary>
    /// Time taken to build the execution graph in milliseconds.
    /// </summary>
    public long? GraphBuildDurationMs { get; set; }

    /// <summary>
    /// Workflow input parameters, deserialized from JSON snapshot.
    /// </summary>
    public Dictionary<string, object>? Input { get; set; }

    /// <summary>
    /// Workflow output data (from output mapping).
    /// </summary>
    public Dictionary<string, object>? Output { get; set; }

    /// <summary>
    /// Detailed execution information for each task in the workflow.
    /// </summary>
    public List<TaskExecutionDetail> Tasks { get; set; } = new();

    /// <summary>
    /// List of errors that occurred during workflow execution.
    /// </summary>
    public List<string> Errors { get; set; } = new();
}
