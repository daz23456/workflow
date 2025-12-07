using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Service for performing synthetic health checks on workflow endpoints.
/// Replays GET requests from previous successful executions to verify services are available.
/// </summary>
public interface ISyntheticCheckService
{
    /// <summary>
    /// Performs a health check for a specific workflow by replaying GET requests
    /// from the last successful execution.
    /// </summary>
    /// <param name="workflowName">Name of the workflow to check.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Health status for the workflow and its tasks.</returns>
    Task<WorkflowHealthStatus> CheckWorkflowHealthAsync(
        string workflowName, CancellationToken ct = default);

    /// <summary>
    /// Gets the cached health status for a workflow (from the last check).
    /// </summary>
    /// <param name="workflowName">Name of the workflow.</param>
    /// <returns>Cached health status, or null if not available.</returns>
    Task<WorkflowHealthStatus?> GetCachedHealthStatusAsync(string workflowName);

    /// <summary>
    /// Gets health status for all workflows with cached results.
    /// </summary>
    /// <returns>List of cached health statuses.</returns>
    Task<IReadOnlyList<WorkflowHealthStatus>> GetAllHealthStatusesAsync();

    /// <summary>
    /// Refreshes health checks for all known workflows.
    /// </summary>
    /// <param name="ct">Cancellation token.</param>
    Task RefreshAllHealthChecksAsync(CancellationToken ct = default);
}
