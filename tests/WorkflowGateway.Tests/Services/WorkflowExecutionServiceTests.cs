using FluentAssertions;
using Moq;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

public class WorkflowExecutionServiceTests
{
    private readonly Mock<IWorkflowOrchestrator> _orchestratorMock;
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<IExecutionRepository> _executionRepositoryMock;
    private readonly IWorkflowExecutionService _service;

    public WorkflowExecutionServiceTests()
    {
        _orchestratorMock = new Mock<IWorkflowOrchestrator>();
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _executionRepositoryMock = new Mock<IExecutionRepository>();

        // Setup discovery service to return empty tasks by default
        _discoveryServiceMock
            .Setup(x => x.DiscoverTasksAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        // Setup execution repository to return what was saved (default behavior)
        _executionRepositoryMock
            .Setup(x => x.SaveExecutionAsync(It.IsAny<ExecutionRecord>()))
            .ReturnsAsync((ExecutionRecord r) => r);

        _service = new WorkflowExecutionService(
            _orchestratorMock.Object,
            _discoveryServiceMock.Object,
            _executionRepositoryMock.Object,
            timeoutSeconds: 30);
    }

    [Fact]
    public async Task ExecuteAsync_WithValidWorkflow_ShouldReturnResult()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "user-enrichment" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "fetch-user" }
                }
            }
        };

        var input = new Dictionary<string, object>
        {
            ["userId"] = "123"
        };

        var orchestratorResult = new WorkflowExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object>
            {
                ["user"] = new { Id = "123", Name = "John" }
            }
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowResource>(),
                It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(orchestratorResult);

        // Act
        var result = await _service.ExecuteAsync(workflow, input);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("user");
        result.ExecutionTimeMs.Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldUseOrchestrator()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec()
        };

        var input = new Dictionary<string, object> { ["key"] = "value" };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowResource>(),
                It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await _service.ExecuteAsync(workflow, input);

        // Assert
        _orchestratorMock.Verify(
            x => x.ExecuteAsync(
                It.Is<WorkflowResource>(w => w.Metadata.Name == "test-workflow"),
                It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
                It.Is<Dictionary<string, object>>(d => d["key"].ToString() == "value"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldEnforceTimeout()
    {
        // Arrange
        var service = new WorkflowExecutionService(_orchestratorMock.Object, _discoveryServiceMock.Object, _executionRepositoryMock.Object, timeoutSeconds: 1);

        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "slow-workflow" },
            Spec = new WorkflowSpec()
        };

        var input = new Dictionary<string, object>();

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowResource>(),
                It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .Returns(async (WorkflowResource w, Dictionary<string, WorkflowTaskResource> t, Dictionary<string, object> i, CancellationToken ct) =>
            {
                await Task.Delay(5000, ct); // Simulate slow execution
                return new WorkflowExecutionResult { Success = true };
            });

        // Act
        var result = await service.ExecuteAsync(workflow, input);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("timed out");
    }

    [Fact]
    public async Task ExecuteAsync_WithFailure_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "failing-workflow" },
            Spec = new WorkflowSpec()
        };

        var input = new Dictionary<string, object>();

        var orchestratorResult = new WorkflowExecutionResult
        {
            Success = false,
            Errors = new List<string> { "Task 'fetch-user' failed: HTTP 500" }
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowResource>(),
                It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(orchestratorResult);

        // Act
        var result = await _service.ExecuteAsync(workflow, input);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Be("Task 'fetch-user' failed: HTTP 500");
        result.Output.Should().BeNull();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldIncludeExecutionMetrics()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec()
        };

        var input = new Dictionary<string, object>();

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowResource>(),
                It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .Returns(async (WorkflowResource w, Dictionary<string, WorkflowTaskResource> t, Dictionary<string, object> i, CancellationToken ct) =>
            {
                await Task.Delay(100); // Simulate some execution time
                return new WorkflowExecutionResult { Success = true };
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, input);

        // Assert
        result.ExecutionTimeMs.Should().BeGreaterThanOrEqualTo(100);
        result.WorkflowName.Should().Be("test-workflow");
    }

    [Fact]
    public async Task ExecuteAsync_ShouldCancelOnTimeout()
    {
        // Arrange
        var service = new WorkflowExecutionService(_orchestratorMock.Object, _discoveryServiceMock.Object, _executionRepositoryMock.Object, timeoutSeconds: 1);

        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec()
        };

        var input = new Dictionary<string, object>();

        var cancellationTokenReceived = false;

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowResource>(),
                It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .Returns(async (WorkflowResource w, Dictionary<string, WorkflowTaskResource> t, Dictionary<string, object> i, CancellationToken ct) =>
            {
                try
                {
                    await Task.Delay(5000, ct);
                }
                catch (OperationCanceledException)
                {
                    cancellationTokenReceived = true;
                    throw;
                }
                return new WorkflowExecutionResult { Success = true };
            });

        // Act
        var result = await service.ExecuteAsync(workflow, input);

        // Assert
        cancellationTokenReceived.Should().BeTrue();
        result.Success.Should().BeFalse();
    }

    [Fact]
    public void Constructor_WithNullOrchestrator_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new WorkflowExecutionService(null!, _discoveryServiceMock.Object, _executionRepositoryMock.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*orchestrator*");
    }

    [Fact]
    public void Constructor_WithNullDiscoveryService_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new WorkflowExecutionService(_orchestratorMock.Object, null!, _executionRepositoryMock.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*discoveryService*");
    }

    [Fact]
    public async Task ExecuteAsync_WithNullWorkflowMetadata_ShouldUseUnknownAsName()
    {
        // Arrange - Tests line 38: workflow.Metadata?.Name ?? "unknown"
        var workflow = new WorkflowResource
        {
            Metadata = null,
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.WorkflowName.Should().Be("unknown");
    }

    [Fact]
    public async Task ExecuteAsync_WithNullNamespace_ShouldUseDefaultNamespace()
    {
        // Arrange - Tests line 46: workflow.Metadata?.Namespace ?? "default"
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test", Namespace = null },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        _discoveryServiceMock.Verify(x => x.DiscoverTasksAsync("default"), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithTasksHavingNullMetadata_ShouldUseEmptyStringAsKey()
    {
        // Arrange - Tests line 48: t.Metadata?.Name ?? ""
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test" },
            Spec = new WorkflowSpec()
        };

        var tasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = null, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverTasksAsync(It.IsAny<string>()))
            .ReturnsAsync(tasks);

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.Is<Dictionary<string, WorkflowTaskResource>>(d => d.ContainsKey("")), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        _orchestratorMock.Verify(x => x.ExecuteAsync(
            It.IsAny<WorkflowResource>(),
            It.Is<Dictionary<string, WorkflowTaskResource>>(d => d.ContainsKey("")),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithOrchestratorErrors_ShouldJoinErrorMessages()
    {
        // Arrange - Tests line 61: string.Join("; ", result.Errors)
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = false,
                Errors = new List<string> { "Error 1", "Error 2", "Error 3" }
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.Error.Should().Be("Error 1; Error 2; Error 3");
    }

    [Fact]
    public async Task ExecuteAsync_WithNoErrors_ShouldHaveNullError()
    {
        // Arrange - Tests line 61: result.Errors.Any() returning false
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true, Errors = new List<string>() });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.Error.Should().BeNull();
    }

    [Fact]
    public async Task ExecuteAsync_WithUserCancellation_ShouldReturnCancellationError()
    {
        // Arrange - Tests lines 77-89: User cancellation (not timeout)
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "canceled" },
            Spec = new WorkflowSpec()
        };

        var cts = new CancellationTokenSource();

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .Returns(async (WorkflowResource w, Dictionary<string, WorkflowTaskResource> t, Dictionary<string, object> i, CancellationToken ct) =>
            {
                cts.Cancel();
                ct.ThrowIfCancellationRequested();
                return new WorkflowExecutionResult { Success = true };
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>(), cts.Token);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Be("Workflow execution was canceled");
    }

    [Fact]
    public async Task ExecuteAsync_WithOrchestratorException_ShouldReturnErrorResponse()
    {
        // Arrange - Tests lines 90-101: Generic exception handling
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "failing" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Orchestrator failed"));

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Unexpected error during workflow execution: Orchestrator failed");
    }

    [Fact]
    public async Task ExecuteAsync_WithDiscoveryServiceException_ShouldReturnErrorResponse()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "discovery-error" },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverTasksAsync(It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Discovery failed"));

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Unexpected error during workflow execution: Discovery failed");
    }

    [Fact]
    public async Task ExecuteAsync_WithExecutedTasks_ShouldReturnTaskList()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "multi-task" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task-1"] = new TaskExecutionResult { Success = true },
                    ["task-2"] = new TaskExecutionResult { Success = true },
                    ["task-3"] = new TaskExecutionResult { Success = true }
                }
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.ExecutedTasks.Should().HaveCount(3);
        result.ExecutedTasks.Should().Contain(new[] { "task-1", "task-2", "task-3" });
    }

    // ========== DATABASE PERSISTENCE TESTS ==========

    [Fact]
    public async Task ExecuteAsync_ShouldGenerateExecutionId()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.ExecutionId.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSaveExecutionRecordWithRunningStatus_BeforeOrchestration()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "user-workflow" },
            Spec = new WorkflowSpec()
        };

        ExecutionRecord? savedRecord = null;
        _executionRepositoryMock
            .Setup(x => x.SaveExecutionAsync(It.IsAny<ExecutionRecord>()))
            .Callback<ExecutionRecord>(record => savedRecord = record)
            .ReturnsAsync((ExecutionRecord r) => r);

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert - Saved at least twice (Running + final status)
        _executionRepositoryMock.Verify(x => x.SaveExecutionAsync(It.Is<ExecutionRecord>(r =>
            r.WorkflowName == "user-workflow"
        )), Times.AtLeast(2));
    }

    [Fact]
    public async Task ExecuteAsync_ShouldUpdateExecutionRecordToSucceeded_WhenWorkflowSucceeds()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "success-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert - Verify final state was saved
        _executionRepositoryMock.Verify(x => x.SaveExecutionAsync(It.Is<ExecutionRecord>(r =>
            r.Status == ExecutionStatus.Succeeded &&
            r.CompletedAt != null &&
            r.Duration != null
        )), Times.AtLeastOnce());
    }

    [Fact]
    public async Task ExecuteAsync_ShouldUpdateExecutionRecordToFailed_WhenWorkflowFails()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "fail-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = false,
                Errors = new List<string> { "Task failed" }
            });

        // Act
        await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        _executionRepositoryMock.Verify(x => x.SaveExecutionAsync(It.Is<ExecutionRecord>(r =>
            r.Status == ExecutionStatus.Failed &&
            r.CompletedAt != null
        )), Times.AtLeastOnce());
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSaveTaskExecutionRecords_AfterCompletion()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "multi-task-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "fetch-user" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "send-email" }
                }
            }
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task-1"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object> { ["userId"] = "123" },
                        Duration = TimeSpan.FromMilliseconds(150),
                        RetryCount = 0
                    },
                    ["task-2"] = new TaskExecutionResult
                    {
                        Success = true,
                        Duration = TimeSpan.FromMilliseconds(200),
                        RetryCount = 1
                    }
                }
            });

        // Act
        await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        _executionRepositoryMock.Verify(x => x.SaveExecutionAsync(It.Is<ExecutionRecord>(r =>
            r.TaskExecutionRecords.Count == 2 &&
            r.TaskExecutionRecords.Any(t => t.TaskId == "task-1" && t.Status == "Succeeded") &&
            r.TaskExecutionRecords.Any(t => t.TaskId == "task-2" && t.RetryCount == 1)
        )), Times.AtLeastOnce());
    }

    [Fact]
    public async Task ExecuteAsync_ShouldSerializeInputSnapshot_AsJson()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "input-test" },
            Spec = new WorkflowSpec()
        };

        var input = new Dictionary<string, object>
        {
            ["userId"] = "123",
            ["action"] = "register"
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await _service.ExecuteAsync(workflow, input);

        // Assert
        _executionRepositoryMock.Verify(x => x.SaveExecutionAsync(It.Is<ExecutionRecord>(r =>
            r.InputSnapshot != null &&
            r.InputSnapshot.Contains("userId") &&
            r.InputSnapshot.Contains("123")
        )), Times.AtLeastOnce());
    }

    [Fact]
    public async Task ExecuteAsync_ShouldHandleTimeout_AndSaveFailedStatus()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "timeout-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());

        var timeoutService = new WorkflowExecutionService(
            _orchestratorMock.Object,
            _discoveryServiceMock.Object,
            _executionRepositoryMock.Object,
            timeoutSeconds: 1);

        // Act
        var result = await timeoutService.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.Success.Should().BeFalse();
        _executionRepositoryMock.Verify(x => x.SaveExecutionAsync(It.Is<ExecutionRecord>(r =>
            r.Status == ExecutionStatus.Failed
        )), Times.AtLeastOnce());
    }

    [Fact]
    public async Task ExecuteAsync_ShouldIncludeTaskDetails_InResponse()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "task-details-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "fetch-data" }
                }
            }
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task-1"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object> { ["data"] = "value" },
                        Duration = TimeSpan.FromMilliseconds(300),
                        RetryCount = 0,
                        Errors = new List<string>()
                    }
                }
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.TaskDetails.Should().HaveCount(1);
        result.TaskDetails[0].TaskId.Should().Be("task-1");
        result.TaskDetails[0].TaskRef.Should().Be("fetch-data");
        result.TaskDetails[0].Success.Should().BeTrue();
        result.TaskDetails[0].DurationMs.Should().Be(300);
    }

    [Fact]
    public async Task ExecuteAsync_WithNullRepository_ShouldSkipPersistence()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "no-db-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        var serviceWithoutRepo = new WorkflowExecutionService(
            _orchestratorMock.Object,
            _discoveryServiceMock.Object,
            null,
            timeoutSeconds: 30);

        // Act
        var result = await serviceWithoutRepo.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.Success.Should().BeTrue();
        result.ExecutionId.Should().NotBeEmpty();
        // No repository calls should be made
    }

    // ========== START EXECUTION ASYNC TESTS ==========

    [Fact]
    public async Task StartExecutionAsync_WithValidWorkflow_ShouldReturnExecutionId()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, It.IsAny<string?>()))
            .ReturnsAsync(workflow);

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        var executionId = await _service.StartExecutionAsync(workflowName, new Dictionary<string, object>());

        // Assert
        executionId.Should().NotBeEmpty();
    }

    [Fact]
    public async Task StartExecutionAsync_WithNonExistentWorkflow_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var workflowName = "non-existent";

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, It.IsAny<string?>()))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        Func<Task> act = async () => await _service.StartExecutionAsync(workflowName, new Dictionary<string, object>());

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage($"Workflow '{workflowName}' not found");
    }

    // ========== ORCHESTRATION COST MAPPING TESTS ==========

    [Fact]
    public async Task ExecuteAsync_WithOrchestrationCost_ShouldMapCostMetrics()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "cost-workflow" },
            Spec = new WorkflowSpec()
        };

        // Setup timestamp-based metrics (SetupDuration, TeardownDuration, TotalOrchestrationCost are computed from these)
        var baseTime = DateTime.UtcNow;
        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                OrchestrationCost = new OrchestrationCostMetrics
                {
                    // Set timestamps to achieve desired computed durations
                    ExecutionStartedAt = baseTime,
                    FirstTaskStartedAt = baseTime.AddTicks(1000), // SetupDuration = 100 microseconds (1000 ticks = 100 microseconds)
                    LastTaskCompletedAt = baseTime.AddMilliseconds(100),
                    ExecutionCompletedAt = baseTime.AddMilliseconds(100).AddTicks(500), // TeardownDuration = 50 microseconds
                    SchedulingOverhead = TimeSpan.FromTicks(250), // 25 microseconds
                    OrchestrationCostPercentage = 5.5,
                    ExecutionIterations = 3
                }
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.OrchestrationCost.Should().NotBeNull();
        result.OrchestrationCost!.SetupDurationMicros.Should().Be(100);
        result.OrchestrationCost.TeardownDurationMicros.Should().Be(50);
        result.OrchestrationCost.SchedulingOverheadMicros.Should().Be(25);
        result.OrchestrationCost.TotalOrchestrationCostMicros.Should().Be(175);
        result.OrchestrationCost.OrchestrationCostPercentage.Should().Be(5.5);
        result.OrchestrationCost.ExecutionIterations.Should().Be(3);
    }

    [Fact]
    public async Task ExecuteAsync_WithOrchestrationCostIterations_ShouldMapIterationTimings()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "iteration-workflow" },
            Spec = new WorkflowSpec()
        };

        var startTime = DateTime.UtcNow;
        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                OrchestrationCost = new OrchestrationCostMetrics
                {
                    IterationTimings = new List<IterationTiming>
                    {
                        new IterationTiming
                        {
                            Iteration = 1,
                            TaskIds = new List<string> { "task-1", "task-2" },
                            StartedAt = startTime,
                            CompletedAt = startTime.AddMilliseconds(100),
                            SchedulingDelay = TimeSpan.FromMicroseconds(10)
                        },
                        new IterationTiming
                        {
                            Iteration = 2,
                            TaskIds = new List<string> { "task-3" },
                            StartedAt = startTime.AddMilliseconds(100),
                            CompletedAt = startTime.AddMilliseconds(150),
                            SchedulingDelay = TimeSpan.FromMicroseconds(5)
                        }
                    }
                }
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.OrchestrationCost.Should().NotBeNull();
        result.OrchestrationCost!.Iterations.Should().HaveCount(2);
        result.OrchestrationCost.Iterations![0].Iteration.Should().Be(1);
        result.OrchestrationCost.Iterations[0].TaskIds.Should().Contain("task-1", "task-2");
        result.OrchestrationCost.Iterations[0].SchedulingDelayMicros.Should().Be(10);
    }

    [Fact]
    public async Task ExecuteAsync_WithNullOrchestrationCost_ShouldReturnNullCost()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "no-cost-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                OrchestrationCost = null
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.OrchestrationCost.Should().BeNull();
    }

    // ========== GRAPH DIAGNOSTICS MAPPING TESTS ==========

    [Fact]
    public async Task ExecuteAsync_WithGraphDiagnostics_ShouldMapDiagnostics()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "diagnostics-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                GraphDiagnostics = new GraphBuildDiagnostics
                {
                    TaskDiagnostics = new List<TaskDependencyDiagnostic>
                    {
                        new TaskDependencyDiagnostic
                        {
                            TaskId = "task-1",
                            ExplicitDependencies = new List<string> { "task-0" },
                            ImplicitDependencies = new List<string> { "input" }
                        },
                        new TaskDependencyDiagnostic
                        {
                            TaskId = "task-2",
                            ExplicitDependencies = new List<string> { "task-1" },
                            ImplicitDependencies = new List<string>()
                        }
                    }
                }
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.GraphDiagnostics.Should().NotBeNull();
        result.GraphDiagnostics!.Tasks.Should().HaveCount(2);
        result.GraphDiagnostics.Tasks[0].TaskId.Should().Be("task-1");
        result.GraphDiagnostics.Tasks[0].ExplicitDependencies.Should().Contain("task-0");
        result.GraphDiagnostics.Tasks[0].ImplicitDependencies.Should().Contain("input");
    }

    [Fact]
    public async Task ExecuteAsync_WithNullGraphDiagnostics_ShouldReturnNullDiagnostics()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "no-diagnostics-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                GraphDiagnostics = null
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.GraphDiagnostics.Should().BeNull();
    }

    // ========== TASK ERROR INFO MAPPING TESTS ==========

    [Fact]
    public async Task ExecuteAsync_WithTaskErrorInfo_ShouldMapErrorDetails()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "error-info-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "failing-task" }
                }
            }
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = false,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task-1"] = new TaskExecutionResult
                    {
                        Success = false,
                        ErrorInfo = new TaskErrorInfo
                        {
                            TaskId = "task-1",
                            TaskName = "failing-task",
                            ErrorType = TaskErrorType.HttpError,
                            ErrorMessage = "Connection refused",
                            ErrorCode = "ECONNREFUSED",
                            ServiceName = "user-service",
                            ServiceUrl = "http://user-service:8080",
                            HttpMethod = "GET",
                            HttpStatusCode = 500,
                            ResponseBodyPreview = "{\"error\": \"Internal Server Error\"}",
                            RetryAttempts = 3,
                            IsRetryable = true,
                            OccurredAt = DateTime.UtcNow,
                            DurationUntilErrorMs = 150,
                            Suggestion = "Check if user-service is running",
                            SupportAction = "Contact the platform team",
                            ResponseCompliance = "PartiallyCompliant",
                            ResponseComplianceScore = 65,
                            ResponseComplianceIssues = new List<string> { "Missing 'type' field" },
                            ResponseComplianceRecommendations = new List<string> { "Add RFC 7807 type field" },
                            ResponseComplianceSummary = "Response is partially compliant"
                        }
                    }
                },
                Errors = new List<string> { "Task failed" }
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.TaskDetails.Should().HaveCount(1);
        var errorInfo = result.TaskDetails[0].ErrorInfo;
        errorInfo.Should().NotBeNull();
        errorInfo!.TaskId.Should().Be("task-1");
        errorInfo.TaskName.Should().Be("failing-task");
        errorInfo.ErrorType.Should().Be("HttpError");
        errorInfo.ErrorMessage.Should().Be("Connection refused");
        errorInfo.ErrorCode.Should().Be("ECONNREFUSED");
        errorInfo.ServiceName.Should().Be("user-service");
        errorInfo.ServiceUrl.Should().Be("http://user-service:8080");
        errorInfo.HttpMethod.Should().Be("GET");
        errorInfo.HttpStatusCode.Should().Be(500);
        errorInfo.ResponseBodyPreview.Should().Contain("Internal Server Error");
        errorInfo.RetryAttempts.Should().Be(3);
        errorInfo.IsRetryable.Should().BeTrue();
        errorInfo.DurationUntilErrorMs.Should().Be(150);
        errorInfo.Suggestion.Should().Be("Check if user-service is running");
        errorInfo.SupportAction.Should().Be("Contact the platform team");
        errorInfo.ResponseCompliance.Should().Be("PartiallyCompliant");
        errorInfo.ResponseComplianceScore.Should().Be(65);
        errorInfo.ResponseComplianceIssues.Should().Contain("Missing 'type' field");
        errorInfo.ResponseComplianceRecommendations.Should().Contain("Add RFC 7807 type field");
        errorInfo.ResponseComplianceSummary.Should().Be("Response is partially compliant");
        errorInfo.Summary.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ExecuteAsync_WithNullTaskErrorInfo_ShouldReturnNullErrorInfo()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "success-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "success-task" }
                }
            }
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task-1"] = new TaskExecutionResult
                    {
                        Success = true,
                        ErrorInfo = null
                    }
                }
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.TaskDetails.Should().HaveCount(1);
        result.TaskDetails[0].ErrorInfo.Should().BeNull();
    }

    [Fact]
    public async Task ExecuteAsync_WithEmptyTaskId_ShouldEnrichErrorInfo()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "enrich-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "my-task" }
                }
            }
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = false,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task-1"] = new TaskExecutionResult
                    {
                        Success = false,
                        ErrorInfo = new TaskErrorInfo
                        {
                            TaskId = "", // Empty - should be enriched
                            ErrorType = TaskErrorType.Timeout,
                            ErrorMessage = "Timeout"
                        }
                    }
                },
                Errors = new List<string> { "Timeout" }
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.TaskDetails[0].ErrorInfo!.TaskId.Should().Be("task-1");
        result.TaskDetails[0].ErrorInfo!.TaskName.Should().Be("my-task");
    }

    // ========== STATISTICS RECORDING TESTS ==========

    [Fact]
    public async Task ExecuteAsync_WithStatisticsService_ShouldRecordWorkflowStatistics()
    {
        // Arrange
        var statisticsServiceMock = new Mock<IStatisticsAggregationService>();
        var service = new WorkflowExecutionService(
            _orchestratorMock.Object,
            _discoveryServiceMock.Object,
            _executionRepositoryMock.Object,
            statisticsServiceMock.Object,
            timeoutSeconds: 30);

        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "stats-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        statisticsServiceMock.Verify(x => x.RecordWorkflowExecutionAsync(
            "stats-workflow",
            ExecutionStatus.Succeeded,
            It.IsAny<long>(),
            It.IsAny<DateTime>()
        ), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithStatisticsService_ShouldRecordTaskStatistics()
    {
        // Arrange
        var statisticsServiceMock = new Mock<IStatisticsAggregationService>();
        var service = new WorkflowExecutionService(
            _orchestratorMock.Object,
            _discoveryServiceMock.Object,
            _executionRepositoryMock.Object,
            statisticsServiceMock.Object,
            timeoutSeconds: 30);

        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "task-stats-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "fetch-user" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "send-email" }
                }
            }
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task-1"] = new TaskExecutionResult { Success = true, Duration = TimeSpan.FromMilliseconds(100) },
                    ["task-2"] = new TaskExecutionResult { Success = false, Duration = TimeSpan.FromMilliseconds(200) }
                }
            });

        // Act
        await service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        statisticsServiceMock.Verify(x => x.RecordTaskExecutionAsync(
            "fetch-user", "Succeeded", 100, It.IsAny<DateTime>()
        ), Times.Once);

        statisticsServiceMock.Verify(x => x.RecordTaskExecutionAsync(
            "send-email", "Failed", 200, It.IsAny<DateTime>()
        ), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WhenStatisticsServiceFails_ShouldNotFailWorkflow()
    {
        // Arrange
        var statisticsServiceMock = new Mock<IStatisticsAggregationService>();
        statisticsServiceMock
            .Setup(x => x.RecordWorkflowExecutionAsync(It.IsAny<string>(), It.IsAny<ExecutionStatus>(), It.IsAny<long>(), It.IsAny<DateTime>()))
            .ThrowsAsync(new InvalidOperationException("Statistics failed"));

        var service = new WorkflowExecutionService(
            _orchestratorMock.Object,
            _discoveryServiceMock.Object,
            _executionRepositoryMock.Object,
            statisticsServiceMock.Object,
            timeoutSeconds: 30);

        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "resilient-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        var result = await service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert - Should succeed despite statistics failure
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ExecuteAsync_WithTaskMissingTaskRef_ShouldSkipStatistics()
    {
        // Arrange
        var statisticsServiceMock = new Mock<IStatisticsAggregationService>();
        var service = new WorkflowExecutionService(
            _orchestratorMock.Object,
            _discoveryServiceMock.Object,
            _executionRepositoryMock.Object,
            statisticsServiceMock.Object,
            timeoutSeconds: 30);

        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "missing-taskref-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = null } // No TaskRef
                }
            }
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task-1"] = new TaskExecutionResult { Success = true }
                }
            });

        // Act
        await service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert - Task statistics should not be recorded
        statisticsServiceMock.Verify(x => x.RecordTaskExecutionAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long>(), It.IsAny<DateTime>()
        ), Times.Never);
    }

    // ========== GRAPH BUILD DURATION TESTS ==========

    [Fact]
    public async Task ExecuteAsync_ShouldIncludeGraphBuildDuration()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "graph-build-workflow" },
            Spec = new WorkflowSpec()
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                GraphBuildDuration = TimeSpan.FromMilliseconds(25)
            });

        // Act
        var result = await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        result.GraphBuildDurationMs.Should().Be(25);
    }

    // ========== RESOLVED URL/HTTP METHOD TESTS ==========

    [Fact]
    public async Task ExecuteAsync_ShouldCaptureResolvedUrlAndMethod()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "http-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "http-task" }
                }
            }
        };

        _orchestratorMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task-1"] = new TaskExecutionResult
                    {
                        Success = true,
                        ResolvedUrl = "http://api.example.com/users/123",
                        HttpMethod = "GET"
                    }
                }
            });

        // Act
        await _service.ExecuteAsync(workflow, new Dictionary<string, object>());

        // Assert
        _executionRepositoryMock.Verify(x => x.SaveExecutionAsync(It.Is<ExecutionRecord>(r =>
            r.TaskExecutionRecords.Any(t =>
                t.ResolvedUrl == "http://api.example.com/users/123" &&
                t.HttpMethod == "GET"
            )
        )), Times.AtLeastOnce());
    }
}
