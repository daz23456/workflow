using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

/// <summary>
/// Tests for ContractVerificationController - REST API for contract verification.
/// </summary>
public class ContractVerificationControllerTests
{
    private readonly Mock<IContractVerificationService> _verificationMock;
    private readonly Mock<IInteractionRecorder> _recorderMock;
    private readonly Mock<IDeploymentMatrixService> _deploymentMock;
    private readonly ContractVerificationController _controller;

    public ContractVerificationControllerTests()
    {
        _verificationMock = new Mock<IContractVerificationService>();
        _recorderMock = new Mock<IInteractionRecorder>();
        _deploymentMock = new Mock<IDeploymentMatrixService>();
        _controller = new ContractVerificationController(
            _verificationMock.Object,
            _recorderMock.Object,
            _deploymentMock.Object);
    }

    [Fact]
    public async Task VerifyContract_ReturnsSuccess_WhenContractVerified()
    {
        // Arrange
        var verificationResult = new ContractVerificationResult
        {
            ScenarioName = "user-exists",
            IsVerified = true
        };
        _verificationMock
            .Setup(x => x.VerifyContract("get-user", "user-exists"))
            .Returns(verificationResult);

        // Act
        var result = await _controller.VerifyContract("get-user", "user-exists");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<VerificationResponse>().Subject;
        response.IsVerified.Should().BeTrue();
    }

    [Fact]
    public async Task VerifyContract_ReturnsErrors_WhenContractFails()
    {
        // Arrange
        var verificationResult = new ContractVerificationResult
        {
            ScenarioName = "user-exists",
            IsVerified = false,
            Errors = new List<string> { "Status code mismatch" }
        };
        _verificationMock
            .Setup(x => x.VerifyContract("get-user", "user-exists"))
            .Returns(verificationResult);

        // Act
        var result = await _controller.VerifyContract("get-user", "user-exists");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<VerificationResponse>().Subject;
        response.IsVerified.Should().BeFalse();
        response.Errors.Should().Contain("Status code mismatch");
    }

    [Fact]
    public async Task RecordInteraction_StoresInteraction()
    {
        // Arrange
        var request = new RecordInteractionRequest
        {
            TaskName = "get-user",
            RequestBody = "{ \"userId\": \"123\" }",
            ResponseBody = "{ \"name\": \"John\" }",
            StatusCode = 200,
            Environment = "dev"
        };

        // Act
        var result = await _controller.RecordInteraction(request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        _recorderMock.Verify(x => x.RecordInteraction(It.Is<RecordedInteraction>(
            i => i.TaskName == "get-user" && i.StatusCode == 200)), Times.Once);
    }

    [Fact]
    public async Task CanDeploy_ReturnsTrue_WhenDeploymentAllowed()
    {
        // Arrange
        _deploymentMock
            .Setup(x => x.CanDeploy("get-user", "v2", "prod", "staging"))
            .Returns(CanDeployResult.Success());

        // Act
        var result = await _controller.CanDeploy("get-user", "v2", "prod", "staging");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<CanDeployResponse>().Subject;
        response.CanDeploy.Should().BeTrue();
    }

    [Fact]
    public async Task CanDeploy_ReturnsFalse_WhenDeploymentBlocked()
    {
        // Arrange
        _deploymentMock
            .Setup(x => x.CanDeploy("get-user", "v2", "prod", "staging"))
            .Returns(CanDeployResult.Failure("Version v2 is not deployed to staging"));

        // Act
        var result = await _controller.CanDeploy("get-user", "v2", "prod", "staging");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<CanDeployResponse>().Subject;
        response.CanDeploy.Should().BeFalse();
        response.Reason.Should().Contain("not deployed to staging");
    }

    [Fact]
    public async Task GetDeploymentMatrix_ReturnsMatrix()
    {
        // Arrange
        var matrix = new TaskDeploymentMatrix { TaskName = "get-user" };
        matrix.AddDeployment("dev", "v2", DateTime.UtcNow);
        matrix.AddDeployment("staging", "v1", DateTime.UtcNow);

        _deploymentMock
            .Setup(x => x.GetDeploymentMatrix("get-user"))
            .Returns(matrix);

        // Act
        var result = await _controller.GetDeploymentMatrix("get-user");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<DeploymentMatrixResponse>().Subject;
        response.TaskName.Should().Be("get-user");
        response.Deployments.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetDeploymentMatrix_ReturnsNotFound_WhenNoMatrix()
    {
        // Arrange
        _deploymentMock
            .Setup(x => x.GetDeploymentMatrix("unknown-task"))
            .Returns((TaskDeploymentMatrix?)null);

        // Act
        var result = await _controller.GetDeploymentMatrix("unknown-task");

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }
}
