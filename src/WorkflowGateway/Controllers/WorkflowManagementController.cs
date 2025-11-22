using Microsoft.AspNetCore.Mvc;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

[ApiController]
[Route("api/v1")]
public class WorkflowManagementController : ControllerBase
{
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly IDynamicEndpointService _endpointService;

    public WorkflowManagementController(
        IWorkflowDiscoveryService discoveryService,
        IDynamicEndpointService endpointService)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _endpointService = endpointService ?? throw new ArgumentNullException(nameof(endpointService));
    }

    /// <summary>
    /// Get list of all available workflows
    /// </summary>
    /// <param name="namespace">Optional namespace filter</param>
    /// <returns>List of workflows with metadata and endpoints</returns>
    [HttpGet("workflows")]
    [ProducesResponseType(typeof(WorkflowListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflows([FromQuery] string? @namespace = null)
    {
        var workflows = await _discoveryService.DiscoverWorkflowsAsync(@namespace);

        var workflowSummaries = workflows.Select(w => new WorkflowSummary
        {
            Name = w.Metadata?.Name ?? "",
            Namespace = w.Metadata?.Namespace ?? "default",
            TaskCount = w.Spec.Tasks?.Count ?? 0,
            Endpoint = $"/api/v1/workflows/{w.Metadata?.Name}/execute"
        }).ToList();

        var response = new WorkflowListResponse
        {
            Workflows = workflowSummaries
        };

        return Ok(response);
    }

    /// <summary>
    /// Get list of all available workflow tasks
    /// </summary>
    /// <param name="namespace">Optional namespace filter</param>
    /// <returns>List of tasks with metadata</returns>
    [HttpGet("tasks")]
    [ProducesResponseType(typeof(TaskListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTasks([FromQuery] string? @namespace = null)
    {
        var tasks = await _discoveryService.DiscoverTasksAsync(@namespace);

        var taskSummaries = tasks.Select(t => new TaskSummary
        {
            Name = t.Metadata?.Name ?? "",
            Namespace = t.Metadata?.Namespace ?? "default",
            Type = t.Spec.Type
        }).ToList();

        var response = new TaskListResponse
        {
            Tasks = taskSummaries
        };

        return Ok(response);
    }
}
