using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;

namespace WorkflowGateway.Tests.Controllers;

/// <summary>
/// Tests for HealthCheckController - synthetic health check endpoints.
/// </summary>
public class HealthCheckControllerTests
{
    private readonly Mock<ISyntheticCheckService> _checkServiceMock;
    private readonly Mock<ILogger<HealthCheckController>> _loggerMock;
    private readonly HealthCheckController _controller;

    public HealthCheckControllerTests()
    {
        _checkServiceMock = new Mock<ISyntheticCheckService>();
        _loggerMock = new Mock<ILogger<HealthCheckController>>();
        _controller = new HealthCheckController(_checkServiceMock.Object, _loggerMock.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_ThrowsArgumentNullException_WhenCheckServiceIsNull()
    {
        // Act & Assert
        var act = () => new HealthCheckController(null!, _loggerMock.Object);
        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("checkService");
    }

    [Fact]
    public void Constructor_ThrowsArgumentNullException_WhenLoggerIsNull()
    {
        // Act & Assert
        var act = () => new HealthCheckController(_checkServiceMock.Object, null!);
        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("logger");
    }

    #endregion

    #region RunHealthCheck Tests

    [Fact]
    public async Task RunHealthCheck_ReturnsOk_WithHealthStatus()
    {
        // Arrange
        var status = CreateHealthStatus("test-workflow", HealthState.Healthy);
        _checkServiceMock.Setup(x => x.CheckWorkflowHealthAsync("test-workflow", It.IsAny<CancellationToken>()))
            .ReturnsAsync(status);

        // Act
        var result = await _controller.RunHealthCheck("test-workflow", CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<WorkflowHealthStatusResponse>().Subject;
        response.WorkflowName.Should().Be("test-workflow");
        response.OverallHealth.Should().Be("Healthy");
    }

    [Fact]
    public async Task RunHealthCheck_ReturnsUnhealthyStatus_WhenWorkflowFails()
    {
        // Arrange
        var status = CreateHealthStatus("failing-workflow", HealthState.Unhealthy);
        _checkServiceMock.Setup(x => x.CheckWorkflowHealthAsync("failing-workflow", It.IsAny<CancellationToken>()))
            .ReturnsAsync(status);

        // Act
        var result = await _controller.RunHealthCheck("failing-workflow", CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<WorkflowHealthStatusResponse>().Subject;
        response.OverallHealth.Should().Be("Unhealthy");
    }

    [Fact]
    public async Task RunHealthCheck_IncludesTaskHealthDetails()
    {
        // Arrange
        var status = new WorkflowHealthStatus
        {
            WorkflowName = "workflow-with-tasks",
            OverallHealth = HealthState.Degraded,
            Tasks = new List<TaskHealthStatus>
            {
                new() { TaskId = "task1", TaskRef = "validate-user", Status = HealthState.Healthy, Reachable = true, LatencyMs = 50 },
                new() { TaskId = "task2", TaskRef = "send-email", Status = HealthState.Unhealthy, Reachable = false, ErrorMessage = "Connection refused" }
            },
            CheckedAt = DateTime.UtcNow,
            DurationMs = 150
        };
        _checkServiceMock.Setup(x => x.CheckWorkflowHealthAsync("workflow-with-tasks", It.IsAny<CancellationToken>()))
            .ReturnsAsync(status);

        // Act
        var result = await _controller.RunHealthCheck("workflow-with-tasks", CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<WorkflowHealthStatusResponse>().Subject;
        response.Tasks.Should().HaveCount(2);
        response.Tasks[0].TaskRef.Should().Be("validate-user");
        response.Tasks[0].Reachable.Should().BeTrue();
        response.Tasks[1].TaskRef.Should().Be("send-email");
        response.Tasks[1].ErrorMessage.Should().Be("Connection refused");
    }

    #endregion

    #region GetHealthStatus Tests

    [Fact]
    public async Task GetHealthStatus_ReturnsOk_WhenStatusIsCached()
    {
        // Arrange
        var status = CreateHealthStatus("cached-workflow", HealthState.Healthy);
        _checkServiceMock.Setup(x => x.GetCachedHealthStatusAsync("cached-workflow"))
            .ReturnsAsync(status);

        // Act
        var result = await _controller.GetHealthStatus("cached-workflow");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<WorkflowHealthStatusResponse>().Subject;
        response.WorkflowName.Should().Be("cached-workflow");
    }

    [Fact]
    public async Task GetHealthStatus_ReturnsNotFound_WhenNoCachedStatus()
    {
        // Arrange
        _checkServiceMock.Setup(x => x.GetCachedHealthStatusAsync("unknown-workflow"))
            .ReturnsAsync((WorkflowHealthStatus?)null);

        // Act
        var result = await _controller.GetHealthStatus("unknown-workflow");

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region GetHealthSummary Tests

    [Fact]
    public async Task GetHealthSummary_ReturnsOk_WithAllWorkflows()
    {
        // Arrange
        var statuses = new List<WorkflowHealthStatus>
        {
            CreateHealthStatus("workflow-1", HealthState.Healthy),
            CreateHealthStatus("workflow-2", HealthState.Degraded),
            CreateHealthStatus("workflow-3", HealthState.Unhealthy)
        };
        _checkServiceMock.Setup(x => x.GetAllHealthStatusesAsync())
            .ReturnsAsync(statuses);

        // Act
        var result = await _controller.GetHealthSummary();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<HealthSummaryResponse>().Subject;
        response.TotalWorkflows.Should().Be(3);
        response.HealthyCount.Should().Be(1);
        response.DegradedCount.Should().Be(1);
        response.UnhealthyCount.Should().Be(1);
        response.Workflows.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetHealthSummary_ReturnsEmptySummary_WhenNoWorkflows()
    {
        // Arrange
        _checkServiceMock.Setup(x => x.GetAllHealthStatusesAsync())
            .ReturnsAsync(new List<WorkflowHealthStatus>());

        // Act
        var result = await _controller.GetHealthSummary();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<HealthSummaryResponse>().Subject;
        response.TotalWorkflows.Should().Be(0);
        response.HealthyCount.Should().Be(0);
        response.Workflows.Should().BeEmpty();
    }

    [Fact]
    public async Task GetHealthSummary_CountsUnknownState()
    {
        // Arrange
        var statuses = new List<WorkflowHealthStatus>
        {
            CreateHealthStatus("workflow-1", HealthState.Unknown),
            CreateHealthStatus("workflow-2", HealthState.Unknown)
        };
        _checkServiceMock.Setup(x => x.GetAllHealthStatusesAsync())
            .ReturnsAsync(statuses);

        // Act
        var result = await _controller.GetHealthSummary();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<HealthSummaryResponse>().Subject;
        response.UnknownCount.Should().Be(2);
    }

    #endregion

    #region Helper Methods

    private static WorkflowHealthStatus CreateHealthStatus(string name, HealthState health)
    {
        return new WorkflowHealthStatus
        {
            WorkflowName = name,
            OverallHealth = health,
            Tasks = new List<TaskHealthStatus>(),
            CheckedAt = DateTime.UtcNow,
            DurationMs = 100
        };
    }

    #endregion
}
