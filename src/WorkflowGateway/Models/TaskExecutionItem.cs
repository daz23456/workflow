using System.Text.Json.Serialization;
using WorkflowCore.Models;

namespace WorkflowGateway.Models;

/// <summary>
/// Represents a single task execution across any workflow.
/// </summary>
public class TaskExecutionItem
{
    /// <summary>
    /// Unique execution ID.
    /// </summary>
    [JsonPropertyName("executionId")]
    public string ExecutionId { get; set; } = string.Empty;

    /// <summary>
    /// Name of the workflow this task executed in.
    /// </summary>
    [JsonPropertyName("workflowName")]
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// Namespace of the workflow.
    /// </summary>
    [JsonPropertyName("workflowNamespace")]
    public string WorkflowNamespace { get; set; } = string.Empty;

    /// <summary>
    /// Execution status.
    /// </summary>
    [JsonPropertyName("status")]
    public ExecutionStatus Status { get; set; }

    /// <summary>
    /// Duration in milliseconds.
    /// </summary>
    [JsonPropertyName("durationMs")]
    public long DurationMs { get; set; }

    /// <summary>
    /// Timestamp when execution started (UTC).
    /// </summary>
    [JsonPropertyName("startedAt")]
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// Error message if execution failed.
    /// </summary>
    [JsonPropertyName("error")]
    public string? Error { get; set; }
}
