using WorkflowGateway.Models;

namespace WorkflowGateway.Services;

/// <summary>
/// Service for aggregating and calculating workflow execution metrics.
/// </summary>
public interface IMetricsService
{
    /// <summary>
    /// Gets system-wide metrics aggregated across all workflows for a time range.
    /// </summary>
    /// <param name="range">Time range to filter executions.</param>
    /// <returns>System-wide metrics including throughput, percentiles, and error rate.</returns>
    Task<SystemMetrics> GetSystemMetricsAsync(TimeRange range);

    /// <summary>
    /// Gets metrics for all workflows.
    /// </summary>
    /// <returns>List of per-workflow metrics.</returns>
    Task<List<WorkflowMetrics>> GetWorkflowMetricsAsync();

    /// <summary>
    /// Gets historical trend data for a specific workflow.
    /// </summary>
    /// <param name="workflowName">Name of the workflow.</param>
    /// <param name="range">Time range for historical data.</param>
    /// <returns>List of historical data points.</returns>
    Task<List<WorkflowHistoryPoint>> GetWorkflowHistoryAsync(string workflowName, TimeRange range);

    /// <summary>
    /// Gets the slowest workflows by average duration.
    /// </summary>
    /// <param name="limit">Maximum number of workflows to return (default: 10).</param>
    /// <returns>List of slowest workflows with degradation info.</returns>
    Task<List<SlowestWorkflow>> GetSlowestWorkflowsAsync(int limit = 10);
}
