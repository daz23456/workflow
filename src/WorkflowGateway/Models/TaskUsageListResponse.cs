using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Response containing workflows that use a specific task.
/// </summary>
public class TaskUsageListResponse
{
    /// <summary>
    /// Name of the task.
    /// </summary>
    [JsonPropertyName("taskName")]
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// List of workflows using this task.
    /// </summary>
    [JsonPropertyName("workflows")]
    public List<TaskUsageItem> Workflows { get; set; } = new();

    /// <summary>
    /// Total count of workflows using this task.
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
