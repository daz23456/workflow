using Microsoft.Extensions.Logging;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowGateway.Services;

/// <summary>
/// Service for evaluating workflow and task executions for performance anomalies.
/// Integrates with IAnomalyDetector for detection and IWorkflowEventNotifier for real-time alerts.
/// </summary>
public class AnomalyEvaluationService
{
    private readonly IAnomalyDetector _detector;
    private readonly IWorkflowEventNotifier _notifier;
    private readonly ILogger<AnomalyEvaluationService> _logger;

    public AnomalyEvaluationService(
        IAnomalyDetector detector,
        IWorkflowEventNotifier notifier,
        ILogger<AnomalyEvaluationService> logger)
    {
        _detector = detector ?? throw new ArgumentNullException(nameof(detector));
        _notifier = notifier ?? throw new ArgumentNullException(nameof(notifier));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Evaluates a workflow execution for anomalies.
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="executionId">Execution ID</param>
    /// <param name="durationMs">Execution duration in milliseconds</param>
    /// <returns>AnomalyEvent if anomaly detected, null otherwise</returns>
    public async Task<AnomalyEvent?> EvaluateWorkflowAsync(
        string workflowName,
        string executionId,
        double durationMs)
    {
        try
        {
            var anomaly = await _detector.EvaluateAsync(workflowName, null, durationMs, executionId);

            if (anomaly != null)
            {
                _logger.LogWarning(
                    "Anomaly detected for workflow {WorkflowName} execution {ExecutionId}: {Severity} (Z-score: {ZScore:F2})",
                    workflowName, executionId, anomaly.Severity, anomaly.ZScore);

                await NotifyAnomalyAsync(anomaly);
            }

            return anomaly;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error evaluating anomaly for workflow {WorkflowName} execution {ExecutionId}",
                workflowName, executionId);
            return null;
        }
    }

    /// <summary>
    /// Evaluates a task execution for anomalies.
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="taskId">Task ID</param>
    /// <param name="executionId">Execution ID</param>
    /// <param name="durationMs">Task duration in milliseconds</param>
    /// <returns>AnomalyEvent if anomaly detected, null otherwise</returns>
    public async Task<AnomalyEvent?> EvaluateTaskAsync(
        string workflowName,
        string taskId,
        string executionId,
        double durationMs)
    {
        try
        {
            var anomaly = await _detector.EvaluateAsync(workflowName, taskId, durationMs, executionId);

            if (anomaly != null)
            {
                _logger.LogWarning(
                    "Anomaly detected for task {TaskId} in workflow {WorkflowName}: {Severity} (Z-score: {ZScore:F2})",
                    taskId, workflowName, anomaly.Severity, anomaly.ZScore);

                await NotifyAnomalyAsync(anomaly);
            }

            return anomaly;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error evaluating anomaly for task {TaskId} in workflow {WorkflowName}",
                taskId, workflowName);
            return null;
        }
    }

    /// <summary>
    /// Evaluates a complete workflow execution result for anomalies at both workflow and task levels.
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="executionId">Execution ID</param>
    /// <param name="result">Workflow execution result</param>
    /// <returns>List of detected anomalies</returns>
    public async Task<List<AnomalyEvent>> EvaluateExecutionResultAsync(
        string workflowName,
        string executionId,
        WorkflowExecutionResult result)
    {
        var anomalies = new List<AnomalyEvent>();

        // Evaluate workflow-level anomaly
        var workflowAnomaly = await EvaluateWorkflowAsync(
            workflowName,
            executionId,
            result.TotalDuration.TotalMilliseconds);

        if (workflowAnomaly != null)
        {
            anomalies.Add(workflowAnomaly);
        }

        // Evaluate task-level anomalies
        foreach (var (taskId, taskResult) in result.TaskResults)
        {
            var taskAnomaly = await EvaluateTaskAsync(
                workflowName,
                taskId,
                executionId,
                taskResult.Duration.TotalMilliseconds);

            if (taskAnomaly != null)
            {
                anomalies.Add(taskAnomaly);
            }
        }

        return anomalies;
    }

    private async Task NotifyAnomalyAsync(AnomalyEvent anomaly)
    {
        try
        {
            await _notifier.OnAnomalyDetectedAsync(anomaly);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to notify anomaly for execution {ExecutionId}",
                anomaly.ExecutionId);
            // Don't rethrow - notification failure shouldn't prevent returning the anomaly
        }
    }
}
