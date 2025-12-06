using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Service for calculating and managing baseline statistics for anomaly detection.
/// Baselines are computed from historical execution data and used to detect
/// performance anomalies using Z-score analysis.
/// </summary>
public interface IAnomalyBaselineService
{
    /// <summary>
    /// Gets the cached baseline for a workflow or task.
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="taskId">Optional task ID for task-level baselines</param>
    /// <returns>The cached baseline, or null if no baseline exists</returns>
    Task<AnomalyBaseline?> GetBaselineAsync(string workflowName, string? taskId = null);

    /// <summary>
    /// Calculates a new baseline from historical execution data.
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="taskId">Optional task ID for task-level baselines</param>
    /// <param name="windowDays">Number of days to include in the calculation window</param>
    /// <returns>The calculated baseline</returns>
    Task<AnomalyBaseline> CalculateBaselineAsync(string workflowName, string? taskId = null, int windowDays = 7);

    /// <summary>
    /// Refreshes all cached baselines for all workflows.
    /// Called periodically by the background service.
    /// </summary>
    /// <param name="ct">Cancellation token</param>
    Task RefreshAllBaselinesAsync(CancellationToken ct = default);

    /// <summary>
    /// Checks if there is sufficient execution data to calculate a meaningful baseline.
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="taskId">Optional task ID for task-level baselines</param>
    /// <param name="minSamples">Minimum number of samples required (default: 30)</param>
    /// <returns>True if sufficient data exists</returns>
    Task<bool> HasSufficientDataAsync(string workflowName, string? taskId = null, int minSamples = 30);

    /// <summary>
    /// Gets all workflow names that have baselines.
    /// </summary>
    /// <returns>Collection of workflow names</returns>
    Task<IEnumerable<string>> GetAllWorkflowNamesAsync();
}
