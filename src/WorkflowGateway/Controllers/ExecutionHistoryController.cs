using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

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

    [HttpGet("workflows/{workflowName}/list")]
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

    [HttpGet("{id}")]
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

    [HttpGet("{id}/trace")]
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
