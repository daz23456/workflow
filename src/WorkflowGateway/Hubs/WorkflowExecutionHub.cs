/**
 * Workflow Execution Hub
 *
 * SignalR hub for real-time workflow execution with WebSockets.
 * Protocol: execute, subscribe, task_started, task_completed, workflow_completed
 */

using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Hubs;

/// <summary>
/// SignalR hub for real-time workflow execution
/// </summary>
public class WorkflowExecutionHub : Hub<IWorkflowExecutionClient>
{
    /// <summary>
    /// Name of the global visualization group that receives ALL execution events
    /// </summary>
    public const string VisualizationGroupName = "visualization";

    private readonly IWorkflowExecutionService _executionService;
    private readonly ILogger<WorkflowExecutionHub> _logger;

    public WorkflowExecutionHub(
        IWorkflowExecutionService executionService,
        ILogger<WorkflowExecutionHub>? logger = null)
    {
        _executionService = executionService;
        _logger = logger ?? new LoggerFactory().CreateLogger<WorkflowExecutionHub>();
    }

    /// <summary>
    /// Execute a workflow and return execution ID
    /// </summary>
    public async Task<Guid> ExecuteWorkflow(ExecuteWorkflowRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.WorkflowName))
        {
            throw new ArgumentException("Workflow name cannot be empty", nameof(request));
        }

        _logger.LogInformation(
            "Client {ConnectionId} executing workflow {WorkflowName}",
            Context.ConnectionId,
            request.WorkflowName
        );

        var executionId = await _executionService.StartExecutionAsync(
            request.WorkflowName,
            request.Input
        );

        return executionId;
    }

    /// <summary>
    /// Subscribe to execution events for a specific execution
    /// </summary>
    public async Task SubscribeToExecution(Guid executionId)
    {
        var groupName = GetExecutionGroupName(executionId);

        _logger.LogInformation(
            "Client {ConnectionId} subscribing to execution {ExecutionId}",
            Context.ConnectionId,
            executionId
        );

        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    }

    /// <summary>
    /// Unsubscribe from execution events
    /// </summary>
    public async Task UnsubscribeFromExecution(Guid executionId)
    {
        var groupName = GetExecutionGroupName(executionId);

        _logger.LogInformation(
            "Client {ConnectionId} unsubscribing from execution {ExecutionId}",
            Context.ConnectionId,
            executionId
        );

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }

    /// <summary>
    /// Join the global visualization group to receive ALL execution events.
    /// Used by the neural network visualization to monitor all workflow activity.
    /// </summary>
    public async Task JoinVisualizationGroup()
    {
        _logger.LogInformation(
            "Client {ConnectionId} joining visualization group",
            Context.ConnectionId
        );

        await Groups.AddToGroupAsync(Context.ConnectionId, VisualizationGroupName);
    }

    /// <summary>
    /// Leave the global visualization group
    /// </summary>
    public async Task LeaveVisualizationGroup()
    {
        _logger.LogInformation(
            "Client {ConnectionId} leaving visualization group",
            Context.ConnectionId
        );

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, VisualizationGroupName);
    }

    /// <summary>
    /// Called when a client connects
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client {ConnectionId} connected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a client disconnects
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation(
            "Client {ConnectionId} disconnected",
            Context.ConnectionId
        );

        if (exception != null)
        {
            _logger.LogError(
                exception,
                "Client {ConnectionId} disconnected with error",
                Context.ConnectionId
            );
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Notify clients that a task has started (called by orchestrator)
    /// </summary>
    public async Task NotifyTaskStarted(TaskStartedEvent taskEvent)
    {
        var groupName = GetExecutionGroupName(taskEvent.ExecutionId);

        _logger.LogDebug(
            "Notifying group {GroupName} of task started: {TaskName}",
            groupName,
            taskEvent.TaskName
        );

        await Clients.Group(groupName).TaskStarted(taskEvent);
    }

    /// <summary>
    /// Notify clients that a task has completed (called by orchestrator)
    /// </summary>
    public async Task NotifyTaskCompleted(TaskCompletedEvent taskEvent)
    {
        var groupName = GetExecutionGroupName(taskEvent.ExecutionId);

        _logger.LogDebug(
            "Notifying group {GroupName} of task completed: {TaskName} ({Status})",
            groupName,
            taskEvent.TaskName,
            taskEvent.Status
        );

        await Clients.Group(groupName).TaskCompleted(taskEvent);
    }

    /// <summary>
    /// Notify clients that a workflow has completed (called by orchestrator)
    /// </summary>
    public async Task NotifyWorkflowCompleted(WorkflowCompletedEvent workflowEvent)
    {
        var groupName = GetExecutionGroupName(workflowEvent.ExecutionId);

        _logger.LogDebug(
            "Notifying group {GroupName} of workflow completed: {WorkflowName} ({Status})",
            groupName,
            workflowEvent.WorkflowName,
            workflowEvent.Status
        );

        await Clients.Group(groupName).WorkflowCompleted(workflowEvent);
    }

    private static string GetExecutionGroupName(Guid executionId)
    {
        return $"execution-{executionId}";
    }
}
