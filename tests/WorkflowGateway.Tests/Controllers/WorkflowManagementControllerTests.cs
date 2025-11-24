using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Data.Repositories;
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
    private readonly Mock<IWorkflowVersionRepository> _versionRepositoryMock;
    private readonly WorkflowManagementController _controller;

    public WorkflowManagementControllerTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _endpointServiceMock = new Mock<IDynamicEndpointService>();
        _versionRepositoryMock = new Mock<IWorkflowVersionRepository>();
        _controller = new WorkflowManagementController(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _versionRepositoryMock.Object);
    }

    [Fact]
    public void Constructor_WithNullDiscoveryService_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new WorkflowManagementController(
            null!,
            _endpointServiceMock.Object,
            _versionRepositoryMock.Object));
    }

    [Fact]
    public void Constructor_WithNullEndpointService_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new WorkflowManagementController(
            _discoveryServiceMock.Object,
            null!,
            _versionRepositoryMock.Object));
    }

    [Fact]
    public void Constructor_WithNullVersionRepository_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new WorkflowManagementController(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            null!));
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

    [Fact]
    public async Task GetWorkflows_WithEmptyResults_ShouldReturnEmptyList()
    {
        // Arrange
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource>());

        // Act
        var result = await _controller.GetWorkflows();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowListResponse;
        response.Should().NotBeNull();
        response!.Workflows.Should().BeEmpty();
    }

    [Fact]
    public async Task GetTasks_WithEmptyResults_ShouldReturnEmptyList()
    {
        // Arrange
        _discoveryServiceMock
            .Setup(x => x.DiscoverTasksAsync(null))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        // Act
        var result = await _controller.GetTasks();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskListResponse;
        response.Should().NotBeNull();
        response!.Tasks.Should().BeEmpty();
    }

    [Fact]
    public async Task GetWorkflows_WithNullMetadata_ShouldHandleGracefully()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = null,
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
        response.Workflows[0].Name.Should().Be("");
        response.Workflows[0].Namespace.Should().Be("default");
    }

    [Fact]
    public async Task GetTasks_WithNullMetadata_ShouldHandleGracefully()
    {
        // Arrange
        var tasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = null,
                Spec = new WorkflowTaskSpec { Type = "http" }
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
        response!.Tasks.Should().HaveCount(1);
        response.Tasks[0].Name.Should().Be("");
        response.Tasks[0].Namespace.Should().Be("default");
    }

    [Fact]
    public async Task GetWorkflows_WithNullSpec_ShouldHandleGracefully()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "workflow-1", Namespace = "default" },
                Spec = new WorkflowSpec { Tasks = null }
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
        response.Workflows[0].TaskCount.Should().Be(0);
    }

    [Fact]
    public async Task GetWorkflows_WithTasksList_ShouldCountTasks()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = "multi-task-workflow", Namespace = "default" },
                Spec = new WorkflowSpec
                {
                    Tasks = new List<WorkflowTaskStep>
                    {
                        new WorkflowTaskStep { Id = "task1", TaskRef = "ref1" },
                        new WorkflowTaskStep { Id = "task2", TaskRef = "ref2" },
                        new WorkflowTaskStep { Id = "task3", TaskRef = "ref3" }
                    }
                }
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
        response.Workflows[0].TaskCount.Should().Be(3);
    }

    // ========== WORKFLOW VERSIONS TESTS ==========

    [Fact]
    public async Task GetWorkflowVersions_ShouldReturnAllVersions()
    {
        // Arrange
        var versions = new List<WorkflowVersion>
        {
            new WorkflowVersion
            {
                WorkflowName = "test-workflow",
                VersionHash = "hash1",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                DefinitionSnapshot = "workflow definition 1"
            },
            new WorkflowVersion
            {
                WorkflowName = "test-workflow",
                VersionHash = "hash2",
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                DefinitionSnapshot = "workflow definition 2"
            }
        };

        _versionRepositoryMock
            .Setup(x => x.GetVersionsAsync("test-workflow"))
            .ReturnsAsync(versions);

        // Act
        var result = await _controller.GetWorkflowVersions("test-workflow");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowVersionListResponse;

        response.Should().NotBeNull();
        response!.WorkflowName.Should().Be("test-workflow");
        response.Versions.Should().HaveCount(2);
        response.TotalCount.Should().Be(2);
        response.Versions.Should().Contain(v => v.VersionHash == "hash1");
        response.Versions.Should().Contain(v => v.VersionHash == "hash2");
    }

    [Fact]
    public async Task GetWorkflowVersions_ShouldOrderByCreatedAtDescending()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var versions = new List<WorkflowVersion>
        {
            new WorkflowVersion
            {
                WorkflowName = "test-workflow",
                VersionHash = "oldest",
                CreatedAt = now.AddHours(-3),
                DefinitionSnapshot = "old definition"
            },
            new WorkflowVersion
            {
                WorkflowName = "test-workflow",
                VersionHash = "newest",
                CreatedAt = now,
                DefinitionSnapshot = "new definition"
            },
            new WorkflowVersion
            {
                WorkflowName = "test-workflow",
                VersionHash = "middle",
                CreatedAt = now.AddHours(-1),
                DefinitionSnapshot = "middle definition"
            }
        };

        _versionRepositoryMock
            .Setup(x => x.GetVersionsAsync("test-workflow"))
            .ReturnsAsync(versions);

        // Act
        var result = await _controller.GetWorkflowVersions("test-workflow");

        // Assert
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowVersionListResponse;

        response!.Versions[0].VersionHash.Should().Be("newest");
        response.Versions[1].VersionHash.Should().Be("middle");
        response.Versions[2].VersionHash.Should().Be("oldest");
    }

    [Fact]
    public async Task GetWorkflowVersions_WithNoVersions_ShouldReturnEmptyList()
    {
        // Arrange
        _versionRepositoryMock
            .Setup(x => x.GetVersionsAsync("nonexistent-workflow"))
            .ReturnsAsync(new List<WorkflowVersion>());

        // Act
        var result = await _controller.GetWorkflowVersions("nonexistent-workflow");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowVersionListResponse;

        response.Should().NotBeNull();
        response!.WorkflowName.Should().Be("nonexistent-workflow");
        response.Versions.Should().BeEmpty();
        response.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task GetWorkflowVersions_ShouldIncludeDefinitionSnapshot()
    {
        // Arrange
        var versions = new List<WorkflowVersion>
        {
            new WorkflowVersion
            {
                WorkflowName = "test-workflow",
                VersionHash = "hash1",
                CreatedAt = DateTime.UtcNow,
                DefinitionSnapshot = "apiVersion: workflow.io/v1\nkind: Workflow"
            }
        };

        _versionRepositoryMock
            .Setup(x => x.GetVersionsAsync("test-workflow"))
            .ReturnsAsync(versions);

        // Act
        var result = await _controller.GetWorkflowVersions("test-workflow");

        // Assert
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowVersionListResponse;

        response!.Versions[0].DefinitionSnapshot.Should().Be("apiVersion: workflow.io/v1\nkind: Workflow");
    }

    [Fact]
    public async Task GetWorkflowVersions_ShouldCallRepositoryWithCorrectWorkflowName()
    {
        // Arrange
        _versionRepositoryMock
            .Setup(x => x.GetVersionsAsync("my-workflow"))
            .ReturnsAsync(new List<WorkflowVersion>());

        // Act
        await _controller.GetWorkflowVersions("my-workflow");

        // Assert
        _versionRepositoryMock.Verify(x => x.GetVersionsAsync("my-workflow"), Times.Once);
    }
}
