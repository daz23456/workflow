using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

public class WorkflowWatcherServiceTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<IDynamicEndpointService> _endpointServiceMock;
    private readonly Mock<ILogger<WorkflowWatcherService>> _loggerMock;

    public WorkflowWatcherServiceTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _endpointServiceMock = new Mock<IDynamicEndpointService>();
        _loggerMock = new Mock<ILogger<WorkflowWatcherService>>();

        // Setup default behavior
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<WorkflowResource>());
    }

    [Fact]
    public async Task Service_ShouldStartAndStop()
    {
        // Arrange
        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        var executeTask = service.StartAsync(cts.Token);
        await Task.Delay(100); // Let it run briefly
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        executeTask.IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task Service_ShouldPerformInitialSync()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100); // Wait for initial sync
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _discoveryServiceMock.Verify(x => x.DiscoverWorkflowsAsync(null), Times.AtLeastOnce);
        _endpointServiceMock.Verify(
            x => x.OnWorkflowsChangedAsync(
                It.Is<List<string>>(list => list.Contains("workflow-1")),
                It.IsAny<List<string>>(),
                null),
            Times.Once);
    }

    [Fact]
    public async Task Service_ShouldDetectAddedWorkflows()
    {
        // Arrange
        var initialWorkflows = new List<WorkflowResource>();
        var updatedWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "new-workflow" },
                Spec = new WorkflowSpec()
            }
        };

        var callCount = 0;
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(() => callCount++ == 0 ? initialWorkflows : updatedWorkflows);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(1500); // Wait for at least one polling cycle
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _endpointServiceMock.Verify(
            x => x.OnWorkflowsChangedAsync(
                It.Is<List<string>>(list => list.Contains("new-workflow")),
                It.IsAny<List<string>>(),
                null),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task Service_ShouldDetectRemovedWorkflows()
    {
        // Arrange
        var initialWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "old-workflow" },
                Spec = new WorkflowSpec()
            }
        };
        var updatedWorkflows = new List<WorkflowResource>();

        var callCount = 0;
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(() => callCount++ == 0 ? initialWorkflows : updatedWorkflows);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(1500); // Wait for at least one polling cycle
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _endpointServiceMock.Verify(
            x => x.OnWorkflowsChangedAsync(
                It.IsAny<List<string>>(),
                It.Is<List<string>>(list => list.Contains("old-workflow")),
                null),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task Service_ShouldContinuePollingAfterError()
    {
        // Arrange
        var callCount = 0;
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount == 2)
                {
                    throw new Exception("Simulated error");
                }
                return new List<WorkflowResource>();
            });

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(2500); // Wait for multiple polling cycles
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Service should have tried multiple times despite the error
        _discoveryServiceMock.Verify(x => x.DiscoverWorkflowsAsync(null), Times.AtLeast(2));
    }
}
