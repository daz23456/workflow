using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for synthetic health check endpoints.
/// </summary>
[ApiController]
[Route("api/v1")]
public class HealthCheckController : ControllerBase
{
    private readonly ISyntheticCheckService _checkService;
    private readonly ILogger<HealthCheckController> _logger;

    public HealthCheckController(
        ISyntheticCheckService checkService,
        ILogger<HealthCheckController> logger)
    {
        _checkService = checkService ?? throw new ArgumentNullException(nameof(checkService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Runs a health check for a specific workflow immediately.
    /// </summary>
    /// <param name="name">The workflow name.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The health status of the workflow.</returns>
    [HttpPost("workflows/{name}/health-check")]
    [ProducesResponseType(typeof(WorkflowHealthStatusResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<WorkflowHealthStatusResponse>> RunHealthCheck(
        string name,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Running health check for workflow: {WorkflowName}", name);

        var status = await _checkService.CheckWorkflowHealthAsync(name, cancellationToken);
        return Ok(MapToResponse(status));
    }

    /// <summary>
    /// Gets the cached health status for a specific workflow.
    /// </summary>
    /// <param name="name">The workflow name.</param>
    /// <returns>The cached health status, or 404 if not available.</returns>
    [HttpGet("workflows/{name}/health-status")]
    [ProducesResponseType(typeof(WorkflowHealthStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkflowHealthStatusResponse>> GetHealthStatus(string name)
    {
        var status = await _checkService.GetCachedHealthStatusAsync(name);

        if (status == null)
        {
            return NotFound(new { message = $"No health status cached for workflow '{name}'. Run a health check first." });
        }

        return Ok(MapToResponse(status));
    }

    /// <summary>
    /// Gets a summary of health status for all workflows.
    /// </summary>
    /// <returns>Health summary for all workflows.</returns>
    [HttpGet("health/summary")]
    [ProducesResponseType(typeof(HealthSummaryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<HealthSummaryResponse>> GetHealthSummary()
    {
        var statuses = await _checkService.GetAllHealthStatusesAsync();

        var response = new HealthSummaryResponse
        {
            TotalWorkflows = statuses.Count,
            HealthyCount = statuses.Count(s => s.OverallHealth == HealthState.Healthy),
            DegradedCount = statuses.Count(s => s.OverallHealth == HealthState.Degraded),
            UnhealthyCount = statuses.Count(s => s.OverallHealth == HealthState.Unhealthy),
            UnknownCount = statuses.Count(s => s.OverallHealth == HealthState.Unknown),
            Workflows = statuses.Select(MapToResponse).ToList(),
            GeneratedAt = DateTime.UtcNow
        };

        return Ok(response);
    }

    private static WorkflowHealthStatusResponse MapToResponse(WorkflowHealthStatus status)
    {
        return new WorkflowHealthStatusResponse
        {
            WorkflowName = status.WorkflowName,
            OverallHealth = status.OverallHealth.ToString(),
            Tasks = status.Tasks.Select(t => new TaskHealthStatusResponse
            {
                TaskId = t.TaskId,
                TaskRef = t.TaskRef,
                Status = t.Status.ToString(),
                Url = t.Url,
                LatencyMs = t.LatencyMs,
                Reachable = t.Reachable,
                StatusCode = t.StatusCode,
                ErrorMessage = t.ErrorMessage
            }).ToList(),
            CheckedAt = status.CheckedAt,
            DurationMs = status.DurationMs
        };
    }
}

/// <summary>
/// API response model for workflow health status.
/// </summary>
public class WorkflowHealthStatusResponse
{
    public string WorkflowName { get; set; } = string.Empty;
    public string OverallHealth { get; set; } = string.Empty;
    public List<TaskHealthStatusResponse> Tasks { get; set; } = new();
    public DateTime CheckedAt { get; set; }
    public long DurationMs { get; set; }
}

/// <summary>
/// API response model for task health status.
/// </summary>
public class TaskHealthStatusResponse
{
    public string TaskId { get; set; } = string.Empty;
    public string TaskRef { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Url { get; set; }
    public long LatencyMs { get; set; }
    public bool Reachable { get; set; }
    public int? StatusCode { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// API response model for health summary.
/// </summary>
public class HealthSummaryResponse
{
    public int TotalWorkflows { get; set; }
    public int HealthyCount { get; set; }
    public int DegradedCount { get; set; }
    public int UnhealthyCount { get; set; }
    public int UnknownCount { get; set; }
    public List<WorkflowHealthStatusResponse> Workflows { get; set; } = new();
    public DateTime GeneratedAt { get; set; }
}
