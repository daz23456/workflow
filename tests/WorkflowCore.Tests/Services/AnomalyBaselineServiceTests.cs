using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using WorkflowCore.Data;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class AnomalyBaselineServiceTests : IDisposable
{
    private readonly WorkflowDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly AnomalyBaselineService _service;

    public AnomalyBaselineServiceTests()
    {
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new WorkflowDbContext(options);
        _cache = new MemoryCache(new MemoryCacheOptions());
        _service = new AnomalyBaselineService(_context, _cache);
    }

    public void Dispose()
    {
        _context.Dispose();
        _cache.Dispose();
    }

    #region CalculateBaselineAsync Tests

    [Fact]
    public async Task CalculateBaselineAsync_WithSufficientData_ShouldReturnBaseline()
    {
        // Arrange
        var workflowName = "test-workflow";
        await SeedExecutionRecords(workflowName, durations: new[] { 100, 200, 300, 400, 500 });

        // Act
        var baseline = await _service.CalculateBaselineAsync(workflowName);

        // Assert
        baseline.Should().NotBeNull();
        baseline.WorkflowName.Should().Be(workflowName);
        baseline.SampleCount.Should().Be(5);
        baseline.MeanDurationMs.Should().BeApproximately(300, 0.1); // (100+200+300+400+500)/5 = 300
    }

    [Fact]
    public async Task CalculateBaselineAsync_ShouldCalculateCorrectStandardDeviation()
    {
        // Arrange
        var workflowName = "stddev-workflow";
        // Using values that give a known std dev: 10, 20, 30, 40, 50
        // Mean = 30, Variance = ((20^2 + 10^2 + 0 + 10^2 + 20^2) / 5) = 200, StdDev = √200 ≈ 14.14
        await SeedExecutionRecords(workflowName, durations: new[] { 10, 20, 30, 40, 50 });

        // Act
        var baseline = await _service.CalculateBaselineAsync(workflowName);

        // Assert
        baseline.StdDevDurationMs.Should().BeApproximately(14.14, 0.1);
    }

    [Fact]
    public async Task CalculateBaselineAsync_ShouldCalculateCorrectPercentiles()
    {
        // Arrange
        var workflowName = "percentile-workflow";
        // 100 values: 1, 2, 3, ..., 100
        var durations = Enumerable.Range(1, 100).ToArray();
        await SeedExecutionRecords(workflowName, durations);

        // Act
        var baseline = await _service.CalculateBaselineAsync(workflowName);

        // Assert
        baseline.P50DurationMs.Should().BeApproximately(50, 1); // Median
        baseline.P95DurationMs.Should().BeApproximately(95, 1);
        baseline.P99DurationMs.Should().BeApproximately(99, 1);
    }

    [Fact]
    public async Task CalculateBaselineAsync_WithNoData_ShouldReturnEmptyBaseline()
    {
        // Arrange
        var workflowName = "empty-workflow";

        // Act
        var baseline = await _service.CalculateBaselineAsync(workflowName);

        // Assert
        baseline.Should().NotBeNull();
        baseline.SampleCount.Should().Be(0);
        baseline.MeanDurationMs.Should().Be(0);
        baseline.StdDevDurationMs.Should().Be(0);
    }

    [Fact]
    public async Task CalculateBaselineAsync_ShouldOnlyIncludeSuccessfulExecutions()
    {
        // Arrange
        var workflowName = "mixed-status-workflow";
        await SeedExecutionRecords(workflowName, durations: new[] { 100, 200, 300 }, status: ExecutionStatus.Succeeded);
        await SeedExecutionRecords(workflowName, durations: new[] { 1000, 2000 }, status: ExecutionStatus.Failed);

        // Act
        var baseline = await _service.CalculateBaselineAsync(workflowName);

        // Assert
        baseline.SampleCount.Should().Be(3); // Only successful
        baseline.MeanDurationMs.Should().BeApproximately(200, 0.1);
    }

    [Fact]
    public async Task CalculateBaselineAsync_ShouldRespectTimeWindow()
    {
        // Arrange
        var workflowName = "time-window-workflow";
        var now = DateTime.UtcNow;

        // Recent executions (within 7 days)
        await SeedExecutionRecords(workflowName, durations: new[] { 100, 200, 300 }, startDate: now.AddDays(-3));
        // Old executions (outside 7 days)
        await SeedExecutionRecords(workflowName, durations: new[] { 1000, 2000 }, startDate: now.AddDays(-10));

        // Act
        var baseline = await _service.CalculateBaselineAsync(workflowName, windowDays: 7);

        // Assert
        baseline.SampleCount.Should().Be(3); // Only recent
        baseline.MeanDurationMs.Should().BeApproximately(200, 0.1);
    }

    [Fact]
    public async Task CalculateBaselineAsync_ForTask_ShouldCalculateTaskBaseline()
    {
        // Arrange
        var workflowName = "task-workflow";
        var taskId = "task-1";
        await SeedTaskExecutionRecords(workflowName, taskId, durations: new[] { 50, 100, 150 });

        // Act
        var baseline = await _service.CalculateBaselineAsync(workflowName, taskId);

        // Assert
        baseline.TaskId.Should().Be(taskId);
        baseline.SampleCount.Should().Be(3);
        baseline.MeanDurationMs.Should().BeApproximately(100, 0.1);
    }

    [Fact]
    public async Task CalculateBaselineAsync_ShouldSetWindowDates()
    {
        // Arrange
        var workflowName = "dates-workflow";
        await SeedExecutionRecords(workflowName, durations: new[] { 100 });

        // Act
        var baseline = await _service.CalculateBaselineAsync(workflowName, windowDays: 7);

        // Assert
        baseline.WindowStart.Should().BeCloseTo(DateTime.UtcNow.AddDays(-7), TimeSpan.FromSeconds(5));
        baseline.WindowEnd.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        baseline.CalculatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    #endregion

    #region GetBaselineAsync Tests

    [Fact]
    public async Task GetBaselineAsync_WithCachedBaseline_ShouldReturnFromCache()
    {
        // Arrange
        var workflowName = "cached-workflow";
        var cachedBaseline = new AnomalyBaseline
        {
            WorkflowName = workflowName,
            MeanDurationMs = 999,
            SampleCount = 10
        };
        _cache.Set($"baseline:{workflowName}:", cachedBaseline);

        // Act
        var baseline = await _service.GetBaselineAsync(workflowName);

        // Assert
        baseline.Should().NotBeNull();
        baseline!.MeanDurationMs.Should().Be(999);
    }

    [Fact]
    public async Task GetBaselineAsync_WithNoCachedBaseline_ShouldReturnNull()
    {
        // Arrange
        var workflowName = "uncached-workflow";

        // Act
        var baseline = await _service.GetBaselineAsync(workflowName);

        // Assert
        baseline.Should().BeNull();
    }

    [Fact]
    public async Task GetBaselineAsync_ForTask_ShouldUseSeparateCacheKey()
    {
        // Arrange
        var workflowName = "task-cache-workflow";
        var taskId = "task-1";
        var workflowBaseline = new AnomalyBaseline { WorkflowName = workflowName, MeanDurationMs = 100 };
        var taskBaseline = new AnomalyBaseline { WorkflowName = workflowName, TaskId = taskId, MeanDurationMs = 50 };

        _cache.Set($"baseline:{workflowName}:", workflowBaseline);
        _cache.Set($"baseline:{workflowName}:{taskId}", taskBaseline);

        // Act
        var workflowResult = await _service.GetBaselineAsync(workflowName);
        var taskResult = await _service.GetBaselineAsync(workflowName, taskId);

        // Assert
        workflowResult!.MeanDurationMs.Should().Be(100);
        taskResult!.MeanDurationMs.Should().Be(50);
    }

    #endregion

    #region HasSufficientDataAsync Tests

    [Fact]
    public async Task HasSufficientDataAsync_WithEnoughSamples_ShouldReturnTrue()
    {
        // Arrange
        var workflowName = "sufficient-workflow";
        await SeedExecutionRecords(workflowName, durations: Enumerable.Range(1, 30).ToArray());

        // Act
        var result = await _service.HasSufficientDataAsync(workflowName);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task HasSufficientDataAsync_WithInsufficientSamples_ShouldReturnFalse()
    {
        // Arrange
        var workflowName = "insufficient-workflow";
        await SeedExecutionRecords(workflowName, durations: new[] { 100, 200 });

        // Act
        var result = await _service.HasSufficientDataAsync(workflowName);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasSufficientDataAsync_WithCustomMinSamples_ShouldRespectThreshold()
    {
        // Arrange
        var workflowName = "custom-min-workflow";
        await SeedExecutionRecords(workflowName, durations: Enumerable.Range(1, 10).ToArray());

        // Act
        var result = await _service.HasSufficientDataAsync(workflowName, minSamples: 5);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region RefreshAllBaselinesAsync Tests

    [Fact]
    public async Task RefreshAllBaselinesAsync_ShouldUpdateCacheForAllWorkflows()
    {
        // Arrange
        await SeedExecutionRecords("workflow-1", durations: Enumerable.Range(1, 50).ToArray());
        await SeedExecutionRecords("workflow-2", durations: Enumerable.Range(100, 50).ToArray());

        // Act
        await _service.RefreshAllBaselinesAsync();

        // Assert
        var baseline1 = await _service.GetBaselineAsync("workflow-1");
        var baseline2 = await _service.GetBaselineAsync("workflow-2");

        baseline1.Should().NotBeNull();
        baseline2.Should().NotBeNull();
        baseline1!.SampleCount.Should().Be(50);
        baseline2!.SampleCount.Should().Be(50);
    }

    [Fact]
    public async Task RefreshAllBaselinesAsync_ShouldSkipWorkflowsWithInsufficientData()
    {
        // Arrange
        await SeedExecutionRecords("sufficient-workflow", durations: Enumerable.Range(1, 50).ToArray());
        await SeedExecutionRecords("insufficient-workflow", durations: new[] { 100, 200 });

        // Act
        await _service.RefreshAllBaselinesAsync();

        // Assert
        var sufficientBaseline = await _service.GetBaselineAsync("sufficient-workflow");
        var insufficientBaseline = await _service.GetBaselineAsync("insufficient-workflow");

        sufficientBaseline.Should().NotBeNull();
        insufficientBaseline.Should().BeNull();
    }

    [Fact]
    public async Task RefreshAllBaselinesAsync_ShouldRespectCancellationToken()
    {
        // Arrange
        await SeedExecutionRecords("workflow-1", durations: Enumerable.Range(1, 50).ToArray());
        var cts = new CancellationTokenSource();
        cts.Cancel();

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(
            () => _service.RefreshAllBaselinesAsync(cts.Token));
    }

    #endregion

    #region GetAllWorkflowNamesAsync Tests

    [Fact]
    public async Task GetAllWorkflowNamesAsync_ShouldReturnDistinctWorkflowNames()
    {
        // Arrange
        await SeedExecutionRecords("workflow-a", durations: new[] { 100 });
        await SeedExecutionRecords("workflow-b", durations: new[] { 200 });
        await SeedExecutionRecords("workflow-a", durations: new[] { 300 }); // Duplicate

        // Act
        var names = await _service.GetAllWorkflowNamesAsync();

        // Assert
        names.Should().BeEquivalentTo(new[] { "workflow-a", "workflow-b" });
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task CalculateBaselineAsync_WithSingleSample_ShouldHaveZeroStdDev()
    {
        // Arrange
        var workflowName = "single-sample";
        await SeedExecutionRecords(workflowName, durations: new[] { 100 });

        // Act
        var baseline = await _service.CalculateBaselineAsync(workflowName);

        // Assert
        baseline.StdDevDurationMs.Should().Be(0);
    }

    [Fact]
    public async Task CalculateBaselineAsync_WithIdenticalSamples_ShouldHaveZeroStdDev()
    {
        // Arrange
        var workflowName = "identical-samples";
        await SeedExecutionRecords(workflowName, durations: new[] { 100, 100, 100, 100, 100 });

        // Act
        var baseline = await _service.CalculateBaselineAsync(workflowName);

        // Assert
        baseline.StdDevDurationMs.Should().Be(0);
        baseline.MeanDurationMs.Should().Be(100);
    }

    #endregion

    #region Helper Methods

    private async Task SeedExecutionRecords(
        string workflowName,
        int[] durations,
        ExecutionStatus status = ExecutionStatus.Succeeded,
        DateTime? startDate = null)
    {
        var baseDate = startDate ?? DateTime.UtcNow;

        foreach (var (duration, index) in durations.Select((d, i) => (d, i)))
        {
            var record = new ExecutionRecord
            {
                Id = Guid.NewGuid(),
                WorkflowName = workflowName,
                Status = status,
                StartedAt = baseDate.AddMinutes(-index),
                CompletedAt = baseDate.AddMinutes(-index).AddMilliseconds(duration),
                Duration = TimeSpan.FromMilliseconds(duration)
            };
            _context.ExecutionRecords.Add(record);
        }

        await _context.SaveChangesAsync();
    }

    private async Task SeedTaskExecutionRecords(
        string workflowName,
        string taskId,
        int[] durations,
        string status = "Succeeded",
        DateTime? startDate = null)
    {
        var baseDate = startDate ?? DateTime.UtcNow;
        var executionId = Guid.NewGuid();

        // Create parent execution record
        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = workflowName,
            Status = ExecutionStatus.Succeeded,
            StartedAt = baseDate
        };
        _context.ExecutionRecords.Add(executionRecord);

        foreach (var (duration, index) in durations.Select((d, i) => (d, i)))
        {
            var record = new TaskExecutionRecord
            {
                Id = Guid.NewGuid(),
                ExecutionId = executionId,
                TaskId = taskId,
                TaskRef = $"{workflowName}-{taskId}",
                Status = status,
                StartedAt = baseDate.AddMinutes(-index),
                CompletedAt = baseDate.AddMinutes(-index).AddMilliseconds(duration),
                Duration = TimeSpan.FromMilliseconds(duration)
            };
            _context.TaskExecutionRecords.Add(record);
        }

        await _context.SaveChangesAsync();
    }

    #endregion
}
