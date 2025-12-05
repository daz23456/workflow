using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class WorkflowExecutionResultTests
{
    [Fact]
    public void WorkflowExecutionResult_DefaultValues_ShouldBeInitialized()
    {
        // Act
        var result = new WorkflowExecutionResult();

        // Assert
        result.Success.Should().BeFalse();
        result.Output.Should().BeNull();
        result.TaskResults.Should().NotBeNull().And.BeEmpty();
        result.Errors.Should().NotBeNull().And.BeEmpty();
        result.TotalDuration.Should().Be(TimeSpan.Zero);
        result.GraphBuildDuration.Should().Be(TimeSpan.Zero);
        result.OrchestrationCost.Should().BeNull();
        result.GraphDiagnostics.Should().BeNull();
    }

    [Fact]
    public void WorkflowExecutionResult_WithValues_ShouldStoreCorrectly()
    {
        // Arrange
        var output = new Dictionary<string, object> { ["result"] = "success" };
        var taskResults = new Dictionary<string, TaskExecutionResult>
        {
            ["task-1"] = new TaskExecutionResult { Success = true }
        };

        // Act
        var result = new WorkflowExecutionResult
        {
            Success = true,
            Output = output,
            TaskResults = taskResults,
            Errors = new List<string> { "warning" },
            TotalDuration = TimeSpan.FromSeconds(5),
            GraphBuildDuration = TimeSpan.FromMilliseconds(50)
        };

        // Assert
        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("result");
        result.TaskResults.Should().ContainKey("task-1");
        result.Errors.Should().ContainSingle().Which.Should().Be("warning");
        result.TotalDuration.Should().Be(TimeSpan.FromSeconds(5));
        result.GraphBuildDuration.Should().Be(TimeSpan.FromMilliseconds(50));
    }
}

public class OrchestrationCostMetricsTests
{
    [Fact]
    public void SetupDuration_ShouldCalculateCorrectly()
    {
        // Arrange
        var start = new DateTime(2024, 1, 1, 10, 0, 0);
        var firstTask = new DateTime(2024, 1, 1, 10, 0, 1); // 1 second later

        var metrics = new OrchestrationCostMetrics
        {
            ExecutionStartedAt = start,
            FirstTaskStartedAt = firstTask
        };

        // Act & Assert
        metrics.SetupDuration.Should().Be(TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void TeardownDuration_ShouldCalculateCorrectly()
    {
        // Arrange
        var lastTask = new DateTime(2024, 1, 1, 10, 0, 5);
        var completed = new DateTime(2024, 1, 1, 10, 0, 6); // 1 second later

        var metrics = new OrchestrationCostMetrics
        {
            LastTaskCompletedAt = lastTask,
            ExecutionCompletedAt = completed
        };

        // Act & Assert
        metrics.TeardownDuration.Should().Be(TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void TotalOrchestrationCost_ShouldSumAllComponents()
    {
        // Arrange
        var start = new DateTime(2024, 1, 1, 10, 0, 0);
        var firstTask = new DateTime(2024, 1, 1, 10, 0, 1);
        var lastTask = new DateTime(2024, 1, 1, 10, 0, 5);
        var completed = new DateTime(2024, 1, 1, 10, 0, 6);

        var metrics = new OrchestrationCostMetrics
        {
            ExecutionStartedAt = start,
            FirstTaskStartedAt = firstTask,
            LastTaskCompletedAt = lastTask,
            ExecutionCompletedAt = completed,
            SchedulingOverhead = TimeSpan.FromMilliseconds(500)
        };

        // Act
        var total = metrics.TotalOrchestrationCost;

        // Assert - Setup (1s) + Teardown (1s) + Scheduling (0.5s) = 2.5s
        total.Should().Be(TimeSpan.FromMilliseconds(2500));
    }

    [Fact]
    public void TotalOrchestrationCost_WithZeroValues_ShouldReturnZero()
    {
        // Arrange
        var sameTime = new DateTime(2024, 1, 1, 10, 0, 0);
        var metrics = new OrchestrationCostMetrics
        {
            ExecutionStartedAt = sameTime,
            FirstTaskStartedAt = sameTime,
            LastTaskCompletedAt = sameTime,
            ExecutionCompletedAt = sameTime,
            SchedulingOverhead = TimeSpan.Zero
        };

        // Act & Assert
        metrics.TotalOrchestrationCost.Should().Be(TimeSpan.Zero);
    }

    [Fact]
    public void DefaultValues_ShouldBeInitialized()
    {
        // Act
        var metrics = new OrchestrationCostMetrics();

        // Assert
        metrics.TotalTaskExecutionTime.Should().Be(TimeSpan.Zero);
        metrics.SchedulingOverhead.Should().Be(TimeSpan.Zero);
        metrics.OrchestrationCostPercentage.Should().Be(0);
        metrics.ExecutionIterations.Should().Be(0);
        metrics.IterationTimings.Should().NotBeNull().And.BeEmpty();
    }
}

public class IterationTimingTests
{
    [Fact]
    public void DefaultValues_ShouldBeInitialized()
    {
        // Act
        var timing = new IterationTiming();

        // Assert
        timing.Iteration.Should().Be(0);
        timing.TaskIds.Should().NotBeNull().And.BeEmpty();
        timing.SchedulingDelay.Should().Be(TimeSpan.Zero);
    }

    [Fact]
    public void WithValues_ShouldStoreCorrectly()
    {
        // Arrange
        var start = new DateTime(2024, 1, 1, 10, 0, 0);
        var end = new DateTime(2024, 1, 1, 10, 0, 5);

        // Act
        var timing = new IterationTiming
        {
            Iteration = 1,
            StartedAt = start,
            CompletedAt = end,
            TaskIds = new List<string> { "task-1", "task-2" },
            SchedulingDelay = TimeSpan.FromMilliseconds(100)
        };

        // Assert
        timing.Iteration.Should().Be(1);
        timing.StartedAt.Should().Be(start);
        timing.CompletedAt.Should().Be(end);
        timing.TaskIds.Should().HaveCount(2);
        timing.SchedulingDelay.Should().Be(TimeSpan.FromMilliseconds(100));
    }
}
