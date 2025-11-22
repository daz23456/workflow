using FluentAssertions;
using Moq;
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
    private readonly IWorkflowExecutionService _service;

    public WorkflowExecutionServiceTests()
    {
        _orchestratorMock = new Mock<IWorkflowOrchestrator>();
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();

        // Setup discovery service to return empty tasks by default
        _discoveryServiceMock
            .Setup(x => x.DiscoverTasksAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        _service = new WorkflowExecutionService(_orchestratorMock.Object, _discoveryServiceMock.Object, timeoutSeconds: 30);
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
        var service = new WorkflowExecutionService(_orchestratorMock.Object, _discoveryServiceMock.Object, timeoutSeconds: 1);

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
        var service = new WorkflowExecutionService(_orchestratorMock.Object, _discoveryServiceMock.Object, timeoutSeconds: 1);

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
}
