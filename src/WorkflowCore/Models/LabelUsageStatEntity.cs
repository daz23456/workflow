namespace WorkflowCore.Models;

/// <summary>
/// Entity for storing pre-computed label usage statistics.
/// Used for analytics and to optimize label listing with counts.
/// </summary>
public class LabelUsageStatEntity
{
    /// <summary>
    /// Unique identifier for the statistics record.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The type of label: "Tag" or "Category".
    /// </summary>
    public string LabelType { get; set; } = string.Empty;

    /// <summary>
    /// The label value (e.g., "production", "orders").
    /// </summary>
    public string LabelValue { get; set; } = string.Empty;

    /// <summary>
    /// The entity type this statistic applies to: "Workflow" or "Task".
    /// </summary>
    public string EntityType { get; set; } = string.Empty;

    /// <summary>
    /// Number of entities using this label.
    /// </summary>
    public int UsageCount { get; set; }

    /// <summary>
    /// Timestamp when this label was last used.
    /// </summary>
    public DateTime? LastUsedAt { get; set; }

    /// <summary>
    /// Timestamp when this statistic was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
