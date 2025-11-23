using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

public class WorkflowTestResponse
{
    [JsonPropertyName("valid")]
    public bool Valid { get; set; }

    [JsonPropertyName("validationErrors")]
    public List<string> ValidationErrors { get; set; } = new();

    [JsonPropertyName("executionPlan")]
    public object? ExecutionPlan { get; set; } // Can be ExecutionPlan or EnhancedExecutionPlan
}

public class ExecutionPlan
{
    [JsonPropertyName("taskOrder")]
    public List<string> TaskOrder { get; set; } = new();

    [JsonPropertyName("parallelizable")]
    public List<string> Parallelizable { get; set; } = new();
}
