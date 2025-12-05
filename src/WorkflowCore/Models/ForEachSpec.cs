using System.Text.Json.Serialization;
using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

/// <summary>
/// Configuration for forEach array iteration.
/// Allows a task to iterate over array items with parallel execution support.
/// </summary>
public class ForEachSpec
{
    /// <summary>
    /// Template expression that resolves to an array to iterate over.
    /// Example: "{{input.orderIds}}" or "{{tasks.fetch-orders.output.orders}}"
    /// </summary>
    [YamlMember(Alias = "items")]
    [JsonPropertyName("items")]
    public string Items { get; set; } = string.Empty;

    /// <summary>
    /// Variable name for the current item in each iteration.
    /// Used in template expressions as {{forEach.{itemVar}}}
    /// Example: "order" allows {{forEach.order.id}}
    /// </summary>
    [YamlMember(Alias = "itemVar")]
    [JsonPropertyName("itemVar")]
    public string ItemVar { get; set; } = string.Empty;

    /// <summary>
    /// Maximum number of parallel executions.
    /// If not set or 0, all items execute in parallel (limited by system resources).
    /// </summary>
    [YamlMember(Alias = "maxParallel")]
    [JsonPropertyName("maxParallel")]
    public int MaxParallel { get; set; }
}
