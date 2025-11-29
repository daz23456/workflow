using System.Text.Json;

namespace WorkflowGateway.Models;

public class TransformRequest
{
    public string Dsl { get; set; } = string.Empty;
    public JsonElement[] Data { get; set; } = Array.Empty<JsonElement>();
}
