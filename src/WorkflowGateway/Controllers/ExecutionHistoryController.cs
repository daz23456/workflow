using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for accessing workflow execution history and traces.
/// Provides detailed information about past executions including status, duration,
/// task-level details, inputs/outputs, and execution traces for debugging.
/// </summary>
[ApiController]
[Route("api/v1/executions")]
public class ExecutionHistoryController : ControllerBase
{
    private readonly IExecutionRepository _executionRepository;
    private readonly IWorkflowDiscoveryService _workflowDiscoveryService;
    private readonly IExecutionTraceService _traceService;

    public ExecutionHistoryController(
        IExecutionRepository executionRepository,
        IWorkflowDiscoveryService workflowDiscoveryService,
        IExecutionTraceService traceService)
    {
        _executionRepository = executionRepository ?? throw new ArgumentNullException(nameof(executionRepository));
        _workflowDiscoveryService = workflowDiscoveryService ?? throw new ArgumentNullException(nameof(workflowDiscoveryService));
        _traceService = traceService ?? throw new ArgumentNullException(nameof(traceService));
    }

    /// <summary>
    /// List execution history for a specific workflow with optional filtering and pagination.
    /// Returns a summary of each execution including ID, status, timestamps, and duration.
    /// </summary>
    /// <param name="workflowName">The name of the workflow to list executions for.</param>
    /// <param name="status">Optional status filter. Valid values: Running, Succeeded, Failed, Cancelled.</param>
    /// <param name="skip">Number of records to skip for pagination. Default: 0.</param>
    /// <param name="take">Number of records to return. Default: 20, Max: 100.</param>
    /// <returns>
    /// A paginated list of execution summaries for the specified workflow,
    /// ordered by start time descending (most recent first).
    /// </returns>
    [HttpGet("workflows/{workflowName}/list")]
    [ProducesResponseType(typeof(ExecutionListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListExecutions(
        string workflowName,
        [FromQuery] ExecutionStatus? status = null,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20)
    {
        var executions = await _executionRepository.ListExecutionsAsync(workflowName, status, skip, take);

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
            TotalCount = summaries.Count,
            Skip = skip,
            Take = take
        };

        return Ok(response);
    }

    /// <summary>
    /// Get detailed information about a specific workflow execution.
    /// Includes complete task-level details with inputs, outputs, timing, and error information.
    /// </summary>
    /// <param name="id">The unique execution ID (GUID) returned when the workflow was executed.</param>
    /// <returns>
    /// Full execution details including workflow name, status, timestamps, duration,
    /// graph build time, input snapshot, and detailed task execution records.
    /// Returns 404 if execution not found.
    /// </returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(DetailedWorkflowExecutionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetExecutionDetails(Guid id)
    {
        var execution = await _executionRepository.GetExecutionAsync(id);

        if (execution == null)
        {
            return NotFound(new { error = $"Execution {id} not found" });
        }

        var response = new DetailedWorkflowExecutionResponse
        {
            ExecutionId = execution.Id,
            WorkflowName = execution.WorkflowName,
            Status = execution.Status.ToString(),
            StartedAt = execution.StartedAt,
            CompletedAt = execution.CompletedAt,
            DurationMs = execution.Duration.HasValue ? (long?)execution.Duration.Value.TotalMilliseconds : null,
            GraphBuildDurationMs = execution.GraphBuildDuration.HasValue ? (long?)execution.GraphBuildDuration.Value.TotalMilliseconds : null,
            Input = DeserializeInputSnapshot(execution.InputSnapshot),
            Tasks = MapTaskExecutionDetails(execution.TaskExecutionRecords)
        };

        return Ok(response);
    }

    private Dictionary<string, object> DeserializeInputSnapshot(string? inputSnapshot)
    {
        if (string.IsNullOrEmpty(inputSnapshot))
        {
            return new Dictionary<string, object>();
        }

        try
        {
            var deserialized = JsonSerializer.Deserialize<Dictionary<string, object>>(inputSnapshot);
            return deserialized ?? new Dictionary<string, object>();
        }
        catch (JsonException)
        {
            // Return empty dictionary if JSON is invalid
            return new Dictionary<string, object>();
        }
    }

    private List<TaskExecutionDetail> MapTaskExecutionDetails(List<TaskExecutionRecord> taskRecords)
    {
        var details = new List<TaskExecutionDetail>();

        foreach (var record in taskRecords)
        {
            var detail = new TaskExecutionDetail
            {
                TaskId = record.TaskId,
                TaskRef = record.TaskRef,
                Success = record.Status == "Succeeded",
                Output = DeserializeOutput(record.Output),
                Errors = DeserializeErrors(record.Errors),
                RetryCount = record.RetryCount,
                DurationMs = record.Duration.HasValue ? (long)record.Duration.Value.TotalMilliseconds : 0,
                StartedAt = record.StartedAt,
                CompletedAt = record.CompletedAt ?? record.StartedAt
            };

            details.Add(detail);
        }

        return details;
    }

    private Dictionary<string, object>? DeserializeOutput(string? outputJson)
    {
        if (string.IsNullOrEmpty(outputJson))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, object>>(outputJson);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private List<string> DeserializeErrors(string? errorsJson)
    {
        if (string.IsNullOrEmpty(errorsJson))
        {
            return new List<string>();
        }

        try
        {
            var errors = JsonSerializer.Deserialize<List<string>>(errorsJson);
            return errors ?? new List<string>();
        }
        catch (JsonException)
        {
            return new List<string>();
        }
    }

    /// <summary>
    /// Get the execution trace for a workflow execution.
    /// The trace provides a visual representation of the execution flow including
    /// task dependencies, parallel execution groups, and timing information.
    /// Useful for debugging and understanding workflow execution patterns.
    /// </summary>
    /// <param name="id">The unique execution ID (GUID) to get the trace for.</param>
    /// <returns>
    /// An execution trace containing nodes (tasks) and edges (dependencies),
    /// with timing and status information for each task.
    /// Returns 404 if execution or workflow definition not found.
    /// </returns>
    [HttpGet("{id}/trace")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTrace(Guid id)
    {
        var execution = await _executionRepository.GetExecutionAsync(id);

        if (execution == null)
        {
            return NotFound(new { error = $"Execution {id} not found" });
        }

        var workflow = await _workflowDiscoveryService.GetWorkflowByNameAsync(execution.WorkflowName, null);

        if (workflow == null)
        {
            return NotFound(new { error = $"Workflow definition '{execution.WorkflowName}' not found" });
        }

        var trace = _traceService.BuildTrace(execution, workflow);

        return Ok(trace);
    }
}
