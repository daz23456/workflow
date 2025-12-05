using System.Text.Json.Serialization;
using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

public class WorkflowResource
{
    [YamlMember(Alias = "apiVersion")]
    [JsonPropertyName("apiVersion")]
    public string ApiVersion { get; set; } = string.Empty;

    [YamlMember(Alias = "kind")]
    [JsonPropertyName("kind")]
    public string Kind { get; set; } = string.Empty;

    [YamlMember(Alias = "metadata")]
    [JsonPropertyName("metadata")]
    public ResourceMetadata Metadata { get; set; } = new();

    [YamlMember(Alias = "spec")]
    [JsonPropertyName("spec")]
    public WorkflowSpec Spec { get; set; } = new();

    [YamlMember(Alias = "status")]
    [JsonPropertyName("status")]
    public WorkflowStatus? Status { get; set; }
}

public class WorkflowSpec
{
    [YamlMember(Alias = "description")]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [YamlMember(Alias = "input")]
    [JsonPropertyName("input")]
    public Dictionary<string, WorkflowInputParameter> Input { get; set; } = new();

    [YamlMember(Alias = "tasks")]
    [JsonPropertyName("tasks")]
    public List<WorkflowTaskStep> Tasks { get; set; } = new();

    [YamlMember(Alias = "output")]
    [JsonPropertyName("output")]
    public Dictionary<string, string>? Output { get; set; }
}

public class WorkflowInputParameter
{
    [YamlMember(Alias = "type")]
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [YamlMember(Alias = "required")]
    [JsonPropertyName("required")]
    public bool Required { get; set; }

    [YamlMember(Alias = "description")]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [YamlMember(Alias = "default")]
    [JsonPropertyName("default")]
    public object? Default { get; set; }
}

public class WorkflowTaskStep
{
    [YamlMember(Alias = "id")]
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [YamlMember(Alias = "taskRef")]
    [JsonPropertyName("taskRef")]
    public string TaskRef { get; set; } = string.Empty;

    [YamlMember(Alias = "input")]
    [JsonPropertyName("input")]
    public Dictionary<string, string> Input { get; set; } = new();

    [YamlMember(Alias = "dependsOn")]
    [JsonPropertyName("dependsOn")]
    public List<string>? DependsOn { get; set; }

    /// <summary>
    /// Optional condition to evaluate before executing the task.
    /// If the condition evaluates to false, the task is skipped.
    /// </summary>
    [YamlMember(Alias = "condition")]
    [JsonPropertyName("condition")]
    public ConditionSpec? Condition { get; set; }

    /// <summary>
    /// Optional switch/case for multi-branch task routing.
    /// Routes to different taskRefs based on value matching.
    /// </summary>
    [YamlMember(Alias = "switch")]
    [JsonPropertyName("switch")]
    public SwitchSpec? Switch { get; set; }

    /// <summary>
    /// Optional forEach for array iteration.
    /// Executes the task for each item in the array.
    /// </summary>
    [YamlMember(Alias = "forEach")]
    [JsonPropertyName("forEach")]
    public ForEachSpec? ForEach { get; set; }

    [YamlMember(Alias = "timeout")]
    [JsonPropertyName("timeout")]
    public string? Timeout { get; set; }
}

public class WorkflowStatus
{
    [YamlMember(Alias = "phase")]
    [JsonPropertyName("phase")]
    public string Phase { get; set; } = "Pending";

    [YamlMember(Alias = "executionCount")]
    [JsonPropertyName("executionCount")]
    public int ExecutionCount { get; set; }

    [YamlMember(Alias = "lastExecuted")]
    [JsonPropertyName("lastExecuted")]
    public DateTime LastExecuted { get; set; }

    [YamlMember(Alias = "validationErrors")]
    [JsonPropertyName("validationErrors")]
    public List<string> ValidationErrors { get; set; } = new();
}
