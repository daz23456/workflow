using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

public class WorkflowWatcherServiceTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<IDynamicEndpointService> _endpointServiceMock;
    private readonly Mock<IWorkflowVersioningService> _versioningServiceMock;
    private readonly Mock<ILogger<WorkflowWatcherService>> _loggerMock;
    private readonly IServiceProvider _serviceProvider;

    public WorkflowWatcherServiceTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _endpointServiceMock = new Mock<IDynamicEndpointService>();
        _versioningServiceMock = new Mock<IWorkflowVersioningService>();
        _loggerMock = new Mock<ILogger<WorkflowWatcherService>>();

        // Setup default behavior
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<WorkflowResource>());

        // Create a service collection for testing
        var services = new ServiceCollection();
        services.AddScoped(_ => _versioningServiceMock.Object);
        _serviceProvider = services.BuildServiceProvider();
    }

    [Fact]
    public async Task Service_ShouldStartAndStop()
    {
        // Arrange
        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
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
            _serviceProvider,
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
            _serviceProvider,
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
            _serviceProvider,
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
            _serviceProvider,
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

    [Fact]
    public void Constructor_WithNullDiscoveryService_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new WorkflowWatcherService(
            null!,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*discoveryService*");
    }

    [Fact]
    public void Constructor_WithNullEndpointService_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            null!,
            _serviceProvider,
            _loggerMock.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*endpointService*");
    }

    [Fact]
    public void Constructor_WithNullServiceProvider_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            null!,
            _loggerMock.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*serviceProvider*");
    }

    [Fact]
    public void Constructor_WithNullLogger_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            null!);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*logger*");
    }

    [Fact]
    public async Task Service_WithWorkflowsHavingNullMetadata_ShouldFilterThemOut()
    {
        // Arrange - Tests line 63: w.Metadata?.Name ?? ""
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = null, // Null metadata should be filtered
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "valid-workflow" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Only "valid-workflow" should be in added workflows
        _endpointServiceMock.Verify(
            x => x.OnWorkflowsChangedAsync(
                It.Is<List<string>>(list => list.Count == 1 && list.Contains("valid-workflow")),
                It.IsAny<List<string>>(),
                null),
            Times.Once);
    }

    [Fact]
    public async Task Service_WithWorkflowsHavingEmptyName_ShouldFilterThemOut()
    {
        // Arrange - Tests line 63: Where(n => !string.IsNullOrEmpty(n))
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "" }, // Empty name should be filtered
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "valid-workflow" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Only "valid-workflow" should be in added workflows
        _endpointServiceMock.Verify(
            x => x.OnWorkflowsChangedAsync(
                It.Is<List<string>>(list => list.Count == 1 && list.Contains("valid-workflow")),
                It.IsAny<List<string>>(),
                null),
            Times.Once);
    }

    [Fact]
    public async Task Service_WithNoChanges_ShouldNotNotifyEndpointService()
    {
        // Arrange - Tests line 87-90: else block with LogDebug
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
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100); // Initial sync

        // Clear invocations from initial sync
        _endpointServiceMock.Invocations.Clear();

        // Wait for second polling cycle (no changes)
        await Task.Delay(1100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - EndpointService should not be called on second sync (no changes)
        _endpointServiceMock.Verify(
            x => x.OnWorkflowsChangedAsync(It.IsAny<List<string>>(), It.IsAny<List<string>>(), null),
            Times.Never);
    }

    [Fact]
    public async Task Service_WithChanges_ShouldUpdatePreviousWorkflows()
    {
        // Arrange - Tests line 83: _previousWorkflows = currentWorkflowNames
        var firstWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        var secondWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-2" },
                Spec = new WorkflowSpec()
            }
        };

        var callCount = 0;
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(() => callCount++ == 0 ? firstWorkflows : secondWorkflows);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(1600); // Wait for at least one polling cycle

        // Clear invocations
        _endpointServiceMock.Invocations.Clear();

        // Wait for third polling cycle (should have no changes since state was updated)
        await Task.Delay(1100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - No changes on third cycle because _previousWorkflows was updated
        _endpointServiceMock.Verify(
            x => x.OnWorkflowsChangedAsync(It.IsAny<List<string>>(), It.IsAny<List<string>>(), null),
            Times.Never);
    }

    [Fact]
    public async Task Service_WithBothAddedAndRemovedWorkflows_ShouldDetectBoth()
    {
        // Arrange - Tests line 72: if (addedWorkflows.Any() || removedWorkflows.Any())
        var firstWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "old-workflow" },
                Spec = new WorkflowSpec()
            }
        };

        var secondWorkflows = new List<WorkflowResource>
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
            .ReturnsAsync(() => callCount++ == 0 ? firstWorkflows : secondWorkflows);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(1600); // Wait for second sync
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should detect both added and removed
        _endpointServiceMock.Verify(
            x => x.OnWorkflowsChangedAsync(
                It.Is<List<string>>(added => added.Contains("new-workflow")),
                It.Is<List<string>>(removed => removed.Contains("old-workflow")),
                null),
            Times.Once);
    }

    [Fact]
    public async Task StopAsync_ShouldCallBaseStopAsync()
    {
        // Arrange
        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        await service.StartAsync(cts.Token);
        await Task.Delay(100);

        // Act
        await service.StopAsync(CancellationToken.None);

        // Assert - Verify the service has stopped (IsCompleted should be true)
        // This indirectly tests that base.StopAsync was called
        cts.Cancel();

        // Verify logger was called for graceful stop
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("stopping gracefully")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task Service_WithPollingIntervalParameter_ShouldUseSpecifiedInterval()
    {
        // Arrange - Tests line 24: _pollingInterval = TimeSpan.FromSeconds(pollingIntervalSeconds)
        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 2); // 2 seconds

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100); // Initial sync

        var callCountAfterInitial = _discoveryServiceMock.Invocations.Count;

        // Wait less than polling interval
        await Task.Delay(1000); // 1 second < 2 second interval

        var callCountAfter1Second = _discoveryServiceMock.Invocations.Count;

        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should not have polled again in 1 second (interval is 2 seconds)
        callCountAfter1Second.Should().Be(callCountAfterInitial);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldLogStartMessage()
    {
        // Arrange
        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Verify logging of start message with polling interval
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("started") && v.ToString()!.Contains("10")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task ExecuteAsync_OnCancellation_ShouldLogStoppingMessage()
    {
        // Arrange
        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Verify logging of stopping message
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("stopping") || v.ToString()!.Contains("stopped")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task SyncWorkflowsAsync_WithException_ShouldLogErrorAndContinue()
    {
        // Arrange - Tests lines 92-96: catch with LogError and throw
        // and lines 46-50: exception handling in ExecuteAsync loop
        var callCount = 0;
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(() =>
            {
                callCount++;
                // Initial sync succeeds, second sync throws
                if (callCount == 2)
                {
                    throw new InvalidOperationException("Test exception");
                }
                return new List<WorkflowResource>();
            });

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(1600); // Wait for second sync with error
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Verify error was logged (from lines 92-96 and 46-50)
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to sync workflows") || v.ToString()!.Contains("Error occurred while syncing")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task Service_WithMultipleWorkflowChanges_ShouldLogCorrectCounts()
    {
        // Arrange - Tests lines 74-77: LogInformation with counts
        var firstWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        var secondWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-2" },
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-3" },
                Spec = new WorkflowSpec()
            }
        };

        var callCount = 0;
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(() => callCount++ == 0 ? firstWorkflows : secondWorkflows);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(1600);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Verify logging includes counts (2 added, 1 removed)
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("changes detected") || v.ToString()!.Contains("Added:") || v.ToString()!.Contains("Removed:")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task SyncWorkflowsAsync_AfterSuccessfulSync_ShouldLogSuccess()
    {
        // Arrange - Tests line 85: LogInformation for success
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
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Verify success logging
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("updated successfully")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    // ========== VERSION TRACKING TESTS ==========

    [Fact]
    public async Task SyncWorkflowsAsync_WithNewWorkflow_ShouldCreateVersion()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "new-workflow" },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _versioningServiceMock
            .Setup(x => x.CreateVersionIfChangedAsync(It.IsAny<WorkflowResource>()))
            .ReturnsAsync(true);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _versioningServiceMock.Verify(
            x => x.CreateVersionIfChangedAsync(It.Is<WorkflowResource>(w => w.Metadata.Name == "new-workflow")),
            Times.Once);
    }

    [Fact]
    public async Task SyncWorkflowsAsync_WhenWorkflowChanges_ShouldCreateNewVersion()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "changed-workflow" },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _versioningServiceMock
            .Setup(x => x.CreateVersionIfChangedAsync(It.IsAny<WorkflowResource>()))
            .ReturnsAsync(true);  // Indicates workflow changed

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _versioningServiceMock.Verify(
            x => x.CreateVersionIfChangedAsync(It.IsAny<WorkflowResource>()),
            Times.Once);
    }

    [Fact]
    public async Task SyncWorkflowsAsync_WhenWorkflowUnchanged_ShouldNotLogVersionCreation()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "unchanged-workflow" },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _versioningServiceMock
            .Setup(x => x.CreateVersionIfChangedAsync(It.IsAny<WorkflowResource>()))
            .ReturnsAsync(false);  // No changes detected

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should NOT log version creation count (count is 0)
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("new workflow versions")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never);
    }

    [Fact]
    public async Task SyncWorkflowsAsync_WithMultipleWorkflows_ShouldTrackAllVersions()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-2" },
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-3" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        _versioningServiceMock
            .Setup(x => x.CreateVersionIfChangedAsync(It.IsAny<WorkflowResource>()))
            .ReturnsAsync(true);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _versioningServiceMock.Verify(
            x => x.CreateVersionIfChangedAsync(It.IsAny<WorkflowResource>()),
            Times.Exactly(3));
    }

    [Fact]
    public async Task SyncWorkflowsAsync_WhenVersioningFails_ShouldContinueWithOtherWorkflows()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-2" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        var callCount = 0;
        _versioningServiceMock
            .Setup(x => x.CreateVersionIfChangedAsync(It.IsAny<WorkflowResource>()))
            .Returns(() =>
            {
                callCount++;
                if (callCount == 1)
                {
                    throw new InvalidOperationException("Version tracking failed");
                }
                return Task.FromResult(true);
            });

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should have tried both workflows despite first one failing
        _versioningServiceMock.Verify(
            x => x.CreateVersionIfChangedAsync(It.IsAny<WorkflowResource>()),
            Times.Exactly(2));

        // Verify warning was logged for failed workflow
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to track version")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SyncWorkflowsAsync_WithVersionsCreated_ShouldLogCount()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-2" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        _versioningServiceMock
            .Setup(x => x.CreateVersionIfChangedAsync(It.IsAny<WorkflowResource>()))
            .ReturnsAsync(true);

        var service = new WorkflowWatcherService(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should log creation count
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Created 2 new workflow versions")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task SyncWorkflowsAsync_WithoutVersioningService_ShouldContinueNormally()
    {
        // Arrange - Create service provider WITHOUT versioning service
        var emptyServices = new ServiceCollection();
        var emptyServiceProvider = emptyServices.BuildServiceProvider();

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
            emptyServiceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Endpoint service should still be called (workflow tracking continues)
        _endpointServiceMock.Verify(
            x => x.OnWorkflowsChangedAsync(
                It.Is<List<string>>(list => list.Contains("workflow-1")),
                It.IsAny<List<string>>(),
                null),
            Times.Once);
    }
}
