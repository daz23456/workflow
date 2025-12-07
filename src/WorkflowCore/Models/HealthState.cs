namespace WorkflowCore.Models;

/// <summary>
/// Represents the health status of an endpoint or workflow.
/// </summary>
public enum HealthState
{
    /// <summary>
    /// All checks passed successfully.
    /// </summary>
    Healthy,

    /// <summary>
    /// Some checks passed but with issues (e.g., non-2xx response that's still reachable).
    /// </summary>
    Degraded,

    /// <summary>
    /// Checks failed - endpoint unreachable or returning errors.
    /// </summary>
    Unhealthy,

    /// <summary>
    /// Health status is unknown (e.g., no execution history available).
    /// </summary>
    Unknown
}
