using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

public class WorkflowExecutionResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("output")]
    public Dictionary<string, object>? Output { get; set; }

    [JsonPropertyName("executedTasks")]
    public List<string> ExecutedTasks { get; set; } = new();

    [JsonPropertyName("executionTimeMs")]
    public long ExecutionTimeMs { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}
