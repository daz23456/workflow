using System.Text.Json.Serialization;
using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

/// <summary>
/// Specification for conditional task execution.
/// Supports expression-based conditions to skip tasks.
/// </summary>
public class ConditionSpec
{
    /// <summary>
    /// The condition expression to evaluate.
    /// If true, the task executes; if false, the task is skipped.
    /// Supports operators: ==, !=, >, <, >=, <=, &&, ||, !
    /// Examples:
    ///   "{{tasks.check-credit.output.approved}} == true"
    ///   "{{input.amount}} > 100 && {{input.amount}} < 1000"
    ///   "{{tasks.fetch.output.status}} != 'error'"
    /// </summary>
    [YamlMember(Alias = "if")]
    [JsonPropertyName("if")]
    public string? If { get; set; }
}
