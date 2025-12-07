using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

/// <summary>
/// API controller for field usage analysis and tracking.
/// </summary>
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
    /// Get field usage information for a task.
    /// </summary>
    [HttpGet("{taskName}/field-usage")]
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
    /// Get impact analysis for removing a specific field.
    /// </summary>
    [HttpGet("{taskName}/field-impact")]
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
    /// Analyze field usage for a workflow and register it.
    /// </summary>
    [HttpPost("/api/v1/workflows/{workflowName}/analyze-usage")]
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
