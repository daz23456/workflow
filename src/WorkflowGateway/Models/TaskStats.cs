using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Statistics for a workflow task across all executions.
/// </summary>
public class TaskStats
{
    /// <summary>
    /// Number of workflows that use this task.
    /// </summary>
    [JsonPropertyName("usedByWorkflows")]
    public int UsedByWorkflows { get; set; }

    /// <summary>
    /// Total number of times this task has been executed across all workflows.
    /// </summary>
    [JsonPropertyName("totalExecutions")]
    public int TotalExecutions { get; set; }

    /// <summary>
    /// Average execution duration in milliseconds.
    /// </summary>
    [JsonPropertyName("avgDurationMs")]
    public long AvgDurationMs { get; set; }

    /// <summary>
    /// Success rate as a percentage (0-100).
    /// </summary>
    [JsonPropertyName("successRate")]
    public double SuccessRate { get; set; }

    /// <summary>
    /// Timestamp of the last execution (UTC).
    /// </summary>
    [JsonPropertyName("lastExecuted")]
    public DateTime? LastExecuted { get; set; }
}
