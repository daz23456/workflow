using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

public class WorkflowExecutionRequest
{
    [JsonPropertyName("input")]
    public Dictionary<string, object> Input { get; set; } = new();
}
