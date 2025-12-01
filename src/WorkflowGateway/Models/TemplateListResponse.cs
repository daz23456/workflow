using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Response for GET /api/v1/templates endpoint.
/// </summary>
public class TemplateListResponse
{
    /// <summary>
    /// List of workflow templates.
    /// </summary>
    [JsonPropertyName("templates")]
    public List<TemplateSummary> Templates { get; set; } = new();

    /// <summary>
    /// Total number of templates available.
    /// </summary>
    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }
}

/// <summary>
/// Summary information for a workflow template (used in list view).
/// </summary>
public class TemplateSummary
{
    /// <summary>
    /// Unique template identifier.
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
    /// Short description.
    /// </summary>
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Tags for filtering.
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
}
