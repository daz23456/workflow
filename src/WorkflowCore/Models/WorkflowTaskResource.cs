using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

public class WorkflowTaskResource
{
    [YamlMember(Alias = "apiVersion")]
    public string ApiVersion { get; set; } = string.Empty;

    [YamlMember(Alias = "kind")]
    public string Kind { get; set; } = string.Empty;

    [YamlMember(Alias = "metadata")]
    public ResourceMetadata Metadata { get; set; } = new();

    [YamlMember(Alias = "spec")]
    public WorkflowTaskSpec Spec { get; set; } = new();
}

public class ResourceMetadata
{
    [YamlMember(Alias = "name")]
    public string Name { get; set; } = string.Empty;

    [YamlMember(Alias = "namespace")]
    public string Namespace { get; set; } = string.Empty;
}

public class WorkflowTaskSpec
{
    [YamlMember(Alias = "type")]
    public string Type { get; set; } = string.Empty;

    [YamlMember(Alias = "inputSchema")]
    public SchemaDefinition? InputSchema { get; set; }

    [YamlMember(Alias = "outputSchema")]
    public SchemaDefinition? OutputSchema { get; set; }

    [YamlMember(Alias = "request")]
    public HttpRequestDefinition? Request { get; set; }

    [YamlMember(Alias = "timeout")]
    public string? Timeout { get; set; }
}

public class HttpRequestDefinition
{
    [YamlMember(Alias = "method")]
    public string Method { get; set; } = string.Empty;

    [YamlMember(Alias = "url")]
    public string Url { get; set; } = string.Empty;

    [YamlMember(Alias = "headers")]
    public Dictionary<string, string>? Headers { get; set; }

    [YamlMember(Alias = "body")]
    public string? Body { get; set; }
}
