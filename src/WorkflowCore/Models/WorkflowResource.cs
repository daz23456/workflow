using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

public class WorkflowResource
{
    [YamlMember(Alias = "apiVersion")]
    public string ApiVersion { get; set; } = string.Empty;

    [YamlMember(Alias = "kind")]
    public string Kind { get; set; } = string.Empty;

    [YamlMember(Alias = "metadata")]
    public ResourceMetadata Metadata { get; set; } = new();

    [YamlMember(Alias = "spec")]
    public WorkflowSpec Spec { get; set; } = new();

    [YamlMember(Alias = "status")]
    public WorkflowStatus? Status { get; set; }
}

public class WorkflowSpec
{
    [YamlMember(Alias = "input")]
    public Dictionary<string, WorkflowInputParameter> Input { get; set; } = new();

    [YamlMember(Alias = "tasks")]
    public List<WorkflowTaskStep> Tasks { get; set; } = new();

    [YamlMember(Alias = "output")]
    public Dictionary<string, string>? Output { get; set; }
}

public class WorkflowInputParameter
{
    [YamlMember(Alias = "type")]
    public string Type { get; set; } = string.Empty;

    [YamlMember(Alias = "required")]
    public bool Required { get; set; }

    [YamlMember(Alias = "description")]
    public string? Description { get; set; }

    [YamlMember(Alias = "default")]
    public object? Default { get; set; }
}

public class WorkflowTaskStep
{
    [YamlMember(Alias = "id")]
    public string Id { get; set; } = string.Empty;

    [YamlMember(Alias = "taskRef")]
    public string TaskRef { get; set; } = string.Empty;

    [YamlMember(Alias = "input")]
    public Dictionary<string, string> Input { get; set; } = new();

    [YamlMember(Alias = "dependsOn")]
    public List<string>? DependsOn { get; set; }

    [YamlMember(Alias = "condition")]
    public string? Condition { get; set; }
}

public class WorkflowStatus
{
    [YamlMember(Alias = "phase")]
    public string Phase { get; set; } = "Pending";

    [YamlMember(Alias = "executionCount")]
    public int ExecutionCount { get; set; }

    [YamlMember(Alias = "lastExecuted")]
    public DateTime LastExecuted { get; set; }

    [YamlMember(Alias = "validationErrors")]
    public List<string> ValidationErrors { get; set; } = new();
}
