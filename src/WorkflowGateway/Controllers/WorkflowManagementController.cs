using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Data.Repositories;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

[ApiController]
[Route("api/v1")]
public class WorkflowManagementController : ControllerBase
{
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly IDynamicEndpointService _endpointService;
    private readonly IWorkflowVersionRepository _versionRepository;

    public WorkflowManagementController(
        IWorkflowDiscoveryService discoveryService,
        IDynamicEndpointService endpointService,
        IWorkflowVersionRepository versionRepository)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _endpointService = endpointService ?? throw new ArgumentNullException(nameof(endpointService));
        _versionRepository = versionRepository ?? throw new ArgumentNullException(nameof(versionRepository));
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

    /// <summary>
    /// Get version history for a specific workflow
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <returns>List of workflow versions ordered by creation date descending</returns>
    [HttpGet("workflows/{workflowName}/versions")]
    [ProducesResponseType(typeof(WorkflowVersionListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflowVersions(string workflowName)
    {
        var versions = await _versionRepository.GetVersionsAsync(workflowName);

        var versionDetails = versions
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new WorkflowVersionDetail
            {
                VersionHash = v.VersionHash,
                CreatedAt = v.CreatedAt,
                DefinitionSnapshot = v.DefinitionSnapshot
            }).ToList();

        var response = new WorkflowVersionListResponse
        {
            WorkflowName = workflowName,
            Versions = versionDetails,
            TotalCount = versionDetails.Count
        };

        return Ok(response);
    }

    /// <summary>
    /// Delete a workflow
    /// </summary>
    /// <param name="workflowName">Name of the workflow to delete</param>
    /// <param name="namespace">Optional namespace (defaults to 'default')</param>
    /// <returns>204 No Content on success, 404 if workflow not found</returns>
    [HttpDelete("workflows/{workflowName}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteWorkflow(string workflowName, [FromQuery] string? @namespace = null)
    {
        var ns = @namespace ?? "default";

        // Check if workflow exists
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName, ns);
        if (workflow == null)
        {
            return NotFound(new { message = $"Workflow '{workflowName}' not found in namespace '{ns}'" });
        }

        try
        {
            // Unregister dynamic endpoints for this workflow
            await _endpointService.UnregisterWorkflowEndpointsAsync(workflowName);

            // Delete the workflow file from disk
            // Note: In a Kubernetes deployment, this would call k8s API to delete the CRD
            var workflowsDirectory = Environment.GetEnvironmentVariable("WORKFLOW__DISCOVERY__WORKFLOWSDIRECTORY")
                                     ?? "/Users/darren/dev/workflow/demo/crds";
            var workflowFilePath = Path.Combine(workflowsDirectory, $"workflow-{workflowName}.yaml");

            if (System.IO.File.Exists(workflowFilePath))
            {
                System.IO.File.Delete(workflowFilePath);
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = $"Failed to delete workflow '{workflowName}': {ex.Message}" });
        }
    }
}
