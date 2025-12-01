using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Difficulty level for workflow templates.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TemplateDifficulty
{
    /// <summary>
    /// Beginner-friendly templates (simple workflows, minimal configuration).
    /// </summary>
    Beginner,

    /// <summary>
    /// Intermediate templates (moderate complexity, some advanced features).
    /// </summary>
    Intermediate,

    /// <summary>
    /// Advanced templates (complex workflows, advanced features, requires deep understanding).
    /// </summary>
    Advanced
}

/// <summary>
/// Metadata for a workflow template.
/// </summary>
public class TemplateMetadata
{
    /// <summary>
    /// Unique template identifier (same as workflow name).
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Template category.
    /// </summary>
    [JsonPropertyName("category")]
    public TemplateCategory Category { get; set; }

    /// <summary>
    /// Difficulty level.
    /// </summary>
    [JsonPropertyName("difficulty")]
    public TemplateDifficulty Difficulty { get; set; }

    /// <summary>
    /// Human-readable description of what this template does.
    /// </summary>
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Tags for filtering and search (e.g., "parallel", "http", "api", "data-pipeline").
    /// </summary>
    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Estimated setup time in minutes.
    /// </summary>
    [JsonPropertyName("estimatedSetupTime")]
    public int EstimatedSetupTime { get; set; }

    /// <summary>
    /// Number of tasks in the workflow.
    /// </summary>
    [JsonPropertyName("taskCount")]
    public int TaskCount { get; set; }

    /// <summary>
    /// Whether the workflow uses parallel execution.
    /// </summary>
    [JsonPropertyName("hasParallelExecution")]
    public bool HasParallelExecution { get; set; }

    /// <summary>
    /// Kubernetes namespace.
    /// </summary>
    [JsonPropertyName("namespace")]
    public string Namespace { get; set; } = "default";

    /// <summary>
    /// Full YAML definition of the workflow template.
    /// </summary>
    [JsonPropertyName("yamlDefinition")]
    public string? YamlDefinition { get; set; }
}
