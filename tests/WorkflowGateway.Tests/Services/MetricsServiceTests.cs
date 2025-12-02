using FluentAssertions;
using Moq;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

public class MetricsServiceTests
{
    private readonly Mock<IExecutionRepository> _mockRepository;
    private readonly MetricsService _service;

    public MetricsServiceTests()
    {
        _mockRepository = new Mock<IExecutionRepository>();
        _service = new MetricsService(_mockRepository.Object);
    }

    #region GetSystemMetricsAsync Tests

    [Fact]
    public async Task GetSystemMetricsAsync_WithNoExecutions_ShouldReturnZeroMetrics()
    {
        // Arrange
        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync())
            .ReturnsAsync(new Dictionary<string, WorkflowStatistics>());
        _mockRepository.Setup(r => r.ListExecutionsAsync(null, null, 0, int.MaxValue))
            .ReturnsAsync(new List<ExecutionRecord>());

        // Act
        var result = await _service.GetSystemMetricsAsync(TimeRange.Hour24);

        // Assert
        result.TotalExecutions.Should().Be(0);
        result.Throughput.Should().Be(0);
        result.P50Ms.Should().Be(0);
        result.P95Ms.Should().Be(0);
        result.P99Ms.Should().Be(0);
        result.ErrorRate.Should().Be(0);
    }

    [Fact]
    public async Task GetSystemMetricsAsync_WithExecutions_ShouldCalculateThroughput()
    {
        // Arrange: 100 executions in last 24 hours = ~4.17/hour
        var stats = new Dictionary<string, WorkflowStatistics>
        {
            ["workflow1"] = new() { TotalExecutions = 60, AverageDurationMs = 200, SuccessRate = 95 },
            ["workflow2"] = new() { TotalExecutions = 40, AverageDurationMs = 300, SuccessRate = 90 }
        };
        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync()).ReturnsAsync(stats);

        var executions = CreateExecutions(100, TimeSpan.FromHours(24), successRate: 0.92);
        _mockRepository.Setup(r => r.ListExecutionsAsync(null, null, 0, int.MaxValue))
            .ReturnsAsync(executions);

        // Act
        var result = await _service.GetSystemMetricsAsync(TimeRange.Hour24);

        // Assert
        result.TotalExecutions.Should().Be(100);
        result.Throughput.Should().BeApproximately(4.17, 0.1); // 100 / 24 hours
    }

    [Fact]
    public async Task GetSystemMetricsAsync_ShouldCalculatePercentiles()
    {
        // Arrange: 10 executions with known durations [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
        var executions = new List<ExecutionRecord>();
        var startTime = DateTime.UtcNow.AddMinutes(-30); // Safely within the hour range
        for (int i = 1; i <= 10; i++)
        {
            executions.Add(new ExecutionRecord
            {
                Id = Guid.NewGuid(),
                WorkflowName = "test",
                Status = ExecutionStatus.Succeeded,
                StartedAt = startTime,
                CompletedAt = startTime.AddMilliseconds(i * 100),
                Duration = TimeSpan.FromMilliseconds(i * 100)
            });
        }

        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync())
            .ReturnsAsync(new Dictionary<string, WorkflowStatistics>
            {
                ["test"] = new() { TotalExecutions = 10, SuccessRate = 100 }
            });
        _mockRepository.Setup(r => r.ListExecutionsAsync(null, null, 0, int.MaxValue))
            .ReturnsAsync(executions);

        // Act
        var result = await _service.GetSystemMetricsAsync(TimeRange.Hour1);

        // Assert
        // P50 = 5th value (500), P95 = 10th value (1000), P99 = 10th value (1000)
        result.P50Ms.Should().Be(500);
        result.P95Ms.Should().Be(1000);
        result.P99Ms.Should().Be(1000);
    }

    [Fact]
    public async Task GetSystemMetricsAsync_ShouldCalculateErrorRate()
    {
        // Arrange: 80 succeeded, 20 failed = 20% error rate
        var executions = new List<ExecutionRecord>();
        var startTime = DateTime.UtcNow.AddMinutes(-30); // Safely within the hour range
        for (int i = 0; i < 100; i++)
        {
            executions.Add(new ExecutionRecord
            {
                Id = Guid.NewGuid(),
                WorkflowName = "test",
                Status = i < 80 ? ExecutionStatus.Succeeded : ExecutionStatus.Failed,
                StartedAt = startTime,
                CompletedAt = startTime.AddMilliseconds(100),
                Duration = TimeSpan.FromMilliseconds(100)
            });
        }

        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync())
            .ReturnsAsync(new Dictionary<string, WorkflowStatistics>
            {
                ["test"] = new() { TotalExecutions = 100, SuccessRate = 80 }
            });
        _mockRepository.Setup(r => r.ListExecutionsAsync(null, null, 0, int.MaxValue))
            .ReturnsAsync(executions);

        // Act
        var result = await _service.GetSystemMetricsAsync(TimeRange.Hour1);

        // Assert
        result.ErrorRate.Should().BeApproximately(20.0, 0.1);
    }

    [Theory]
    [InlineData(TimeRange.Hour1, 1)]
    [InlineData(TimeRange.Hour24, 24)]
    [InlineData(TimeRange.Day7, 168)]
    [InlineData(TimeRange.Day30, 720)]
    public async Task GetSystemMetricsAsync_ShouldFilterByTimeRange(TimeRange range, int expectedHours)
    {
        // Arrange
        var now = DateTime.UtcNow;
        var executions = new List<ExecutionRecord>
        {
            // In range
            new() { Id = Guid.NewGuid(), WorkflowName = "test", Status = ExecutionStatus.Succeeded,
                    StartedAt = now.AddMinutes(-30), Duration = TimeSpan.FromMilliseconds(100) },
            // Out of range (old)
            new() { Id = Guid.NewGuid(), WorkflowName = "test", Status = ExecutionStatus.Succeeded,
                    StartedAt = now.AddHours(-(expectedHours + 1)), Duration = TimeSpan.FromMilliseconds(100) }
        };

        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync())
            .ReturnsAsync(new Dictionary<string, WorkflowStatistics>());
        _mockRepository.Setup(r => r.ListExecutionsAsync(null, null, 0, int.MaxValue))
            .ReturnsAsync(executions);

        // Act
        var result = await _service.GetSystemMetricsAsync(range);

        // Assert: Only the in-range execution should be counted
        result.TotalExecutions.Should().Be(1);
    }

    #endregion

    #region GetWorkflowMetricsAsync Tests

    [Fact]
    public async Task GetWorkflowMetricsAsync_ShouldReturnMetricsForAllWorkflows()
    {
        // Arrange
        var stats = new Dictionary<string, WorkflowStatistics>
        {
            ["user-signup"] = new() { TotalExecutions = 100, AverageDurationMs = 234, SuccessRate = 99 },
            ["order-process"] = new() { TotalExecutions = 50, AverageDurationMs = 456, SuccessRate = 97 },
            ["payment-flow"] = new() { TotalExecutions = 25, AverageDurationMs = 892, SuccessRate = 95 }
        };
        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync()).ReturnsAsync(stats);
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync(It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync(new List<DurationDataPoint>());

        // Act
        var result = await _service.GetWorkflowMetricsAsync();

        // Assert
        result.Should().HaveCount(3);
        result.Should().Contain(m => m.Name == "user-signup" && m.AvgDurationMs == 234);
        result.Should().Contain(m => m.Name == "order-process" && m.AvgDurationMs == 456);
        result.Should().Contain(m => m.Name == "payment-flow" && m.AvgDurationMs == 892);
    }

    [Fact]
    public async Task GetWorkflowMetricsAsync_ShouldCalculateErrorRate()
    {
        // Arrange
        var stats = new Dictionary<string, WorkflowStatistics>
        {
            ["test"] = new() { TotalExecutions = 100, AverageDurationMs = 200, SuccessRate = 95 }
        };
        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync()).ReturnsAsync(stats);
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync(It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync(new List<DurationDataPoint>());

        // Act
        var result = await _service.GetWorkflowMetricsAsync();

        // Assert
        result.First().ErrorRate.Should().Be(5); // 100 - 95 = 5% error rate
    }

    [Fact]
    public async Task GetWorkflowMetricsAsync_ShouldIncludeP95FromTrends()
    {
        // Arrange
        var stats = new Dictionary<string, WorkflowStatistics>
        {
            ["test"] = new() { TotalExecutions = 100, AverageDurationMs = 200, SuccessRate = 100 }
        };
        var trends = new List<DurationDataPoint>
        {
            new() { Date = DateTime.UtcNow.AddDays(-1), P95DurationMs = 450, ExecutionCount = 50 },
            new() { Date = DateTime.UtcNow, P95DurationMs = 500, ExecutionCount = 50 }
        };
        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync()).ReturnsAsync(stats);
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync("test", It.IsAny<int>())).ReturnsAsync(trends);

        // Act
        var result = await _service.GetWorkflowMetricsAsync();

        // Assert: P95 should be weighted average based on execution count
        result.First().P95Ms.Should().Be(475); // (450*50 + 500*50) / 100 = 475
    }

    #endregion

    #region GetWorkflowHistoryAsync Tests

    [Fact]
    public async Task GetWorkflowHistoryAsync_ShouldReturnHistoricalTrends()
    {
        // Arrange
        var trends = new List<DurationDataPoint>
        {
            new() { Date = DateTime.UtcNow.AddDays(-2), AverageDurationMs = 180, P95DurationMs = 300,
                    ExecutionCount = 100, SuccessCount = 95, FailureCount = 5 },
            new() { Date = DateTime.UtcNow.AddDays(-1), AverageDurationMs = 200, P95DurationMs = 350,
                    ExecutionCount = 120, SuccessCount = 110, FailureCount = 10 },
            new() { Date = DateTime.UtcNow, AverageDurationMs = 220, P95DurationMs = 400,
                    ExecutionCount = 80, SuccessCount = 75, FailureCount = 5 }
        };
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync("test-workflow", 30))
            .ReturnsAsync(trends);

        // Act
        var result = await _service.GetWorkflowHistoryAsync("test-workflow", TimeRange.Day30);

        // Assert
        result.Should().HaveCount(3);
        result[0].AvgDurationMs.Should().Be(180);
        result[1].AvgDurationMs.Should().Be(200);
        result[2].AvgDurationMs.Should().Be(220);
    }

    [Fact]
    public async Task GetWorkflowHistoryAsync_ShouldCalculateErrorRatePerDataPoint()
    {
        // Arrange
        var trends = new List<DurationDataPoint>
        {
            new() { Date = DateTime.UtcNow, ExecutionCount = 100, SuccessCount = 90, FailureCount = 10 }
        };
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync("test", 1))
            .ReturnsAsync(trends);

        // Act
        var result = await _service.GetWorkflowHistoryAsync("test", TimeRange.Hour24);

        // Assert
        result.First().ErrorRate.Should().Be(10); // 10 failures out of 100 = 10%
    }

    [Theory]
    [InlineData(TimeRange.Hour1, 1)]
    [InlineData(TimeRange.Hour24, 1)]
    [InlineData(TimeRange.Day7, 7)]
    [InlineData(TimeRange.Day30, 30)]
    public async Task GetWorkflowHistoryAsync_ShouldUseDaysBackBasedOnRange(TimeRange range, int expectedDays)
    {
        // Arrange
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync("test", expectedDays))
            .ReturnsAsync(new List<DurationDataPoint>());

        // Act
        await _service.GetWorkflowHistoryAsync("test", range);

        // Assert
        _mockRepository.Verify(r => r.GetWorkflowDurationTrendsAsync("test", expectedDays), Times.Once);
    }

    #endregion

    #region GetSlowestWorkflowsAsync Tests

    [Fact]
    public async Task GetSlowestWorkflowsAsync_ShouldReturnTopNSlowest()
    {
        // Arrange
        var stats = new Dictionary<string, WorkflowStatistics>
        {
            ["fast"] = new() { TotalExecutions = 100, AverageDurationMs = 100 },
            ["medium"] = new() { TotalExecutions = 100, AverageDurationMs = 500 },
            ["slow"] = new() { TotalExecutions = 100, AverageDurationMs = 1000 },
            ["slowest"] = new() { TotalExecutions = 100, AverageDurationMs = 2000 }
        };
        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync()).ReturnsAsync(stats);
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync(It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync(new List<DurationDataPoint>());

        // Act
        var result = await _service.GetSlowestWorkflowsAsync(limit: 3);

        // Assert
        result.Should().HaveCount(3);
        result[0].Name.Should().Be("slowest");
        result[1].Name.Should().Be("slow");
        result[2].Name.Should().Be("medium");
    }

    [Fact]
    public async Task GetSlowestWorkflowsAsync_ShouldIncludeP95()
    {
        // Arrange
        var stats = new Dictionary<string, WorkflowStatistics>
        {
            ["test"] = new() { TotalExecutions = 100, AverageDurationMs = 500 }
        };
        var trends = new List<DurationDataPoint>
        {
            new() { P95DurationMs = 800, ExecutionCount = 100 }
        };
        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync()).ReturnsAsync(stats);
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync("test", It.IsAny<int>())).ReturnsAsync(trends);

        // Act
        var result = await _service.GetSlowestWorkflowsAsync(limit: 10);

        // Assert
        result.First().P95Ms.Should().Be(800);
    }

    [Fact]
    public async Task GetSlowestWorkflowsAsync_ShouldCalculateDegradation()
    {
        // Arrange: workflow went from 100ms average to 200ms = 100% degradation
        var stats = new Dictionary<string, WorkflowStatistics>
        {
            ["degrading"] = new() { TotalExecutions = 200, AverageDurationMs = 200 }
        };
        var trends = new List<DurationDataPoint>
        {
            new() { Date = DateTime.UtcNow.AddDays(-7), AverageDurationMs = 100, ExecutionCount = 100 },
            new() { Date = DateTime.UtcNow, AverageDurationMs = 200, ExecutionCount = 100 }
        };
        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync()).ReturnsAsync(stats);
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync("degrading", It.IsAny<int>())).ReturnsAsync(trends);

        // Act
        var result = await _service.GetSlowestWorkflowsAsync(limit: 10);

        // Assert
        result.First().DegradationPercent.Should().Be(100); // 100% slower
    }

    [Fact]
    public async Task GetSlowestWorkflowsAsync_WithImprovement_ShouldShowNegativeDegradation()
    {
        // Arrange: workflow went from 200ms average to 100ms = -50% degradation (improvement)
        var stats = new Dictionary<string, WorkflowStatistics>
        {
            ["improving"] = new() { TotalExecutions = 200, AverageDurationMs = 100 }
        };
        var trends = new List<DurationDataPoint>
        {
            new() { Date = DateTime.UtcNow.AddDays(-7), AverageDurationMs = 200, ExecutionCount = 100 },
            new() { Date = DateTime.UtcNow, AverageDurationMs = 100, ExecutionCount = 100 }
        };
        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync()).ReturnsAsync(stats);
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync("improving", It.IsAny<int>())).ReturnsAsync(trends);

        // Act
        var result = await _service.GetSlowestWorkflowsAsync(limit: 10);

        // Assert
        result.First().DegradationPercent.Should().Be(-50); // 50% faster
    }

    [Fact]
    public async Task GetSlowestWorkflowsAsync_WithDefaultLimit_ShouldReturn10()
    {
        // Arrange
        var stats = Enumerable.Range(1, 15)
            .ToDictionary(i => $"workflow{i}", i => new WorkflowStatistics { AverageDurationMs = i * 100 });
        _mockRepository.Setup(r => r.GetAllWorkflowStatisticsAsync()).ReturnsAsync(stats);
        _mockRepository.Setup(r => r.GetWorkflowDurationTrendsAsync(It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync(new List<DurationDataPoint>());

        // Act
        var result = await _service.GetSlowestWorkflowsAsync();

        // Assert
        result.Should().HaveCount(10);
    }

    #endregion

    #region Helper Methods

    private List<ExecutionRecord> CreateExecutions(int count, TimeSpan timeSpan, double successRate)
    {
        var executions = new List<ExecutionRecord>();
        var now = DateTime.UtcNow;
        var random = new Random(42); // Fixed seed for reproducibility

        for (int i = 0; i < count; i++)
        {
            var startTime = now.AddMinutes(-random.NextDouble() * timeSpan.TotalMinutes);
            var duration = TimeSpan.FromMilliseconds(100 + random.Next(900));
            var isSuccess = random.NextDouble() < successRate;

            executions.Add(new ExecutionRecord
            {
                Id = Guid.NewGuid(),
                WorkflowName = $"workflow{i % 5}",
                Status = isSuccess ? ExecutionStatus.Succeeded : ExecutionStatus.Failed,
                StartedAt = startTime,
                CompletedAt = startTime.Add(duration),
                Duration = duration
            });
        }

        return executions;
    }

    #endregion
}
