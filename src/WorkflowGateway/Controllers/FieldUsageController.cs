using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for analyzing field-level usage patterns across workflows.
/// Tracks which task input/output fields are actually used by consumers,
/// enabling safe schema evolution and identifying unused fields for cleanup.
/// </summary>
/// <remarks>
/// Part of the CI/CD integration (Stage 16.7) - enables breaking change detection
/// before deployment by understanding which fields consumers depend on.
/// </remarks>
[ApiController]
[Route("api/v1/tasks")]
public class FieldUsageController : ControllerBase
{
    private readonly IFieldUsageAnalyzer _analyzer;
    private readonly IConsumerContractValidator _validator;
    private readonly IWorkflowDiscoveryService _discoveryService;

    public FieldUsageController(
        IFieldUsageAnalyzer analyzer,
        IConsumerContractValidator validator,
        IWorkflowDiscoveryService discoveryService)
    {
        _analyzer = analyzer;
        _validator = validator;
        _discoveryService = discoveryService;
    }

    /// <summary>
    /// Get comprehensive field usage information for a task.
    /// Shows which input and output fields are used by which workflows,
    /// along with usage counts and whether fields are unused.
    /// </summary>
    /// <param name="taskName">Name of the task to analyze.</param>
    /// <returns>
    /// Field usage details including:
    /// - Field name and type (input/output)
    /// - List of workflows using each field
    /// - Usage count across all workflows
    /// - IsUnused flag for cleanup candidates
    /// </returns>
    [HttpGet("{taskName}/field-usage")]
    [ProducesResponseType(typeof(FieldUsageResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<FieldUsageResponse>> GetFieldUsage(string taskName)
    {
        var fieldInfoList = _analyzer.GetAllFieldUsage(taskName);

        var response = new FieldUsageResponse
        {
            TaskName = taskName,
            Fields = fieldInfoList.Select(f => new FieldUsageInfoDto
            {
                FieldName = f.FieldName,
                FieldType = f.FieldType.ToString(),
                UsedByWorkflows = f.UsedByWorkflows.ToList(),
                UsageCount = f.UsageCount,
                IsUnused = f.IsUnused
            }).ToList()
        };

        return await Task.FromResult(Ok(response));
    }

    /// <summary>
    /// Analyze the impact of removing a specific field from a task.
    /// Use this before making breaking schema changes to understand which
    /// workflows would be affected and whether removal is safe.
    /// </summary>
    /// <param name="taskName">Name of the task containing the field.</param>
    /// <param name="field">Name of the field to analyze for removal.</param>
    /// <param name="type">Field type: 'input' or 'output'. Default: 'output'.</param>
    /// <returns>
    /// Impact analysis including:
    /// - Whether removal is safe (no consumers)
    /// - List of affected workflows that would break
    /// </returns>
    /// <remarks>
    /// A field is safe to remove only if no workflows currently use it.
    /// Use the affected workflows list to coordinate migration before removal.
    /// </remarks>
    [HttpGet("{taskName}/field-impact")]
    [ProducesResponseType(typeof(FieldImpactResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<FieldImpactResponse>> GetFieldImpact(
        string taskName,
        [FromQuery] string field,
        [FromQuery] string type = "output")
    {
        var fieldType = type.ToLowerInvariant() == "input" ? FieldType.Input : FieldType.Output;

        var fieldInfo = _analyzer.GetFieldUsageInfo(taskName, field, fieldType);
        var isRemovalSafe = _analyzer.IsFieldRemovalSafe(taskName, field, fieldType);

        var response = new FieldImpactResponse
        {
            TaskName = taskName,
            FieldName = field,
            FieldType = fieldType.ToString(),
            IsRemovalSafe = isRemovalSafe,
            AffectedWorkflows = fieldInfo.UsedByWorkflows.ToList()
        };

        return await Task.FromResult(Ok(response));
    }

    /// <summary>
    /// Analyze and register field usage patterns for a workflow.
    /// Scans the workflow definition to determine which task fields are accessed
    /// and registers this information for impact analysis.
    /// </summary>
    /// <param name="workflowName">Name of the workflow to analyze.</param>
    /// <returns>
    /// Analysis results showing for each task:
    /// - Input fields used by the workflow
    /// - Output fields consumed by the workflow
    /// Returns 404 if workflow not found.
    /// </returns>
    /// <remarks>
    /// Call this after deploying a workflow to update the field usage tracking.
    /// This enables accurate impact analysis for future schema changes.
    /// </remarks>
    [HttpPost("/api/v1/workflows/{workflowName}/analyze-usage")]
    [ProducesResponseType(typeof(WorkflowUsageAnalysisResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkflowUsageAnalysisResponse>> AnalyzeWorkflowUsage(string workflowName)
    {
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName);
        if (workflow == null)
        {
            return NotFound(new { error = $"Workflow '{workflowName}' not found" });
        }

        var usages = _analyzer.AnalyzeWorkflow(workflow);

        // Register all usages
        foreach (var usage in usages)
        {
            _analyzer.RegisterUsage(usage);
        }

        var response = new WorkflowUsageAnalysisResponse
        {
            WorkflowName = workflowName,
            TaskUsages = usages.Select(u => new TaskUsageDto
            {
                TaskName = u.TaskName,
                UsedInputFields = u.UsedInputFields.ToList(),
                UsedOutputFields = u.UsedOutputFields.ToList()
            }).ToList()
        };

        return Ok(response);
    }
}
