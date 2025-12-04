using System.Text.Json.Serialization;
using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

/// <summary>
/// Specification for switch/case task routing.
/// Routes execution to different tasks based on a value match.
/// </summary>
public class SwitchSpec
{
    /// <summary>
    /// The value expression to evaluate and match against cases.
    /// Supports template expressions like "{{input.paymentMethod}}" or "{{tasks.validate.output.result}}".
    /// </summary>
    [YamlMember(Alias = "value")]
    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// The list of cases to match against.
    /// First matching case wins.
    /// </summary>
    [YamlMember(Alias = "cases")]
    [JsonPropertyName("cases")]
    public List<SwitchCase> Cases { get; set; } = new();

    /// <summary>
    /// Optional default case if no cases match.
    /// If not provided and no cases match, the switch evaluation fails.
    /// </summary>
    [YamlMember(Alias = "default")]
    [JsonPropertyName("default")]
    public SwitchDefault? Default { get; set; }
}

/// <summary>
/// A single case in a switch statement.
/// </summary>
public class SwitchCase
{
    /// <summary>
    /// The value to match against. String comparison is case-insensitive.
    /// Supports: strings, numbers (as strings), booleans ("true"/"false"), null ("null").
    /// </summary>
    [YamlMember(Alias = "match")]
    [JsonPropertyName("match")]
    public string Match { get; set; } = string.Empty;

    /// <summary>
    /// The task reference to execute if this case matches.
    /// </summary>
    [YamlMember(Alias = "taskRef")]
    [JsonPropertyName("taskRef")]
    public string TaskRef { get; set; } = string.Empty;
}

/// <summary>
/// The default case for a switch statement.
/// Executed when no cases match.
/// </summary>
public class SwitchDefault
{
    /// <summary>
    /// The task reference to execute as the default.
    /// </summary>
    [YamlMember(Alias = "taskRef")]
    [JsonPropertyName("taskRef")]
    public string TaskRef { get; set; } = string.Empty;
}
