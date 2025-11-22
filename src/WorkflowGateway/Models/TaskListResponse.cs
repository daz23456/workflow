using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

public class TaskListResponse
{
    [JsonPropertyName("tasks")]
    public List<TaskSummary> Tasks { get; set; } = new();
}

public class TaskSummary
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("namespace")]
    public string Namespace { get; set; } = "default";
}
