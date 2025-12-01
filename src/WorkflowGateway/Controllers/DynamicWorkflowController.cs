using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text.Json;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

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
    /// Execute a workflow with the provided input
    /// </summary>
    /// <param name="workflowName">Name of the workflow to execute</param>
    /// <param name="request">Execution request with input data</param>
    /// <param name="namespace">Optional namespace (defaults to 'default')</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Workflow execution result</returns>
    [HttpPost("{workflowName}/execute")]
    [ProducesResponseType(typeof(WorkflowExecutionResponse), StatusCodes.Status200OK)]
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

        return Ok(result);
    }

    /// <summary>
    /// Test a workflow without executing it (dry-run mode)
    /// </summary>
    /// <param name="workflowName">Name of the workflow to test</param>
    /// <param name="request">Test request with input data</param>
    /// <param name="namespace">Optional namespace (defaults to 'default')</param>
    /// <returns>Validation results and execution plan</returns>
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
    /// Test-execute a workflow definition without deploying it to Kubernetes.
    /// This allows testing workflows directly from the builder before publishing.
    /// Note: Referenced tasks (taskRef) must exist in Kubernetes.
    /// </summary>
    /// <param name="request">Request containing workflow YAML and input data</param>
    /// <param name="namespace">Optional namespace for task discovery (defaults to 'default')</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Full execution results including task outputs</returns>
    [HttpPost("test-execute")]
    [ProducesResponseType(typeof(TestExecuteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
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
            return Ok(new TestExecuteResponse
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

            return Ok(new TestExecuteResponse
            {
                Success = result.Success,
                WorkflowName = result.WorkflowName,
                Output = result.Output,
                ExecutedTasks = result.ExecutedTasks,
                TaskDetails = result.TaskDetails,
                ExecutionTimeMs = result.ExecutionTimeMs,
                Error = result.Error,
                ValidationErrors = validationErrors
            });
        }
        catch (Exception ex)
        {
            return Ok(new TestExecuteResponse
            {
                Success = false,
                WorkflowName = workflow.Metadata?.Name ?? "",
                ValidationErrors = validationErrors,
                Error = $"Execution failed: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Get details for a specific workflow
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="namespace">Optional namespace filter</param>
    /// <returns>Workflow details including schema and endpoints</returns>
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
    /// List executions for a specific workflow
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="namespace">Optional namespace filter</param>
    /// <param name="status">Optional status filter (Running, Succeeded, Failed, Cancelled)</param>
    /// <param name="skip">Number of executions to skip (pagination)</param>
    /// <param name="take">Number of executions to return (page size, max 100)</param>
    /// <returns>List of execution summaries with pagination info</returns>
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
