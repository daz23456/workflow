using System.Text.Json.Serialization;
using WorkflowCore.Models;

namespace WorkflowGateway.Models;

public class WorkflowDetailResponse
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("namespace")]
    public string Namespace { get; set; } = "default";

    [JsonPropertyName("inputSchema")]
    public SchemaDefinition? InputSchema { get; set; }

    [JsonPropertyName("outputSchema")]
    public Dictionary<string, object>? OutputSchema { get; set; }

    [JsonPropertyName("tasks")]
    public List<WorkflowTaskStep> Tasks { get; set; } = new();

    [JsonPropertyName("endpoints")]
    public WorkflowEndpoints Endpoints { get; set; } = new();
}

public class WorkflowEndpoints
{
    [JsonPropertyName("execute")]
    public string Execute { get; set; } = string.Empty;

    [JsonPropertyName("test")]
    public string Test { get; set; } = string.Empty;

    [JsonPropertyName("details")]
    public string Details { get; set; } = string.Empty;
}
