using Microsoft.AspNetCore.Mvc;
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

    public DynamicWorkflowController(
        IWorkflowDiscoveryService discoveryService,
        IInputValidationService validationService,
        IWorkflowExecutionService executionService,
        IExecutionGraphBuilder graphBuilder,
        IExecutionRepository executionRepository)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _validationService = validationService ?? throw new ArgumentNullException(nameof(validationService));
        _executionService = executionService ?? throw new ArgumentNullException(nameof(executionService));
        _graphBuilder = graphBuilder ?? throw new ArgumentNullException(nameof(graphBuilder));
        _executionRepository = executionRepository ?? throw new ArgumentNullException(nameof(executionRepository));
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

        // Build execution plan (without executing)
        ExecutionPlan? executionPlan = null;
        var validationErrors = new List<string>();

        if (!validationResult.IsValid)
        {
            validationErrors.AddRange(validationResult.Errors.Select(e => e.Message));
        }

        if (validationResult.IsValid && workflow.Spec.Tasks?.Any() == true)
        {
            try
            {
                var graphResult = _graphBuilder.Build(workflow);

                if (graphResult.IsValid && graphResult.Graph != null)
                {
                    executionPlan = new ExecutionPlan
                    {
                        TaskOrder = graphResult.Graph.GetExecutionOrder(),
                        Parallelizable = new List<string>() // TODO: Implement parallel task detection
                    };
                }
                else
                {
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
            ExecutionPlan = executionPlan
        });
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
