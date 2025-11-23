using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Text.Json;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class DynamicWorkflowControllerTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<IInputValidationService> _validationServiceMock;
    private readonly Mock<IWorkflowExecutionService> _executionServiceMock;
    private readonly Mock<IExecutionGraphBuilder> _graphBuilderMock;
    private readonly Mock<IExecutionRepository> _executionRepositoryMock;
    private readonly Mock<ITemplatePreviewService> _templatePreviewServiceMock;
    private readonly DynamicWorkflowController _controller;

    public DynamicWorkflowControllerTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _validationServiceMock = new Mock<IInputValidationService>();
        _executionServiceMock = new Mock<IWorkflowExecutionService>();
        _graphBuilderMock = new Mock<IExecutionGraphBuilder>();
        _executionRepositoryMock = new Mock<IExecutionRepository>();
        _templatePreviewServiceMock = new Mock<ITemplatePreviewService>();

        // Setup default mocks for new functionality (can be overridden in tests)
        _executionRepositoryMock
            .Setup(r => r.GetAverageTaskDurationsAsync(It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync(new Dictionary<string, long>());

        _templatePreviewServiceMock
            .Setup(s => s.PreviewTemplate(It.IsAny<string>(), It.IsAny<JsonElement>()))
            .Returns(new Dictionary<string, string>());

        _controller = new DynamicWorkflowController(
            _discoveryServiceMock.Object,
            _validationServiceMock.Object,
            _executionServiceMock.Object,
            _graphBuilderMock.Object,
            _executionRepositoryMock.Object,
            _templatePreviewServiceMock.Object);
    }

    [Fact]
    public void Constructor_WithNullDiscoveryService_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new DynamicWorkflowController(
            null!,
            _validationServiceMock.Object,
            _executionServiceMock.Object,
            _graphBuilderMock.Object,
            _executionRepositoryMock.Object,
            _templatePreviewServiceMock.Object));
    }

    [Fact]
    public void Constructor_WithNullValidationService_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new DynamicWorkflowController(
            _discoveryServiceMock.Object,
            null!,
            _executionServiceMock.Object,
            _graphBuilderMock.Object,
            _executionRepositoryMock.Object,
            _templatePreviewServiceMock.Object));
    }

    [Fact]
    public void Constructor_WithNullExecutionService_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new DynamicWorkflowController(
            _discoveryServiceMock.Object,
            _validationServiceMock.Object,
            null!,
            _graphBuilderMock.Object,
            _executionRepositoryMock.Object,
            _templatePreviewServiceMock.Object));
    }

    [Fact]
    public void Constructor_WithNullGraphBuilder_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new DynamicWorkflowController(
            _discoveryServiceMock.Object,
            _validationServiceMock.Object,
            _executionServiceMock.Object,
            null!,
            _executionRepositoryMock.Object,
            _templatePreviewServiceMock.Object));
    }

    [Fact]
    public void Constructor_WithNullExecutionRepository_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new DynamicWorkflowController(
            _discoveryServiceMock.Object,
            _validationServiceMock.Object,
            _executionServiceMock.Object,
            _graphBuilderMock.Object,
            null!,
            _templatePreviewServiceMock.Object));
    }

    [Fact]
    public void Constructor_WithNullTemplatePreviewService_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new DynamicWorkflowController(
            _discoveryServiceMock.Object,
            _validationServiceMock.Object,
            _executionServiceMock.Object,
            _graphBuilderMock.Object,
            _executionRepositoryMock.Object,
            null!));
    }

    [Fact]
    public async Task Execute_WithValidInput_ShouldReturnSuccess()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow", Namespace = "default" },
            Spec = new WorkflowSpec()
        };

        var request = new WorkflowExecutionRequest
        {
            Input = new Dictionary<string, object> { ["userId"] = "123" }
        };

        var executionResponse = new WorkflowExecutionResponse
        {
            Success = true,
            Output = new Dictionary<string, object> { ["result"] = "success" }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("test-workflow", null))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(workflow, request.Input, It.IsAny<CancellationToken>()))
            .ReturnsAsync(executionResponse);

        // Act
        var result = await _controller.Execute("test-workflow", request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowExecutionResponse;
        response.Should().NotBeNull();
        response!.Success.Should().BeTrue();
        response.Output.Should().ContainKey("result");
    }

    [Fact]
    public async Task Execute_WithWorkflowNotFound_ShouldReturnNotFound()
    {
        // Arrange
        var request = new WorkflowExecutionRequest
        {
            Input = new Dictionary<string, object>()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("missing-workflow", null))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.Execute("missing-workflow", request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
        var notFoundResult = result as NotFoundObjectResult;
        var problem = notFoundResult!.Value as ProblemDetails;
        problem.Should().NotBeNull();
        problem!.Title.Should().Be("Workflow not found");
        problem.Detail.Should().Contain("missing-workflow");
    }

    [Fact]
    public async Task Execute_WithInvalidInput_ShouldReturnBadRequest()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow", Namespace = "default" },
            Spec = new WorkflowSpec()
        };

        var request = new WorkflowExecutionRequest
        {
            Input = new Dictionary<string, object> { ["invalidField"] = "value" }
        };

        var validationResult = new ValidationResult
        {
            IsValid = false,
            Errors = new List<ValidationError>
            {
                new ValidationError { Message = "Field 'userId' is required" }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("test-workflow", null))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(validationResult);

        // Act
        var result = await _controller.Execute("test-workflow", request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        var problem = badRequestResult!.Value as ProblemDetails;
        problem.Should().NotBeNull();
        problem!.Title.Should().Be("Input validation failed");
        problem.Detail.Should().Contain("userId");
    }

    [Fact]
    public async Task Test_WithValidWorkflow_ShouldReturnExecutionPlan()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "fetch-user" },
                    new WorkflowTaskStep { Id = "task2", TaskRef = "send-email" }
                }
            }
        };

        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object> { ["userId"] = "123" }
        };

        var executionGraph = new ExecutionGraph();
        executionGraph.AddNode("task1");
        executionGraph.AddNode("task2");
        var graphResult = new ExecutionGraphResult
        {
            IsValid = true,
            Graph = executionGraph
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("test-workflow", null))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        _graphBuilderMock
            .Setup(x => x.Build(workflow))
            .Returns(graphResult);

        // Act
        var result = await _controller.Test("test-workflow", request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowTestResponse;
        response.Should().NotBeNull();
        response!.Valid.Should().BeTrue();
        response.ValidationErrors.Should().BeEmpty();
        response.ExecutionPlan.Should().NotBeNull();

        // ExecutionPlan can be either ExecutionPlan or EnhancedExecutionPlan
        var enhancedPlan = response.ExecutionPlan as EnhancedExecutionPlan;
        if (enhancedPlan != null)
        {
            enhancedPlan.ExecutionOrder.Should().HaveCount(2);
        }
        else
        {
            var executionPlan = response.ExecutionPlan as ExecutionPlan;
            executionPlan.Should().NotBeNull();
            executionPlan!.TaskOrder.Should().HaveCount(2);
        }
    }

    [Fact]
    public async Task Test_WithInvalidWorkflow_ShouldReturnValidationErrors()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow", Namespace = "default" },
            Spec = new WorkflowSpec()
        };

        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object> { ["invalidField"] = "value" }
        };

        var validationResult = new ValidationResult
        {
            IsValid = false,
            Errors = new List<ValidationError>
            {
                new ValidationError { Message = "Field 'userId' is required" }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("test-workflow", null))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(validationResult);

        // Act
        var result = await _controller.Test("test-workflow", request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowTestResponse;
        response.Should().NotBeNull();
        response!.Valid.Should().BeFalse();
        response.ValidationErrors.Should().Contain("Field 'userId' is required");
    }

    [Fact]
    public async Task Test_WithWorkflowNotFound_ShouldReturnNotFound()
    {
        // Arrange
        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object>()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("missing-workflow", null))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.Test("missing-workflow", request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
        var notFoundResult = result as NotFoundObjectResult;
        var problem = notFoundResult!.Value as ProblemDetails;
        problem.Should().NotBeNull();
        problem!.Title.Should().Be("Workflow not found");
    }

    [Fact]
    public async Task GetDetails_WithValidWorkflow_ShouldReturnDetails()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "user-enrichment", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["userId"] = new WorkflowInputParameter
                    {
                        Type = "string",
                        Description = "User ID to enrich"
                    }
                },
                Output = new Dictionary<string, string>
                {
                    ["fullName"] = "{{tasks.fetch-user.output.name}}"
                },
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "fetch-user", TaskRef = "get-user-api" }
                }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("user-enrichment", null))
            .ReturnsAsync(workflow);

        // Act
        var result = await _controller.GetDetails("user-enrichment");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowDetailResponse;

        response.Should().NotBeNull();
        response!.Name.Should().Be("user-enrichment");
        response.Namespace.Should().Be("default");
        response.InputSchema.Should().NotBeNull();
        response.InputSchema!.Properties.Should().ContainKey("userId");
        response.OutputSchema.Should().ContainKey("fullName");
        response.Tasks.Should().HaveCount(1);
        response.Endpoints.Should().NotBeNull();
        response.Endpoints!.Execute.Should().Be("/api/v1/workflows/user-enrichment/execute");
        response.Endpoints.Test.Should().Be("/api/v1/workflows/user-enrichment/test");
        response.Endpoints.Details.Should().Be("/api/v1/workflows/user-enrichment");
    }

    [Fact]
    public async Task GetDetails_WithWorkflowNotFound_ShouldReturnNotFound()
    {
        // Arrange
        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("missing-workflow", null))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.GetDetails("missing-workflow");

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
        var notFoundResult = result as NotFoundObjectResult;
        var problem = notFoundResult!.Value as ProblemDetails;
        problem.Should().NotBeNull();
        problem!.Title.Should().Be("Workflow not found");
        problem.Detail.Should().Contain("missing-workflow");
    }

    [Fact]
    public async Task GetDetails_WithNoInputSchema_ShouldReturnNullInputSchema()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "simple-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Input = null,
                Tasks = new List<WorkflowTaskStep>()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("simple-workflow", null))
            .ReturnsAsync(workflow);

        // Act
        var result = await _controller.GetDetails("simple-workflow");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowDetailResponse;
        response.Should().NotBeNull();
        response!.InputSchema.Should().BeNull();
    }

    [Fact]
    public async Task GetDetails_WithEmptyInputSchema_ShouldReturnNullInputSchema()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "simple-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>(),
                Tasks = new List<WorkflowTaskStep>()
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("simple-workflow", null))
            .ReturnsAsync(workflow);

        // Act
        var result = await _controller.GetDetails("simple-workflow");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowDetailResponse;
        response.Should().NotBeNull();
        response!.InputSchema.Should().BeNull();
    }

    [Fact]
    public async Task GetDetails_WithCustomNamespace_ShouldPassNamespaceToService()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "prod-workflow", Namespace = "production" },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("prod-workflow", "production"))
            .ReturnsAsync(workflow);

        // Act
        var result = await _controller.GetDetails("prod-workflow", "production");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _discoveryServiceMock.Verify(x => x.GetWorkflowByNameAsync("prod-workflow", "production"), Times.Once);
    }

    [Fact]
    public async Task Execute_WithCustomNamespace_ShouldPassNamespaceToService()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "prod-workflow", Namespace = "production" },
            Spec = new WorkflowSpec()
        };

        var request = new WorkflowExecutionRequest
        {
            Input = new Dictionary<string, object>()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("prod-workflow", "production"))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(workflow, request.Input, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        // Act
        var result = await _controller.Execute("prod-workflow", request, "production");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _discoveryServiceMock.Verify(x => x.GetWorkflowByNameAsync("prod-workflow", "production"), Times.Once);
    }

    [Fact]
    public async Task Test_WithNoTasks_ShouldReturnValidResponseWithoutExecutionPlan()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "empty-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>()
            }
        };

        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object>()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("empty-workflow", null))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _controller.Test("empty-workflow", request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowTestResponse;
        response.Should().NotBeNull();
        response!.Valid.Should().BeTrue();
        response.ExecutionPlan.Should().BeNull();
    }

    [Fact]
    public async Task Test_WithGraphBuildException_ShouldReturnValidationError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "invalid-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "fetch-user" }
                }
            }
        };

        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object>()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("invalid-workflow", null))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        _graphBuilderMock
            .Setup(x => x.Build(workflow))
            .Throws(new InvalidOperationException("Circular dependency detected"));

        // Act
        var result = await _controller.Test("invalid-workflow", request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowTestResponse;
        response.Should().NotBeNull();
        response!.Valid.Should().BeFalse();
        response.ValidationErrors.Should().Contain(e => e.Contains("Failed to build execution plan"));
        response.ValidationErrors.Should().Contain(e => e.Contains("Circular dependency detected"));
    }

    [Fact]
    public async Task Test_WithInvalidGraphResult_ShouldReturnGraphValidationErrors()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "invalid-graph", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "fetch-user" }
                }
            }
        };

        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object>()
        };

        var graphResult = new ExecutionGraphResult
        {
            IsValid = false,
            Errors = new List<ValidationError>
            {
                new ValidationError { Message = "Task 'task2' referenced but not defined" }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("invalid-graph", null))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        _graphBuilderMock
            .Setup(x => x.Build(workflow))
            .Returns(graphResult);

        // Act
        var result = await _controller.Test("invalid-graph", request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowTestResponse;
        response.Should().NotBeNull();
        response!.Valid.Should().BeFalse();
        response.ValidationErrors.Should().Contain("Task 'task2' referenced but not defined");
    }

    [Fact]
    public async Task Execute_WithMultipleValidationErrors_ShouldReturnAllErrors()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow", Namespace = "default" },
            Spec = new WorkflowSpec()
        };

        var request = new WorkflowExecutionRequest
        {
            Input = new Dictionary<string, object>()
        };

        var validationResult = new ValidationResult
        {
            IsValid = false,
            Errors = new List<ValidationError>
            {
                new ValidationError { Message = "Field 'userId' is required" },
                new ValidationError { Message = "Field 'email' is required" },
                new ValidationError { Message = "Field 'name' must be a string" }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("test-workflow", null))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(validationResult);

        // Act
        var result = await _controller.Execute("test-workflow", request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        var problem = badRequestResult!.Value as ProblemDetails;
        problem.Should().NotBeNull();
        problem!.Detail.Should().Contain("userId");
        problem.Detail.Should().Contain("email");
        problem.Detail.Should().Contain("name");
    }

    [Fact]
    public async Task Test_WithNullTasks_ShouldNotBuildExecutionPlan()
    {
        // Arrange - Tests line 117: workflow.Spec.Tasks?.Any() == true - null path
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "workflow-no-tasks", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = null // No tasks
            }
        };

        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object>()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("workflow-no-tasks", null))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _controller.Test("workflow-no-tasks", request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowTestResponse;
        response.Should().NotBeNull();
        response!.ExecutionPlan.Should().BeNull(); // No execution plan without tasks

        // Verify graph builder was NOT called
        _graphBuilderMock.Verify(
            x => x.Build(It.IsAny<WorkflowResource>()),
            Times.Never);
    }

    [Fact]
    public async Task GetDetails_WithNullOutputSchema_ShouldReturnNullOutput()
    {
        // Arrange - Tests line 196: workflow.Spec.Output null path
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "no-output-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Output = null, // No output schema
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "ref1" }
                }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("no-output-workflow", null))
            .ReturnsAsync(workflow);

        // Act
        var result = await _controller.GetDetails("no-output-workflow");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowDetailResponse;
        response.Should().NotBeNull();
        response!.OutputSchema.Should().BeNull(); // Output schema should be null
    }

    [Fact]
    public async Task GetDetails_WithNullTasks_ShouldReturnEmptyTasksList()
    {
        // Arrange - Tests line 197: workflow.Spec.Tasks null path
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "no-tasks-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = null // No tasks
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("no-tasks-workflow", null))
            .ReturnsAsync(workflow);

        // Act
        var result = await _controller.GetDetails("no-tasks-workflow");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowDetailResponse;
        response.Should().NotBeNull();
        response!.Tasks.Should().BeEmpty(); // Tasks list should be empty
    }

    [Fact]
    public async Task GetDetails_WithNullMetadata_ShouldUseDefaultValues()
    {
        // Arrange - Tests lines 193-194: null metadata handling
        var workflow = new WorkflowResource
        {
            Metadata = null, // Null metadata
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("test-workflow", null))
            .ReturnsAsync(workflow);

        // Act
        var result = await _controller.GetDetails("test-workflow");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as WorkflowDetailResponse;
        response.Should().NotBeNull();
        response!.Name.Should().Be(""); // Should use empty string for null metadata name
        response.Namespace.Should().Be("default"); // Should use default namespace
    }

    [Fact]
    public async Task Test_WithCustomNamespace_ShouldPassNamespaceToService()
    {
        // Arrange - Tests custom namespace parameter
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "prod-workflow", Namespace = "production" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "ref1" }
                }
            }
        };

        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object>()
        };

        var executionGraph = new ExecutionGraph();
        executionGraph.AddNode("task1");
        var graphResult = new ExecutionGraphResult
        {
            IsValid = true,
            Graph = executionGraph
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("prod-workflow", "production"))
            .ReturnsAsync(workflow);

        _validationServiceMock
            .Setup(x => x.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        _graphBuilderMock
            .Setup(x => x.Build(workflow))
            .Returns(graphResult);

        // Act
        var result = await _controller.Test("prod-workflow", request, "production");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _discoveryServiceMock.Verify(
            x => x.GetWorkflowByNameAsync("prod-workflow", "production"),
            Times.Once);
    }

    // ==================== List Executions Tests ====================

    [Fact]
    public async Task ListExecutions_ShouldReturn404_WhenWorkflowNotFound()
    {
        // Arrange
        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("unknown-workflow", null))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.ListExecutions("unknown-workflow");

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
        var notFoundResult = (NotFoundObjectResult)result;
        var problemDetails = notFoundResult.Value as ProblemDetails;
        problemDetails.Should().NotBeNull();
        problemDetails!.Title.Should().Be("Workflow not found");
    }

    [Fact]
    public async Task ListExecutions_ShouldReturnEmptyList_WhenNoExecutions()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("test-workflow", null))
            .ReturnsAsync(workflow);

        _executionRepositoryMock
            .Setup(x => x.ListExecutionsAsync("test-workflow", null, 0, 50))
            .ReturnsAsync(new List<ExecutionRecord>());

        // Act
        var result = await _controller.ListExecutions("test-workflow");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionListResponse>().Subject;
        response.Executions.Should().BeEmpty();
        response.WorkflowName.Should().Be("test-workflow");
        response.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task ListExecutions_ShouldReturnExecutionList_WhenExecutionsExist()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "user-workflow" }
        };

        var execution1 = new ExecutionRecord
        {
            Id = Guid.NewGuid(),
            WorkflowName = "user-workflow",
            Status = ExecutionStatus.Succeeded,
            StartedAt = DateTime.UtcNow.AddMinutes(-10),
            CompletedAt = DateTime.UtcNow.AddMinutes(-8),
            Duration = TimeSpan.FromMinutes(2)
        };

        var execution2 = new ExecutionRecord
        {
            Id = Guid.NewGuid(),
            WorkflowName = "user-workflow",
            Status = ExecutionStatus.Failed,
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            CompletedAt = DateTime.UtcNow.AddMinutes(-4),
            Duration = TimeSpan.FromMinutes(1)
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("user-workflow", null))
            .ReturnsAsync(workflow);

        _executionRepositoryMock
            .Setup(x => x.ListExecutionsAsync("user-workflow", null, 0, 50))
            .ReturnsAsync(new List<ExecutionRecord> { execution1, execution2 });

        // Act
        var result = await _controller.ListExecutions("user-workflow");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionListResponse>().Subject;

        response.WorkflowName.Should().Be("user-workflow");
        response.TotalCount.Should().Be(2);
        response.Executions.Should().HaveCount(2);

        var summary1 = response.Executions[0];
        summary1.Id.Should().Be(execution1.Id);
        summary1.Status.Should().Be("Succeeded");
        summary1.DurationMs.Should().Be((long)TimeSpan.FromMinutes(2).TotalMilliseconds);

        var summary2 = response.Executions[1];
        summary2.Id.Should().Be(execution2.Id);
        summary2.Status.Should().Be("Failed");
    }

    [Fact]
    public async Task ListExecutions_ShouldApplyStatusFilter_WhenProvided()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" }
        };

        var execution = new ExecutionRecord
        {
            Id = Guid.NewGuid(),
            WorkflowName = "test-workflow",
            Status = ExecutionStatus.Failed,
            StartedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
            Duration = TimeSpan.FromSeconds(30)
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("test-workflow", null))
            .ReturnsAsync(workflow);

        _executionRepositoryMock
            .Setup(x => x.ListExecutionsAsync("test-workflow", ExecutionStatus.Failed, 0, 50))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        // Act
        var result = await _controller.ListExecutions("test-workflow", status: "Failed");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _executionRepositoryMock.Verify(
            x => x.ListExecutionsAsync("test-workflow", ExecutionStatus.Failed, 0, 50),
            Times.Once);
    }

    [Fact]
    public async Task ListExecutions_ShouldApplyPagination_WhenProvided()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("test-workflow", null))
            .ReturnsAsync(workflow);

        _executionRepositoryMock
            .Setup(x => x.ListExecutionsAsync("test-workflow", null, 10, 20))
            .ReturnsAsync(new List<ExecutionRecord>());

        // Act
        var result = await _controller.ListExecutions("test-workflow", skip: 10, take: 20);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _executionRepositoryMock.Verify(
            x => x.ListExecutionsAsync("test-workflow", null, 10, 20),
            Times.Once);
    }

    [Fact]
    public async Task ListExecutions_ShouldHandleRunningExecutions_WithoutCompletedAt()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "long-running-workflow" }
        };

        var runningExecution = new ExecutionRecord
        {
            Id = Guid.NewGuid(),
            WorkflowName = "long-running-workflow",
            Status = ExecutionStatus.Running,
            StartedAt = DateTime.UtcNow.AddMinutes(-30),
            CompletedAt = null,
            Duration = null
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync("long-running-workflow", null))
            .ReturnsAsync(workflow);

        _executionRepositoryMock
            .Setup(x => x.ListExecutionsAsync("long-running-workflow", null, 0, 50))
            .ReturnsAsync(new List<ExecutionRecord> { runningExecution });

        // Act
        var result = await _controller.ListExecutions("long-running-workflow");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionListResponse>().Subject;

        response.Executions.Should().HaveCount(1);
        var summary = response.Executions[0];
        summary.Status.Should().Be("Running");
        summary.CompletedAt.Should().BeNull();
        summary.DurationMs.Should().BeNull();
    }
}
