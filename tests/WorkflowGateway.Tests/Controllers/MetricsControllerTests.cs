using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class MetricsControllerTests
{
    private readonly Mock<IMetricsService> _mockMetricsService;
    private readonly MetricsController _controller;

    public MetricsControllerTests()
    {
        _mockMetricsService = new Mock<IMetricsService>();
        _controller = new MetricsController(_mockMetricsService.Object);
    }

    #region GetSystemMetrics Tests

    [Fact]
    public async Task GetSystemMetrics_ShouldReturnOk()
    {
        // Arrange
        var metrics = new SystemMetrics
        {
            TotalExecutions = 100,
            Throughput = 4.17,
            P50Ms = 200,
            P95Ms = 450,
            P99Ms = 800,
            ErrorRate = 2.5,
            TimeRange = "Hour24"
        };
        _mockMetricsService.Setup(s => s.GetSystemMetricsAsync(TimeRange.Hour24))
            .ReturnsAsync(metrics);

        // Act
        var result = await _controller.GetSystemMetrics("24h");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SystemMetrics>().Subject;
        response.TotalExecutions.Should().Be(100);
        response.P95Ms.Should().Be(450);
    }

    [Theory]
    [InlineData("1h", TimeRange.Hour1)]
    [InlineData("24h", TimeRange.Hour24)]
    [InlineData("7d", TimeRange.Day7)]
    [InlineData("30d", TimeRange.Day30)]
    public async Task GetSystemMetrics_ShouldParseTimeRangeCorrectly(string rangeStr, TimeRange expectedRange)
    {
        // Arrange
        _mockMetricsService.Setup(s => s.GetSystemMetricsAsync(expectedRange))
            .ReturnsAsync(new SystemMetrics());

        // Act
        await _controller.GetSystemMetrics(rangeStr);

        // Assert
        _mockMetricsService.Verify(s => s.GetSystemMetricsAsync(expectedRange), Times.Once);
    }

    [Fact]
    public async Task GetSystemMetrics_WithInvalidRange_ShouldDefaultTo24h()
    {
        // Arrange
        _mockMetricsService.Setup(s => s.GetSystemMetricsAsync(TimeRange.Hour24))
            .ReturnsAsync(new SystemMetrics());

        // Act
        await _controller.GetSystemMetrics("invalid");

        // Assert
        _mockMetricsService.Verify(s => s.GetSystemMetricsAsync(TimeRange.Hour24), Times.Once);
    }

    #endregion

    #region GetWorkflowMetrics Tests

    [Fact]
    public async Task GetWorkflowMetrics_ShouldReturnListOfWorkflows()
    {
        // Arrange
        var metrics = new List<WorkflowMetrics>
        {
            new() { Name = "workflow1", AvgDurationMs = 200, P95Ms = 400, ErrorRate = 1.5, ExecutionCount = 100 },
            new() { Name = "workflow2", AvgDurationMs = 500, P95Ms = 900, ErrorRate = 3.0, ExecutionCount = 50 }
        };
        _mockMetricsService.Setup(s => s.GetWorkflowMetricsAsync()).ReturnsAsync(metrics);

        // Act
        var result = await _controller.GetWorkflowMetrics();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<List<WorkflowMetrics>>().Subject;
        response.Should().HaveCount(2);
        response.First().Name.Should().Be("workflow1");
    }

    #endregion

    #region GetWorkflowHistory Tests

    [Fact]
    public async Task GetWorkflowHistory_ShouldReturnHistoricalData()
    {
        // Arrange
        var history = new List<WorkflowHistoryPoint>
        {
            new() { Timestamp = DateTime.UtcNow.AddDays(-1), AvgDurationMs = 180, P95Ms = 300, ErrorRate = 2, Count = 100 },
            new() { Timestamp = DateTime.UtcNow, AvgDurationMs = 200, P95Ms = 350, ErrorRate = 3, Count = 120 }
        };
        _mockMetricsService.Setup(s => s.GetWorkflowHistoryAsync("test-workflow", TimeRange.Hour24))
            .ReturnsAsync(history);

        // Act
        var result = await _controller.GetWorkflowHistory("test-workflow", "24h");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<List<WorkflowHistoryPoint>>().Subject;
        response.Should().HaveCount(2);
    }

    [Theory]
    [InlineData("1h", TimeRange.Hour1)]
    [InlineData("24h", TimeRange.Hour24)]
    [InlineData("7d", TimeRange.Day7)]
    [InlineData("30d", TimeRange.Day30)]
    public async Task GetWorkflowHistory_ShouldParseTimeRangeCorrectly(string rangeStr, TimeRange expectedRange)
    {
        // Arrange
        _mockMetricsService.Setup(s => s.GetWorkflowHistoryAsync("workflow", expectedRange))
            .ReturnsAsync(new List<WorkflowHistoryPoint>());

        // Act
        await _controller.GetWorkflowHistory("workflow", rangeStr);

        // Assert
        _mockMetricsService.Verify(s => s.GetWorkflowHistoryAsync("workflow", expectedRange), Times.Once);
    }

    #endregion

    #region GetSlowestWorkflows Tests

    [Fact]
    public async Task GetSlowestWorkflows_ShouldReturnSlowestWorkflows()
    {
        // Arrange
        var slowest = new List<SlowestWorkflow>
        {
            new() { Name = "slow1", AvgDurationMs = 1000, P95Ms = 1500, DegradationPercent = 50 },
            new() { Name = "slow2", AvgDurationMs = 800, P95Ms = 1200, DegradationPercent = 25 }
        };
        _mockMetricsService.Setup(s => s.GetSlowestWorkflowsAsync(10)).ReturnsAsync(slowest);

        // Act
        var result = await _controller.GetSlowestWorkflows(10);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<List<SlowestWorkflow>>().Subject;
        response.Should().HaveCount(2);
        response.First().Name.Should().Be("slow1");
    }

    [Fact]
    public async Task GetSlowestWorkflows_WithDefaultLimit_ShouldUse10()
    {
        // Arrange
        _mockMetricsService.Setup(s => s.GetSlowestWorkflowsAsync(10))
            .ReturnsAsync(new List<SlowestWorkflow>());

        // Act
        await _controller.GetSlowestWorkflows();

        // Assert
        _mockMetricsService.Verify(s => s.GetSlowestWorkflowsAsync(10), Times.Once);
    }

    [Theory]
    [InlineData(5)]
    [InlineData(20)]
    [InlineData(50)]
    public async Task GetSlowestWorkflows_ShouldRespectLimit(int limit)
    {
        // Arrange
        _mockMetricsService.Setup(s => s.GetSlowestWorkflowsAsync(limit))
            .ReturnsAsync(new List<SlowestWorkflow>());

        // Act
        await _controller.GetSlowestWorkflows(limit);

        // Assert
        _mockMetricsService.Verify(s => s.GetSlowestWorkflowsAsync(limit), Times.Once);
    }

    #endregion
}
