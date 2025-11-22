using System.Diagnostics;
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
    private readonly int _timeoutSeconds;

    public WorkflowExecutionService(
        IWorkflowOrchestrator orchestrator,
        IWorkflowDiscoveryService discoveryService,
        int timeoutSeconds = 30)
    {
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _timeoutSeconds = timeoutSeconds;
    }

    public async Task<WorkflowExecutionResponse> ExecuteAsync(
        WorkflowResource workflow,
        Dictionary<string, object> input,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var workflowName = workflow.Metadata?.Name ?? "unknown";

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

            return new WorkflowExecutionResponse
            {
                WorkflowName = workflowName,
                Success = result.Success,
                Output = result.Output,
                ExecutedTasks = result.TaskResults.Keys.ToList(),
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                Error = result.Errors.Any() ? string.Join("; ", result.Errors) : null
            };
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            // Timeout occurred (timeoutCts was canceled, not the caller's token)
            stopwatch.Stop();

            return new WorkflowExecutionResponse
            {
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

            return new WorkflowExecutionResponse
            {
                WorkflowName = workflowName,
                Success = false,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                Error = "Workflow execution was canceled"
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            return new WorkflowExecutionResponse
            {
                WorkflowName = workflowName,
                Success = false,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                Error = $"Unexpected error during workflow execution: {ex.Message}"
            };
        }
    }
}
