using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

public class WorkflowTestRequest
{
    [JsonPropertyName("input")]
    public Dictionary<string, object> Input { get; set; } = new();
}
