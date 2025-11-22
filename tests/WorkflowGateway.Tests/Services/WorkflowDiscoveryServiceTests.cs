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
}
