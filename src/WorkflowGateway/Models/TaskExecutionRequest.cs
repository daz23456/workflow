using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Request to execute a task standalone (without a workflow).
/// </summary>
public class TaskExecutionRequest
{
    /// <summary>
    /// Input data for the task execution.
    /// </summary>
    [JsonPropertyName("input")]
    public Dictionary<string, object> Input { get; set; } = new();
}
