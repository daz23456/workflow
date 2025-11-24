namespace WorkflowGateway.Models;

/// <summary>
/// Detailed information about a single workflow version.
/// </summary>
public class WorkflowVersionDetail
{
    /// <summary>
    /// Unique version hash (SHA256) identifying this workflow definition.
    /// </summary>
    public string VersionHash { get; set; } = string.Empty;

    /// <summary>
    /// Timestamp when this version was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Snapshot of the workflow definition at this version (YAML format).
    /// </summary>
    public string? DefinitionSnapshot { get; set; }
}
