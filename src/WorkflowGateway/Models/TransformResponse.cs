using System.Text.Json;

namespace WorkflowGateway.Models;

public class TransformResponse
{
    public bool Success { get; set; }
    public JsonElement[]? Data { get; set; }
    public List<string>? Errors { get; set; }
}
