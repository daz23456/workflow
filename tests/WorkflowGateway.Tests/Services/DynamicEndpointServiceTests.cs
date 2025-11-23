using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

public class DynamicEndpointServiceTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly IDynamicEndpointService _service;

    public DynamicEndpointServiceTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _service = new DynamicEndpointService(_discoveryServiceMock.Object);
    }

    [Fact]
    public void Constructor_WithNullDiscoveryService_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new DynamicEndpointService(null!));
    }

    [Fact]
    public async Task RegisterWorkflowEndpoints_ShouldCreateThreeEndpoints()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata
            {
                Name = "user-enrichment",
                Namespace = "default"
            },
            Spec = new WorkflowSpec()
        };

        // Act
        await _service.RegisterWorkflowEndpointsAsync(workflow);

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().HaveCount(3);
        endpoints.Should().Contain(e => e.Pattern == "/api/v1/workflows/user-enrichment/execute" && e.HttpMethod == "POST");
        endpoints.Should().Contain(e => e.Pattern == "/api/v1/workflows/user-enrichment/test" && e.HttpMethod == "POST");
        endpoints.Should().Contain(e => e.Pattern == "/api/v1/workflows/user-enrichment" && e.HttpMethod == "GET");
    }

    [Fact]
    public async Task UnregisterWorkflowEndpoints_ShouldRemoveEndpoints()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "user-enrichment" },
            Spec = new WorkflowSpec()
        };

        await _service.RegisterWorkflowEndpointsAsync(workflow);

        // Act
        await _service.UnregisterWorkflowEndpointsAsync("user-enrichment");

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().BeEmpty();
    }

    [Fact]
    public async Task SyncWithDiscoveredWorkflows_ShouldRegisterAllWorkflows()
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
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(workflows);

        // Act
        await _service.SyncWithDiscoveredWorkflowsAsync("default");

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().HaveCount(6); // 3 endpoints per workflow * 2 workflows
        endpoints.Should().Contain(e => e.WorkflowName == "workflow-1");
        endpoints.Should().Contain(e => e.WorkflowName == "workflow-2");
    }

    [Fact]
    public async Task OnWorkflowsChanged_ShouldRegisterNewWorkflows()
    {
        // Arrange
        var newWorkflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "new-workflow" },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("new-workflow", It.IsAny<string>()))
            .ReturnsAsync(newWorkflow);

        // Act
        await _service.OnWorkflowsChangedAsync(
            new List<string> { "new-workflow" },
            new List<string>(),
            "default");

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().Contain(e => e.WorkflowName == "new-workflow");
        endpoints.Should().HaveCount(3);
    }

    [Fact]
    public async Task OnWorkflowsChanged_ShouldUnregisterRemovedWorkflows()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "old-workflow" },
            Spec = new WorkflowSpec()
        };

        await _service.RegisterWorkflowEndpointsAsync(workflow);

        // Act
        await _service.OnWorkflowsChangedAsync(
            new List<string>(),
            new List<string> { "old-workflow" },
            "default");

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().BeEmpty();
    }

    [Fact]
    public async Task RegisterWorkflowEndpoints_WithDuplicateName_ShouldReplaceExisting()
    {
        // Arrange
        var workflow1 = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "user-enrichment" },
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["userId"] = new WorkflowInputParameter { Type = "string" }
                }
            }
        };

        var workflow2 = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "user-enrichment" },
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["userId"] = new WorkflowInputParameter { Type = "string" },
                    ["email"] = new WorkflowInputParameter { Type = "string" }
                }
            }
        };

        // Act
        await _service.RegisterWorkflowEndpointsAsync(workflow1);
        await _service.RegisterWorkflowEndpointsAsync(workflow2); // Should replace

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().HaveCount(3); // Still only 3 endpoints (replaced, not duplicated)
        endpoints.All(e => e.WorkflowName == "user-enrichment").Should().BeTrue();
    }

    [Fact]
    public async Task RegisterWorkflowEndpoints_WithNullMetadata_ShouldThrowArgumentException()
    {
        // Arrange - Tests line 28: throw new ArgumentException
        var workflow = new WorkflowResource
        {
            Metadata = null, // Null metadata
            Spec = new WorkflowSpec()
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _service.RegisterWorkflowEndpointsAsync(workflow));
    }

    [Fact]
    public async Task RegisterWorkflowEndpoints_ShouldSetCorrectEndpointTypes()
    {
        // Arrange - Tests lines 37, 44, 51: EndpointType property
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "my-workflow" },
            Spec = new WorkflowSpec()
        };

        // Act
        await _service.RegisterWorkflowEndpointsAsync(workflow);

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().Contain(e => e.EndpointType == "execute" && e.Pattern.EndsWith("/execute"));
        endpoints.Should().Contain(e => e.EndpointType == "test" && e.Pattern.EndsWith("/test"));
        endpoints.Should().Contain(e => e.EndpointType == "get" && e.Pattern == "/api/v1/workflows/my-workflow");
    }

    [Fact]
    public async Task UnregisterWorkflowEndpoints_WithNonExistentWorkflow_ShouldNotThrow()
    {
        // Arrange - Tests line 63: TryRemove with non-existent key
        // Act
        var act = async () => await _service.UnregisterWorkflowEndpointsAsync("non-existent-workflow");

        // Assert - Should not throw
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task OnWorkflowsChanged_WhenGetWorkflowByNameReturnsNull_ShouldNotRegister()
    {
        // Arrange - Tests lines 83-86: if (workflow != null) - null path
        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("missing-workflow", It.IsAny<string>()))
            .ReturnsAsync((WorkflowResource?)null); // Returns null

        // Act
        await _service.OnWorkflowsChangedAsync(
            new List<string> { "missing-workflow" },
            new List<string>(),
            null);

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().BeEmpty(); // No endpoints registered because workflow was null
    }

    [Fact]
    public async Task OnWorkflowsChanged_WithEmptyLists_ShouldNotChangeAnything()
    {
        // Arrange
        var existingWorkflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "existing" },
            Spec = new WorkflowSpec()
        };
        await _service.RegisterWorkflowEndpointsAsync(existingWorkflow);

        // Act
        await _service.OnWorkflowsChangedAsync(
            new List<string>(), // No additions
            new List<string>(), // No removals
            null);

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().HaveCount(3); // Still has the existing workflow's 3 endpoints
        endpoints.All(e => e.WorkflowName == "existing").Should().BeTrue();
    }

    [Fact]
    public async Task SyncWithDiscoveredWorkflows_WithNullNamespace_ShouldDiscoverAllNamespaces()
    {
        // Arrange - Tests line 69: @namespace parameter can be null
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null)) // Explicitly null
            .ReturnsAsync(workflows);

        // Act
        await _service.SyncWithDiscoveredWorkflowsAsync(null);

        // Assert
        _discoveryServiceMock.Verify(x => x.DiscoverWorkflowsAsync(null), Times.Once);
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().HaveCount(3);
    }

    [Fact]
    public async Task SyncWithDiscoveredWorkflows_WithEmptyResult_ShouldNotRegisterAnyEndpoints()
    {
        // Arrange
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<WorkflowResource>()); // Empty list

        // Act
        await _service.SyncWithDiscoveredWorkflowsAsync("default");

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().BeEmpty();
    }

    [Fact]
    public async Task GetRegisteredEndpoints_WithMultipleWorkflows_ShouldReturnAllEndpoints()
    {
        // Arrange - Tests line 98: SelectMany to flatten all endpoints
        var workflow1 = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "workflow-1" },
            Spec = new WorkflowSpec()
        };
        var workflow2 = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "workflow-2" },
            Spec = new WorkflowSpec()
        };
        var workflow3 = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "workflow-3" },
            Spec = new WorkflowSpec()
        };

        await _service.RegisterWorkflowEndpointsAsync(workflow1);
        await _service.RegisterWorkflowEndpointsAsync(workflow2);
        await _service.RegisterWorkflowEndpointsAsync(workflow3);

        // Act
        var endpoints = _service.GetRegisteredEndpoints();

        // Assert
        endpoints.Should().HaveCount(9); // 3 workflows * 3 endpoints each
        endpoints.Should().Contain(e => e.WorkflowName == "workflow-1");
        endpoints.Should().Contain(e => e.WorkflowName == "workflow-2");
        endpoints.Should().Contain(e => e.WorkflowName == "workflow-3");
    }

    [Fact]
    public async Task OnWorkflowsChanged_WithBothAddedAndRemoved_ShouldHandleBoth()
    {
        // Arrange
        var oldWorkflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "old-workflow" },
            Spec = new WorkflowSpec()
        };
        await _service.RegisterWorkflowEndpointsAsync(oldWorkflow);

        var newWorkflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "new-workflow" },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("new-workflow", It.IsAny<string>()))
            .ReturnsAsync(newWorkflow);

        // Act
        await _service.OnWorkflowsChangedAsync(
            new List<string> { "new-workflow" },
            new List<string> { "old-workflow" },
            null);

        // Assert
        var endpoints = _service.GetRegisteredEndpoints();
        endpoints.Should().HaveCount(3); // Only new-workflow's 3 endpoints
        endpoints.All(e => e.WorkflowName == "new-workflow").Should().BeTrue();
        endpoints.Should().NotContain(e => e.WorkflowName == "old-workflow");
    }
}
