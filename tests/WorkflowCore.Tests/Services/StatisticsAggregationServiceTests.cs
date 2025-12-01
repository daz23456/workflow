using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// TDD tests for StatisticsAggregationService with DELTA-BASED updates.
/// No full table scans - updates summary incrementally when each execution completes.
///
/// Approach:
/// - When workflow completes → update that workflow's summary (O(1))
/// - When task completes → update that task's summary (O(1))
/// - Reading all stats → query summary tables (O(n) where n = unique workflows/tasks)
/// </summary>
public class StatisticsAggregationServiceTests
{
    #region Workflow Statistics - Incremental Updates

    [Fact]
    public async Task RecordWorkflowExecutionAsync_FirstExecution_ShouldCreateSummary()
    {
        // Arrange
        var options = CreateDbOptions("DeltaFirstWorkflow");
        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        // Act - Record a single execution
        await service.RecordWorkflowExecutionAsync(
            workflowName: "workflow-1",
            status: ExecutionStatus.Succeeded,
            durationMs: 5000,
            executedAt: DateTime.UtcNow);

        // Assert - Summary should be created
        var summary = await context.WorkflowStatisticsSummaries
            .FirstOrDefaultAsync(s => s.WorkflowName == "workflow-1");

        summary.Should().NotBeNull();
        summary!.TotalExecutions.Should().Be(1);
        summary.SuccessCount.Should().Be(1);
        summary.FailureCount.Should().Be(0);
        summary.SuccessRate.Should().Be(100.0);
        summary.AverageDurationMs.Should().Be(5000);
    }

    [Fact]
    public async Task RecordWorkflowExecutionAsync_SubsequentExecutions_ShouldUpdateSummary()
    {
        // Arrange
        var options = CreateDbOptions("DeltaSubsequentWorkflow");
        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        // Act - Record multiple executions
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Succeeded, 1000, DateTime.UtcNow);
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Succeeded, 2000, DateTime.UtcNow);
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Failed, 500, DateTime.UtcNow);

        // Assert - Summary should be updated incrementally
        var summary = await context.WorkflowStatisticsSummaries
            .FirstOrDefaultAsync(s => s.WorkflowName == "workflow-1");

        summary.Should().NotBeNull();
        summary!.TotalExecutions.Should().Be(3);
        summary.SuccessCount.Should().Be(2);
        summary.FailureCount.Should().Be(1);
        summary.SuccessRate.Should().BeApproximately(66.67, 0.1);
        summary.AverageDurationMs.Should().Be(1500); // (1000 + 2000) / 2 = 1500 (only successful)
    }

    [Fact]
    public async Task RecordWorkflowExecutionAsync_ShouldTrackLastExecutedAt()
    {
        // Arrange
        var options = CreateDbOptions("DeltaWorkflowLastExecuted");
        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        var firstExecution = DateTime.UtcNow.AddHours(-1);
        var secondExecution = DateTime.UtcNow;

        // Act
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Succeeded, 1000, firstExecution);
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Succeeded, 2000, secondExecution);

        // Assert
        var summary = await context.WorkflowStatisticsSummaries.FirstAsync();
        summary.LastExecutedAt.Should().BeCloseTo(secondExecution, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task RecordWorkflowExecutionAsync_FailedExecution_ShouldNotAffectDurationAverage()
    {
        // Arrange
        var options = CreateDbOptions("DeltaWorkflowFailedDuration");
        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        // Act - Record success then failure
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Succeeded, 1000, DateTime.UtcNow);
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Failed, 99999, DateTime.UtcNow);

        // Assert - Average should only include successful executions
        var summary = await context.WorkflowStatisticsSummaries.FirstAsync();
        summary.AverageDurationMs.Should().Be(1000); // Failed execution not included
    }

    [Fact]
    public async Task RecordWorkflowExecutionAsync_MultipleWorkflows_ShouldTrackSeparately()
    {
        // Arrange
        var options = CreateDbOptions("DeltaMultipleWorkflows");
        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        // Act
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Succeeded, 1000, DateTime.UtcNow);
        await service.RecordWorkflowExecutionAsync("workflow-2", ExecutionStatus.Succeeded, 2000, DateTime.UtcNow);
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Succeeded, 3000, DateTime.UtcNow);

        // Assert
        var summaries = await context.WorkflowStatisticsSummaries.ToListAsync();
        summaries.Should().HaveCount(2);

        var wf1 = summaries.First(s => s.WorkflowName == "workflow-1");
        wf1.TotalExecutions.Should().Be(2);
        wf1.AverageDurationMs.Should().Be(2000); // (1000 + 3000) / 2

        var wf2 = summaries.First(s => s.WorkflowName == "workflow-2");
        wf2.TotalExecutions.Should().Be(1);
        wf2.AverageDurationMs.Should().Be(2000);
    }

    #endregion

    #region Task Statistics - Incremental Updates

    [Fact]
    public async Task RecordTaskExecutionAsync_FirstExecution_ShouldCreateSummary()
    {
        // Arrange
        var options = CreateDbOptions("DeltaFirstTask");
        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        // Act
        await service.RecordTaskExecutionAsync(
            taskRef: "task-1",
            status: "Succeeded",
            durationMs: 500,
            executedAt: DateTime.UtcNow);

        // Assert
        var summary = await context.TaskStatisticsSummaries
            .FirstOrDefaultAsync(s => s.TaskRef == "task-1");

        summary.Should().NotBeNull();
        summary!.TotalExecutions.Should().Be(1);
        summary.SuccessCount.Should().Be(1);
        summary.AverageDurationMs.Should().Be(500);
    }

    [Fact]
    public async Task RecordTaskExecutionAsync_SubsequentExecutions_ShouldUpdateSummary()
    {
        // Arrange
        var options = CreateDbOptions("DeltaSubsequentTask");
        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        // Act
        await service.RecordTaskExecutionAsync("task-1", "Succeeded", 100, DateTime.UtcNow);
        await service.RecordTaskExecutionAsync("task-1", "Succeeded", 200, DateTime.UtcNow);
        await service.RecordTaskExecutionAsync("task-1", "Failed", 50, DateTime.UtcNow);

        // Assert
        var summary = await context.TaskStatisticsSummaries.FirstAsync();
        summary.TotalExecutions.Should().Be(3);
        summary.SuccessCount.Should().Be(2);
        summary.FailureCount.Should().Be(1);
        summary.AverageDurationMs.Should().Be(150); // (100 + 200) / 2
    }

    [Fact]
    public async Task RecordTaskExecutionAsync_AcrossWorkflows_ShouldAggregateCorrectly()
    {
        // Arrange
        var options = CreateDbOptions("DeltaTaskAcrossWorkflows");
        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        // Act - Same task ref used in different workflows
        await service.RecordTaskExecutionAsync("shared-task", "Succeeded", 100, DateTime.UtcNow);
        await service.RecordTaskExecutionAsync("shared-task", "Succeeded", 300, DateTime.UtcNow);

        // Assert - Should aggregate across all usages
        var summary = await context.TaskStatisticsSummaries.FirstAsync();
        summary.TaskRef.Should().Be("shared-task");
        summary.TotalExecutions.Should().Be(2);
        summary.AverageDurationMs.Should().Be(200); // (100 + 300) / 2
    }

    #endregion

    #region Get All Statistics - O(n) on Summary Tables

    [Fact]
    public async Task GetAllWorkflowStatisticsAsync_ShouldReadFromSummaryTable()
    {
        // Arrange
        var options = CreateDbOptions("GetAllWorkflows");

        // Seed summary table directly (simulating previous delta updates)
        using (var seedContext = new WorkflowDbContext(options))
        {
            seedContext.WorkflowStatisticsSummaries.AddRange(
                new WorkflowStatisticsSummary
                {
                    WorkflowName = "workflow-1",
                    TotalExecutions = 100,
                    SuccessCount = 90,
                    FailureCount = 10,
                    SuccessRate = 90.0,
                    AverageDurationMs = 5000
                },
                new WorkflowStatisticsSummary
                {
                    WorkflowName = "workflow-2",
                    TotalExecutions = 50,
                    SuccessCount = 45,
                    FailureCount = 5,
                    SuccessRate = 90.0,
                    AverageDurationMs = 3000
                }
            );
            await seedContext.SaveChangesAsync();
        }

        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        // Act - Should read from summary table, NOT scan ExecutionRecords
        var stats = await service.GetAllWorkflowStatisticsAsync();

        // Assert
        stats.Should().HaveCount(2);
        stats["workflow-1"].TotalExecutions.Should().Be(100);
        stats["workflow-2"].TotalExecutions.Should().Be(50);
    }

    [Fact]
    public async Task GetAllTaskStatisticsAsync_ShouldReadFromSummaryTable()
    {
        // Arrange
        var options = CreateDbOptions("GetAllTasks");

        using (var seedContext = new WorkflowDbContext(options))
        {
            seedContext.TaskStatisticsSummaries.AddRange(
                new TaskStatisticsSummary
                {
                    TaskRef = "task-1",
                    TotalExecutions = 200,
                    SuccessCount = 180,
                    FailureCount = 20,
                    SuccessRate = 90.0,
                    AverageDurationMs = 500
                },
                new TaskStatisticsSummary
                {
                    TaskRef = "task-2",
                    TotalExecutions = 100,
                    SuccessCount = 95,
                    FailureCount = 5,
                    SuccessRate = 95.0,
                    AverageDurationMs = 250
                }
            );
            await seedContext.SaveChangesAsync();
        }

        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        // Act
        var stats = await service.GetAllTaskStatisticsAsync();

        // Assert
        stats.Should().HaveCount(2);
        stats["task-1"].TotalExecutions.Should().Be(200);
        stats["task-2"].TotalExecutions.Should().Be(100);
    }

    #endregion

    #region Running Totals for Average Calculation

    [Fact]
    public async Task RecordWorkflowExecutionAsync_ShouldMaintainRunningTotalsForAccurateAverage()
    {
        // Arrange
        var options = CreateDbOptions("DeltaRunningTotals");
        using var context = new WorkflowDbContext(options);
        var service = new StatisticsAggregationService(context);

        // Act - Record 3 executions with known durations
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Succeeded, 100, DateTime.UtcNow);
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Succeeded, 200, DateTime.UtcNow);
        await service.RecordWorkflowExecutionAsync("workflow-1", ExecutionStatus.Succeeded, 300, DateTime.UtcNow);

        // Assert - Average should be exactly (100 + 200 + 300) / 3 = 200
        var summary = await context.WorkflowStatisticsSummaries.FirstAsync();
        summary.AverageDurationMs.Should().Be(200);
        summary.TotalExecutions.Should().Be(3);
        summary.SuccessCount.Should().Be(3);
    }

    #endregion

    #region Helper Methods

    private static DbContextOptions<WorkflowDbContext> CreateDbOptions(string dbName)
    {
        return new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: $"DeltaStats_{dbName}_{Guid.NewGuid()}")
            .Options;
    }

    #endregion
}
