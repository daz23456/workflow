using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for task impact analysis, blast radius visualization, and lifecycle management.
/// Provides tools to understand the consequences of task changes across the workflow ecosystem,
/// helping teams make informed decisions about breaking changes and deprecations.
/// </summary>
/// <remarks>
/// Key capabilities:
/// - Blast Radius Analysis: See all affected workflows and tasks when making changes
/// - Impact Assessment: Understand breaking changes before they happen
/// - Lifecycle Management: Track task versions, deprecations, and superseded relationships
/// </remarks>
[ApiController]
[Route("api/v1/tasks")]
public class TaskImpactController : ControllerBase
{
    private readonly ITaskDependencyTracker _dependencyTracker;
    private readonly ITaskLifecycleManager _lifecycleManager;
    private readonly IBlastRadiusAnalyzer _blastRadiusAnalyzer;

    public TaskImpactController(
        ITaskDependencyTracker dependencyTracker,
        ITaskLifecycleManager lifecycleManager,
        IBlastRadiusAnalyzer blastRadiusAnalyzer)
    {
        _dependencyTracker = dependencyTracker;
        _lifecycleManager = lifecycleManager;
        _blastRadiusAnalyzer = blastRadiusAnalyzer;
    }

    /// <summary>
    /// Analyze the blast radius of changes to a task.
    /// Performs transitive dependency analysis to show all workflows and tasks
    /// that would be affected by modifying this task, at configurable depth levels.
    /// </summary>
    /// <param name="taskName">Name of the task to analyze.</param>
    /// <param name="depth">
    /// Analysis depth: 1-3 for specific levels, or 0 for unlimited.
    /// Depth 1 shows direct dependents, depth 2 includes their dependents, etc.
    /// Default: 1.
    /// </param>
    /// <param name="format">
    /// Response format:
    /// - "flat": Summary with lists of affected workflows/tasks
    /// - "graph": Node/edge graph structure for visualization
    /// - "both": Include both formats (default)
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Blast radius analysis including:
    /// - Total affected workflows and tasks
    /// - Breakdown by depth level
    /// - Graph with nodes and edges for visualization
    /// - TruncatedAtDepth flag if more dependencies exist
    /// </returns>
    [HttpGet("{taskName}/blast-radius")]
    public async Task<ActionResult<BlastRadiusResponse>> GetBlastRadius(
        string taskName,
        [FromQuery] int depth = 1,
        [FromQuery] string format = "both",
        CancellationToken cancellationToken = default)
    {
        // Convert depth=0 to unlimited
        var maxDepth = depth <= 0 ? int.MaxValue : depth;

        var result = await _blastRadiusAnalyzer.AnalyzeAsync(taskName, maxDepth, cancellationToken);

        var response = new BlastRadiusResponse
        {
            TaskName = result.TaskName,
            AnalysisDepth = result.AnalysisDepth,
            TruncatedAtDepth = result.TruncatedAtDepth
        };

        // Include summary unless format is "graph" only
        if (format != "graph")
        {
            response.Summary = new BlastRadiusSummary
            {
                TotalAffectedWorkflows = result.TotalAffectedWorkflows,
                TotalAffectedTasks = result.TotalAffectedTasks,
                AffectedWorkflows = result.AffectedWorkflows,
                AffectedTasks = result.AffectedTasks,
                ByDepth = result.ByDepth.Select(d => new BlastRadiusDepthLevelResponse
                {
                    Depth = d.Depth,
                    Workflows = d.Workflows,
                    Tasks = d.Tasks
                }).ToList()
            };
        }

        // Include graph unless format is "flat" only
        if (format != "flat")
        {
            response.Graph = new BlastRadiusGraphResponse
            {
                Nodes = result.Graph.Nodes.Select(n => new BlastRadiusNodeResponse
                {
                    Id = n.Id,
                    Name = n.Name,
                    Type = n.Type.ToString().ToLowerInvariant(),
                    Depth = n.Depth,
                    IsSource = n.IsSource
                }).ToList(),
                Edges = result.Graph.Edges.Select(e => new BlastRadiusEdgeResponse
                {
                    Source = e.Source,
                    Target = e.Target,
                    Relationship = e.Relationship
                }).ToList()
            };
        }

        return Ok(response);
    }

    /// <summary>
    /// Get impact analysis for a proposed task change.
    /// Identifies which workflows would be affected by the change and whether
    /// it constitutes a breaking change that requires coordination.
    /// </summary>
    /// <param name="taskName">Name of the task to analyze.</param>
    /// <param name="removedField">
    /// Optional: Name of a field being removed. If specified, the analysis
    /// will identify workflows using that field and flag it as a breaking change.
    /// </param>
    /// <returns>
    /// Impact analysis including:
    /// - List of affected workflows
    /// - Whether the change is breaking
    /// - Breaking reason if applicable
    /// - Blocked workflows (if removedField specified)
    /// - Impact level (None, Low, Medium, High)
    /// - Suggested actions for migration
    /// Returns 404 if task not found.
    /// </returns>
    [HttpGet("{taskName}/impact")]
    [ProducesResponseType(typeof(TaskImpactResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
    /// Get the current lifecycle state for a task.
    /// Shows whether the task is active, deprecated, superseded, or blocked,
    /// along with relevant metadata like deprecation dates and successor tasks.
    /// </summary>
    /// <param name="taskName">Name of the task to get lifecycle info for.</param>
    /// <returns>
    /// Lifecycle state including:
    /// - State: Active, Deprecated, Superseded, or Blocked
    /// - SupersededBy: Name of replacement task (if superseded)
    /// - DeprecationDate: When the task will be removed (if deprecated)
    /// - IsBlocked: Whether execution is currently blocked
    /// Returns 404 if task not found.
    /// </returns>
    [HttpGet("{taskName}/lifecycle")]
    [ProducesResponseType(typeof(TaskLifecycleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
    /// Used when introducing a breaking-change replacement (e.g., get-user → get-user-v2).
    /// The old task remains functional but consumers are encouraged to migrate.
    /// </summary>
    /// <param name="taskName">Name of the task being superseded.</param>
    /// <param name="request">Request containing the name of the replacement task.</param>
    /// <returns>
    /// 200 OK if successful.
    /// 404 if task not found.
    /// </returns>
    /// <remarks>
    /// After superseding, the /lifecycle endpoint will show:
    /// - State: Superseded
    /// - SupersededBy: the new task name
    /// </remarks>
    [HttpPost("{taskName}/supersede")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
    /// Mark a task as deprecated with a planned removal date.
    /// Signals to consumers that they should migrate away from this task
    /// before the deprecation date when it will be removed.
    /// </summary>
    /// <param name="taskName">Name of the task to deprecate.</param>
    /// <param name="request">Request containing the planned deprecation/removal date.</param>
    /// <returns>
    /// 200 OK if successful.
    /// 404 if task not found.
    /// </returns>
    /// <remarks>
    /// After deprecating, the /lifecycle endpoint will show:
    /// - State: Deprecated
    /// - DeprecationDate: when the task will be removed
    /// Use the /impact endpoint to see which workflows need to migrate.
    /// </remarks>
    [HttpPost("{taskName}/deprecate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
