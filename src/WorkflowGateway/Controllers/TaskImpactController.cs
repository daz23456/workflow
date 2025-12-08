using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;

namespace WorkflowGateway.Controllers;

/// <summary>
/// API controller for task impact analysis and lifecycle management.
/// </summary>
[ApiController]
[Route("api/v1/tasks")]
public class TaskImpactController : ControllerBase
{
    private readonly ITaskDependencyTracker _dependencyTracker;
    private readonly ITaskLifecycleManager _lifecycleManager;

    public TaskImpactController(
        ITaskDependencyTracker dependencyTracker,
        ITaskLifecycleManager lifecycleManager)
    {
        _dependencyTracker = dependencyTracker;
        _lifecycleManager = lifecycleManager;
    }

    /// <summary>
    /// Get impact analysis for a task change.
    /// </summary>
    [HttpGet("{taskName}/impact")]
    public async Task<ActionResult<TaskImpactResponse>> GetImpact(
        string taskName,
        [FromQuery] string? removedField = null)
    {
        var lifecycle = _lifecycleManager.GetLifecycle(taskName);
        var dependency = _dependencyTracker.GetDependency(taskName);

        // Task exists if it has lifecycle or dependency info
        if (lifecycle == null && dependency == null)
        {
            return NotFound(new { error = $"Task '{taskName}' not found" });
        }

        var affectedWorkflows = _dependencyTracker.GetAffectedWorkflows(taskName);
        var blockedWorkflows = new List<string>();
        var isBreaking = false;
        string? breakingReason = null;

        // Check if field removal affects any workflows
        if (!string.IsNullOrEmpty(removedField))
        {
            var workflowsUsingField = _dependencyTracker.GetWorkflowsUsingField(taskName, removedField);
            if (workflowsUsingField.Any())
            {
                isBreaking = true;
                breakingReason = $"Removing field '{removedField}' will break {workflowsUsingField.Count} workflow(s)";
                blockedWorkflows.AddRange(workflowsUsingField);
            }
        }

        var impactLevel = CalculateImpactLevel(isBreaking, affectedWorkflows.Count);

        var response = new TaskImpactResponse
        {
            TaskName = taskName,
            AffectedWorkflows = affectedWorkflows.ToList(),
            IsBreaking = isBreaking,
            BreakingReason = breakingReason,
            BlockedWorkflows = blockedWorkflows,
            ImpactLevel = impactLevel.ToString(),
            SuggestedActions = GetSuggestedActions(isBreaking, blockedWorkflows.Count)
        };

        return await Task.FromResult(Ok(response));
    }

    /// <summary>
    /// Get lifecycle state for a task.
    /// </summary>
    [HttpGet("{taskName}/lifecycle")]
    public async Task<ActionResult<TaskLifecycleResponse>> GetLifecycle(string taskName)
    {
        var lifecycle = _lifecycleManager.GetLifecycle(taskName);
        if (lifecycle == null)
        {
            return NotFound(new { error = $"Task '{taskName}' not found" });
        }

        var response = new TaskLifecycleResponse
        {
            TaskName = lifecycle.TaskName,
            State = lifecycle.State.ToString(),
            SupersededBy = lifecycle.SupersededBy,
            DeprecationDate = lifecycle.DeprecationDate,
            IsBlocked = lifecycle.IsBlocked
        };

        return await Task.FromResult(Ok(response));
    }

    /// <summary>
    /// Mark a task as superseded by a newer version.
    /// </summary>
    [HttpPost("{taskName}/supersede")]
    public async Task<IActionResult> SupersedeTask(string taskName, [FromBody] SupersedeTaskRequest request)
    {
        var lifecycle = _lifecycleManager.GetLifecycle(taskName);
        if (lifecycle == null)
        {
            return NotFound(new { error = $"Task '{taskName}' not found" });
        }

        _lifecycleManager.SupersedeTask(taskName, request.NewTaskName);

        return await Task.FromResult(Ok());
    }

    /// <summary>
    /// Mark a task as deprecated with a removal date.
    /// </summary>
    [HttpPost("{taskName}/deprecate")]
    public async Task<IActionResult> DeprecateTask(string taskName, [FromBody] DeprecateTaskRequest request)
    {
        var lifecycle = _lifecycleManager.GetLifecycle(taskName);
        if (lifecycle == null)
        {
            return NotFound(new { error = $"Task '{taskName}' not found" });
        }

        _lifecycleManager.DeprecateTask(taskName, request.DeprecationDate);

        return await Task.FromResult(Ok());
    }

    private static ImpactLevel CalculateImpactLevel(bool isBreaking, int affectedCount)
    {
        if (!isBreaking) return ImpactLevel.None;
        if (affectedCount == 0) return ImpactLevel.Low;
        if (affectedCount < 5) return ImpactLevel.Medium;
        return ImpactLevel.High;
    }

    private static List<string> GetSuggestedActions(bool isBreaking, int blockedCount)
    {
        var actions = new List<string>();

        if (isBreaking)
        {
            actions.Add("Create a new task version with -v2 suffix");
            actions.Add("Notify dependent workflow owners");

            if (blockedCount > 0)
            {
                actions.Add($"Coordinate migration with {blockedCount} blocked workflow(s)");
            }
        }

        return actions;
    }
}
