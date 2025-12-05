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

    /// <summary>
    /// Start a workflow execution asynchronously and return execution ID immediately
    /// </summary>
    Task<Guid> StartExecutionAsync(
        string workflowName,
        Dictionary<string, object> input);
}

public class WorkflowExecutionService : IWorkflowExecutionService
{
    private readonly IWorkflowOrchestrator _orchestrator;
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly IExecutionRepository? _executionRepository;
    private readonly IStatisticsAggregationService? _statisticsService;
    private readonly int _timeoutSeconds;

    public WorkflowExecutionService(
        IWorkflowOrchestrator orchestrator,
        IWorkflowDiscoveryService discoveryService,
        IExecutionRepository? executionRepository,
        IStatisticsAggregationService? statisticsService = null,
        int timeoutSeconds = 30)
    {
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _executionRepository = executionRepository;
        _statisticsService = statisticsService;
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
            executionRecord.GraphBuildDuration = result.GraphBuildDuration;

            // Map task execution results to TaskExecutionRecords
            executionRecord.TaskExecutionRecords = MapTaskExecutionRecords(executionId, workflow, result.TaskResults);

            // Save final record if repository available
            if (_executionRepository != null)
            {
                await _executionRepository.SaveExecutionAsync(executionRecord);
            }

            // Record statistics incrementally (delta-based, O(1))
            if (_statisticsService != null)
            {
                await RecordStatisticsAsync(workflowName, executionRecord.Status, stopwatch.ElapsedMilliseconds, workflow, result.TaskResults);
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
                GraphBuildDurationMs = (long)result.GraphBuildDuration.TotalMilliseconds,
                OrchestrationCost = MapOrchestrationCost(result.OrchestrationCost),
                GraphDiagnostics = MapGraphDiagnostics(result.GraphDiagnostics),
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

            records.Add(new TaskExecutionRecord
            {
                ExecutionId = executionId,
                TaskId = taskId,
                TaskRef = taskStep?.TaskRef ?? "",
                Status = result.Success ? "Succeeded" : "Failed",
                Output = result.Output != null ? JsonSerializer.Serialize(result.Output) : null,
                Errors = result.Errors.Any() ? JsonSerializer.Serialize(result.Errors) : null,
                ErrorInfo = result.ErrorInfo != null ? JsonSerializer.Serialize(result.ErrorInfo) : null,
                Duration = result.Duration,
                RetryCount = result.RetryCount,
                // Use actual timestamps from TaskExecutionResult (set by orchestrator)
                StartedAt = result.StartedAt,
                CompletedAt = result.CompletedAt
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

            details.Add(new TaskExecutionDetail
            {
                TaskId = taskId,
                TaskRef = taskStep?.TaskRef ?? "",
                Success = result.Success,
                Output = result.Output,
                Errors = result.Errors,
                ErrorInfo = MapTaskErrorInfo(result.ErrorInfo, taskId, taskStep?.TaskRef),
                RetryCount = result.RetryCount,
                DurationMs = (long)result.Duration.TotalMilliseconds,
                // Use actual timestamps from TaskExecutionResult (set by orchestrator)
                StartedAt = result.StartedAt,
                CompletedAt = result.CompletedAt
            });
        }

        return details;
    }

    /// <summary>
    /// Maps TaskErrorInfo from WorkflowCore to TaskErrorInfoResponse for API
    /// </summary>
    private static TaskErrorInfoResponse? MapTaskErrorInfo(TaskErrorInfo? errorInfo, string taskId, string? taskRef)
    {
        if (errorInfo == null) return null;

        // Enrich with task ID if not set
        if (string.IsNullOrEmpty(errorInfo.TaskId))
        {
            errorInfo.TaskId = taskId;
        }

        return new TaskErrorInfoResponse
        {
            TaskId = errorInfo.TaskId,
            TaskName = errorInfo.TaskName ?? taskRef,
            TaskDescription = errorInfo.TaskDescription,
            ErrorType = errorInfo.ErrorType.ToString(),
            ErrorMessage = errorInfo.ErrorMessage,
            ErrorCode = errorInfo.ErrorCode,
            ServiceName = errorInfo.ServiceName,
            ServiceUrl = errorInfo.ServiceUrl,
            HttpMethod = errorInfo.HttpMethod,
            HttpStatusCode = errorInfo.HttpStatusCode,
            ResponseBodyPreview = errorInfo.ResponseBodyPreview,
            RetryAttempts = errorInfo.RetryAttempts,
            IsRetryable = errorInfo.IsRetryable,
            OccurredAt = errorInfo.OccurredAt,
            DurationUntilErrorMs = errorInfo.DurationUntilErrorMs,
            Suggestion = errorInfo.Suggestion,
            SupportAction = errorInfo.SupportAction,
            Summary = errorInfo.GetSummary(),
            // RFC 7807 Compliance fields
            ResponseCompliance = errorInfo.ResponseCompliance,
            ResponseComplianceScore = errorInfo.ResponseComplianceScore,
            ResponseComplianceIssues = errorInfo.ResponseComplianceIssues,
            ResponseComplianceRecommendations = errorInfo.ResponseComplianceRecommendations,
            ResponseComplianceSummary = errorInfo.ResponseComplianceSummary
        };
    }

    /// <summary>
    /// Start a workflow execution asynchronously (fire-and-forget) and return execution ID
    /// </summary>
    public async Task<Guid> StartExecutionAsync(
        string workflowName,
        Dictionary<string, object> input)
    {
        // Generate execution ID
        var executionId = Guid.NewGuid();

        // Get workflow definition
        var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName);
        if (workflow == null)
        {
            throw new InvalidOperationException($"Workflow '{workflowName}' not found");
        }

        // Start execution in background (fire-and-forget)
        _ = Task.Run(async () =>
        {
            try
            {
                await ExecuteAsync(workflow, input);
            }
            catch (Exception)
            {
                // Log error but don't throw - this is fire-and-forget
                // Errors will be sent via WebSocket events
            }
        });

        return executionId;
    }

    private static OrchestrationCostResponse? MapOrchestrationCost(OrchestrationCostMetrics? cost)
    {
        if (cost == null) return null;

        return new OrchestrationCostResponse
        {
            SetupDurationMicros = (long)cost.SetupDuration.TotalMicroseconds,
            TeardownDurationMicros = (long)cost.TeardownDuration.TotalMicroseconds,
            SchedulingOverheadMicros = (long)cost.SchedulingOverhead.TotalMicroseconds,
            TotalOrchestrationCostMicros = (long)cost.TotalOrchestrationCost.TotalMicroseconds,
            OrchestrationCostPercentage = cost.OrchestrationCostPercentage,
            ExecutionIterations = cost.ExecutionIterations,
            Iterations = cost.IterationTimings?.Select(iter => new IterationTimingResponse
            {
                Iteration = iter.Iteration,
                TaskIds = iter.TaskIds,
                DurationMicros = (long)(iter.CompletedAt - iter.StartedAt).TotalMicroseconds,
                SchedulingDelayMicros = (long)iter.SchedulingDelay.TotalMicroseconds
            }).ToList()
        };
    }

    private static GraphDiagnosticsResponse? MapGraphDiagnostics(GraphBuildDiagnostics? diagnostics)
    {
        if (diagnostics == null) return null;

        return new GraphDiagnosticsResponse
        {
            Tasks = diagnostics.TaskDiagnostics.Select(task => new TaskDependencyDiagnosticResponse
            {
                TaskId = task.TaskId,
                ExplicitDependencies = task.ExplicitDependencies,
                ImplicitDependencies = task.ImplicitDependencies
            }).ToList()
        };
    }

    /// <summary>
    /// Records workflow and task statistics incrementally (delta-based).
    /// This is fire-and-forget style - errors are logged but don't fail the workflow.
    /// </summary>
    private async Task RecordStatisticsAsync(
        string workflowName,
        ExecutionStatus status,
        long durationMs,
        WorkflowResource workflow,
        Dictionary<string, TaskExecutionResult> taskResults)
    {
        try
        {
            // Record workflow statistics
            await _statisticsService!.RecordWorkflowExecutionAsync(workflowName, status, durationMs, DateTime.UtcNow);

            // Record task statistics
            var taskStepsById = workflow.Spec?.Tasks?.ToDictionary(t => t.Id, t => t) ?? new Dictionary<string, WorkflowTaskStep>();

            foreach (var (taskId, result) in taskResults)
            {
                var taskStep = taskStepsById.GetValueOrDefault(taskId);
                if (taskStep?.TaskRef == null) continue;

                var taskStatus = result.Success ? "Succeeded" : "Failed";
                var taskDurationMs = (long)result.Duration.TotalMilliseconds;

                await _statisticsService.RecordTaskExecutionAsync(taskStep.TaskRef, taskStatus, taskDurationMs, DateTime.UtcNow);
            }
        }
        catch
        {
            // Statistics recording is non-critical - don't fail the workflow
            // In production, this would be logged
        }
    }
}
