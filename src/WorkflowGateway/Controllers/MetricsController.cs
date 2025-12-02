using Microsoft.AspNetCore.Mvc;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for system and workflow metrics endpoints.
/// </summary>
[ApiController]
[Route("api/v1/metrics")]
public class MetricsController : ControllerBase
{
    private readonly IMetricsService _metricsService;

    public MetricsController(IMetricsService metricsService)
    {
        _metricsService = metricsService ?? throw new ArgumentNullException(nameof(metricsService));
    }

    /// <summary>
    /// Gets system-wide metrics aggregated across all workflows.
    /// </summary>
    /// <param name="range">Time range: 1h, 24h, 7d, or 30d (default: 24h)</param>
    /// <returns>System metrics including throughput, latency percentiles, and error rate.</returns>
    [HttpGet("system")]
    [ProducesResponseType(typeof(SystemMetrics), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSystemMetrics([FromQuery] string range = "24h")
    {
        var timeRange = ParseTimeRange(range);
        var metrics = await _metricsService.GetSystemMetricsAsync(timeRange);
        return Ok(metrics);
    }

    /// <summary>
    /// Gets metrics for all workflows.
    /// </summary>
    /// <returns>List of per-workflow metrics.</returns>
    [HttpGet("workflows")]
    [ProducesResponseType(typeof(List<WorkflowMetrics>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflowMetrics()
    {
        var metrics = await _metricsService.GetWorkflowMetricsAsync();
        return Ok(metrics);
    }

    /// <summary>
    /// Gets historical trend data for a specific workflow.
    /// </summary>
    /// <param name="name">Workflow name.</param>
    /// <param name="range">Time range: 1h, 24h, 7d, or 30d (default: 24h)</param>
    /// <returns>Historical data points for the workflow.</returns>
    [HttpGet("workflows/{name}/history")]
    [ProducesResponseType(typeof(List<WorkflowHistoryPoint>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflowHistory(string name, [FromQuery] string range = "24h")
    {
        var timeRange = ParseTimeRange(range);
        var history = await _metricsService.GetWorkflowHistoryAsync(name, timeRange);
        return Ok(history);
    }

    /// <summary>
    /// Gets the slowest workflows by average execution duration.
    /// </summary>
    /// <param name="limit">Maximum number of workflows to return (default: 10).</param>
    /// <returns>List of slowest workflows with degradation info.</returns>
    [HttpGet("slowest")]
    [ProducesResponseType(typeof(List<SlowestWorkflow>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSlowestWorkflows([FromQuery] int limit = 10)
    {
        var slowest = await _metricsService.GetSlowestWorkflowsAsync(limit);
        return Ok(slowest);
    }

    private static TimeRange ParseTimeRange(string range)
    {
        return range.ToLowerInvariant() switch
        {
            "1h" => TimeRange.Hour1,
            "24h" => TimeRange.Hour24,
            "7d" => TimeRange.Day7,
            "30d" => TimeRange.Day30,
            _ => TimeRange.Hour24
        };
    }
}
