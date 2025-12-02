/**
 * SignalRWorkflowEventNotifier Tests
 *
 * Tests for SignalR-based workflow execution event notifications.
 * Verifies that events are properly broadcast to WebSocket clients.
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

namespace WorkflowGateway.Tests.Services;

public class SignalRWorkflowEventNotifierTests
{
    private readonly Mock<IHubContext<WorkflowExecutionHub, IWorkflowExecutionClient>> _mockHubContext;
    private readonly Mock<IHubClients<IWorkflowExecutionClient>> _mockClients;
    private readonly Mock<IWorkflowExecutionClient> _mockGroupClient;
    private readonly Mock<IWorkflowExecutionClient> _mockVisualizationClient;
    private readonly SignalRWorkflowEventNotifier _notifier;

    public SignalRWorkflowEventNotifierTests()
    {
        _mockHubContext = new Mock<IHubContext<WorkflowExecutionHub, IWorkflowExecutionClient>>();
        _mockClients = new Mock<IHubClients<IWorkflowExecutionClient>>();
        _mockGroupClient = new Mock<IWorkflowExecutionClient>();
        _mockVisualizationClient = new Mock<IWorkflowExecutionClient>();

        _mockHubContext.Setup(h => h.Clients).Returns(_mockClients.Object);

        // Setup the visualization group mock (broadcasts go to both execution group AND visualization group)
        _mockClients.Setup(c => c.Group(WorkflowExecutionHub.VisualizationGroupName))
            .Returns(_mockVisualizationClient.Object);

        // Setup visualization client methods to return completed tasks
        _mockVisualizationClient.Setup(c => c.WorkflowStarted(It.IsAny<WorkflowStartedEvent>())).Returns(Task.CompletedTask);
        _mockVisualizationClient.Setup(c => c.TaskStarted(It.IsAny<TaskStartedEvent>())).Returns(Task.CompletedTask);
        _mockVisualizationClient.Setup(c => c.TaskCompleted(It.IsAny<TaskCompletedEvent>())).Returns(Task.CompletedTask);
        _mockVisualizationClient.Setup(c => c.WorkflowCompleted(It.IsAny<WorkflowCompletedEvent>())).Returns(Task.CompletedTask);
        _mockVisualizationClient.Setup(c => c.SignalFlow(It.IsAny<SignalFlowEvent>())).Returns(Task.CompletedTask);

        _notifier = new SignalRWorkflowEventNotifier(_mockHubContext.Object);
    }

    [Fact]
    public void Constructor_NullHubContext_ThrowsArgumentNullException()
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentNullException>(() =>
            new SignalRWorkflowEventNotifier(null!));
        exception.ParamName.Should().Be("hubContext");
    }

    [Fact]
    public async Task OnWorkflowStartedAsync_BroadcastsToCorrectGroup()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var workflowName = "test-workflow";
        var timestamp = DateTime.UtcNow;
        var expectedGroupName = $"execution-{executionId}";

        _mockClients.Setup(c => c.Group(expectedGroupName)).Returns(_mockGroupClient.Object);

        WorkflowStartedEvent? capturedEvent = null;
        _mockGroupClient
            .Setup(c => c.WorkflowStarted(It.IsAny<WorkflowStartedEvent>()))
            .Callback<WorkflowStartedEvent>(e => capturedEvent = e)
            .Returns(Task.CompletedTask);

        // Act
        await _notifier.OnWorkflowStartedAsync(executionId, workflowName, timestamp);

        // Assert - Verifies both execution group and visualization group received the event
        _mockClients.Verify(c => c.Group(expectedGroupName), Times.Once);
        _mockClients.Verify(c => c.Group(WorkflowExecutionHub.VisualizationGroupName), Times.Once);
        _mockGroupClient.Verify(c => c.WorkflowStarted(It.IsAny<WorkflowStartedEvent>()), Times.Once);
        _mockVisualizationClient.Verify(c => c.WorkflowStarted(It.IsAny<WorkflowStartedEvent>()), Times.Once);

        capturedEvent.Should().NotBeNull();
        capturedEvent!.ExecutionId.Should().Be(executionId);
        capturedEvent.WorkflowName.Should().Be(workflowName);
        capturedEvent.Timestamp.Should().Be(timestamp);
    }

    [Fact]
    public async Task OnTaskStartedAsync_BroadcastsToCorrectGroup()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var taskId = "task-1";
        var taskName = "fetch-data";
        var timestamp = DateTime.UtcNow;
        var expectedGroupName = $"execution-{executionId}";

        _mockClients.Setup(c => c.Group(expectedGroupName)).Returns(_mockGroupClient.Object);

        TaskStartedEvent? capturedEvent = null;
        _mockGroupClient
            .Setup(c => c.TaskStarted(It.IsAny<TaskStartedEvent>()))
            .Callback<TaskStartedEvent>(e => capturedEvent = e)
            .Returns(Task.CompletedTask);

        // Act
        await _notifier.OnTaskStartedAsync(executionId, taskId, taskName, timestamp);

        // Assert - Verifies both execution group and visualization group received the event
        _mockClients.Verify(c => c.Group(expectedGroupName), Times.Once);
        _mockClients.Verify(c => c.Group(WorkflowExecutionHub.VisualizationGroupName), Times.Once);
        _mockGroupClient.Verify(c => c.TaskStarted(It.IsAny<TaskStartedEvent>()), Times.Once);
        _mockVisualizationClient.Verify(c => c.TaskStarted(It.IsAny<TaskStartedEvent>()), Times.Once);

        capturedEvent.Should().NotBeNull();
        capturedEvent!.ExecutionId.Should().Be(executionId);
        capturedEvent.TaskId.Should().Be(taskId);
        capturedEvent.TaskName.Should().Be(taskName);
        capturedEvent.Timestamp.Should().Be(timestamp);
    }

    [Fact]
    public async Task OnTaskCompletedAsync_BroadcastsToCorrectGroup()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var taskId = "task-1";
        var taskName = "fetch-data";
        var status = "Succeeded";
        var output = new Dictionary<string, object> { ["result"] = "success" };
        var duration = TimeSpan.FromSeconds(2);
        var timestamp = DateTime.UtcNow;
        var expectedGroupName = $"execution-{executionId}";

        _mockClients.Setup(c => c.Group(expectedGroupName)).Returns(_mockGroupClient.Object);

        TaskCompletedEvent? capturedEvent = null;
        _mockGroupClient
            .Setup(c => c.TaskCompleted(It.IsAny<TaskCompletedEvent>()))
            .Callback<TaskCompletedEvent>(e => capturedEvent = e)
            .Returns(Task.CompletedTask);

        // Act
        await _notifier.OnTaskCompletedAsync(executionId, taskId, taskName, status, output, duration, timestamp);

        // Assert - Verifies both execution group and visualization group received the event
        _mockClients.Verify(c => c.Group(expectedGroupName), Times.Once);
        _mockClients.Verify(c => c.Group(WorkflowExecutionHub.VisualizationGroupName), Times.Once);
        _mockGroupClient.Verify(c => c.TaskCompleted(It.IsAny<TaskCompletedEvent>()), Times.Once);
        _mockVisualizationClient.Verify(c => c.TaskCompleted(It.IsAny<TaskCompletedEvent>()), Times.Once);

        capturedEvent.Should().NotBeNull();
        capturedEvent!.ExecutionId.Should().Be(executionId);
        capturedEvent.TaskId.Should().Be(taskId);
        capturedEvent.TaskName.Should().Be(taskName);
        capturedEvent.Status.Should().Be(status);
        capturedEvent.Output.Should().BeEquivalentTo(output);
        capturedEvent.Duration.Should().Be(duration);
        capturedEvent.Timestamp.Should().Be(timestamp);
    }

    [Fact]
    public async Task OnWorkflowCompletedAsync_BroadcastsToCorrectGroup()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var workflowName = "test-workflow";
        var status = "Succeeded";
        var output = new Dictionary<string, object> { ["final"] = "result" };
        var duration = TimeSpan.FromSeconds(10);
        var timestamp = DateTime.UtcNow;
        var expectedGroupName = $"execution-{executionId}";

        _mockClients.Setup(c => c.Group(expectedGroupName)).Returns(_mockGroupClient.Object);

        WorkflowCompletedEvent? capturedEvent = null;
        _mockGroupClient
            .Setup(c => c.WorkflowCompleted(It.IsAny<WorkflowCompletedEvent>()))
            .Callback<WorkflowCompletedEvent>(e => capturedEvent = e)
            .Returns(Task.CompletedTask);

        // Act
        await _notifier.OnWorkflowCompletedAsync(executionId, workflowName, status, output, duration, timestamp);

        // Assert - Verifies both execution group and visualization group received the event
        _mockClients.Verify(c => c.Group(expectedGroupName), Times.Once);
        _mockClients.Verify(c => c.Group(WorkflowExecutionHub.VisualizationGroupName), Times.Once);
        _mockGroupClient.Verify(c => c.WorkflowCompleted(It.IsAny<WorkflowCompletedEvent>()), Times.Once);
        _mockVisualizationClient.Verify(c => c.WorkflowCompleted(It.IsAny<WorkflowCompletedEvent>()), Times.Once);

        capturedEvent.Should().NotBeNull();
        capturedEvent!.ExecutionId.Should().Be(executionId);
        capturedEvent.WorkflowName.Should().Be(workflowName);
        capturedEvent.Status.Should().Be(status);
        capturedEvent.Output.Should().BeEquivalentTo(output);
        capturedEvent.Duration.Should().Be(duration);
        capturedEvent.Timestamp.Should().Be(timestamp);
    }

    [Fact]
    public async Task OnSignalFlowAsync_BroadcastsToCorrectGroup()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var fromTaskId = "task-1";
        var toTaskId = "task-2";
        var timestamp = DateTime.UtcNow;
        var expectedGroupName = $"execution-{executionId}";

        _mockClients.Setup(c => c.Group(expectedGroupName)).Returns(_mockGroupClient.Object);

        SignalFlowEvent? capturedEvent = null;
        _mockGroupClient
            .Setup(c => c.SignalFlow(It.IsAny<SignalFlowEvent>()))
            .Callback<SignalFlowEvent>(e => capturedEvent = e)
            .Returns(Task.CompletedTask);

        // Act
        await _notifier.OnSignalFlowAsync(executionId, fromTaskId, toTaskId, timestamp);

        // Assert - Verifies both execution group and visualization group received the event
        _mockClients.Verify(c => c.Group(expectedGroupName), Times.Once);
        _mockClients.Verify(c => c.Group(WorkflowExecutionHub.VisualizationGroupName), Times.Once);
        _mockGroupClient.Verify(c => c.SignalFlow(It.IsAny<SignalFlowEvent>()), Times.Once);
        _mockVisualizationClient.Verify(c => c.SignalFlow(It.IsAny<SignalFlowEvent>()), Times.Once);

        capturedEvent.Should().NotBeNull();
        capturedEvent!.ExecutionId.Should().Be(executionId);
        capturedEvent.FromTaskId.Should().Be(fromTaskId);
        capturedEvent.ToTaskId.Should().Be(toTaskId);
        capturedEvent.Timestamp.Should().Be(timestamp);
    }
}
