using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Response containing execution history for a specific task across all workflows.
/// </summary>
public class TaskExecutionListResponse
{
    /// <summary>
    /// Name of the task.
    /// </summary>
    [JsonPropertyName("taskName")]
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// List of task executions.
    /// </summary>
    [JsonPropertyName("executions")]
    public List<TaskExecutionItem> Executions { get; set; } = new();

    /// <summary>
    /// Average task execution duration in milliseconds across all executions.
    /// </summary>
    [JsonPropertyName("averageDurationMs")]
    public long AverageDurationMs { get; set; }

    /// <summary>
    /// Total count of executions matching the filter.
    /// </summary>
    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }

    /// <summary>
    /// Number of records skipped (for pagination).
    /// </summary>
    [JsonPropertyName("skip")]
    public int Skip { get; set; }

    /// <summary>
    /// Number of records taken (for pagination).
    /// </summary>
    [JsonPropertyName("take")]
    public int Take { get; set; }
}
