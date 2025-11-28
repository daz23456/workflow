using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Represents a workflow that uses a specific task.
/// </summary>
public class TaskUsageItem
{
    /// <summary>
    /// Name of the workflow.
    /// </summary>
    [JsonPropertyName("workflowName")]
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// Namespace of the workflow.
    /// </summary>
    [JsonPropertyName("workflowNamespace")]
    public string WorkflowNamespace { get; set; } = string.Empty;

    /// <summary>
    /// Total number of tasks in this workflow.
    /// </summary>
    [JsonPropertyName("taskCount")]
    public int TaskCount { get; set; }

    /// <summary>
    /// Timestamp of the last execution (UTC).
    /// </summary>
    [JsonPropertyName("lastExecuted")]
    public DateTime? LastExecuted { get; set; }
}
