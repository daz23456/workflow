namespace WorkflowCore.Models;

/// <summary>
/// Aggregated health status for a workflow based on synthetic health checks.
/// </summary>
public class WorkflowHealthStatus
{
    /// <summary>
    /// Name of the workflow.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// Overall health status (determined by worst task status).
    /// </summary>
    public HealthState OverallHealth { get; set; }

    /// <summary>
    /// Health status for each task endpoint.
    /// </summary>
    public List<TaskHealthStatus> Tasks { get; set; } = new();

    /// <summary>
    /// Timestamp when the health check was performed.
    /// </summary>
    public DateTime CheckedAt { get; set; }

    /// <summary>
    /// Total duration of the health check in milliseconds.
    /// </summary>
    public long DurationMs { get; set; }
}
