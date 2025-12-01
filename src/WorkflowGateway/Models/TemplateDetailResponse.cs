using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Response for GET /api/v1/templates/{name} endpoint.
/// Contains full template details including YAML definition and graph data.
/// </summary>
public class TemplateDetailResponse
{
    /// <summary>
    /// Complete template metadata.
    /// </summary>
    [JsonPropertyName("metadata")]
    public TemplateMetadata Metadata { get; set; } = new();

    /// <summary>
    /// Full YAML definition of the workflow template.
    /// </summary>
    [JsonPropertyName("yamlDefinition")]
    public string YamlDefinition { get; set; } = string.Empty;

    /// <summary>
    /// Graph data for visual preview (nodes and edges).
    /// </summary>
    [JsonPropertyName("graph")]
    public TemplateGraph? Graph { get; set; }
}

/// <summary>
/// Graph representation of a workflow template for visualization.
/// </summary>
public class TemplateGraph
{
    /// <summary>
    /// List of task nodes in the workflow.
    /// </summary>
    [JsonPropertyName("nodes")]
    public List<TemplateGraphNode> Nodes { get; set; } = new();

    /// <summary>
    /// List of dependency edges between tasks.
    /// </summary>
    [JsonPropertyName("edges")]
    public List<TemplateGraphEdge> Edges { get; set; } = new();
}

/// <summary>
/// A node in the workflow graph (represents a task).
/// </summary>
public class TemplateGraphNode
{
    /// <summary>
    /// Task ID (unique within workflow).
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Task reference name (points to WorkflowTaskResource).
    /// </summary>
    [JsonPropertyName("taskRef")]
    public string TaskRef { get; set; } = string.Empty;

    /// <summary>
    /// Task type (e.g., "http", "websocket").
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
}

/// <summary>
/// An edge in the workflow graph (represents a dependency between tasks).
/// </summary>
public class TemplateGraphEdge
{
    /// <summary>
    /// Source task ID.
    /// </summary>
    [JsonPropertyName("from")]
    public string From { get; set; } = string.Empty;

    /// <summary>
    /// Target task ID.
    /// </summary>
    [JsonPropertyName("to")]
    public string To { get; set; } = string.Empty;
}
