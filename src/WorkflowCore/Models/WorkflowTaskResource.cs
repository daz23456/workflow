using System.Text.Json;
using System.Text.Json.Serialization;
using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

public class WorkflowTaskResource
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
    public WorkflowTaskSpec Spec { get; set; } = new();

    [YamlMember(Alias = "status")]
    [JsonPropertyName("status")]
    public WorkflowTaskStatus? Status { get; set; }
}

public class ResourceMetadata
{
    [YamlMember(Alias = "name")]
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [YamlMember(Alias = "namespace")]
    [JsonPropertyName("namespace")]
    public string Namespace { get; set; } = string.Empty;

    [YamlMember(Alias = "annotations")]
    [JsonPropertyName("annotations")]
    public Dictionary<string, string>? Annotations { get; set; }
}

public class WorkflowTaskSpec
{
    [YamlMember(Alias = "type")]
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable description of what this task does.
    /// Used by MCP consumer tools to help LLMs understand task purpose.
    /// Stage 15: MCP Server for External Workflow Consumption
    /// </summary>
    [YamlMember(Alias = "description")]
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Category of the task (e.g., "http", "transform", "notification").
    /// Used by MCP consumer tools for filtering and search.
    /// Stage 15: MCP Server for External Workflow Consumption
    /// </summary>
    [YamlMember(Alias = "category")]
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    /// <summary>
    /// Tags for task metadata (e.g., ["external-api", "idempotent", "cacheable"]).
    /// Used by MCP consumer tools for filtering and search.
    /// Stage 15: MCP Server for External Workflow Consumption
    /// </summary>
    [YamlMember(Alias = "tags")]
    [JsonPropertyName("tags")]
    public List<string>? Tags { get; set; }

    [YamlMember(Alias = "inputSchema")]
    [JsonPropertyName("inputSchema")]
    public SchemaDefinition? InputSchema { get; set; }

    [YamlMember(Alias = "outputSchema")]
    [JsonPropertyName("outputSchema")]
    public SchemaDefinition? OutputSchema { get; set; }

    [YamlMember(Alias = "request")]
    [JsonPropertyName("request")]
    public HttpRequestDefinition? Request { get; set; }

    [YamlMember(Alias = "http")]
    [JsonPropertyName("http")]
    public HttpRequestDefinition? Http { get; set; }

    [YamlMember(Alias = "transform")]
    [JsonPropertyName("transform")]
    public TransformDefinition? Transform { get; set; }

    [YamlMember(Alias = "timeout")]
    [JsonPropertyName("timeout")]
    public string? Timeout { get; set; }

    /// <summary>
    /// Cache configuration for this task.
    /// When enabled, task outputs are cached based on resolved request parameters.
    /// Stage 39.1: Task-Level Caching
    /// </summary>
    [YamlMember(Alias = "cache")]
    [JsonPropertyName("cache")]
    public TaskCacheOptions? Cache { get; set; }
}

public class HttpRequestDefinition
{
    [YamlMember(Alias = "method")]
    [JsonPropertyName("method")]
    public string Method { get; set; } = string.Empty;

    [YamlMember(Alias = "url")]
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [YamlMember(Alias = "headers")]
    [JsonPropertyName("headers")]
    public Dictionary<string, string>? Headers { get; set; }

    [YamlMember(Alias = "body")]
    [JsonPropertyName("body")]
    public string? Body { get; set; }
}

public class TransformDefinition
{
    [YamlMember(Alias = "input")]
    [JsonPropertyName("input")]
    public string Input { get; set; } = string.Empty;

    [YamlMember(Alias = "jsonPath")]
    [JsonPropertyName("jsonPath")]
    public string JsonPath { get; set; } = string.Empty;

    // Legacy support for old "query" property
    [YamlMember(Alias = "query")]
    [JsonPropertyName("query")]
    public string? Query { get; set; }

    /// <summary>
    /// Pipeline of transform operations to apply sequentially.
    /// When specified, takes precedence over JsonPath/Query.
    /// Stored as raw JSON to avoid polymorphic deserialization issues during discovery.
    /// Use TransformDslParser.Parse() to convert to typed operations when needed.
    /// </summary>
    [YamlMember(Alias = "pipeline")]
    [JsonPropertyName("pipeline")]
    public JsonElement? Pipeline { get; set; }
}

public class WorkflowTaskStatus
{
    [YamlMember(Alias = "usageCount")]
    [JsonPropertyName("usageCount")]
    public int UsageCount { get; set; }

    [YamlMember(Alias = "lastUpdated")]
    [JsonPropertyName("lastUpdated")]
    public DateTime LastUpdated { get; set; }
}
