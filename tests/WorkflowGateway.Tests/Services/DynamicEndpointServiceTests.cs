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
}
