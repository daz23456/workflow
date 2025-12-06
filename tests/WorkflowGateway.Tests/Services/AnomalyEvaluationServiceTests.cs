using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

public class AnomalyEvaluationServiceTests
{
    private readonly Mock<IAnomalyDetector> _detectorMock;
    private readonly Mock<IWorkflowEventNotifier> _notifierMock;
    private readonly Mock<ILogger<AnomalyEvaluationService>> _loggerMock;
    private readonly AnomalyEvaluationService _service;

    public AnomalyEvaluationServiceTests()
    {
        _detectorMock = new Mock<IAnomalyDetector>();
        _notifierMock = new Mock<IWorkflowEventNotifier>();
        _loggerMock = new Mock<ILogger<AnomalyEvaluationService>>();
        _service = new AnomalyEvaluationService(
            _detectorMock.Object,
            _notifierMock.Object,
            _loggerMock.Object);
    }

    #region EvaluateWorkflowAsync Tests

    [Fact]
    public async Task EvaluateWorkflowAsync_NoAnomaly_ReturnsNull()
    {
        // Arrange
        _detectorMock
            .Setup(x => x.EvaluateAsync("test-workflow", null, 1000, "exec-123"))
            .ReturnsAsync((AnomalyEvent?)null);

        // Act
        var result = await _service.EvaluateWorkflowAsync(
            "test-workflow",
            "exec-123",
            durationMs: 1000);

        // Assert
        result.Should().BeNull();
        _notifierMock.Verify(x => x.OnAnomalyDetectedAsync(It.IsAny<AnomalyEvent>()), Times.Never);
    }

    [Fact]
    public async Task EvaluateWorkflowAsync_AnomalyDetected_ReturnsEventAndNotifies()
    {
        // Arrange
        var anomalyEvent = new AnomalyEvent
        {
            WorkflowName = "test-workflow",
            ExecutionId = "exec-123",
            Severity = AnomalySeverity.Medium,
            ZScore = 3.5,
            ActualValue = 1500,
            ExpectedValue = 1000
        };

        _detectorMock
            .Setup(x => x.EvaluateAsync("test-workflow", null, 1500, "exec-123"))
            .ReturnsAsync(anomalyEvent);

        // Act
        var result = await _service.EvaluateWorkflowAsync(
            "test-workflow",
            "exec-123",
            durationMs: 1500);

        // Assert
        result.Should().NotBeNull();
        result!.Severity.Should().Be(AnomalySeverity.Medium);
        _notifierMock.Verify(x => x.OnAnomalyDetectedAsync(anomalyEvent), Times.Once);
    }

    [Fact]
    public async Task EvaluateWorkflowAsync_CriticalAnomaly_NotifiesAndLogs()
    {
        // Arrange
        var anomalyEvent = new AnomalyEvent
        {
            WorkflowName = "critical-workflow",
            ExecutionId = "exec-456",
            Severity = AnomalySeverity.Critical,
            ZScore = 6.0,
            ActualValue = 5000,
            ExpectedValue = 1000
        };

        _detectorMock
            .Setup(x => x.EvaluateAsync("critical-workflow", null, 5000, "exec-456"))
            .ReturnsAsync(anomalyEvent);

        // Act
        var result = await _service.EvaluateWorkflowAsync(
            "critical-workflow",
            "exec-456",
            durationMs: 5000);

        // Assert
        result.Should().NotBeNull();
        result!.Severity.Should().Be(AnomalySeverity.Critical);
        _notifierMock.Verify(x => x.OnAnomalyDetectedAsync(anomalyEvent), Times.Once);
    }

    #endregion

    #region EvaluateTaskAsync Tests

    [Fact]
    public async Task EvaluateTaskAsync_NoAnomaly_ReturnsNull()
    {
        // Arrange
        _detectorMock
            .Setup(x => x.EvaluateAsync("test-workflow", "task-1", 500, "exec-123"))
            .ReturnsAsync((AnomalyEvent?)null);

        // Act
        var result = await _service.EvaluateTaskAsync(
            "test-workflow",
            "task-1",
            "exec-123",
            durationMs: 500);

        // Assert
        result.Should().BeNull();
        _notifierMock.Verify(x => x.OnAnomalyDetectedAsync(It.IsAny<AnomalyEvent>()), Times.Never);
    }

    [Fact]
    public async Task EvaluateTaskAsync_AnomalyDetected_ReturnsEventAndNotifies()
    {
        // Arrange
        var anomalyEvent = new AnomalyEvent
        {
            WorkflowName = "test-workflow",
            TaskId = "task-1",
            ExecutionId = "exec-123",
            Severity = AnomalySeverity.High,
            ZScore = 4.5,
            ActualValue = 2000,
            ExpectedValue = 500
        };

        _detectorMock
            .Setup(x => x.EvaluateAsync("test-workflow", "task-1", 2000, "exec-123"))
            .ReturnsAsync(anomalyEvent);

        // Act
        var result = await _service.EvaluateTaskAsync(
            "test-workflow",
            "task-1",
            "exec-123",
            durationMs: 2000);

        // Assert
        result.Should().NotBeNull();
        result!.TaskId.Should().Be("task-1");
        result.Severity.Should().Be(AnomalySeverity.High);
        _notifierMock.Verify(x => x.OnAnomalyDetectedAsync(anomalyEvent), Times.Once);
    }

    #endregion

    #region EvaluateExecutionResultAsync Tests

    [Fact]
    public async Task EvaluateExecutionResultAsync_SuccessfulExecution_EvaluatesWorkflowAndTasks()
    {
        // Arrange
        var executionId = "11111111-1111-1111-1111-111111111111";
        var executionResult = new WorkflowExecutionResult
        {
            Success = true,
            TotalDuration = TimeSpan.FromMilliseconds(2000),
            TaskResults = new Dictionary<string, TaskExecutionResult>
            {
                ["task-1"] = new TaskExecutionResult
                {
                    Success = true,
                    Duration = TimeSpan.FromMilliseconds(500)
                },
                ["task-2"] = new TaskExecutionResult
                {
                    Success = true,
                    Duration = TimeSpan.FromMilliseconds(1200)
                }
            }
        };

        // Setup - no anomalies
        _detectorMock
            .Setup(x => x.EvaluateAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<double>(), It.IsAny<string>()))
            .ReturnsAsync((AnomalyEvent?)null);

        // Act
        var results = await _service.EvaluateExecutionResultAsync("test-workflow", executionId, executionResult);

        // Assert
        results.Should().BeEmpty();

        // Verify workflow-level evaluation was called
        _detectorMock.Verify(x => x.EvaluateAsync(
            "test-workflow",
            null,
            2000,
            executionId), Times.Once);

        // Verify task-level evaluations were called
        _detectorMock.Verify(x => x.EvaluateAsync(
            "test-workflow",
            "task-1",
            500,
            executionId), Times.Once);

        _detectorMock.Verify(x => x.EvaluateAsync(
            "test-workflow",
            "task-2",
            1200,
            executionId), Times.Once);
    }

    [Fact]
    public async Task EvaluateExecutionResultAsync_WithAnomalies_ReturnsAllAnomalies()
    {
        // Arrange
        var executionId = "22222222-2222-2222-2222-222222222222";
        var executionResult = new WorkflowExecutionResult
        {
            Success = true,
            TotalDuration = TimeSpan.FromMilliseconds(5000),
            TaskResults = new Dictionary<string, TaskExecutionResult>
            {
                ["slow-task"] = new TaskExecutionResult
                {
                    Success = true,
                    Duration = TimeSpan.FromMilliseconds(4000)
                }
            }
        };

        var workflowAnomaly = new AnomalyEvent
        {
            WorkflowName = "test-workflow",
            ExecutionId = executionId,
            Severity = AnomalySeverity.Medium
        };

        var taskAnomaly = new AnomalyEvent
        {
            WorkflowName = "test-workflow",
            TaskId = "slow-task",
            ExecutionId = executionId,
            Severity = AnomalySeverity.High
        };

        _detectorMock
            .Setup(x => x.EvaluateAsync("test-workflow", null, 5000, executionId))
            .ReturnsAsync(workflowAnomaly);

        _detectorMock
            .Setup(x => x.EvaluateAsync("test-workflow", "slow-task", 4000, executionId))
            .ReturnsAsync(taskAnomaly);

        // Act
        var results = await _service.EvaluateExecutionResultAsync("test-workflow", executionId, executionResult);

        // Assert
        results.Should().HaveCount(2);
        results.Should().Contain(workflowAnomaly);
        results.Should().Contain(taskAnomaly);
        _notifierMock.Verify(x => x.OnAnomalyDetectedAsync(It.IsAny<AnomalyEvent>()), Times.Exactly(2));
    }

    [Fact]
    public async Task EvaluateExecutionResultAsync_FailedExecution_StillEvaluates()
    {
        // Arrange
        var executionId = "33333333-3333-3333-3333-333333333333";
        var executionResult = new WorkflowExecutionResult
        {
            Success = false,
            TotalDuration = TimeSpan.FromMilliseconds(1000),
            TaskResults = new Dictionary<string, TaskExecutionResult>
            {
                ["failed-task"] = new TaskExecutionResult
                {
                    Success = false,
                    Duration = TimeSpan.FromMilliseconds(800)
                }
            }
        };

        _detectorMock
            .Setup(x => x.EvaluateAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<double>(), It.IsAny<string>()))
            .ReturnsAsync((AnomalyEvent?)null);

        // Act
        var results = await _service.EvaluateExecutionResultAsync("test-workflow", executionId, executionResult);

        // Assert
        results.Should().BeEmpty();

        // Verify evaluations were still called
        _detectorMock.Verify(x => x.EvaluateAsync(
            "test-workflow",
            null,
            1000,
            executionId), Times.Once);
    }

    [Fact]
    public async Task EvaluateExecutionResultAsync_EmptyTaskResults_OnlyEvaluatesWorkflow()
    {
        // Arrange
        var executionId = "44444444-4444-4444-4444-444444444444";
        var executionResult = new WorkflowExecutionResult
        {
            Success = true,
            TotalDuration = TimeSpan.FromMilliseconds(100),
            TaskResults = new Dictionary<string, TaskExecutionResult>()
        };

        _detectorMock
            .Setup(x => x.EvaluateAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<double>(), It.IsAny<string>()))
            .ReturnsAsync((AnomalyEvent?)null);

        // Act
        var results = await _service.EvaluateExecutionResultAsync("test-workflow", executionId, executionResult);

        // Assert
        _detectorMock.Verify(x => x.EvaluateAsync(
            "test-workflow",
            null,
            100,
            executionId), Times.Once);

        // No task evaluations
        _detectorMock.Verify(x => x.EvaluateAsync(
            It.IsAny<string>(),
            It.Is<string?>(t => t != null),
            It.IsAny<double>(),
            It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public async Task EvaluateWorkflowAsync_DetectorThrows_ReturnsNullAndLogs()
    {
        // Arrange
        _detectorMock
            .Setup(x => x.EvaluateAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<double>(), It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Baseline service unavailable"));

        // Act
        var result = await _service.EvaluateWorkflowAsync(
            "test-workflow",
            "exec-123",
            durationMs: 1000);

        // Assert
        result.Should().BeNull();
        // Service should handle exception gracefully
    }

    [Fact]
    public async Task EvaluateWorkflowAsync_NotifierThrows_StillReturnsAnomaly()
    {
        // Arrange
        var anomalyEvent = new AnomalyEvent
        {
            WorkflowName = "test-workflow",
            Severity = AnomalySeverity.Low
        };

        _detectorMock
            .Setup(x => x.EvaluateAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<double>(), It.IsAny<string>()))
            .ReturnsAsync(anomalyEvent);

        _notifierMock
            .Setup(x => x.OnAnomalyDetectedAsync(It.IsAny<AnomalyEvent>()))
            .ThrowsAsync(new Exception("SignalR connection failed"));

        // Act
        var result = await _service.EvaluateWorkflowAsync(
            "test-workflow",
            "exec-123",
            durationMs: 1000);

        // Assert
        result.Should().NotBeNull();
        // Notification failure should not prevent returning the anomaly
    }

    #endregion
}
