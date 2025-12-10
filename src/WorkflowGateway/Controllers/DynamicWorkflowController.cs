using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text.Json;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Core controller for workflow execution and testing.
/// Provides endpoints to execute workflows synchronously, test workflows in dry-run mode,
/// validate inputs, and retrieve workflow details. This is the primary API for interacting
/// with deployed workflows.
/// </summary>
[ApiController]
[Route("api/v1/workflows")]
public class DynamicWorkflowController : ControllerBase
{
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly IInputValidationService _validationService;
    private readonly IWorkflowExecutionService _executionService;
    private readonly IExecutionGraphBuilder _graphBuilder;
    private readonly IExecutionRepository _executionRepository;
    private readonly ITemplatePreviewService _templatePreviewService;
    private readonly IWorkflowYamlParser _yamlParser;

    public DynamicWorkflowController(
        IWorkflowDiscoveryService discoveryService,
        IInputValidationService validationService,
        IWorkflowExecutionService executionService,
        IExecutionGraphBuilder graphBuilder,
        IExecutionRepository executionRepository,
        ITemplatePreviewService templatePreviewService,
        IWorkflowYamlParser yamlParser)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _validationService = validationService ?? throw new ArgumentNullException(nameof(validationService));
        _executionService = executionService ?? throw new ArgumentNullException(nameof(executionService));
        _graphBuilder = graphBuilder ?? throw new ArgumentNullException(nameof(graphBuilder));
        _executionRepository = executionRepository ?? throw new ArgumentNullException(nameof(executionRepository));
        _templatePreviewService = templatePreviewService ?? throw new ArgumentNullException(nameof(templatePreviewService));
        _yamlParser = yamlParser ?? throw new ArgumentNullException(nameof(yamlParser));
    }

    /// <summary>
    /// Execute a workflow synchronously with the provided input.
    /// This is the primary endpoint for triggering workflow execution. The workflow runs
    /// immediately and the response contains the complete execution result including
    /// all task outputs and any errors encountered.
    /// </summary>
    /// <param name="workflowName">Name of the workflow to execute (must exist in Kubernetes).</param>
    /// <param name="request">Execution request containing the input data matching the workflow's input schema.</param>
    /// <param name="namespace">Optional Kubernetes namespace. Defaults to 'default' if not specified.</param>
    /// <param name="cancellationToken">Cancellation token to abort the execution.</param>
    /// <returns>
    /// On success (200): Complete execution result with outputs from all tasks.
    /// On upstream failure (502): Execution failed due to task errors (includes partial results).
    /// On not found (404): Workflow does not exist.
    /// On validation error (400): Input does not match the workflow's schema.
    /// </returns>
    /// <remarks>
    /// Execution is synchronous with a configurable timeout (default 30 seconds).
    /// For long-running operations, consider using async patterns or webhooks.
    /// </remarks>
    [HttpPost("{workflowName}/execute")]
    [ProducesResponseType(typeof(WorkflowExecutionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(WorkflowExecutionResponse), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Execute(
        string workflowName,
        [FromBody] WorkflowExecutionRequest request,
        [FromQuery] string? @namespace = null,
        CancellationToken cancellationToken = default)
    {
        // Get workflow from Kubernetes
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName, @namespace);
        if (workflow == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Workflow not found",
                Detail = $"Workflow '{workflowName}' does not exist in namespace '{@namespace ?? "default"}'",
                Status = StatusCodes.Status404NotFound
            });
        }

        // Validate input against workflow schema
        var validationResult = await _validationService.ValidateAsync(workflow, request.Input);
        if (!validationResult.IsValid)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Input validation failed",
                Detail = string.Join("; ", validationResult.Errors.Select(e => e.Message)),
                Status = StatusCodes.Status400BadRequest
            });
        }

        // Execute workflow
        var result = await _executionService.ExecuteAsync(workflow, request.Input, cancellationToken);

        // Return appropriate status code based on execution success
        if (result.Success)
        {
            return Ok(result);
        }
        else
        {
            // Return 502 Bad Gateway for failed executions (upstream service failures)
            return StatusCode(StatusCodes.Status502BadGateway, result);
        }
    }

    /// <summary>
    /// Test a workflow in dry-run mode without actually executing it.
    /// Validates the input against the workflow schema, builds the execution graph,
    /// and returns a preview of what would be executed including template resolution.
    /// </summary>
    /// <param name="workflowName">Name of the workflow to test.</param>
    /// <param name="request">Test request containing the input data to validate.</param>
    /// <param name="namespace">Optional Kubernetes namespace. Defaults to 'default' if not specified.</param>
    /// <returns>
    /// Validation results including:
    /// - Whether the input is valid
    /// - Any validation errors
    /// - The execution plan with parallel groups and task order
    /// - Estimated duration based on historical data
    /// - Template previews showing resolved values
    /// - Graph build duration for performance monitoring
    /// </returns>
    /// <remarks>
    /// Use this endpoint to preview workflow execution before committing,
    /// validate inputs during development, or benchmark graph build performance.
    /// </remarks>
    [HttpPost("{workflowName}/test")]
    [ProducesResponseType(typeof(WorkflowTestResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Test(
        string workflowName,
        [FromBody] WorkflowTestRequest request,
        [FromQuery] string? @namespace = null)
    {
        // Get workflow from Kubernetes
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName, @namespace);
        if (workflow == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Workflow not found",
                Detail = $"Workflow '{workflowName}' does not exist in namespace '{@namespace ?? "default"}'",
                Status = StatusCodes.Status404NotFound
            });
        }

        // Validate input against workflow schema
        var validationResult = await _validationService.ValidateAsync(workflow, request.Input);

        // Build enhanced execution plan (without executing)
        EnhancedExecutionPlan? executionPlan = null;
        var validationErrors = new List<string>();
        long? graphBuildDurationMs = null;

        if (!validationResult.IsValid)
        {
            validationErrors.AddRange(validationResult.Errors.Select(e => e.Message));
        }

        // Always time graph build if workflow has tasks (regardless of input validation)
        // This allows benchmarking graph build performance without needing valid input
        if (workflow.Spec.Tasks?.Any() == true)
        {
            try
            {
                // Time the graph build operation
                var graphBuildStopwatch = Stopwatch.StartNew();
                var graphResult = _graphBuilder.Build(workflow);
                graphBuildStopwatch.Stop();
                graphBuildDurationMs = graphBuildStopwatch.ElapsedMilliseconds;

                // Only build full execution plan if input validation passed and graph is valid
                if (validationResult.IsValid && graphResult.IsValid && graphResult.Graph != null)
                {
                    var graph = graphResult.Graph;
                    var parallelGroups = graph.GetParallelGroups();

                    // Build task level lookup from parallel groups
                    var taskLevels = new Dictionary<string, int>();
                    foreach (var group in parallelGroups)
                    {
                        foreach (var taskId in group.TaskIds)
                        {
                            taskLevels[taskId] = group.Level;
                        }
                    }

                    // Build nodes with level information
                    var nodes = new List<GraphNode>();
                    foreach (var taskId in graph.Nodes)
                    {
                        var taskStep = workflow.Spec.Tasks?.FirstOrDefault(t => t.Id == taskId);
                        nodes.Add(new GraphNode
                        {
                            Id = taskId,
                            TaskRef = taskStep?.TaskRef ?? "",
                            Level = taskLevels.ContainsKey(taskId) ? taskLevels[taskId] : 0
                        });
                    }

                    // Build edges from dependencies
                    var edges = new List<GraphEdge>();
                    foreach (var taskId in graph.Nodes)
                    {
                        var dependencies = graph.GetDependencies(taskId);
                        foreach (var dependency in dependencies)
                        {
                            edges.Add(new GraphEdge
                            {
                                Source = dependency,  // Arrow starts at prerequisite
                                Target = taskId       // Arrow points to dependent
                            });
                        }
                    }

                    // Get historical task durations for time estimation
                    var historicalDurations = await _executionRepository.GetAverageTaskDurationsAsync(workflowName, 30);

                    // Calculate estimated total duration by summing average durations
                    long? estimatedDurationMs = null;
                    if (historicalDurations.Any())
                    {
                        estimatedDurationMs = historicalDurations.Values.Sum();
                    }

                    // Generate template previews for each task
                    var templatePreviews = new Dictionary<string, Dictionary<string, string>>();
                    var inputElement = JsonSerializer.SerializeToElement(request.Input);

                    foreach (var taskStep in workflow.Spec.Tasks ?? Enumerable.Empty<WorkflowTaskStep>())
                    {
                        var taskPreviews = new Dictionary<string, string>();

                        // Preview each input template for this task
                        foreach (var inputKvp in taskStep.Input)
                        {
                            var templatePreview = _templatePreviewService.PreviewTemplate(inputKvp.Value, inputElement);
                            foreach (var previewKvp in templatePreview)
                            {
                                taskPreviews[previewKvp.Key] = previewKvp.Value;
                            }
                        }

                        templatePreviews[taskStep.Id] = taskPreviews;
                    }

                    executionPlan = new EnhancedExecutionPlan
                    {
                        Nodes = nodes,
                        Edges = edges,
                        ParallelGroups = parallelGroups,
                        ExecutionOrder = graph.GetExecutionOrder(),
                        ValidationResult = validationResult,
                        EstimatedDurationMs = estimatedDurationMs,
                        TemplatePreviews = templatePreviews
                    };
                }
                else if (!graphResult.IsValid)
                {
                    // Only add graph errors if graph build actually failed (not input validation)
                    validationErrors.AddRange(graphResult.Errors.Select(e => e.Message));
                }
            }
            catch (Exception ex)
            {
                validationErrors.Add($"Failed to build execution plan: {ex.Message}");
            }
        }

        return Ok(new WorkflowTestResponse
        {
            Valid = validationErrors.Count == 0,
            ValidationErrors = validationErrors,
            ExecutionPlan = executionPlan,
            GraphBuildDurationMs = graphBuildDurationMs
        });
    }

    /// <summary>
    /// Execute a workflow definition directly from YAML without deploying to Kubernetes.
    /// Ideal for testing workflows during development before committing to version control.
    /// The workflow is parsed, validated, and executed in a single request.
    /// </summary>
    /// <param name="request">Request containing the complete workflow YAML definition and input data.</param>
    /// <param name="namespace">Optional namespace for task discovery. Defaults to 'default'. Required tasks must exist.</param>
    /// <param name="cancellationToken">Cancellation token to abort the execution.</param>
    /// <returns>
    /// Full execution results including:
    /// - Success/failure status
    /// - Validation errors (if any)
    /// - Task outputs and execution details
    /// - Execution time in milliseconds
    /// </returns>
    /// <remarks>
    /// Important: While the workflow definition doesn't need to be deployed,
    /// all tasks referenced via taskRef must already exist in Kubernetes.
    /// Use this for rapid iteration during workflow development.
    /// </remarks>
    [HttpPost("test-execute")]
    [ProducesResponseType(typeof(TestExecuteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(TestExecuteResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(TestExecuteResponse), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(typeof(TestExecuteResponse), StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> TestExecute(
        [FromBody] TestExecuteRequest request,
        [FromQuery] string? @namespace = null,
        CancellationToken cancellationToken = default)
    {
        var validationErrors = new List<string>();

        // Parse YAML into WorkflowResource
        WorkflowCore.Models.WorkflowResource workflow;
        try
        {
            workflow = _yamlParser.Parse(request.WorkflowYaml);
        }
        catch (YamlParseException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid workflow YAML",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest
            });
        }

        // Set namespace if not specified in YAML
        if (workflow.Metadata != null && string.IsNullOrEmpty(workflow.Metadata.Namespace))
        {
            workflow.Metadata.Namespace = @namespace ?? "default";
        }

        // Validate input against workflow schema
        var inputValidation = await _validationService.ValidateAsync(workflow, request.Input);
        if (!inputValidation.IsValid)
        {
            validationErrors.AddRange(inputValidation.Errors.Select(e => e.Message));
        }

        // Validate execution graph
        if (workflow.Spec?.Tasks?.Any() == true)
        {
            var graphResult = _graphBuilder.Build(workflow);
            if (!graphResult.IsValid)
            {
                validationErrors.AddRange(graphResult.Errors.Select(e => e.Message));
            }
        }
        else
        {
            validationErrors.Add("Workflow must have at least one task");
        }

        // Return early if validation fails
        if (validationErrors.Any())
        {
            return BadRequest(new TestExecuteResponse
            {
                Success = false,
                WorkflowName = workflow.Metadata?.Name ?? "",
                ValidationErrors = validationErrors,
                Error = "Validation failed: " + string.Join("; ", validationErrors)
            });
        }

        // Execute the workflow
        try
        {
            var result = await _executionService.ExecuteAsync(workflow, request.Input, cancellationToken);

            var response = new TestExecuteResponse
            {
                Success = result.Success,
                WorkflowName = result.WorkflowName,
                Output = result.Output,
                ExecutedTasks = result.ExecutedTasks,
                TaskDetails = result.TaskDetails,
                ExecutionTimeMs = result.ExecutionTimeMs,
                Error = result.Error,
                ValidationErrors = validationErrors
            };

            // Return appropriate status code based on execution success
            if (result.Success)
            {
                return Ok(response);
            }
            else
            {
                return StatusCode(StatusCodes.Status502BadGateway, response);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new TestExecuteResponse
            {
                Success = false,
                WorkflowName = workflow.Metadata?.Name ?? "",
                ValidationErrors = validationErrors,
                Error = $"Execution failed: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Get detailed information about a specific workflow including its input/output schemas and tasks.
    /// Use this to discover what inputs a workflow requires and what outputs it produces.
    /// </summary>
    /// <param name="workflowName">Name of the workflow to retrieve details for.</param>
    /// <param name="namespace">Optional Kubernetes namespace. Defaults to 'default' if not specified.</param>
    /// <returns>
    /// Complete workflow details including:
    /// - Name and namespace
    /// - Input schema (required and optional parameters with types)
    /// - Output schema (what the workflow produces)
    /// - List of tasks with their configurations
    /// - API endpoint URLs for execution and testing
    /// Returns 404 if workflow not found.
    /// </returns>
    [HttpGet("{workflowName}")]
    [ProducesResponseType(typeof(WorkflowDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDetails(
        string workflowName,
        [FromQuery] string? @namespace = null)
    {
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName, @namespace);
        if (workflow == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Workflow not found",
                Detail = $"Workflow '{workflowName}' does not exist in namespace '{@namespace ?? "default"}'",
                Status = StatusCodes.Status404NotFound
            });
        }

        // Convert WorkflowInputParameter dictionary to SchemaDefinition
        SchemaDefinition? inputSchema = null;
        if (workflow.Spec.Input != null && workflow.Spec.Input.Any())
        {
            inputSchema = new SchemaDefinition
            {
                Type = "object",
                Properties = workflow.Spec.Input.ToDictionary(
                    kvp => kvp.Key,
                    kvp => new PropertyDefinition
                    {
                        Type = kvp.Value.Type,
                        Description = kvp.Value.Description
                    })
            };
        }

        var response = new WorkflowDetailResponse
        {
            Name = workflow.Metadata?.Name ?? "",
            Namespace = workflow.Metadata?.Namespace ?? "default",
            InputSchema = inputSchema,
            OutputSchema = workflow.Spec.Output?.ToDictionary(k => k.Key, v => (object)v.Value),
            Tasks = workflow.Spec.Tasks?.ToList() ?? new List<WorkflowTaskStep>(),
            Endpoints = new WorkflowEndpoints
            {
                Execute = $"/api/v1/workflows/{workflowName}/execute",
                Test = $"/api/v1/workflows/{workflowName}/test",
                Details = $"/api/v1/workflows/{workflowName}"
            }
        };

        return Ok(response);
    }

    /// <summary>
    /// List execution history for a specific workflow with filtering and pagination.
    /// Returns a summary of past executions ordered by start time (most recent first).
    /// </summary>
    /// <param name="workflowName">Name of the workflow to list executions for.</param>
    /// <param name="namespace">Optional Kubernetes namespace filter.</param>
    /// <param name="status">Optional status filter: Running, Succeeded, Failed, or Cancelled.</param>
    /// <param name="skip">Number of records to skip for pagination. Default: 0.</param>
    /// <param name="take">Number of records to return per page. Default: 50, Maximum: 100.</param>
    /// <returns>
    /// Paginated list of execution summaries including:
    /// - Execution ID
    /// - Status
    /// - Start and completion timestamps
    /// - Duration in milliseconds
    /// Also includes total count and pagination info.
    /// Returns 404 if workflow not found.
    /// </returns>
    [HttpGet("{workflowName}/executions")]
    [ProducesResponseType(typeof(ExecutionListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ListExecutions(
        string workflowName,
        [FromQuery] string? @namespace = null,
        [FromQuery] string? status = null,
        [FromQuery] int? skip = null,
        [FromQuery] int? take = null)
    {
        // Verify workflow exists
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName, @namespace);
        if (workflow == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Workflow not found",
                Detail = $"Workflow '{workflowName}' does not exist in namespace '{@namespace ?? "default"}'",
                Status = StatusCodes.Status404NotFound
            });
        }

        // Apply defaults for pagination
        var skipValue = skip ?? 0;
        var takeValue = Math.Min(take ?? 50, 100); // Default 50, max 100

        // Parse status filter
        ExecutionStatus? statusFilter = null;
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ExecutionStatus>(status, out var parsedStatus))
        {
            statusFilter = parsedStatus;
        }

        // Fetch executions from repository
        var executions = await _executionRepository.ListExecutionsAsync(
            workflowName,
            statusFilter,
            skipValue,
            takeValue);

        // Map to ExecutionSummary
        var summaries = executions.Select(e => new ExecutionSummary
        {
            Id = e.Id,
            WorkflowName = e.WorkflowName,
            Status = e.Status.ToString(),
            StartedAt = e.StartedAt,
            CompletedAt = e.CompletedAt,
            DurationMs = e.Duration.HasValue ? (long?)e.Duration.Value.TotalMilliseconds : null
        }).ToList();

        var response = new ExecutionListResponse
        {
            WorkflowName = workflowName,
            Executions = summaries,
            TotalCount = summaries.Count(),
            Skip = skipValue,
            Take = takeValue
        };

        return Ok(response);
    }
}
