using System.Text.Json.Serialization;
using WorkflowCore.Models;

namespace WorkflowGateway.Models;

/// <summary>
/// Response from standalone task execution.
/// </summary>
public class TaskExecutionResponse
{
    /// <summary>
    /// Unique execution ID.
    /// </summary>
    [JsonPropertyName("executionId")]
    public string ExecutionId { get; set; } = string.Empty;

    /// <summary>
    /// Name of the task that was executed.
    /// </summary>
    [JsonPropertyName("taskName")]
    public string TaskName { get; set; } = string.Empty;

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
    /// Timestamp when execution completed (UTC).
    /// </summary>
    [JsonPropertyName("completedAt")]
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Output data from the task execution.
    /// </summary>
    [JsonPropertyName("output")]
    public Dictionary<string, object>? Output { get; set; }

    /// <summary>
    /// Error message if execution failed.
    /// </summary>
    [JsonPropertyName("error")]
    public string? Error { get; set; }
}
