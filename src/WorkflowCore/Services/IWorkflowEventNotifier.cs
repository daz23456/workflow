namespace WorkflowCore.Services;

/// <summary>
/// Interface for workflow execution event notifications.
/// Implementations can hook into workflow execution lifecycle to emit real-time events.
/// </summary>
public interface IWorkflowEventNotifier
{
    /// <summary>
    /// Called when a workflow execution starts
    /// </summary>
    Task OnWorkflowStartedAsync(Guid executionId, string workflowName, DateTime timestamp);

    /// <summary>
    /// Called when a task starts execution
    /// </summary>
    Task OnTaskStartedAsync(Guid executionId, string taskId, string taskName, DateTime timestamp);

    /// <summary>
    /// Called when a task completes execution
    /// </summary>
    Task OnTaskCompletedAsync(
        Guid executionId,
        string taskId,
        string taskName,
        string status,
        Dictionary<string, object> output,
        TimeSpan duration,
        DateTime timestamp);

    /// <summary>
    /// Called when a workflow execution completes
    /// </summary>
    Task OnWorkflowCompletedAsync(
        Guid executionId,
        string workflowName,
        string status,
        Dictionary<string, object> output,
        TimeSpan duration,
        DateTime timestamp);

    /// <summary>
    /// Called when a signal flows from one task to another (dependency activation).
    /// Emitted when a task completes and unblocks dependent tasks.
    /// Used for neural visualization to animate data flow along edges.
    /// </summary>
    Task OnSignalFlowAsync(Guid executionId, string fromTaskId, string toTaskId, DateTime timestamp);

    /// <summary>
    /// Called when a performance anomaly is detected during workflow or task execution.
    /// </summary>
    Task OnAnomalyDetectedAsync(Models.AnomalyEvent anomalyEvent);
}
