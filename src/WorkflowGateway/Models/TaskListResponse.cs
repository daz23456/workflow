using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

public class TaskListResponse
{
    [JsonPropertyName("tasks")]
    public List<TaskSummary> Tasks { get; set; } = new();

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("skip")]
    public int Skip { get; set; }

    [JsonPropertyName("take")]
    public int Take { get; set; }
}

public class TaskSummary
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("namespace")]
    public string Namespace { get; set; } = "default";

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("stats")]
    public TaskSummaryStats? Stats { get; set; }
}

public class TaskSummaryStats
{
    [JsonPropertyName("usedByWorkflows")]
    public int UsedByWorkflows { get; set; }

    [JsonPropertyName("totalExecutions")]
    public int TotalExecutions { get; set; }

    [JsonPropertyName("successRate")]
    public double SuccessRate { get; set; }

    [JsonPropertyName("avgDurationMs")]
    public long AvgDurationMs { get; set; }

    [JsonPropertyName("lastExecuted")]
    public DateTime? LastExecuted { get; set; }
}
