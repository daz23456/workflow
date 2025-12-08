namespace WorkflowCore.Models;

/// <summary>
/// Entity for storing workflow label data (tags and categories) in PostgreSQL.
/// Designed for efficient GIN index queries on array columns.
/// </summary>
public class WorkflowLabelEntity
{
    /// <summary>
    /// Unique identifier for the label record.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The name of the workflow.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// The Kubernetes namespace of the workflow.
    /// </summary>
    public string Namespace { get; set; } = "default";

    /// <summary>
    /// Free-form tags associated with the workflow.
    /// Stored as TEXT[] in PostgreSQL for GIN index queries.
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Predefined categories for the workflow.
    /// Stored as TEXT[] in PostgreSQL for GIN index queries.
    /// </summary>
    public List<string> Categories { get; set; } = new();

    /// <summary>
    /// Timestamp when the labels were last synced from Kubernetes.
    /// </summary>
    public DateTime SyncedAt { get; set; }

    /// <summary>
    /// SHA256 hash of the workflow spec to detect changes.
    /// </summary>
    public string? VersionHash { get; set; }
}
