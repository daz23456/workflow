namespace WorkflowCore.Models;

/// <summary>
/// Represents a versioned snapshot of a workflow definition.
/// Used to track changes to workflows over time.
/// </summary>
public class WorkflowVersion
{
    /// <summary>
    /// Unique identifier for the workflow version.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Name of the workflow.
    /// </summary>
    public string? WorkflowName { get; set; }

    /// <summary>
    /// SHA256 hash of the workflow definition, used to detect changes.
    /// </summary>
    public string? VersionHash { get; set; }

    /// <summary>
    /// Timestamp when this version was created (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// YAML snapshot of the complete workflow definition.
    /// </summary>
    public string? DefinitionSnapshot { get; set; }
}
