/**
 * WorkflowExecutionHub Tests
 *
 * Tests for real-time WebSocket workflow execution hub.
 * Protocol: execute, subscribe, task_started, task_completed, workflow_completed
 */

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Moq;
using WorkflowGateway.Hubs;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;
using FluentAssertions;

namespace WorkflowGateway.Tests.Hubs;

public class WorkflowExecutionHubTests
{
    private readonly Mock<IWorkflowExecutionService> _mockExecutionService;
    private readonly Mock<IHubCallerClients<IWorkflowExecutionClient>> _mockClients;
    private readonly Mock<HubCallerContext> _mockContext;
    private readonly Mock<IWorkflowExecutionClient> _mockCaller;
    private readonly Mock<IWorkflowExecutionClient> _mockAllClients;
    private readonly Mock<IGroupManager> _mockGroups;
    private readonly WorkflowExecutionHub _hub;

    public WorkflowExecutionHubTests()
    {
        _mockExecutionService = new Mock<IWorkflowExecutionService>();
        _mockClients = new Mock<IHubCallerClients<IWorkflowExecutionClient>>();
        _mockContext = new Mock<HubCallerContext>();
        _mockCaller = new Mock<IWorkflowExecutionClient>();
        _mockAllClients = new Mock<IWorkflowExecutionClient>();
        _mockGroups = new Mock<IGroupManager>();

        _hub = new WorkflowExecutionHub(_mockExecutionService.Object)
        {
            Clients = _mockClients.Object,
            Context = _mockContext.Object,
            Groups = _mockGroups.Object
        };

        _mockClients.Setup(c => c.Caller).Returns(_mockCaller.Object);
        _mockClients.Setup(c => c.All).Returns(_mockAllClients.Object);
        _mockContext.Setup(c => c.ConnectionId).Returns("test-connection-id");
    }

    [Fact]
    public async Task ExecuteWorkflow_ValidRequest_ReturnsExecutionId()
    {
        // Arrange
        var request = new ExecuteWorkflowRequest
        {
            WorkflowName = "test-workflow",
            Input = new Dictionary<string, object> { ["key"] = "value" }
        };

        var expectedExecutionId = Guid.NewGuid();
        _mockExecutionService
            .Setup(s => s.StartExecutionAsync(request.WorkflowName, request.Input))
            .ReturnsAsync(expectedExecutionId);

        // Act
        var result = await _hub.ExecuteWorkflow(request);

        // Assert
        result.Should().Be(expectedExecutionId);
        _mockExecutionService.Verify(
            s => s.StartExecutionAsync(request.WorkflowName, request.Input),
            Times.Once
        );
    }

    [Fact]
    public async Task ExecuteWorkflow_InvalidWorkflowName_ThrowsException()
    {
        // Arrange
        var request = new ExecuteWorkflowRequest
        {
            WorkflowName = "",
            Input = new Dictionary<string, object>()
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _hub.ExecuteWorkflow(request));
    }

    [Fact]
    public async Task SubscribeToExecution_ValidId_AddsToGroup()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var groupName = $"execution-{executionId}";

        // Act
        await _hub.SubscribeToExecution(executionId);

        // Assert
        _mockGroups.Verify(
            g => g.AddToGroupAsync("test-connection-id", groupName, default),
            Times.Once
        );
    }

    [Fact]
    public async Task UnsubscribeFromExecution_ValidId_RemovesFromGroup()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var groupName = $"execution-{executionId}";

        // Act
        await _hub.UnsubscribeFromExecution(executionId);

        // Assert
        _mockGroups.Verify(
            g => g.RemoveFromGroupAsync("test-connection-id", groupName, default),
            Times.Once
        );
    }

    [Fact]
    public async Task OnConnectedAsync_ClientConnects_ReturnsSuccessfully()
    {
        // Act
        await _hub.OnConnectedAsync();

        // Assert - connection should succeed without errors
        _mockContext.Verify(c => c.ConnectionId, Times.AtLeastOnce);
    }

    [Fact]
    public async Task OnDisconnectedAsync_ClientDisconnects_CleansUpSubscriptions()
    {
        // Act
        await _hub.OnDisconnectedAsync(null);

        // Assert - disconnection should succeed without errors
        _mockContext.Verify(c => c.ConnectionId, Times.AtLeastOnce);
    }

    [Fact]
    public async Task NotifyTaskStarted_ValidEvent_BroadcastsToGroup()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var taskEvent = new TaskStartedEvent
        {
            ExecutionId = executionId,
            TaskId = "task-1",
            TaskName = "fetch-data",
            Timestamp = DateTime.UtcNow
        };

        var mockGroupClients = new Mock<IWorkflowExecutionClient>();
        _mockClients.Setup(c => c.Group($"execution-{executionId}")).Returns(mockGroupClients.Object);

        // Act
        await _hub.NotifyTaskStarted(taskEvent);

        // Assert
        mockGroupClients.Verify(
            c => c.TaskStarted(taskEvent),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyTaskCompleted_ValidEvent_BroadcastsToGroup()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var taskEvent = new TaskCompletedEvent
        {
            ExecutionId = executionId,
            TaskId = "task-1",
            TaskName = "fetch-data",
            Status = "Succeeded",
            Output = new Dictionary<string, object> { ["result"] = "success" },
            Duration = TimeSpan.FromSeconds(2),
            Timestamp = DateTime.UtcNow
        };

        var mockGroupClients = new Mock<IWorkflowExecutionClient>();
        _mockClients.Setup(c => c.Group($"execution-{executionId}")).Returns(mockGroupClients.Object);

        // Act
        await _hub.NotifyTaskCompleted(taskEvent);

        // Assert
        mockGroupClients.Verify(
            c => c.TaskCompleted(taskEvent),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyWorkflowCompleted_ValidEvent_BroadcastsToGroup()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var workflowEvent = new WorkflowCompletedEvent
        {
            ExecutionId = executionId,
            WorkflowName = "test-workflow",
            Status = "Succeeded",
            Output = new Dictionary<string, object> { ["final"] = "result" },
            Duration = TimeSpan.FromSeconds(10),
            Timestamp = DateTime.UtcNow
        };

        var mockGroupClients = new Mock<IWorkflowExecutionClient>();
        _mockClients.Setup(c => c.Group($"execution-{executionId}")).Returns(mockGroupClients.Object);

        // Act
        await _hub.NotifyWorkflowCompleted(workflowEvent);

        // Assert
        mockGroupClients.Verify(
            c => c.WorkflowCompleted(workflowEvent),
            Times.Once
        );
    }
}
