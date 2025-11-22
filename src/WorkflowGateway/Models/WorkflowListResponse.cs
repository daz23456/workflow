using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

public class WorkflowListResponse
{
    [JsonPropertyName("workflows")]
    public List<WorkflowSummary> Workflows { get; set; } = new();
}

public class WorkflowSummary
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("namespace")]
    public string Namespace { get; set; } = "default";

    [JsonPropertyName("taskCount")]
    public int TaskCount { get; set; }

    [JsonPropertyName("endpoint")]
    public string Endpoint { get; set; } = string.Empty;
}
