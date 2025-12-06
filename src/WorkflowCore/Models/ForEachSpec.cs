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
    /// Default: "item"
    /// </summary>
    [YamlMember(Alias = "itemVar")]
    [JsonPropertyName("itemVar")]
    public string ItemVar { get; set; } = "item";

    /// <summary>
    /// Variable name for the current index in each iteration.
    /// Used in template expressions as {{forEach.{indexVar}}}
    /// Example: "idx" allows {{forEach.idx}}
    /// Default: "index"
    /// </summary>
    [YamlMember(Alias = "indexVar")]
    [JsonPropertyName("indexVar")]
    public string IndexVar { get; set; } = "index";

    /// <summary>
    /// Whether to execute iterations in parallel.
    /// Default: false (sequential execution)
    /// </summary>
    [YamlMember(Alias = "parallel")]
    [JsonPropertyName("parallel")]
    public bool Parallel { get; set; }

    /// <summary>
    /// Maximum number of parallel executions when Parallel is true.
    /// If not set or 0, all items execute in parallel (limited by system resources).
    /// </summary>
    [YamlMember(Alias = "maxConcurrency")]
    [JsonPropertyName("maxConcurrency")]
    public int MaxConcurrency { get; set; }
}
