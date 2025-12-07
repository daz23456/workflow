using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
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
    private readonly Mock<IExecutionRepository> _executionRepositoryMock;
    private readonly Mock<IHttpTaskExecutor> _taskExecutorMock;
    private readonly Mock<IWorkflowInputValidator> _inputValidatorMock;
    private readonly WorkflowManagementController _controller;

    public WorkflowManagementControllerTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _endpointServiceMock = new Mock<IDynamicEndpointService>();
        _versionRepositoryMock = new Mock<IWorkflowVersionRepository>();
        _executionRepositoryMock = new Mock<IExecutionRepository>();
        _taskExecutorMock = new Mock<IHttpTaskExecutor>();
        _inputValidatorMock = new Mock<IWorkflowInputValidator>();

        // Setup default mock returns for statistics methods
        _executionRepositoryMock
            .Setup(r => r.GetAllWorkflowStatisticsAsync())
            .ReturnsAsync(new Dictionary<string, WorkflowStatistics>());
        _executionRepositoryMock
            .Setup(r => r.GetAllTaskStatisticsAsync())
            .ReturnsAsync(new Dictionary<string, TaskStatistics>());
        _executionRepositoryMock
            .Setup(r => r.GetWorkflowStatisticsAsync(It.IsAny<string>()))
            .ReturnsAsync((WorkflowStatistics?)null);
        _executionRepositoryMock
            .Setup(r => r.GetTaskStatisticsAsync(It.IsAny<string>()))
            .ReturnsAsync((TaskStatistics?)null);

        // Setup default mock returns for discovery service
        _discoveryServiceMock
            .Setup(s => s.DiscoverWorkflowsAsync(It.IsAny<string?>()))
            .ReturnsAsync(new List<WorkflowResource>());
        _discoveryServiceMock
            .Setup(s => s.DiscoverTasksAsync(It.IsAny<string?>()))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        _controller = new WorkflowManagementController(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _versionRepositoryMock.Object,
            _executionRepositoryMock.Object,
            _taskExecutorMock.Object,
            _inputValidatorMock.Object);
    }

    [Fact]
    public void Constructor_WithNullDiscoveryService_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new WorkflowManagementController(
            null!,
            _endpointServiceMock.Object,
            _versionRepositoryMock.Object,
            _executionRepositoryMock.Object,
            _taskExecutorMock.Object,
            _inputValidatorMock.Object));
    }

    [Fact]
    public void Constructor_WithNullEndpointService_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new WorkflowManagementController(
            _discoveryServiceMock.Object,
            null!,
            _versionRepositoryMock.Object,
            _executionRepositoryMock.Object,
            _taskExecutorMock.Object,
            _inputValidatorMock.Object));
    }

    [Fact]
    public void Constructor_WithNullVersionRepository_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new WorkflowManagementController(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            null!,
            _executionRepositoryMock.Object,
            _taskExecutorMock.Object,
            _inputValidatorMock.Object));
    }

    [Fact]
    public void Constructor_WithNullExecutionRepository_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new WorkflowManagementController(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _versionRepositoryMock.Object,
            null!,
            _taskExecutorMock.Object,
            _inputValidatorMock.Object));
    }

    [Fact]
    public void Constructor_WithNullInputValidator_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new WorkflowManagementController(
            _discoveryServiceMock.Object,
            _endpointServiceMock.Object,
            _versionRepositoryMock.Object,
            _executionRepositoryMock.Object,
            _taskExecutorMock.Object,
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

    // ========== TASK DETAIL ENDPOINT TESTS ==========

    [Fact]
    public async Task GetTaskDetail_ShouldReturnTaskDetails()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                InputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["userId"] = new PropertyDefinition { Type = "string" }
                    }
                },
                OutputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["user"] = new PropertyDefinition { Type = "object" }
                    }
                },
                Http = new HttpRequestDefinition
                {
                    Method = "GET",
                    Url = "https://api.example.com/users/{{input.userId}}",
                    Headers = new Dictionary<string, string> { ["Accept"] = "application/json" }
                },
                Timeout = "30s"
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync(task);

        // Act
        var result = await _controller.GetTaskDetail(taskName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskDetailResponse;

        response.Should().NotBeNull();
        response!.Name.Should().Be(taskName);
        response.Namespace.Should().Be("default");
        response.InputSchema.Should().NotBeNull();
        response.OutputSchema.Should().NotBeNull();
        response.HttpRequest.Should().NotBeNull();
        response.HttpRequest!.Method.Should().Be("GET");
        response.HttpRequest.Url.Should().Be("https://api.example.com/users/{{input.userId}}");
        response.Timeout.Should().Be("30s");
    }

    [Fact]
    public async Task GetTaskDetail_WithNonExistentTask_ShouldReturn404()
    {
        // Arrange
        _discoveryServiceMock
            .Setup(x => x.GetTaskByNameAsync("nonexistent-task", "default"))
            .ReturnsAsync((WorkflowTaskResource?)null);

        // Act
        var result = await _controller.GetTaskDetail("nonexistent-task");

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetTaskDetail_ShouldIncludeStatistics()
    {
        // Arrange
        var taskName = "send-email";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        _discoveryServiceMock
            .Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync(task);

        // Act
        var result = await _controller.GetTaskDetail(taskName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskDetailResponse;

        response.Should().NotBeNull();
        response!.Stats.Should().NotBeNull();
        response.Stats!.UsedByWorkflows.Should().BeGreaterThanOrEqualTo(0);
        response.Stats.TotalExecutions.Should().BeGreaterThanOrEqualTo(0);
        response.Stats.AvgDurationMs.Should().BeGreaterThanOrEqualTo(0);
        response.Stats.SuccessRate.Should().BeInRange(0, 100);
    }

    [Fact]
    public async Task GetTaskDetail_WithCustomNamespace_ShouldUseProvidedNamespace()
    {
        // Arrange
        var taskName = "prod-task";
        var customNamespace = "production";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = customNamespace },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        _discoveryServiceMock
            .Setup(x => x.GetTaskByNameAsync(taskName, customNamespace))
            .ReturnsAsync(task);

        // Act
        var result = await _controller.GetTaskDetail(taskName, customNamespace);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskDetailResponse;

        response.Should().NotBeNull();
        response!.Namespace.Should().Be(customNamespace);

        _discoveryServiceMock.Verify(x => x.GetTaskByNameAsync(taskName, customNamespace), Times.Once);
    }

    [Fact]
    public async Task GetTaskUsage_ShouldReturnWorkflowsUsingTask()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        var workflows = new List<WorkflowResource>
        {
            new()
            {
                Metadata = new ResourceMetadata { Name = "user-workflow", Namespace = "default" },
                Spec = new WorkflowSpec
                {
                    Tasks = new List<WorkflowTaskStep>
                    {
                        new() { Id = "task1", TaskRef = taskName },
                        new() { Id = "task2", TaskRef = "other-task" }
                    }
                }
            },
            new()
            {
                Metadata = new ResourceMetadata { Name = "profile-workflow", Namespace = "default" },
                Spec = new WorkflowSpec
                {
                    Tasks = new List<WorkflowTaskStep>
                    {
                        new() { Id = "task1", TaskRef = taskName }
                    }
                }
            },
            new()
            {
                Metadata = new ResourceMetadata { Name = "other-workflow", Namespace = "default" },
                Spec = new WorkflowSpec
                {
                    Tasks = new List<WorkflowTaskStep>
                    {
                        new() { Id = "task1", TaskRef = "different-task" }
                    }
                }
            }
        };

        _discoveryServiceMock.Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync(task);
        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync("default"))
            .ReturnsAsync(workflows);

        // Act
        var result = await _controller.GetTaskUsage(taskName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskUsageListResponse;

        response.Should().NotBeNull();
        response!.TaskName.Should().Be(taskName);
        response.Workflows.Should().HaveCount(2);
        response.Workflows.Should().Contain(u => u.WorkflowName == "user-workflow");
        response.Workflows.Should().Contain(u => u.WorkflowName == "profile-workflow");
        response.Workflows.Should().NotContain(u => u.WorkflowName == "other-workflow");
    }

    [Fact]
    public async Task GetTaskUsage_WithNonExistentTask_ShouldReturn404()
    {
        // Arrange
        var taskName = "non-existent-task";
        _discoveryServiceMock.Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync((WorkflowTaskResource?)null);

        // Act
        var result = await _controller.GetTaskUsage(taskName);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetTaskUsage_ShouldSupportPagination()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        var workflows = Enumerable.Range(1, 10)
            .Select(i => new WorkflowResource
            {
                Metadata = new ResourceMetadata { Name = $"workflow-{i}", Namespace = "default" },
                Spec = new WorkflowSpec
                {
                    Tasks = new List<WorkflowTaskStep>
                    {
                        new() { Id = "task1", TaskRef = taskName }
                    }
                }
            }).ToList();

        _discoveryServiceMock.Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync(task);
        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync("default"))
            .ReturnsAsync(workflows);

        // Act - Get page 2 with 3 items per page
        var result = await _controller.GetTaskUsage(taskName, skip: 3, take: 3);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskUsageListResponse;

        response.Should().NotBeNull();
        response!.Workflows.Should().HaveCount(3);
        response.TotalCount.Should().Be(10);
        response.Workflows[0].WorkflowName.Should().Be("workflow-4");
    }

    [Fact]
    public async Task GetTaskUsage_ShouldIncludeTaskCount()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        var workflows = new List<WorkflowResource>
        {
            new()
            {
                Metadata = new ResourceMetadata { Name = "multi-use-workflow", Namespace = "default" },
                Spec = new WorkflowSpec
                {
                    Tasks = new List<WorkflowTaskStep>
                    {
                        new() { Id = "task1", TaskRef = taskName },
                        new() { Id = "task2", TaskRef = taskName },
                        new() { Id = "task3", TaskRef = "other-task" }
                    }
                }
            }
        };

        _discoveryServiceMock.Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync(task);
        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync("default"))
            .ReturnsAsync(workflows);

        // Act
        var result = await _controller.GetTaskUsage(taskName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskUsageListResponse;

        response.Should().NotBeNull();
        response!.Workflows.Should().HaveCount(1);
        response.Workflows[0].TaskCount.Should().Be(2); // Used twice in the workflow
    }

    [Fact]
    public async Task GetTaskExecutions_ShouldReturnExecutionHistory()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        var executions = new List<(ExecutionRecord Execution, TaskExecutionRecord Task)>
        {
            (
                new ExecutionRecord
                {
                    Id = Guid.NewGuid(),
                    WorkflowName = "user-profile",
                    Status = ExecutionStatus.Succeeded,
                    StartedAt = DateTime.UtcNow.AddMinutes(-10)
                },
                new TaskExecutionRecord
                {
                    TaskRef = taskName,
                    Status = "Succeeded",
                    Duration = TimeSpan.FromMilliseconds(150),
                    StartedAt = DateTime.UtcNow.AddMinutes(-10)
                }
            ),
            (
                new ExecutionRecord
                {
                    Id = Guid.NewGuid(),
                    WorkflowName = "simple-fetch",
                    Status = ExecutionStatus.Failed,
                    StartedAt = DateTime.UtcNow.AddMinutes(-5)
                },
                new TaskExecutionRecord
                {
                    TaskRef = taskName,
                    Status = "Failed",
                    Duration = TimeSpan.FromMilliseconds(200),
                    StartedAt = DateTime.UtcNow.AddMinutes(-5)
                }
            )
        };

        _discoveryServiceMock.Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync(task);
        _executionRepositoryMock.Setup(x => x.GetTaskExecutionsAsync(taskName, 0, 20))
            .ReturnsAsync(executions);

        // Act
        var result = await _controller.GetTaskExecutions(taskName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskExecutionListResponse;

        response.Should().NotBeNull();
        response!.TaskName.Should().Be(taskName);
        response.Executions.Should().HaveCount(2);
        response.AverageDurationMs.Should().Be(175); // (150 + 200) / 2
    }

    [Fact]
    public async Task GetTaskExecutions_WithNonExistentTask_ShouldReturn404()
    {
        // Arrange
        var taskName = "non-existent-task";
        _discoveryServiceMock.Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync((WorkflowTaskResource?)null);

        // Act
        var result = await _controller.GetTaskExecutions(taskName);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetTaskExecutions_ShouldSupportPagination()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        var executions = Enumerable.Range(1, 3)
            .Select(i => (
                new ExecutionRecord
                {
                    Id = Guid.NewGuid(),
                    WorkflowName = $"workflow-{i}",
                    Status = ExecutionStatus.Succeeded,
                    StartedAt = DateTime.UtcNow.AddMinutes(-i)
                },
                new TaskExecutionRecord
                {
                    TaskRef = taskName,
                    Status = "Succeeded",
                    Duration = TimeSpan.FromMilliseconds(100),
                    StartedAt = DateTime.UtcNow.AddMinutes(-i)
                }
            )).ToList();

        _discoveryServiceMock.Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync(task);
        _executionRepositoryMock.Setup(x => x.GetTaskExecutionsAsync(taskName, 2, 5))
            .ReturnsAsync(executions.Skip(2).Take(5).ToList());

        // Act - Get page 2 with 5 items per page
        var result = await _controller.GetTaskExecutions(taskName, skip: 2, take: 5);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskExecutionListResponse;

        response.Should().NotBeNull();
        response!.Executions.Should().HaveCount(1);
        response.Skip.Should().Be(2);
        response.Take.Should().Be(5);
    }

    #region ExecuteTask Tests

    [Fact]
    public async Task ExecuteTask_WithNonExistentTask_ShouldReturn404()
    {
        // Arrange
        var taskName = "non-existent-task";
        var request = new TaskExecutionRequest
        {
            Input = new Dictionary<string, object> { ["userId"] = "123" }
        };

        _discoveryServiceMock.Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync((WorkflowTaskResource?)null);

        // Act
        var result = await _controller.ExecuteTask(taskName, request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task ExecuteTask_WithValidInput_ShouldReturnSuccessResponse()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Http = new HttpRequestDefinition
                {
                    Method = "GET",
                    Url = "https://api.example.com/users/{{input.userId}}",
                    Headers = new Dictionary<string, string>()
                },
                InputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["userId"] = new PropertyDefinition { Type = "string" }
                    }
                }
            }
        };

        var request = new TaskExecutionRequest
        {
            Input = new Dictionary<string, object> { ["userId"] = "123" }
        };

        _discoveryServiceMock.Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync(task);

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowTaskSpec>(),
                It.IsAny<TemplateContext>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["id"] = "123", ["name"] = "John Doe" },
                Duration = TimeSpan.FromMilliseconds(150),
                RetryCount = 0
            });

        // Act
        var result = await _controller.ExecuteTask(taskName, request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskExecutionResponse;

        response.Should().NotBeNull();
        response!.TaskName.Should().Be(taskName);
        response.ExecutionId.Should().NotBeNullOrEmpty();
        response.Status.Should().Be(ExecutionStatus.Succeeded);
        response.DurationMs.Should().Be(150);
        response.Output.Should().NotBeNull();
        response.Error.Should().BeNull();
    }

    [Fact]
    public async Task ExecuteTask_WithEmptyInput_ShouldStillExecute()
    {
        // Arrange
        var taskName = "simple-task";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Http = new HttpRequestDefinition
                {
                    Method = "GET",
                    Url = "https://api.example.com/ping",
                    Headers = new Dictionary<string, string>()
                }
            }
        };

        var request = new TaskExecutionRequest
        {
            Input = new Dictionary<string, object>()
        };

        _discoveryServiceMock.Setup(x => x.GetTaskByNameAsync(taskName, "default"))
            .ReturnsAsync(task);

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowTaskSpec>(),
                It.IsAny<TemplateContext>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["status"] = "ok" },
                Duration = TimeSpan.FromMilliseconds(50),
                RetryCount = 0
            });

        // Act
        var result = await _controller.ExecuteTask(taskName, request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TaskExecutionResponse;

        response.Should().NotBeNull();
        response!.TaskName.Should().Be(taskName);
        response.Status.Should().Be(ExecutionStatus.Succeeded);
    }

    #endregion

    #region Duration Trends Tests

    // ========== WORKFLOW DURATION TRENDS TESTS ==========

    [Fact]
    public async Task GetWorkflowDurationTrends_WithValidWorkflow_ShouldReturnDataPoints()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName, Namespace = "default" },
            Spec = new WorkflowSpec()
        };

        var dataPoints = new List<DurationDataPoint>
        {
            new DurationDataPoint
            {
                Date = DateTime.UtcNow.Date.AddDays(-2),
                AverageDurationMs = 150.0,
                MinDurationMs = 100.0,
                MaxDurationMs = 200.0,
                P50DurationMs = 150.0,
                P95DurationMs = 190.0,
                ExecutionCount = 10,
                SuccessCount = 9,
                FailureCount = 1
            },
            new DurationDataPoint
            {
                Date = DateTime.UtcNow.Date.AddDays(-1),
                AverageDurationMs = 175.0,
                MinDurationMs = 120.0,
                MaxDurationMs = 250.0,
                P50DurationMs = 170.0,
                P95DurationMs = 240.0,
                ExecutionCount = 15,
                SuccessCount = 14,
                FailureCount = 1
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        _executionRepositoryMock
            .Setup(x => x.GetWorkflowDurationTrendsAsync(workflowName, 30))
            .ReturnsAsync(dataPoints);

        // Act
        var result = await _controller.GetWorkflowDurationTrends(workflowName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as DurationTrendsResponse;

        response.Should().NotBeNull();
        response!.EntityType.Should().Be("Workflow");
        response.EntityName.Should().Be(workflowName);
        response.DaysBack.Should().Be(30);
        response.DataPoints.Should().HaveCount(2);
        response.DataPoints[0].AverageDurationMs.Should().Be(150.0);
        response.DataPoints[1].AverageDurationMs.Should().Be(175.0);

        _executionRepositoryMock.Verify(x => x.GetWorkflowDurationTrendsAsync(workflowName, 30), Times.Once);
    }

    [Fact]
    public async Task GetWorkflowDurationTrends_WithNonExistentWorkflow_ShouldReturn404()
    {
        // Arrange
        var workflowName = "non-existent-workflow";

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.GetWorkflowDurationTrends(workflowName);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
        var notFoundResult = result as NotFoundObjectResult;
        notFoundResult!.Value.Should().NotBeNull();

        _executionRepositoryMock.Verify(x => x.GetWorkflowDurationTrendsAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetWorkflowDurationTrends_WithInvalidDaysBackTooLow_ShouldReturn400()
    {
        // Arrange
        var workflowName = "test-workflow";

        // Act
        var result = await _controller.GetWorkflowDurationTrends(workflowName, daysBack: 0);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        badRequestResult!.Value.Should().NotBeNull();

        _discoveryServiceMock.Verify(x => x.GetWorkflowByNameAsync(It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
        _executionRepositoryMock.Verify(x => x.GetWorkflowDurationTrendsAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetWorkflowDurationTrends_WithInvalidDaysBackTooHigh_ShouldReturn400()
    {
        // Arrange
        var workflowName = "test-workflow";

        // Act
        var result = await _controller.GetWorkflowDurationTrends(workflowName, daysBack: 91);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        badRequestResult!.Value.Should().NotBeNull();

        _discoveryServiceMock.Verify(x => x.GetWorkflowByNameAsync(It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
        _executionRepositoryMock.Verify(x => x.GetWorkflowDurationTrendsAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetWorkflowDurationTrends_WithEmptyDataPoints_ShouldReturnEmptyList()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName, Namespace = "default" },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        _executionRepositoryMock
            .Setup(x => x.GetWorkflowDurationTrendsAsync(workflowName, 30))
            .ReturnsAsync(new List<DurationDataPoint>());

        // Act
        var result = await _controller.GetWorkflowDurationTrends(workflowName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as DurationTrendsResponse;

        response.Should().NotBeNull();
        response!.EntityType.Should().Be("Workflow");
        response.EntityName.Should().Be(workflowName);
        response.DataPoints.Should().BeEmpty();
    }

    [Fact]
    public async Task GetWorkflowDurationTrends_WithCustomDaysBack_ShouldUseProvidedValue()
    {
        // Arrange
        var workflowName = "test-workflow";
        var customDaysBack = 7;
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName, Namespace = "default" },
            Spec = new WorkflowSpec()
        };

        var dataPoints = new List<DurationDataPoint>
        {
            new DurationDataPoint
            {
                Date = DateTime.UtcNow.Date.AddDays(-1),
                AverageDurationMs = 150.0,
                ExecutionCount = 5,
                SuccessCount = 5,
                FailureCount = 0
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        _executionRepositoryMock
            .Setup(x => x.GetWorkflowDurationTrendsAsync(workflowName, customDaysBack))
            .ReturnsAsync(dataPoints);

        // Act
        var result = await _controller.GetWorkflowDurationTrends(workflowName, daysBack: customDaysBack);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as DurationTrendsResponse;

        response.Should().NotBeNull();
        response!.DaysBack.Should().Be(customDaysBack);

        _executionRepositoryMock.Verify(x => x.GetWorkflowDurationTrendsAsync(workflowName, customDaysBack), Times.Once);
    }

    [Fact]
    public async Task GetWorkflowDurationTrends_ShouldIncludeAllDataPointFields()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName, Namespace = "default" },
            Spec = new WorkflowSpec()
        };

        var dataPoints = new List<DurationDataPoint>
        {
            new DurationDataPoint
            {
                Date = DateTime.UtcNow.Date,
                AverageDurationMs = 150.0,
                MinDurationMs = 100.0,
                MaxDurationMs = 200.0,
                P50DurationMs = 150.0,
                P95DurationMs = 190.0,
                ExecutionCount = 10,
                SuccessCount = 9,
                FailureCount = 1
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        _executionRepositoryMock
            .Setup(x => x.GetWorkflowDurationTrendsAsync(workflowName, 30))
            .ReturnsAsync(dataPoints);

        // Act
        var result = await _controller.GetWorkflowDurationTrends(workflowName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as DurationTrendsResponse;

        response.Should().NotBeNull();
        response!.DataPoints.Should().HaveCount(1);

        var dataPoint = response.DataPoints[0];
        dataPoint.Date.Should().Be(DateTime.UtcNow.Date);
        dataPoint.AverageDurationMs.Should().Be(150.0);
        dataPoint.MinDurationMs.Should().Be(100.0);
        dataPoint.MaxDurationMs.Should().Be(200.0);
        dataPoint.P50DurationMs.Should().Be(150.0);
        dataPoint.P95DurationMs.Should().Be(190.0);
        dataPoint.ExecutionCount.Should().Be(10);
        dataPoint.SuccessCount.Should().Be(9);
        dataPoint.FailureCount.Should().Be(1);
    }

    // ========== TASK DURATION TRENDS TESTS ==========

    [Fact]
    public async Task GetTaskDurationTrends_WithValidTask_ShouldReturnDataPoints()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        var dataPoints = new List<DurationDataPoint>
        {
            new DurationDataPoint
            {
                Date = DateTime.UtcNow.Date.AddDays(-2),
                AverageDurationMs = 120.0,
                MinDurationMs = 90.0,
                MaxDurationMs = 150.0,
                P50DurationMs = 115.0,
                P95DurationMs = 145.0,
                ExecutionCount = 20,
                SuccessCount = 19,
                FailureCount = 1
            },
            new DurationDataPoint
            {
                Date = DateTime.UtcNow.Date.AddDays(-1),
                AverageDurationMs = 135.0,
                MinDurationMs = 100.0,
                MaxDurationMs = 180.0,
                P50DurationMs = 130.0,
                P95DurationMs = 170.0,
                ExecutionCount = 25,
                SuccessCount = 24,
                FailureCount = 1
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetTaskByNameAsync(taskName, null))
            .ReturnsAsync(task);

        _executionRepositoryMock
            .Setup(x => x.GetTaskDurationTrendsAsync(taskName, 30))
            .ReturnsAsync(dataPoints);

        // Act
        var result = await _controller.GetTaskDurationTrends(taskName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as DurationTrendsResponse;

        response.Should().NotBeNull();
        response!.EntityType.Should().Be("Task");
        response.EntityName.Should().Be(taskName);
        response.DaysBack.Should().Be(30);
        response.DataPoints.Should().HaveCount(2);
        response.DataPoints[0].AverageDurationMs.Should().Be(120.0);
        response.DataPoints[1].AverageDurationMs.Should().Be(135.0);

        _executionRepositoryMock.Verify(x => x.GetTaskDurationTrendsAsync(taskName, 30), Times.Once);
    }

    [Fact]
    public async Task GetTaskDurationTrends_WithNonExistentTask_ShouldReturn404()
    {
        // Arrange
        var taskName = "non-existent-task";

        _discoveryServiceMock
            .Setup(x => x.GetTaskByNameAsync(taskName, null))
            .ReturnsAsync((WorkflowTaskResource?)null);

        // Act
        var result = await _controller.GetTaskDurationTrends(taskName);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
        var notFoundResult = result as NotFoundObjectResult;
        notFoundResult!.Value.Should().NotBeNull();

        _executionRepositoryMock.Verify(x => x.GetTaskDurationTrendsAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetTaskDurationTrends_WithInvalidDaysBackTooLow_ShouldReturn400()
    {
        // Arrange
        var taskName = "fetch-user";

        // Act
        var result = await _controller.GetTaskDurationTrends(taskName, daysBack: 0);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        badRequestResult!.Value.Should().NotBeNull();

        _discoveryServiceMock.Verify(x => x.GetTaskByNameAsync(It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
        _executionRepositoryMock.Verify(x => x.GetTaskDurationTrendsAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetTaskDurationTrends_WithInvalidDaysBackTooHigh_ShouldReturn400()
    {
        // Arrange
        var taskName = "fetch-user";

        // Act
        var result = await _controller.GetTaskDurationTrends(taskName, daysBack: 100);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        badRequestResult!.Value.Should().NotBeNull();

        _discoveryServiceMock.Verify(x => x.GetTaskByNameAsync(It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
        _executionRepositoryMock.Verify(x => x.GetTaskDurationTrendsAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetTaskDurationTrends_WithEmptyDataPoints_ShouldReturnEmptyList()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        _discoveryServiceMock
            .Setup(x => x.GetTaskByNameAsync(taskName, null))
            .ReturnsAsync(task);

        _executionRepositoryMock
            .Setup(x => x.GetTaskDurationTrendsAsync(taskName, 30))
            .ReturnsAsync(new List<DurationDataPoint>());

        // Act
        var result = await _controller.GetTaskDurationTrends(taskName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as DurationTrendsResponse;

        response.Should().NotBeNull();
        response!.EntityType.Should().Be("Task");
        response.EntityName.Should().Be(taskName);
        response.DataPoints.Should().BeEmpty();
    }

    [Fact]
    public async Task GetTaskDurationTrends_WithCustomDaysBack_ShouldUseProvidedValue()
    {
        // Arrange
        var taskName = "fetch-user";
        var customDaysBack = 14;
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        var dataPoints = new List<DurationDataPoint>
        {
            new DurationDataPoint
            {
                Date = DateTime.UtcNow.Date.AddDays(-1),
                AverageDurationMs = 125.0,
                ExecutionCount = 8,
                SuccessCount = 8,
                FailureCount = 0
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetTaskByNameAsync(taskName, null))
            .ReturnsAsync(task);

        _executionRepositoryMock
            .Setup(x => x.GetTaskDurationTrendsAsync(taskName, customDaysBack))
            .ReturnsAsync(dataPoints);

        // Act
        var result = await _controller.GetTaskDurationTrends(taskName, daysBack: customDaysBack);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as DurationTrendsResponse;

        response.Should().NotBeNull();
        response!.DaysBack.Should().Be(customDaysBack);

        _executionRepositoryMock.Verify(x => x.GetTaskDurationTrendsAsync(taskName, customDaysBack), Times.Once);
    }

    [Fact]
    public async Task GetTaskDurationTrends_ShouldIncludeAllDataPointFields()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        var dataPoints = new List<DurationDataPoint>
        {
            new DurationDataPoint
            {
                Date = DateTime.UtcNow.Date,
                AverageDurationMs = 125.0,
                MinDurationMs = 95.0,
                MaxDurationMs = 155.0,
                P50DurationMs = 120.0,
                P95DurationMs = 150.0,
                ExecutionCount = 15,
                SuccessCount = 14,
                FailureCount = 1
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetTaskByNameAsync(taskName, null))
            .ReturnsAsync(task);

        _executionRepositoryMock
            .Setup(x => x.GetTaskDurationTrendsAsync(taskName, 30))
            .ReturnsAsync(dataPoints);

        // Act
        var result = await _controller.GetTaskDurationTrends(taskName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as DurationTrendsResponse;

        response.Should().NotBeNull();
        response!.DataPoints.Should().HaveCount(1);

        var dataPoint = response.DataPoints[0];
        dataPoint.Date.Should().Be(DateTime.UtcNow.Date);
        dataPoint.AverageDurationMs.Should().Be(125.0);
        dataPoint.MinDurationMs.Should().Be(95.0);
        dataPoint.MaxDurationMs.Should().Be(155.0);
        dataPoint.P50DurationMs.Should().Be(120.0);
        dataPoint.P95DurationMs.Should().Be(150.0);
        dataPoint.ExecutionCount.Should().Be(15);
        dataPoint.SuccessCount.Should().Be(14);
        dataPoint.FailureCount.Should().Be(1);
    }

    [Fact]
    public async Task GetTaskDurationTrends_WithMaxDaysBack_ShouldAccept90Days()
    {
        // Arrange
        var taskName = "fetch-user";
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = taskName, Namespace = "default" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        _discoveryServiceMock
            .Setup(x => x.GetTaskByNameAsync(taskName, null))
            .ReturnsAsync(task);

        _executionRepositoryMock
            .Setup(x => x.GetTaskDurationTrendsAsync(taskName, 90))
            .ReturnsAsync(new List<DurationDataPoint>());

        // Act
        var result = await _controller.GetTaskDurationTrends(taskName, daysBack: 90);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as DurationTrendsResponse;

        response.Should().NotBeNull();
        response!.DaysBack.Should().Be(90);

        _executionRepositoryMock.Verify(x => x.GetTaskDurationTrendsAsync(taskName, 90), Times.Once);
    }

    #endregion
}
