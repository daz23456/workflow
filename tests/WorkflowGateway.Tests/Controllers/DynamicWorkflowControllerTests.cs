using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
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
    private readonly DynamicWorkflowController _controller;

    public DynamicWorkflowControllerTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _validationServiceMock = new Mock<IInputValidationService>();
        _executionServiceMock = new Mock<IWorkflowExecutionService>();
        _graphBuilderMock = new Mock<IExecutionGraphBuilder>();

        _controller = new DynamicWorkflowController(
            _discoveryServiceMock.Object,
            _validationServiceMock.Object,
            _executionServiceMock.Object,
            _graphBuilderMock.Object);
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
        response.ExecutionPlan!.TaskOrder.Should().HaveCount(2);
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
}
