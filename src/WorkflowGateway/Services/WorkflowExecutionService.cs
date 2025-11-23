using System.Diagnostics;
using System.Text.Json;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;

namespace WorkflowGateway.Services;

public interface IWorkflowExecutionService
{
    Task<WorkflowExecutionResponse> ExecuteAsync(
        WorkflowResource workflow,
        Dictionary<string, object> input,
        CancellationToken cancellationToken = default);
}

public class WorkflowExecutionService : IWorkflowExecutionService
{
    private readonly IWorkflowOrchestrator _orchestrator;
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly IExecutionRepository? _executionRepository;
    private readonly int _timeoutSeconds;

    public WorkflowExecutionService(
        IWorkflowOrchestrator orchestrator,
        IWorkflowDiscoveryService discoveryService,
        IExecutionRepository? executionRepository,
        int timeoutSeconds = 30)
    {
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _executionRepository = executionRepository;
        _timeoutSeconds = timeoutSeconds;
    }

    public async Task<WorkflowExecutionResponse> ExecuteAsync(
        WorkflowResource workflow,
        Dictionary<string, object> input,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var workflowName = workflow.Metadata?.Name ?? "unknown";
        var executionId = Guid.NewGuid();

        // Create initial execution record
        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = workflowName,
            Status = ExecutionStatus.Running,
            StartedAt = DateTime.UtcNow,
            InputSnapshot = JsonSerializer.Serialize(input)
        };

        // Save initial record (status: Running) if repository available
        if (_executionRepository != null)
        {
            await _executionRepository.SaveExecutionAsync(executionRecord);
        }

        try
        {
            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(_timeoutSeconds));
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);

            // Discover available tasks
            var taskNamespace = workflow.Metadata?.Namespace ?? "default";
            var availableTasksList = await _discoveryService.DiscoverTasksAsync(taskNamespace);
            var availableTasks = availableTasksList.ToDictionary(t => t.Metadata?.Name ?? "", t => t);

            var result = await _orchestrator.ExecuteAsync(workflow, availableTasks, input, linkedCts.Token);

            stopwatch.Stop();

            // Update execution record with completion status
            executionRecord.Status = result.Success ? ExecutionStatus.Succeeded : ExecutionStatus.Failed;
            executionRecord.CompletedAt = DateTime.UtcNow;
            executionRecord.Duration = stopwatch.Elapsed;

            // Map task execution results to TaskExecutionRecords
            executionRecord.TaskExecutionRecords = MapTaskExecutionRecords(executionId, workflow, result.TaskResults);

            // Save final record if repository available
            if (_executionRepository != null)
            {
                await _executionRepository.SaveExecutionAsync(executionRecord);
            }

            return new WorkflowExecutionResponse
            {
                ExecutionId = executionId,
                WorkflowName = workflowName,
                Success = result.Success,
                Output = result.Output,
                ExecutedTasks = result.TaskResults.Keys.ToList(),
                TaskDetails = MapTaskExecutionDetails(workflow, result.TaskResults),
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                Error = result.Errors.Any() ? string.Join("; ", result.Errors) : null
            };
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            // Timeout occurred (timeoutCts was canceled, not the caller's token)
            stopwatch.Stop();

            executionRecord.Status = ExecutionStatus.Failed;
            executionRecord.CompletedAt = DateTime.UtcNow;
            executionRecord.Duration = stopwatch.Elapsed;

            if (_executionRepository != null)
            {
                await _executionRepository.SaveExecutionAsync(executionRecord);
            }

            return new WorkflowExecutionResponse
            {
                ExecutionId = executionId,
                WorkflowName = workflowName,
                Success = false,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                Error = $"Workflow execution timed out after {_timeoutSeconds} seconds"
            };
        }
        catch (OperationCanceledException)
        {
            // User canceled
            stopwatch.Stop();

            executionRecord.Status = ExecutionStatus.Cancelled;
            executionRecord.CompletedAt = DateTime.UtcNow;
            executionRecord.Duration = stopwatch.Elapsed;

            if (_executionRepository != null)
            {
                await _executionRepository.SaveExecutionAsync(executionRecord);
            }

            return new WorkflowExecutionResponse
            {
                ExecutionId = executionId,
                WorkflowName = workflowName,
                Success = false,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                Error = "Workflow execution was canceled"
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            executionRecord.Status = ExecutionStatus.Failed;
            executionRecord.CompletedAt = DateTime.UtcNow;
            executionRecord.Duration = stopwatch.Elapsed;

            if (_executionRepository != null)
            {
                await _executionRepository.SaveExecutionAsync(executionRecord);
            }

            return new WorkflowExecutionResponse
            {
                ExecutionId = executionId,
                WorkflowName = workflowName,
                Success = false,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                Error = $"Unexpected error during workflow execution: {ex.Message}"
            };
        }
    }

    private List<TaskExecutionRecord> MapTaskExecutionRecords(
        Guid executionId,
        WorkflowResource workflow,
        Dictionary<string, TaskExecutionResult> taskResults)
    {
        var records = new List<TaskExecutionRecord>();
        var taskStepsById = workflow.Spec?.Tasks?.ToDictionary(t => t.Id, t => t) ?? new Dictionary<string, WorkflowTaskStep>();

        foreach (var (taskId, result) in taskResults)
        {
            var taskStep = taskStepsById.GetValueOrDefault(taskId);
            var completedAt = DateTime.UtcNow;
            var startedAt = completedAt - result.Duration;

            records.Add(new TaskExecutionRecord
            {
                ExecutionId = executionId,
                TaskId = taskId,
                TaskRef = taskStep?.TaskRef ?? "",
                Status = result.Success ? "Succeeded" : "Failed",
                Output = result.Output != null ? JsonSerializer.Serialize(result.Output) : null,
                Errors = result.Errors.Any() ? JsonSerializer.Serialize(result.Errors) : null,
                Duration = result.Duration,
                RetryCount = result.RetryCount,
                StartedAt = startedAt,
                CompletedAt = completedAt
            });
        }

        return records;
    }

    private List<TaskExecutionDetail> MapTaskExecutionDetails(
        WorkflowResource workflow,
        Dictionary<string, TaskExecutionResult> taskResults)
    {
        var details = new List<TaskExecutionDetail>();
        var taskStepsById = workflow.Spec?.Tasks?.ToDictionary(t => t.Id, t => t) ?? new Dictionary<string, WorkflowTaskStep>();

        foreach (var (taskId, result) in taskResults)
        {
            var taskStep = taskStepsById.GetValueOrDefault(taskId);
            var completedAt = DateTime.UtcNow;
            var startedAt = completedAt - result.Duration;

            details.Add(new TaskExecutionDetail
            {
                TaskId = taskId,
                TaskRef = taskStep?.TaskRef ?? "",
                Success = result.Success,
                Output = result.Output,
                Errors = result.Errors,
                RetryCount = result.RetryCount,
                DurationMs = (long)result.Duration.TotalMilliseconds,
                StartedAt = startedAt,
                CompletedAt = completedAt
            });
        }

        return details;
    }
}
