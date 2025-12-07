using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
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
    private readonly IExecutionRepository _executionRepository;
    private readonly IHttpTaskExecutor _taskExecutor;
    private readonly IWorkflowInputValidator _inputValidator;

    public WorkflowManagementController(
        IWorkflowDiscoveryService discoveryService,
        IDynamicEndpointService endpointService,
        IWorkflowVersionRepository versionRepository,
        IExecutionRepository executionRepository,
        IHttpTaskExecutor taskExecutor,
        IWorkflowInputValidator inputValidator)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _endpointService = endpointService ?? throw new ArgumentNullException(nameof(endpointService));
        _versionRepository = versionRepository ?? throw new ArgumentNullException(nameof(versionRepository));
        _executionRepository = executionRepository ?? throw new ArgumentNullException(nameof(executionRepository));
        _taskExecutor = taskExecutor ?? throw new ArgumentNullException(nameof(taskExecutor));
        _inputValidator = inputValidator ?? throw new ArgumentNullException(nameof(inputValidator));
    }

    /// <summary>
    /// Get list of all available workflows
    /// </summary>
    /// <param name="namespace">Optional namespace filter</param>
    /// <param name="search">Optional search term to filter by name or description</param>
    /// <param name="skip">Number of records to skip (for pagination)</param>
    /// <param name="take">Number of records to take (for pagination, defaults to 50)</param>
    /// <returns>List of workflows with metadata, stats, and endpoints</returns>
    [HttpGet("workflows")]
    [ProducesResponseType(typeof(WorkflowListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflows(
        [FromQuery] string? @namespace = null,
        [FromQuery] string? search = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        var workflows = await _discoveryService.DiscoverWorkflowsAsync(@namespace);
        var allWorkflowStats = await _executionRepository.GetAllWorkflowStatisticsAsync();

        // Apply search filter if provided
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLowerInvariant();
            workflows = workflows.Where(w =>
                (w.Metadata?.Name?.ToLowerInvariant().Contains(searchLower) ?? false) ||
                (w.Spec.Description?.ToLowerInvariant().Contains(searchLower) ?? false)
            ).ToList();
        }

        var totalCount = workflows.Count;

        var workflowSummaries = workflows
            .Skip(skip)
            .Take(take)
            .Select(w =>
            {
                var name = w.Metadata?.Name ?? "";
                allWorkflowStats.TryGetValue(name, out var stats);

                // Build input schema preview (list of input parameter names with types)
                var inputPreview = w.Spec.Input?.Any() == true
                    ? string.Join(", ", w.Spec.Input.Select(kv => $"{kv.Key}: {kv.Value.Type}"))
                    : "No input required";

                return new WorkflowSummary
                {
                    Name = name,
                    Namespace = w.Metadata?.Namespace ?? "default",
                    Description = w.Spec.Description ?? "",
                    TaskCount = w.Spec.Tasks?.Count ?? 0,
                    InputSchemaPreview = inputPreview,
                    Endpoint = $"/api/v1/workflows/{name}/execute",
                    Stats = stats != null ? new WorkflowSummaryStats
                    {
                        TotalExecutions = stats.TotalExecutions,
                        SuccessRate = stats.SuccessRate,
                        AvgDurationMs = stats.AverageDurationMs,
                        LastExecuted = stats.LastExecuted
                    } : null
                };
            }).ToList();

        var response = new WorkflowListResponse
        {
            Workflows = workflowSummaries,
            Total = totalCount,
            Skip = skip,
            Take = take
        };

        return Ok(response);
    }

    /// <summary>
    /// Get list of all available workflow tasks
    /// </summary>
    /// <param name="namespace">Optional namespace filter</param>
    /// <param name="search">Optional search term to filter by name</param>
    /// <param name="skip">Number of records to skip (for pagination)</param>
    /// <param name="take">Number of records to take (for pagination, defaults to 50)</param>
    /// <returns>List of tasks with metadata and stats</returns>
    [HttpGet("tasks")]
    [ProducesResponseType(typeof(TaskListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTasks(
        [FromQuery] string? @namespace = null,
        [FromQuery] string? search = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        var tasks = await _discoveryService.DiscoverTasksAsync(@namespace);
        var allTaskStats = await _executionRepository.GetAllTaskStatisticsAsync();
        var allWorkflows = await _discoveryService.DiscoverWorkflowsAsync(@namespace);

        // Apply search filter if provided
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLowerInvariant();
            tasks = tasks.Where(t =>
                (t.Metadata?.Name?.ToLowerInvariant().Contains(searchLower) ?? false) ||
                (t.Spec.Type?.ToLowerInvariant().Contains(searchLower) ?? false)
            ).ToList();
        }

        var totalCount = tasks.Count;

        var taskSummaries = tasks
            .Skip(skip)
            .Take(take)
            .Select(t =>
            {
                var name = t.Metadata?.Name ?? "";
                allTaskStats.TryGetValue(name, out var stats);

                // Count workflows using this task
                var usedByWorkflows = allWorkflows
                    .Count(w => w.Spec.Tasks?.Any(task => task.TaskRef == name) ?? false);

                return new TaskSummary
                {
                    Name = name,
                    Namespace = t.Metadata?.Namespace ?? "default",
                    Type = t.Spec.Type,
                    Description = null, // Not available in WorkflowTaskSpec yet
                    Stats = new TaskSummaryStats
                    {
                        UsedByWorkflows = usedByWorkflows,
                        TotalExecutions = stats?.TotalExecutions ?? 0,
                        SuccessRate = stats?.SuccessRate ?? 0,
                        AvgDurationMs = stats?.AverageDurationMs ?? 0,
                        LastExecuted = stats?.LastExecuted
                    }
                };
            }).ToList();

        var response = new TaskListResponse
        {
            Tasks = taskSummaries,
            Total = totalCount,
            Skip = skip,
            Take = take
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

    /// <summary>
    /// Get detailed information about a specific task
    /// </summary>
    /// <param name="taskName">Name of the task</param>
    /// <param name="namespace">Optional namespace (defaults to 'default')</param>
    /// <returns>Detailed task information including schemas, HTTP config, and statistics</returns>
    [HttpGet("tasks/{taskName}")]
    [ProducesResponseType(typeof(TaskDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTaskDetail(string taskName, [FromQuery] string? @namespace = null)
    {
        var ns = @namespace ?? "default";

        // Get task from discovery service
        var task = await _discoveryService.GetTaskByNameAsync(taskName, ns);
        if (task == null)
        {
            return NotFound(new { message = $"Task '{taskName}' not found in namespace '{ns}'" });
        }

        // Build response with task details
        var response = new TaskDetailResponse
        {
            Name = task.Metadata?.Name ?? taskName,
            Namespace = task.Metadata?.Namespace ?? ns,
            Description = null,  // Not available in WorkflowTaskSpec
            InputSchema = task.Spec.InputSchema,
            OutputSchema = task.Spec.OutputSchema
        };

        // Add HTTP configuration if available
        if (task.Spec.Http != null)
        {
            response.HttpRequest = new HttpRequestConfig
            {
                Method = task.Spec.Http.Method,
                Url = task.Spec.Http.Url,
                Headers = task.Spec.Http.Headers ?? new Dictionary<string, string>(),
                BodyTemplate = task.Spec.Http.Body
            };
        }

        // Add retry policy if available (not currently in model, leaving as null)
        response.RetryPolicy = null;

        // Add timeout if available
        response.Timeout = task.Spec.Timeout;

        // Calculate statistics from execution history
        // Get execution stats from database
        var executionStats = await _executionRepository.GetTaskStatisticsAsync(taskName);

        // Count workflows using this task
        var allWorkflows = await _discoveryService.DiscoverWorkflowsAsync(ns);
        var workflowsUsingTask = allWorkflows
            .Count(w => w.Spec.Tasks?.Any(t => t.TaskRef == taskName) ?? false);

        response.Stats = new TaskStats
        {
            UsedByWorkflows = workflowsUsingTask,
            TotalExecutions = executionStats?.TotalExecutions ?? 0,
            AvgDurationMs = executionStats?.AverageDurationMs ?? 0,
            SuccessRate = executionStats?.SuccessRate ?? 0,
            LastExecuted = executionStats?.LastExecuted
        };

        return Ok(response);
    }

    /// <summary>
    /// Get workflows that use a specific task
    /// </summary>
    /// <param name="taskName">Name of the task</param>
    /// <param name="namespace">Optional namespace (defaults to 'default')</param>
    /// <param name="skip">Number of records to skip (for pagination)</param>
    /// <param name="take">Number of records to take (for pagination, defaults to 20)</param>
    /// <returns>List of workflows using this task</returns>
    [HttpGet("tasks/{taskName}/usage")]
    [ProducesResponseType(typeof(TaskUsageListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTaskUsage(
        string taskName,
        [FromQuery] string? @namespace = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20)
    {
        var ns = @namespace ?? "default";

        // Check if task exists
        var task = await _discoveryService.GetTaskByNameAsync(taskName, ns);
        if (task == null)
        {
            return NotFound(new { message = $"Task '{taskName}' not found in namespace '{ns}'" });
        }

        // Get all workflows in namespace
        var allWorkflows = await _discoveryService.DiscoverWorkflowsAsync(ns);

        // Filter workflows that use this task and count usage
        var workflowsUsingTask = allWorkflows
            .Select(w => new
            {
                Workflow = w,
                TaskCount = w.Spec.Tasks?.Count(t => t.TaskRef == taskName) ?? 0
            })
            .Where(x => x.TaskCount > 0)
            .Select(x => new TaskUsageItem
            {
                WorkflowName = x.Workflow.Metadata?.Name ?? "",
                WorkflowNamespace = x.Workflow.Metadata?.Namespace ?? ns,
                TaskCount = x.TaskCount,
                LastExecuted = null // TODO: Implement when execution history is available
            })
            .ToList();

        // Apply pagination
        var totalCount = workflowsUsingTask.Count;
        var paginatedWorkflows = workflowsUsingTask
            .Skip(skip)
            .Take(take)
            .ToList();

        var response = new TaskUsageListResponse
        {
            TaskName = taskName,
            Workflows = paginatedWorkflows,
            TotalCount = totalCount,
            Skip = skip,
            Take = take
        };

        return Ok(response);
    }

    /// <summary>
    /// Get execution history for a specific task across all workflows
    /// </summary>
    /// <param name="taskName">Name of the task</param>
    /// <param name="namespace">Optional namespace (defaults to 'default')</param>
    /// <param name="skip">Number of records to skip (for pagination)</param>
    /// <param name="take">Number of records to take (for pagination, defaults to 20)</param>
    /// <returns>List of task executions with average duration</returns>
    [HttpGet("tasks/{taskName}/executions")]
    [ProducesResponseType(typeof(TaskExecutionListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTaskExecutions(
        string taskName,
        [FromQuery] string? @namespace = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20)
    {
        var ns = @namespace ?? "default";

        // Check if task exists
        var task = await _discoveryService.GetTaskByNameAsync(taskName, ns);
        if (task == null)
        {
            return NotFound(new { message = $"Task '{taskName}' not found in namespace '{ns}'" });
        }

        // Get task executions from repository
        var executions = await _executionRepository.GetTaskExecutionsAsync(taskName, skip, take);

        // Calculate average duration
        var averageDurationMs = executions.Any()
            ? (long)executions.Average(e => e.Task.Duration?.TotalMilliseconds ?? 0)
            : 0;

        // Map to response items
        var executionItems = executions.Select(e =>
        {
            // Parse task status to ExecutionStatus enum
            var status = ExecutionStatus.Running; // Default
            if (!string.IsNullOrEmpty(e.Task.Status))
            {
                if (Enum.TryParse<ExecutionStatus>(e.Task.Status, ignoreCase: true, out var parsedStatus))
                {
                    status = parsedStatus;
                }
            }

            return new TaskExecutionItem
            {
                ExecutionId = e.Execution.Id.ToString(),
                WorkflowName = e.Execution.WorkflowName ?? "",
                WorkflowNamespace = ns,
                Status = status,
                DurationMs = (long)(e.Task.Duration?.TotalMilliseconds ?? 0),
                StartedAt = e.Task.StartedAt,
                Error = string.IsNullOrEmpty(e.Task.Errors) ? null : e.Task.Errors
            };
        }).ToList();

        var response = new TaskExecutionListResponse
        {
            TaskName = taskName,
            Executions = executionItems,
            AverageDurationMs = averageDurationMs,
            TotalCount = executionItems.Count(),
            Skip = skip,
            Take = take
        };

        return Ok(response);
    }

    /// <summary>
    /// Execute a task standalone (without a workflow)
    /// </summary>
    /// <param name="taskName">Name of the task to execute</param>
    /// <param name="request">Task execution request with input data</param>
    /// <param name="namespace">Optional namespace (defaults to 'default')</param>
    /// <returns>Task execution result with output and status</returns>
    [HttpPost("tasks/{taskName}/execute")]
    [ProducesResponseType(typeof(TaskExecutionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExecuteTask(
        string taskName,
        [FromBody] TaskExecutionRequest request,
        [FromQuery] string? @namespace = null)
    {
        var ns = @namespace ?? "default";

        // Check if task exists
        var task = await _discoveryService.GetTaskByNameAsync(taskName, ns);
        if (task == null)
        {
            return NotFound(new { message = $"Task '{taskName}' not found in namespace '{ns}'" });
        }

        // Create template context with input data
        var context = new TemplateContext
        {
            Input = request.Input ?? new Dictionary<string, object>()
        };

        // Execute the task
        var startedAt = DateTime.UtcNow;
        var result = await _taskExecutor.ExecuteAsync(task.Spec, context, HttpContext?.RequestAborted ?? default);

        // Map to response
        var response = new TaskExecutionResponse
        {
            ExecutionId = Guid.NewGuid().ToString(),
            TaskName = taskName,
            Status = result.Success ? ExecutionStatus.Succeeded : ExecutionStatus.Failed,
            DurationMs = (long)result.Duration.TotalMilliseconds,
            StartedAt = startedAt,
            CompletedAt = startedAt.Add(result.Duration),
            Output = result.Output,
            Error = result.Errors.Any() ? string.Join("; ", result.Errors) : null
        };

        return Ok(response);
    }

    /// <summary>
    /// Get duration trends for a workflow over the last N days
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="daysBack">Number of days to look back (default: 30, max: 90)</param>
    /// <returns>Time-series data points with duration statistics</returns>
    [HttpGet("workflows/{workflowName}/duration-trends")]
    [ProducesResponseType(typeof(DurationTrendsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetWorkflowDurationTrends(
        string workflowName,
        [FromQuery] int daysBack = 30)
    {
        // Validate daysBack parameter
        if (daysBack < 1 || daysBack > 90)
        {
            return BadRequest(new { error = "daysBack must be between 1 and 90" });
        }

        // Check if workflow exists
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName, null);
        if (workflow == null)
        {
            return NotFound(new { error = $"Workflow '{workflowName}' not found" });
        }

        // Get duration trends from repository
        var dataPoints = await _executionRepository.GetWorkflowDurationTrendsAsync(workflowName, daysBack);

        var response = new DurationTrendsResponse
        {
            EntityType = "Workflow",
            EntityName = workflowName,
            DaysBack = daysBack,
            DataPoints = dataPoints
        };

        return Ok(response);
    }

    /// <summary>
    /// Get duration trends for a task over the last N days (across all workflows)
    /// </summary>
    /// <param name="taskName">Name of the task</param>
    /// <param name="daysBack">Number of days to look back (default: 30, max: 90)</param>
    /// <returns>Time-series data points with duration statistics</returns>
    [HttpGet("tasks/{taskName}/duration-trends")]
    [ProducesResponseType(typeof(DurationTrendsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetTaskDurationTrends(
        string taskName,
        [FromQuery] int daysBack = 30)
    {
        // Validate daysBack parameter
        if (daysBack < 1 || daysBack > 90)
        {
            return BadRequest(new { error = "daysBack must be between 1 and 90" });
        }

        // Check if task exists
        var task = await _discoveryService.GetTaskByNameAsync(taskName, null);
        if (task == null)
        {
            return NotFound(new { error = $"Task '{taskName}' not found" });
        }

        // Get duration trends from repository
        var dataPoints = await _executionRepository.GetTaskDurationTrendsAsync(taskName, daysBack);

        var response = new DurationTrendsResponse
        {
            EntityType = "Task",
            EntityName = taskName,
            DaysBack = daysBack,
            DataPoints = dataPoints
        };

        return Ok(response);
    }

    /// <summary>
    /// Validate input for a workflow without executing it.
    /// Useful for MCP consumers to check if they have all required inputs.
    /// Stage 15: MCP Server for External Workflow Consumption
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="request">Input validation request containing the input to validate</param>
    /// <param name="namespace">Optional namespace (defaults to 'default')</param>
    /// <returns>Validation result with missing/invalid inputs and suggested prompt</returns>
    [HttpPost("workflows/{workflowName}/validate-input")]
    [ProducesResponseType(typeof(InputValidationResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ValidateWorkflowInput(
        string workflowName,
        [FromBody] ValidateInputRequest request,
        [FromQuery] string? @namespace = null)
    {
        var ns = @namespace ?? "default";

        // Check if workflow exists
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName, ns);
        if (workflow == null)
        {
            return NotFound(new { message = $"Workflow '{workflowName}' not found in namespace '{ns}'" });
        }

        // Validate input
        var result = _inputValidator.ValidateInput(workflow, request.Input);

        return Ok(result);
    }
}
