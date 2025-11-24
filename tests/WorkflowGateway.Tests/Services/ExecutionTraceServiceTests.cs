using FluentAssertions;
using WorkflowCore.Models;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

public class ExecutionTraceServiceTests
{
    private readonly ExecutionTraceService _service;

    public ExecutionTraceServiceTests()
    {
        _service = new ExecutionTraceService();
    }

    [Fact]
    public void BuildTrace_WithNoDependencies_ShouldHaveZeroWaitTime()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var workflow = CreateWorkflow("test-workflow", new[]
        {
            ("task1", "fetch-user", Array.Empty<string>())
        });

        var executionRecord = CreateExecution("test-workflow", startTime, new[]
        {
            ("task1", "fetch-user", startTime, startTime.AddMilliseconds(100))
        });

        // Act
        var trace = _service.BuildTrace(executionRecord, workflow);

        // Assert
        trace.TaskTimings.Should().HaveCount(1);
        trace.TaskTimings[0].TaskId.Should().Be("task1");
        trace.TaskTimings[0].WaitTimeMs.Should().Be(0); // No dependencies = no wait
        trace.TaskTimings[0].WaitedForTasks.Should().BeEmpty();
    }

    [Fact]
    public void BuildTrace_WithSingleDependency_ShouldCalculateWaitTime()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var workflow = CreateWorkflow("test-workflow", new[]
        {
            ("task1", "fetch-user", Array.Empty<string>()),
            ("task2", "process-user", new[] { "task1" })
        });

        var executionRecord = CreateExecution("test-workflow", startTime, new[]
        {
            ("task1", "fetch-user", startTime, startTime.AddMilliseconds(100)),
            ("task2", "process-user", startTime.AddMilliseconds(150), startTime.AddMilliseconds(250))
        });

        // Act
        var trace = _service.BuildTrace(executionRecord, workflow);

        // Assert
        var task2Timing = trace.TaskTimings.First(t => t.TaskId == "task2");
        task2Timing.WaitTimeMs.Should().Be(50); // Started at 150, dependency completed at 100 = 50ms wait
        task2Timing.WaitedForTasks.Should().Contain("task1");
    }

    [Fact]
    public void BuildTrace_WithMultipleDependencies_ShouldUseMaxCompletionTime()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var workflow = CreateWorkflow("test-workflow", new[]
        {
            ("task1", "fetch-user", Array.Empty<string>()),
            ("task2", "fetch-products", Array.Empty<string>()),
            ("task3", "merge-data", new[] { "task1", "task2" })
        });

        var executionRecord = CreateExecution("test-workflow", startTime, new[]
        {
            ("task1", "fetch-user", startTime, startTime.AddMilliseconds(100)),
            ("task2", "fetch-products", startTime, startTime.AddMilliseconds(200)), // Completes later
            ("task3", "merge-data", startTime.AddMilliseconds(250), startTime.AddMilliseconds(300))
        });

        // Act
        var trace = _service.BuildTrace(executionRecord, workflow);

        // Assert
        var task3Timing = trace.TaskTimings.First(t => t.TaskId == "task3");
        task3Timing.WaitTimeMs.Should().Be(50); // Started at 250, max(100, 200) = 200, wait = 50ms
        task3Timing.WaitedForTasks.Should().Contain("task1");
        task3Timing.WaitedForTasks.Should().Contain("task2");
    }

    [Fact]
    public void BuildTrace_WithParallelTasks_ShouldDetectOverlap()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var workflow = CreateWorkflow("test-workflow", new[]
        {
            ("task1", "fetch-user", Array.Empty<string>()),
            ("task2", "fetch-products", Array.Empty<string>())
        });

        // Tasks overlap: task1 runs 0-100ms, task2 runs 50-150ms
        var executionRecord = CreateExecution("test-workflow", startTime, new[]
        {
            ("task1", "fetch-user", startTime, startTime.AddMilliseconds(100)),
            ("task2", "fetch-products", startTime.AddMilliseconds(50), startTime.AddMilliseconds(150))
        });

        // Act
        var trace = _service.BuildTrace(executionRecord, workflow);

        // Assert
        trace.ActualParallelGroups.Should().HaveCount(1);
        trace.ActualParallelGroups[0].TaskIds.Should().Contain("task1");
        trace.ActualParallelGroups[0].TaskIds.Should().Contain("task2");
    }

    [Fact]
    public void BuildTrace_WithSequentialTasks_ShouldNotShowParallel()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var workflow = CreateWorkflow("test-workflow", new[]
        {
            ("task1", "fetch-user", Array.Empty<string>()),
            ("task2", "process-user", new[] { "task1" })
        });

        // Tasks run sequentially: task1 finishes before task2 starts
        var executionRecord = CreateExecution("test-workflow", startTime, new[]
        {
            ("task1", "fetch-user", startTime, startTime.AddMilliseconds(100)),
            ("task2", "process-user", startTime.AddMilliseconds(100), startTime.AddMilliseconds(200))
        });

        // Act
        var trace = _service.BuildTrace(executionRecord, workflow);

        // Assert
        // Sequential tasks should not be in same parallel group
        if (trace.ActualParallelGroups.Any())
        {
            trace.ActualParallelGroups.Should().NotContain(g =>
                g.TaskIds.Contains("task1") && g.TaskIds.Contains("task2"));
        }
    }

    [Fact]
    public void BuildTrace_WithFailedTasks_ShouldIncludeInTrace()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var workflow = CreateWorkflow("test-workflow", new[]
        {
            ("task1", "fetch-user", Array.Empty<string>())
        });

        var executionRecord = CreateExecution("test-workflow", startTime, new[]
        {
            ("task1", "fetch-user", startTime, startTime.AddMilliseconds(100), "Failed", 2)
        });

        // Act
        var trace = _service.BuildTrace(executionRecord, workflow);

        // Assert
        trace.TaskTimings.Should().HaveCount(1);
        trace.TaskTimings[0].Success.Should().BeFalse();
        trace.TaskTimings[0].RetryCount.Should().Be(2);
    }

    [Fact]
    public void BuildTrace_WithEmptyExecution_ShouldReturnEmptyTrace()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var workflow = CreateWorkflow("test-workflow", Array.Empty<(string, string, string[])>());
        var executionRecord = CreateExecution("test-workflow", startTime, Array.Empty<(string, string, DateTime, DateTime, string, int)>());

        // Act
        var trace = _service.BuildTrace(executionRecord, workflow);

        // Assert
        trace.WorkflowName.Should().Be("test-workflow");
        trace.TaskTimings.Should().BeEmpty();
        trace.DependencyOrder.Should().BeEmpty();
        trace.ActualParallelGroups.Should().BeEmpty();
    }

    // Helper methods to create test data
    private WorkflowResource CreateWorkflow(string name, (string taskId, string taskRef, string[] dependencies)[] tasks)
    {
        var taskSteps = tasks.Select(t => new WorkflowTaskStep
        {
            Id = t.taskId,
            TaskRef = t.taskRef,
            Input = t.dependencies.Any()
                ? t.dependencies.ToDictionary(d => d, d => $"{{{{tasks.{d}.output}}}}")
                : new Dictionary<string, string>()
        }).ToList();

        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = name },
            Spec = new WorkflowSpec { Tasks = taskSteps }
        };
    }

    private ExecutionRecord CreateExecution(string workflowName, DateTime startTime,
        (string taskId, string taskRef, DateTime startedAt, DateTime completedAt, string status, int retryCount)[] tasks)
    {
        var taskRecords = tasks.Select(t => new TaskExecutionRecord
        {
            TaskId = t.taskId,
            TaskRef = t.taskRef,
            StartedAt = t.startedAt,
            CompletedAt = t.completedAt,
            Duration = t.completedAt - t.startedAt,
            Status = t.status,
            RetryCount = t.retryCount
        }).ToList();

        return new ExecutionRecord
        {
            Id = Guid.NewGuid(),
            WorkflowName = workflowName,
            StartedAt = startTime,
            CompletedAt = tasks.Any() ? tasks.Max(t => t.completedAt) : startTime,
            TaskExecutionRecords = taskRecords
        };
    }

    private ExecutionRecord CreateExecution(string workflowName, DateTime startTime,
        (string taskId, string taskRef, DateTime startedAt, DateTime completedAt)[] tasks)
    {
        return CreateExecution(workflowName, startTime,
            tasks.Select(t => (t.taskId, t.taskRef, t.startedAt, t.completedAt, "Succeeded", 0)).ToArray());
    }
}
