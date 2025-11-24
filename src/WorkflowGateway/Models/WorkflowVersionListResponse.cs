namespace WorkflowGateway.Models;

/// <summary>
/// Response model for listing workflow versions.
/// </summary>
public class WorkflowVersionListResponse
{
    /// <summary>
    /// Name of the workflow these versions belong to.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// List of version details, ordered by creation date descending (most recent first).
    /// </summary>
    public List<WorkflowVersionDetail> Versions { get; set; } = new();

    /// <summary>
    /// Total number of versions for this workflow.
    /// </summary>
    public int TotalCount { get; set; }
}
