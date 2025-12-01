using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Request to test-execute a workflow definition without deploying it
/// </summary>
public class TestExecuteRequest
{
    /// <summary>
    /// The workflow definition in YAML format
    /// </summary>
    [JsonPropertyName("workflowYaml")]
    public string WorkflowYaml { get; set; } = "";

    /// <summary>
    /// Input data to pass to the workflow
    /// </summary>
    [JsonPropertyName("input")]
    public Dictionary<string, object> Input { get; set; } = new();
}

/// <summary>
/// Response from test-execute containing full execution results
/// </summary>
public class TestExecuteResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("workflowName")]
    public string WorkflowName { get; set; } = "";

    [JsonPropertyName("output")]
    public Dictionary<string, object>? Output { get; set; }

    [JsonPropertyName("executedTasks")]
    public List<string> ExecutedTasks { get; set; } = new();

    [JsonPropertyName("taskDetails")]
    public List<TaskExecutionDetail> TaskDetails { get; set; } = new();

    [JsonPropertyName("executionTimeMs")]
    public long ExecutionTimeMs { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }

    [JsonPropertyName("validationErrors")]
    public List<string> ValidationErrors { get; set; } = new();
}
