using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

public class WorkflowDiscoveryServiceTests
{
    private readonly Mock<IKubernetesWorkflowClient> _k8sClientMock;
    private readonly IWorkflowDiscoveryService _service;

    public WorkflowDiscoveryServiceTests()
    {
        _k8sClientMock = new Mock<IKubernetesWorkflowClient>();
        _service = new WorkflowDiscoveryService(_k8sClientMock.Object);
    }

    [Fact]
    public async Task DiscoverWorkflows_ShouldQueryKubernetes()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata
                {
                    Name = "user-enrichment",
                    Namespace = "default"
                },
                Spec = new WorkflowSpec
                {
                    Tasks = new List<WorkflowTaskStep>
                    {
                        new WorkflowTaskStep { Id = "task-1", TaskRef = "fetch-user" }
                    }
                }
            }
        };

        _k8sClientMock
            .Setup(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflows);

        // Act
        var result = await _service.DiscoverWorkflowsAsync("default");

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result[0].Metadata.Name.Should().Be("user-enrichment");

        _k8sClientMock.Verify(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DiscoverWorkflows_ShouldCacheResults()
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

        _k8sClientMock
            .Setup(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflows);

        // Act
        var result1 = await _service.DiscoverWorkflowsAsync("default");
        var result2 = await _service.DiscoverWorkflowsAsync("default");

        // Assert
        result1.Should().HaveCount(1);
        result2.Should().HaveCount(1);

        // Should only call Kubernetes once (cached)
        _k8sClientMock.Verify(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DiscoverWorkflows_ShouldRefreshAfterTTL()
    {
        // Arrange
        var k8sMock = new Mock<IKubernetesWorkflowClient>();
        var service = new WorkflowDiscoveryService(k8sMock.Object, cacheTTLSeconds: 1);

        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        k8sMock
            .Setup(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflows);

        // Act
        await service.DiscoverWorkflowsAsync("default");
        await Task.Delay(1100); // Wait for TTL to expire
        await service.DiscoverWorkflowsAsync("default");

        // Assert - Should call Kubernetes twice (cache expired)
        k8sMock.Verify(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task GetWorkflowByName_ShouldReturnWorkflow()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata
                {
                    Name = "user-enrichment",
                    Namespace = "default"
                },
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata
                {
                    Name = "order-processing",
                    Namespace = "default"
                },
                Spec = new WorkflowSpec()
            }
        };

        _k8sClientMock
            .Setup(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflows);

        // Act
        var result = await _service.GetWorkflowByNameAsync("user-enrichment", "default");

        // Assert
        result.Should().NotBeNull();
        result!.Metadata.Name.Should().Be("user-enrichment");
    }

    [Fact]
    public async Task GetWorkflowByName_WhenNotFound_ShouldReturnNull()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "other-workflow" },
                Spec = new WorkflowSpec()
            }
        };

        _k8sClientMock
            .Setup(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflows);

        // Act
        var result = await _service.GetWorkflowByNameAsync("non-existent", "default");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task WorkflowsChanged_ShouldFireWhenCacheRefreshes()
    {
        // Arrange
        var k8sMock = new Mock<IKubernetesWorkflowClient>();
        var service = new WorkflowDiscoveryService(k8sMock.Object, cacheTTLSeconds: 1);

        var eventFired = false;
        WorkflowChangedEventArgs? eventArgs = null;

        service.WorkflowsChanged += (sender, args) =>
        {
            eventFired = true;
            eventArgs = args;
        };

        var initialWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        var updatedWorkflows = new List<WorkflowResource>
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

        k8sMock.SetupSequence(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(initialWorkflows)
            .ReturnsAsync(updatedWorkflows);

        // Act
        await service.DiscoverWorkflowsAsync("default");
        await Task.Delay(1100); // Wait for TTL
        await service.DiscoverWorkflowsAsync("default");

        // Assert
        eventFired.Should().BeTrue();
        eventArgs.Should().NotBeNull();
        eventArgs!.AddedWorkflows.Should().Contain("workflow-2");
    }

    [Fact]
    public void Constructor_WithNullClient_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new WorkflowDiscoveryService(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*kubernetesClient*");
    }

    [Fact]
    public async Task DiscoverWorkflows_WithNullNamespace_ShouldUseDefault()
    {
        // Arrange - Tests line 32: var ns = @namespace ?? "default";
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        _k8sClientMock
            .Setup(x => x.ListWorkflowsAsync("default", It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflows);

        // Act
        var result = await _service.DiscoverWorkflowsAsync(null);

        // Assert
        result.Should().HaveCount(1);
        _k8sClientMock.Verify(x => x.ListWorkflowsAsync("default", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DiscoverTasks_ShouldQueryKubernetes()
    {
        // Arrange
        var tasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "fetch-user" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };

        _k8sClientMock
            .Setup(x => x.ListTasksAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(tasks);

        // Act
        var result = await _service.DiscoverTasksAsync("default");

        // Assert
        result.Should().HaveCount(1);
        result[0].Metadata.Name.Should().Be("fetch-user");
        _k8sClientMock.Verify(x => x.ListTasksAsync("default", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DiscoverTasks_ShouldCacheResults()
    {
        // Arrange
        var tasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "task-1" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };

        _k8sClientMock
            .Setup(x => x.ListTasksAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(tasks);

        // Act
        var result1 = await _service.DiscoverTasksAsync("default");
        var result2 = await _service.DiscoverTasksAsync("default");

        // Assert
        result1.Should().HaveCount(1);
        result2.Should().HaveCount(1);
        _k8sClientMock.Verify(x => x.ListTasksAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DiscoverTasks_ShouldRefreshAfterTTL()
    {
        // Arrange - Tests task cache TTL behavior
        var k8sMock = new Mock<IKubernetesWorkflowClient>();
        var service = new WorkflowDiscoveryService(k8sMock.Object, cacheTTLSeconds: 1);

        var tasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "task-1" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };

        k8sMock
            .Setup(x => x.ListTasksAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(tasks);

        // Act
        await service.DiscoverTasksAsync("default");
        await Task.Delay(1100); // Wait for TTL
        await service.DiscoverTasksAsync("default");

        // Assert
        k8sMock.Verify(x => x.ListTasksAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task DiscoverTasks_WithNullNamespace_ShouldUseDefault()
    {
        // Arrange - Tests line 69: var ns = @namespace ?? "default";
        var tasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "task-1" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };

        _k8sClientMock
            .Setup(x => x.ListTasksAsync("default", It.IsAny<CancellationToken>()))
            .ReturnsAsync(tasks);

        // Act
        var result = await _service.DiscoverTasksAsync(null);

        // Assert
        result.Should().HaveCount(1);
        _k8sClientMock.Verify(x => x.ListTasksAsync("default", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetWorkflowByName_WithNullMetadata_ShouldNotMatch()
    {
        // Arrange - Tests line 64: w.Metadata?.Name == name
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = null, // Null metadata
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        _k8sClientMock
            .Setup(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflows);

        // Act
        var result = await _service.GetWorkflowByNameAsync("workflow-1", "default");

        // Assert
        result.Should().NotBeNull();
        result!.Metadata!.Name.Should().Be("workflow-1");
    }

    [Fact]
    public async Task WorkflowsChanged_ShouldIncludeRemovedWorkflows()
    {
        // Arrange - Tests lines 118-119 with removed workflows
        var k8sMock = new Mock<IKubernetesWorkflowClient>();
        var service = new WorkflowDiscoveryService(k8sMock.Object, cacheTTLSeconds: 1);

        var eventFired = false;
        WorkflowChangedEventArgs? eventArgs = null;

        service.WorkflowsChanged += (sender, args) =>
        {
            eventFired = true;
            eventArgs = args;
        };

        var initialWorkflows = new List<WorkflowResource>
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

        var updatedWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        k8sMock.SetupSequence(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(initialWorkflows)
            .ReturnsAsync(updatedWorkflows);

        // Act
        await service.DiscoverWorkflowsAsync("default");
        await Task.Delay(1100);
        await service.DiscoverWorkflowsAsync("default");

        // Assert
        eventFired.Should().BeTrue();
        eventArgs.Should().NotBeNull();
        eventArgs!.RemovedWorkflows.Should().Contain("workflow-2");
    }

    [Fact]
    public async Task WorkflowsChanged_WithNullMetadata_ShouldFilterOut()
    {
        // Arrange - Tests lines 108-116 with null metadata filtering
        var k8sMock = new Mock<IKubernetesWorkflowClient>();
        var service = new WorkflowDiscoveryService(k8sMock.Object, cacheTTLSeconds: 1);

        var eventFired = false;
        WorkflowChangedEventArgs? eventArgs = null;

        service.WorkflowsChanged += (sender, args) =>
        {
            eventFired = true;
            eventArgs = args;
        };

        var initialWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = null, // Null metadata should be filtered
                Spec = new WorkflowSpec()
            }
        };

        var updatedWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        k8sMock.SetupSequence(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(initialWorkflows)
            .ReturnsAsync(updatedWorkflows);

        // Act
        await service.DiscoverWorkflowsAsync("default");
        await Task.Delay(1100);
        await service.DiscoverWorkflowsAsync("default");

        // Assert
        eventFired.Should().BeTrue();
        eventArgs.Should().NotBeNull();
        eventArgs!.AddedWorkflows.Should().Contain("workflow-1");
        eventArgs.RemovedWorkflows.Should().BeEmpty();
    }

    [Fact]
    public async Task WorkflowsChanged_WithNoChanges_ShouldNotFire()
    {
        // Arrange - Tests line 121: if (addedWorkflows.Any() || removedWorkflows.Any())
        var k8sMock = new Mock<IKubernetesWorkflowClient>();
        var service = new WorkflowDiscoveryService(k8sMock.Object, cacheTTLSeconds: 1);

        var eventCount = 0;

        service.WorkflowsChanged += (sender, args) =>
        {
            eventCount++;
        };

        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        k8sMock
            .Setup(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflows);

        // Act
        await service.DiscoverWorkflowsAsync("default"); // First call - event fires (empty → workflow-1)
        await Task.Delay(1100); // Wait for cache to expire
        await service.DiscoverWorkflowsAsync("default"); // Second call - event should NOT fire (workflow-1 → workflow-1)

        // Assert - Event should only fire once (on first call), not on second
        eventCount.Should().Be(1);
    }

    [Fact]
    public async Task DiscoverWorkflows_OnFirstCall_ShouldUsePreviousAsEmpty()
    {
        // Arrange - Tests line 48: cached?.Data ?? new List<WorkflowResource>()
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        var eventFired = false;
        WorkflowChangedEventArgs? eventArgs = null;

        _service.WorkflowsChanged += (sender, args) =>
        {
            eventFired = true;
            eventArgs = args;
        };

        _k8sClientMock
            .Setup(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflows);

        // Act - First call with no cached data
        var result = await _service.DiscoverWorkflowsAsync("default");

        // Assert
        result.Should().HaveCount(1);
        eventFired.Should().BeTrue();
        eventArgs!.AddedWorkflows.Should().Contain("workflow-1");
        eventArgs.RemovedWorkflows.Should().BeEmpty();
    }

    [Fact]
    public async Task DiscoverWorkflows_WithDifferentNamespaces_ShouldCacheSeparately()
    {
        // Arrange - Tests cache key generation with different namespaces
        var defaultWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-default" },
                Spec = new WorkflowSpec()
            }
        };

        var prodWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-prod" },
                Spec = new WorkflowSpec()
            }
        };

        _k8sClientMock
            .Setup(x => x.ListWorkflowsAsync("default", It.IsAny<CancellationToken>()))
            .ReturnsAsync(defaultWorkflows);

        _k8sClientMock
            .Setup(x => x.ListWorkflowsAsync("production", It.IsAny<CancellationToken>()))
            .ReturnsAsync(prodWorkflows);

        // Act
        var defaultResult = await _service.DiscoverWorkflowsAsync("default");
        var prodResult = await _service.DiscoverWorkflowsAsync("production");

        // Assert
        defaultResult.Should().HaveCount(1);
        defaultResult[0].Metadata!.Name.Should().Be("workflow-default");
        prodResult.Should().HaveCount(1);
        prodResult[0].Metadata!.Name.Should().Be("workflow-prod");

        _k8sClientMock.Verify(x => x.ListWorkflowsAsync("default", It.IsAny<CancellationToken>()), Times.Once);
        _k8sClientMock.Verify(x => x.ListWorkflowsAsync("production", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DiscoverTasks_WithDifferentNamespaces_ShouldCacheSeparately()
    {
        // Arrange - Tests task cache key generation with different namespaces
        var defaultTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "task-default" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };

        var prodTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "task-prod" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };

        _k8sClientMock
            .Setup(x => x.ListTasksAsync("default", It.IsAny<CancellationToken>()))
            .ReturnsAsync(defaultTasks);

        _k8sClientMock
            .Setup(x => x.ListTasksAsync("production", It.IsAny<CancellationToken>()))
            .ReturnsAsync(prodTasks);

        // Act
        var defaultResult = await _service.DiscoverTasksAsync("default");
        var prodResult = await _service.DiscoverTasksAsync("production");

        // Assert
        defaultResult.Should().HaveCount(1);
        defaultResult[0].Metadata.Name.Should().Be("task-default");
        prodResult.Should().HaveCount(1);
        prodResult[0].Metadata.Name.Should().Be("task-prod");

        _k8sClientMock.Verify(x => x.ListTasksAsync("default", It.IsAny<CancellationToken>()), Times.Once);
        _k8sClientMock.Verify(x => x.ListTasksAsync("production", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task WorkflowsChanged_WithBothAddedAndRemoved_ShouldIncludeBoth()
    {
        // Arrange - Tests both added and removed in one event
        var k8sMock = new Mock<IKubernetesWorkflowClient>();
        var service = new WorkflowDiscoveryService(k8sMock.Object, cacheTTLSeconds: 1);

        var eventFired = false;
        WorkflowChangedEventArgs? eventArgs = null;

        service.WorkflowsChanged += (sender, args) =>
        {
            eventFired = true;
            eventArgs = args;
        };

        var initialWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-old" },
                Spec = new WorkflowSpec()
            }
        };

        var updatedWorkflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-new" },
                Spec = new WorkflowSpec()
            }
        };

        k8sMock.SetupSequence(x => x.ListWorkflowsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(initialWorkflows)
            .ReturnsAsync(updatedWorkflows);

        // Act
        await service.DiscoverWorkflowsAsync("default");
        await Task.Delay(1100);
        await service.DiscoverWorkflowsAsync("default");

        // Assert
        eventFired.Should().BeTrue();
        eventArgs.Should().NotBeNull();
        eventArgs!.AddedWorkflows.Should().Contain("workflow-new");
        eventArgs.RemovedWorkflows.Should().Contain("workflow-old");
    }
}
