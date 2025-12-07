namespace WorkflowCore.Models;

/// <summary>
/// Health status for a single task endpoint within a workflow.
/// </summary>
public class TaskHealthStatus
{
    /// <summary>
    /// Task identifier from the workflow definition.
    /// </summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>
    /// Task reference name from the workflow.
    /// </summary>
    public string TaskRef { get; set; } = string.Empty;

    /// <summary>
    /// Health status of this task's endpoint.
    /// </summary>
    public HealthState Status { get; set; }

    /// <summary>
    /// The URL that was checked.
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// Latency of the health check in milliseconds.
    /// </summary>
    public long LatencyMs { get; set; }

    /// <summary>
    /// Whether the endpoint was reachable (DNS resolved, TCP connected).
    /// </summary>
    public bool Reachable { get; set; }

    /// <summary>
    /// HTTP status code returned, if any.
    /// </summary>
    public int? StatusCode { get; set; }

    /// <summary>
    /// Error message if the check failed.
    /// </summary>
    public string? ErrorMessage { get; set; }
}
