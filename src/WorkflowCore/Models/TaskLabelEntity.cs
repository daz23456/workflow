namespace WorkflowCore.Models;

/// <summary>
/// Entity for storing task label data (tags and category) in PostgreSQL.
/// Designed for efficient GIN index queries on array columns.
/// </summary>
public class TaskLabelEntity
{
    /// <summary>
    /// Unique identifier for the label record.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The name of the task.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// The Kubernetes namespace of the task.
    /// </summary>
    public string Namespace { get; set; } = "default";

    /// <summary>
    /// The predefined category for the task (e.g., "http", "notification").
    /// Single value since tasks typically belong to one category.
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Free-form tags associated with the task.
    /// Stored as TEXT[] in PostgreSQL for GIN index queries.
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Timestamp when the labels were last synced from Kubernetes.
    /// </summary>
    public DateTime SyncedAt { get; set; }

    /// <summary>
    /// SHA256 hash of the task spec to detect changes.
    /// </summary>
    public string? VersionHash { get; set; }
}
