using System.Text.Json.Serialization;
using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

/// <summary>
/// Configuration for fallback task execution when circuit is open.
/// </summary>
public class FallbackSpec
{
    /// <summary>
    /// Reference to the task to execute as a fallback.
    /// </summary>
    [YamlMember(Alias = "taskRef")]
    [JsonPropertyName("taskRef")]
    public string TaskRef { get; set; } = string.Empty;

    /// <summary>
    /// Input parameters for the fallback task.
    /// Supports template expressions (e.g., "{{input.cacheKey}}").
    /// </summary>
    [YamlMember(Alias = "input")]
    [JsonPropertyName("input")]
    public Dictionary<string, string> Input { get; set; } = new();
}
