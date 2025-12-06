using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class CircuitBreakerControllerTests
{
    private readonly Mock<ICircuitStateStore> _mockStateStore;
    private readonly CircuitBreakerController _controller;

    public CircuitBreakerControllerTests()
    {
        _mockStateStore = new Mock<ICircuitStateStore>();
        _controller = new CircuitBreakerController(_mockStateStore.Object);
    }

    // ========== LIST CIRCUITS ==========

    [Fact]
    public async Task ListCircuits_ShouldReturnAllCircuits()
    {
        // Arrange
        var states = new Dictionary<string, CircuitStateInfo>
        {
            ["service-a"] = new() { State = CircuitState.Closed },
            ["service-b"] = new() { State = CircuitState.Open }
        };
        _mockStateStore.Setup(s => s.GetAllStatesAsync())
            .ReturnsAsync(states);

        // Act
        var result = await _controller.ListCircuits();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var ok = (OkObjectResult)result;
        ok.Value.Should().BeOfType<CircuitListResponse>();
        var response = (CircuitListResponse)ok.Value!;
        response.Circuits.Should().HaveCount(2);
    }

    [Fact]
    public async Task ListCircuits_WhenEmpty_ShouldReturnEmptyList()
    {
        // Arrange
        _mockStateStore.Setup(s => s.GetAllStatesAsync())
            .ReturnsAsync(new Dictionary<string, CircuitStateInfo>());

        // Act
        var result = await _controller.ListCircuits();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var ok = (OkObjectResult)result;
        var response = (CircuitListResponse)ok.Value!;
        response.Circuits.Should().BeEmpty();
    }

    // ========== GET CIRCUIT ==========

    [Fact]
    public async Task GetCircuit_ShouldReturnCircuitState()
    {
        // Arrange
        var state = new CircuitStateInfo
        {
            State = CircuitState.Open,
            FailureCount = 5,
            CircuitOpenedAt = DateTime.UtcNow
        };
        _mockStateStore.Setup(s => s.GetStateAsync("test-service"))
            .ReturnsAsync(state);

        // Act
        var result = await _controller.GetCircuit("test-service");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var ok = (OkObjectResult)result;
        ok.Value.Should().BeOfType<CircuitStateResponse>();
        var response = (CircuitStateResponse)ok.Value!;
        response.ServiceName.Should().Be("test-service");
        response.State.Should().Be("Open");
        response.FailureCount.Should().Be(5);
    }

    // ========== FORCE OPEN ==========

    [Fact]
    public async Task ForceOpen_ShouldOpenCircuit()
    {
        // Arrange
        _mockStateStore.Setup(s => s.GetStateAsync("test-service"))
            .ReturnsAsync(new CircuitStateInfo { State = CircuitState.Closed });
        _mockStateStore.Setup(s => s.SaveStateAsync(It.IsAny<string>(), It.IsAny<CircuitStateInfo>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.ForceOpen("test-service");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _mockStateStore.Verify(s => s.SaveStateAsync(
            "test-service",
            It.Is<CircuitStateInfo>(info => info.State == CircuitState.Open)), Times.Once);
    }

    // ========== FORCE CLOSE ==========

    [Fact]
    public async Task ForceClose_ShouldCloseCircuit()
    {
        // Arrange
        _mockStateStore.Setup(s => s.GetStateAsync("test-service"))
            .ReturnsAsync(new CircuitStateInfo { State = CircuitState.Open });
        _mockStateStore.Setup(s => s.SaveStateAsync(It.IsAny<string>(), It.IsAny<CircuitStateInfo>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.ForceClose("test-service");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _mockStateStore.Verify(s => s.SaveStateAsync(
            "test-service",
            It.Is<CircuitStateInfo>(info => info.State == CircuitState.Closed)), Times.Once);
    }

    // ========== RESET ==========

    [Fact]
    public async Task Reset_ShouldResetCircuitState()
    {
        // Arrange
        _mockStateStore.Setup(s => s.RemoveStateAsync("test-service"))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.Reset("test-service");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _mockStateStore.Verify(s => s.RemoveStateAsync("test-service"), Times.Once);
    }

    [Fact]
    public async Task Reset_WhenNotFound_ShouldStillSucceed()
    {
        // Arrange
        _mockStateStore.Setup(s => s.RemoveStateAsync("unknown-service"))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.Reset("unknown-service");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    // ========== HEALTH ==========

    [Fact]
    public async Task GetHealth_WhenHealthy_ShouldReturnHealthy()
    {
        // Arrange
        _mockStateStore.Setup(s => s.IsHealthyAsync())
            .ReturnsAsync(true);

        // Act
        var result = await _controller.GetHealth();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var ok = (OkObjectResult)result;
        var response = (CircuitBreakerHealthResponse)ok.Value!;
        response.Status.Should().Be("healthy");
    }

    [Fact]
    public async Task GetHealth_WhenUnhealthy_ShouldReturnUnhealthy()
    {
        // Arrange
        _mockStateStore.Setup(s => s.IsHealthyAsync())
            .ReturnsAsync(false);

        // Act
        var result = await _controller.GetHealth();

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var objResult = (ObjectResult)result;
        objResult.StatusCode.Should().Be(503);
        var response = (CircuitBreakerHealthResponse)objResult.Value!;
        response.Status.Should().Be("unhealthy");
    }
}
