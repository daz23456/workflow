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
}

public class WorkflowSpec
{
    [YamlMember(Alias = "tasks")]
    public List<WorkflowTaskStep> Tasks { get; set; } = new();
}

public class WorkflowTaskStep
{
    [YamlMember(Alias = "id")]
    public string Id { get; set; } = string.Empty;

    [YamlMember(Alias = "taskRef")]
    public string TaskRef { get; set; } = string.Empty;

    [YamlMember(Alias = "input")]
    public Dictionary<string, string> Input { get; set; } = new();

    [YamlMember(Alias = "condition")]
    public string? Condition { get; set; }
}
