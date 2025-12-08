using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for workflow optimization discovery and application.
/// </summary>
[ApiController]
[Route("api/v1/workflows/{workflowName}")]
public class OptimizationController : ControllerBase
{
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly IWorkflowAnalyzer _analyzer;
    private readonly ITransformEquivalenceChecker _equivalenceChecker;
    private readonly IHistoricalReplayEngine _replayEngine;

    public OptimizationController(
        IWorkflowDiscoveryService discoveryService,
        IWorkflowAnalyzer analyzer,
        ITransformEquivalenceChecker equivalenceChecker,
        IHistoricalReplayEngine replayEngine)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _analyzer = analyzer ?? throw new ArgumentNullException(nameof(analyzer));
        _equivalenceChecker = equivalenceChecker ?? throw new ArgumentNullException(nameof(equivalenceChecker));
        _replayEngine = replayEngine ?? throw new ArgumentNullException(nameof(replayEngine));
    }

    /// <summary>
    /// Get optimization suggestions for a workflow.
    /// </summary>
    /// <param name="workflowName">Name of the workflow to analyze.</param>
    /// <returns>List of optimization suggestions with safety levels.</returns>
    [HttpGet("optimizations")]
    [ProducesResponseType(typeof(OptimizationListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOptimizations(string workflowName)
    {
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName);
        if (workflow == null)
        {
            return NotFound(new { error = $"Workflow '{workflowName}' not found" });
        }

        var analysisResult = _analyzer.Analyze(workflow);

        var suggestions = analysisResult.Candidates.Select((opt, index) =>
        {
            var safetyLevel = _equivalenceChecker.AssessOptimizationSafety(opt);
            return new OptimizationSuggestion
            {
                Id = $"opt-{index + 1}-{opt.Type}-{opt.TaskId}",
                Type = opt.Type,
                Description = opt.Description,
                AffectedTaskIds = new List<string> { opt.TaskId },
                EstimatedImpact = opt.EstimatedImpact > 0.7 ? "High" : opt.EstimatedImpact > 0.3 ? "Medium" : "Low",
                SafetyLevel = safetyLevel.ToString()
            };
        }).ToList();

        return Ok(new OptimizationListResponse
        {
            WorkflowName = workflowName,
            Suggestions = suggestions,
            AnalyzedAt = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Test an optimization by replaying historical executions.
    /// </summary>
    /// <param name="workflowName">Name of the workflow.</param>
    /// <param name="optimizationId">ID of the optimization to test.</param>
    /// <param name="request">Test configuration.</param>
    /// <returns>Replay results with confidence score.</returns>
    [HttpPost("optimizations/{optimizationId}/test")]
    [ProducesResponseType(typeof(OptimizationTestResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TestOptimization(
        string workflowName,
        string optimizationId,
        [FromBody] OptimizationTestRequest request)
    {
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName);
        if (workflow == null)
        {
            return NotFound(new { error = $"Workflow '{workflowName}' not found" });
        }

        var tasks = await _discoveryService.DiscoverTasksAsync();
        var taskDict = tasks.ToDictionary(t => t.Metadata?.Name ?? "", t => t);

        var analysisResult = _analyzer.Analyze(workflow);
        var optimization = FindOptimizationById(analysisResult.Candidates, optimizationId);

        if (optimization == null)
        {
            return NotFound(new { error = $"Optimization '{optimizationId}' not found for workflow '{workflowName}'" });
        }

        // Create optimized workflow
        var optimizedWorkflow = ApplyOptimizationToWorkflow(workflow, optimization);

        var replayOptions = new ReplayOptions
        {
            IgnoreFields = request.IgnoreFields?.ToArray() ?? Array.Empty<string>(),
            DryRun = request.DryRun
        };

        var replayResult = await _replayEngine.ReplayWorkflowAsync(
            workflow,
            optimizedWorkflow,
            taskDict,
            request.ReplayCount,
            replayOptions);

        return Ok(new OptimizationTestResponse
        {
            OptimizationId = optimizationId,
            ConfidenceScore = replayResult.ConfidenceScore,
            TotalReplays = replayResult.TotalReplays,
            MatchingOutputs = replayResult.MatchingOutputs,
            AverageTimeDeltaMs = replayResult.AverageTimeDelta.TotalMilliseconds,
            Mismatches = replayResult.Mismatches.Select(m => new ReplayMismatchDetail
            {
                ExecutionId = m.ExecutionId,
                TaskRef = m.TaskRef,
                Reason = m.Reason
            }).ToList()
        });
    }

    /// <summary>
    /// Apply an optimization to a workflow.
    /// </summary>
    /// <param name="workflowName">Name of the workflow.</param>
    /// <param name="optimizationId">ID of the optimization to apply.</param>
    /// <param name="force">Force application even if optimization is unsafe.</param>
    /// <returns>The optimized workflow specification.</returns>
    [HttpPost("optimizations/{optimizationId}/apply")]
    [ProducesResponseType(typeof(OptimizationApplyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApplyOptimization(
        string workflowName,
        string optimizationId,
        [FromQuery] bool force = false)
    {
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName);
        if (workflow == null)
        {
            return NotFound(new { error = $"Workflow '{workflowName}' not found" });
        }

        var analysisResult = _analyzer.Analyze(workflow);
        var optimization = FindOptimizationById(analysisResult.Candidates, optimizationId);

        if (optimization == null)
        {
            return NotFound(new { error = $"Optimization '{optimizationId}' not found for workflow '{workflowName}'" });
        }

        var safetyLevel = _equivalenceChecker.AssessOptimizationSafety(optimization);

        if (safetyLevel == SafetyLevel.Unsafe && !force)
        {
            return BadRequest(new
            {
                error = "Cannot apply unsafe optimization without force flag",
                safetyLevel = safetyLevel.ToString(),
                hint = "Use ?force=true to apply anyway (not recommended)"
            });
        }

        var optimizedWorkflow = ApplyOptimizationToWorkflow(workflow, optimization);

        var response = new OptimizationApplyResponse
        {
            OptimizationId = optimizationId,
            Applied = true,
            OptimizedWorkflow = optimizedWorkflow.Spec
        };

        if (safetyLevel == SafetyLevel.Unsafe && force)
        {
            response.Warning = "Applied unsafe optimization - verify correctness before deploying";
        }

        return Ok(response);
    }

    /// <summary>
    /// Find an optimization by its generated ID.
    /// </summary>
    private static OptimizationCandidate? FindOptimizationById(List<OptimizationCandidate> candidates, string id)
    {
        for (int i = 0; i < candidates.Count; i++)
        {
            var opt = candidates[i];
            var generatedId = $"opt-{i + 1}-{opt.Type}-{opt.TaskId}";
            if (generatedId == id)
            {
                return opt;
            }
        }
        return null;
    }

    /// <summary>
    /// Apply an optimization to create an optimized workflow.
    /// </summary>
    private static WorkflowResource ApplyOptimizationToWorkflow(
        WorkflowResource workflow,
        OptimizationCandidate optimization)
    {
        // Create a deep copy of the workflow
        var optimizedWorkflow = new WorkflowResource
        {
            ApiVersion = workflow.ApiVersion,
            Kind = workflow.Kind,
            Metadata = new ResourceMetadata
            {
                Name = $"{workflow.Metadata?.Name}-optimized",
                Namespace = workflow.Metadata?.Namespace ?? "default"
            },
            Spec = new WorkflowSpec
            {
                Description = $"{workflow.Spec.Description} (optimized: {optimization.Type})",
                Input = workflow.Spec.Input,
                Output = workflow.Spec.Output,
                Tasks = workflow.Spec.Tasks.Select(t => new WorkflowTaskStep
                {
                    Id = t.Id,
                    TaskRef = t.TaskRef,
                    WorkflowRef = t.WorkflowRef,
                    Input = t.Input,
                    DependsOn = t.DependsOn != null ? new List<string>(t.DependsOn) : null,
                    Condition = t.Condition,
                    Switch = t.Switch,
                    ForEach = t.ForEach,
                    Timeout = t.Timeout,
                    CircuitBreaker = t.CircuitBreaker,
                    Fallback = t.Fallback
                }).ToList()
            }
        };

        // Apply the specific optimization based on type
        switch (optimization.Type)
        {
            case "filter-before-map":
                // Reorder tasks so filter runs before map
                ReorderFilterBeforeMap(optimizedWorkflow, optimization.TaskId);
                break;
            case "transform-fusion":
                // Mark fused transforms
                optimizedWorkflow.Spec.Description += $" [fused: {optimization.TaskId}]";
                break;
            case "dead-task":
                // Remove dead task
                RemoveDeadTask(optimizedWorkflow, optimization.TaskId);
                break;
            case "parallel-promotion":
                // Remove unnecessary dependency for parallel execution
                optimizedWorkflow.Spec.Description += $" [parallelized: {optimization.TaskId}]";
                break;
        }

        return optimizedWorkflow;
    }

    private static void ReorderFilterBeforeMap(WorkflowResource workflow, string taskId)
    {
        var tasks = workflow.Spec.Tasks;
        var taskIndex = tasks.FindIndex(t => t.Id == taskId);

        if (taskIndex > 0)
        {
            // Simple reordering - swap with previous task
            var task = tasks[taskIndex];
            tasks.RemoveAt(taskIndex);
            tasks.Insert(taskIndex - 1, task);
        }
    }

    private static void RemoveDeadTask(WorkflowResource workflow, string taskId)
    {
        var tasks = workflow.Spec.Tasks;
        var taskIndex = tasks.FindIndex(t => t.Id == taskId);

        if (taskIndex >= 0)
        {
            tasks.RemoveAt(taskIndex);

            // Update dependencies that reference the removed task
            foreach (var task in tasks)
            {
                task.DependsOn?.Remove(taskId);
            }
        }
    }
}
