using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

public class WorkflowListResponse
{
    [JsonPropertyName("workflows")]
    public List<WorkflowSummary> Workflows { get; set; } = new();

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("skip")]
    public int Skip { get; set; }

    [JsonPropertyName("take")]
    public int Take { get; set; }
}

public class WorkflowSummary
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("namespace")]
    public string Namespace { get; set; } = "default";

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("taskCount")]
    public int TaskCount { get; set; }

    [JsonPropertyName("inputSchemaPreview")]
    public string InputSchemaPreview { get; set; } = string.Empty;

    [JsonPropertyName("endpoint")]
    public string Endpoint { get; set; } = string.Empty;

    [JsonPropertyName("stats")]
    public WorkflowSummaryStats? Stats { get; set; }
}

public class WorkflowSummaryStats
{
    [JsonPropertyName("totalExecutions")]
    public int TotalExecutions { get; set; }

    [JsonPropertyName("successRate")]
    public double SuccessRate { get; set; }

    [JsonPropertyName("avgDurationMs")]
    public long AvgDurationMs { get; set; }

    [JsonPropertyName("lastExecuted")]
    public DateTime? LastExecuted { get; set; }
}
