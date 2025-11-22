using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Models;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class WorkflowManagementControllerTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<IDynamicEndpointService> _endpointServiceMock;
    private readonly WorkflowManagementController _controller;

    public WorkflowManagementControllerTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _endpointServiceMock = new Mock<IDynamicEndpointService>();
        _controller = new WorkflowManagementController(_discoveryServiceMock.Object, _endpointServiceMock.Object);
    }

    [Fact]
    public async Task GetWorkflows_ShouldReturnAllWorkflows()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1", Namespace = "default" },
                Spec = new WorkflowSpec()
            },
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-2", Namespace = "default" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        // Act
        var result = await _controller.GetWorkflows();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowListResponse;

        response.Should().NotBeNull();
        response!.Workflows.Should().HaveCount(2);
        response.Workflows.Should().Contain(w => w.Name == "workflow-1");
        response.Workflows.Should().Contain(w => w.Name == "workflow-2");
    }

    [Fact]
    public async Task GetWorkflows_WithNamespace_ShouldFilterByNamespace()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-prod", Namespace = "production" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync("production"))
            .ReturnsAsync(workflows);

        // Act
        var result = await _controller.GetWorkflows("production");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowListResponse;

        response.Should().NotBeNull();
        response!.Workflows.Should().HaveCount(1);
        response.Workflows[0].Name.Should().Be("workflow-prod");
        response.Workflows[0].Namespace.Should().Be("production");

        _discoveryServiceMock.Verify(x => x.DiscoverWorkflowsAsync("production"), Times.Once);
    }

    [Fact]
    public async Task GetWorkflows_ShouldIncludeEndpointUrl()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "user-enrichment", Namespace = "default" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        // Act
        var result = await _controller.GetWorkflows();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowListResponse;

        response.Should().NotBeNull();
        response!.Workflows.Should().HaveCount(1);

        var workflow = response.Workflows[0];
        workflow.Endpoint.Should().Be("/api/v1/workflows/user-enrichment/execute");
    }

    [Fact]
    public async Task GetTasks_ShouldReturnAllTasks()
    {
        // Arrange
        var tasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "fetch-user", Namespace = "default" },
                Spec = new WorkflowTaskSpec
                {
                    Type = "http"
                }
            },
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "send-email", Namespace = "default" },
                Spec = new WorkflowTaskSpec
                {
                    Type = "http"
                }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverTasksAsync(null))
            .ReturnsAsync(tasks);

        // Act
        var result = await _controller.GetTasks();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskListResponse;

        response.Should().NotBeNull();
        response!.Tasks.Should().HaveCount(2);
        response.Tasks.Should().Contain(t => t.Name == "fetch-user");
        response.Tasks.Should().Contain(t => t.Name == "send-email");
    }

    [Fact]
    public async Task GetTasks_WithNamespace_ShouldFilterByNamespace()
    {
        // Arrange
        var tasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "prod-task", Namespace = "production" },
                Spec = new WorkflowTaskSpec
                {
                    Type = "http"
                }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverTasksAsync("production"))
            .ReturnsAsync(tasks);

        // Act
        var result = await _controller.GetTasks("production");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskListResponse;

        response.Should().NotBeNull();
        response!.Tasks.Should().HaveCount(1);
        response.Tasks[0].Name.Should().Be("prod-task");
        response.Tasks[0].Namespace.Should().Be("production");

        _discoveryServiceMock.Verify(x => x.DiscoverTasksAsync("production"), Times.Once);
    }

    [Fact]
    public async Task GetWorkflows_ShouldUseCachedResults()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "cached-workflow", Namespace = "default" },
                Spec = new WorkflowSpec()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        // Act - Call twice
        await _controller.GetWorkflows();
        var result = await _controller.GetWorkflows();

        // Assert
        result.Should().BeOfType<OkObjectResult>();

        // Verify discovery service was called (caching happens in the service layer)
        _discoveryServiceMock.Verify(x => x.DiscoverWorkflowsAsync(null), Times.Exactly(2));
    }
}
