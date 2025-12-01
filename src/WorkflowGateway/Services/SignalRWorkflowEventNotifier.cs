using Microsoft.AspNetCore.SignalR;
using WorkflowCore.Services;
using WorkflowGateway.Hubs;
using WorkflowGateway.Models;

namespace WorkflowGateway.Services;

/// <summary>
/// SignalR-based implementation of IWorkflowEventNotifier
/// Broadcasts workflow execution events to WebSocket clients.
/// Events are sent to both:
/// - The execution-specific group (for clients tracking a specific execution)
/// - The global visualization group (for the neural network visualization)
/// </summary>
public class SignalRWorkflowEventNotifier : IWorkflowEventNotifier
{
    private readonly IHubContext<WorkflowExecutionHub, IWorkflowExecutionClient> _hubContext;

    public SignalRWorkflowEventNotifier(IHubContext<WorkflowExecutionHub, IWorkflowExecutionClient> hubContext)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
    }

    public async Task OnWorkflowStartedAsync(Guid executionId, string workflowName, DateTime timestamp)
    {
        var groupName = GetExecutionGroupName(executionId);
        var workflowEvent = new WorkflowStartedEvent
        {
            ExecutionId = executionId,
            WorkflowName = workflowName,
            Timestamp = timestamp
        };

        // Broadcast to both execution-specific group and global visualization group
        await Task.WhenAll(
            _hubContext.Clients.Group(groupName).WorkflowStarted(workflowEvent),
            _hubContext.Clients.Group(WorkflowExecutionHub.VisualizationGroupName).WorkflowStarted(workflowEvent)
        );
    }

    public async Task OnTaskStartedAsync(Guid executionId, string taskId, string taskName, DateTime timestamp)
    {
        var groupName = GetExecutionGroupName(executionId);
        var taskEvent = new TaskStartedEvent
        {
            ExecutionId = executionId,
            TaskId = taskId,
            TaskName = taskName,
            Timestamp = timestamp
        };

        // Broadcast to both execution-specific group and global visualization group
        await Task.WhenAll(
            _hubContext.Clients.Group(groupName).TaskStarted(taskEvent),
            _hubContext.Clients.Group(WorkflowExecutionHub.VisualizationGroupName).TaskStarted(taskEvent)
        );
    }

    public async Task OnTaskCompletedAsync(
        Guid executionId,
        string taskId,
        string taskName,
        string status,
        Dictionary<string, object> output,
        TimeSpan duration,
        DateTime timestamp)
    {
        var groupName = GetExecutionGroupName(executionId);
        var taskEvent = new TaskCompletedEvent
        {
            ExecutionId = executionId,
            TaskId = taskId,
            TaskName = taskName,
            Status = status,
            Output = output,
            Duration = duration,
            Timestamp = timestamp
        };

        // Broadcast to both execution-specific group and global visualization group
        await Task.WhenAll(
            _hubContext.Clients.Group(groupName).TaskCompleted(taskEvent),
            _hubContext.Clients.Group(WorkflowExecutionHub.VisualizationGroupName).TaskCompleted(taskEvent)
        );
    }

    public async Task OnWorkflowCompletedAsync(
        Guid executionId,
        string workflowName,
        string status,
        Dictionary<string, object> output,
        TimeSpan duration,
        DateTime timestamp)
    {
        var groupName = GetExecutionGroupName(executionId);
        var workflowEvent = new WorkflowCompletedEvent
        {
            ExecutionId = executionId,
            WorkflowName = workflowName,
            Status = status,
            Output = output,
            Duration = duration,
            Timestamp = timestamp
        };

        // Broadcast to both execution-specific group and global visualization group
        await Task.WhenAll(
            _hubContext.Clients.Group(groupName).WorkflowCompleted(workflowEvent),
            _hubContext.Clients.Group(WorkflowExecutionHub.VisualizationGroupName).WorkflowCompleted(workflowEvent)
        );
    }

    public async Task OnSignalFlowAsync(Guid executionId, string fromTaskId, string toTaskId, DateTime timestamp)
    {
        var groupName = GetExecutionGroupName(executionId);
        var signalEvent = new SignalFlowEvent
        {
            ExecutionId = executionId,
            FromTaskId = fromTaskId,
            ToTaskId = toTaskId,
            Timestamp = timestamp
        };

        // Broadcast to both execution-specific group and global visualization group
        await Task.WhenAll(
            _hubContext.Clients.Group(groupName).SignalFlow(signalEvent),
            _hubContext.Clients.Group(WorkflowExecutionHub.VisualizationGroupName).SignalFlow(signalEvent)
        );
    }

    private static string GetExecutionGroupName(Guid executionId)
    {
        return $"execution-{executionId}";
    }
}
