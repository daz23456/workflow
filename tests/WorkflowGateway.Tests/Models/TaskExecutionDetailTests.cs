using FluentAssertions;
using WorkflowGateway.Models;

namespace WorkflowGateway.Tests.Models;

public class TaskExecutionDetailTests
{
    [Fact]
    public void TaskExecutionDetail_ShouldInitialize_WithDefaultValues()
    {
        // Arrange & Act
        var detail = new TaskExecutionDetail();

        // Assert
        detail.TaskId.Should().BeNull();
        detail.TaskRef.Should().BeNull();
        detail.Success.Should().BeFalse();
        detail.Output.Should().BeNull();
        detail.Errors.Should().NotBeNull();
        detail.Errors.Should().BeEmpty();
        detail.RetryCount.Should().Be(0);
        detail.DurationMs.Should().Be(0);
    }

    [Fact]
    public void TaskExecutionDetail_ShouldSet_AllProperties()
    {
        // Arrange
        var startedAt = DateTime.UtcNow.AddMinutes(-5);
        var completedAt = DateTime.UtcNow;
        var output = new Dictionary<string, object>
        {
            ["userId"] = "123",
            ["email"] = "test@example.com"
        };

        // Act
        var detail = new TaskExecutionDetail
        {
            TaskId = "task-1",
            TaskRef = "fetch-user",
            Success = true,
            Output = output,
            Errors = new List<string>(),
            RetryCount = 2,
            DurationMs = 1500,
            StartedAt = startedAt,
            CompletedAt = completedAt
        };

        // Assert
        detail.TaskId.Should().Be("task-1");
        detail.TaskRef.Should().Be("fetch-user");
        detail.Success.Should().BeTrue();
        detail.Output.Should().BeEquivalentTo(output);
        detail.Errors.Should().BeEmpty();
        detail.RetryCount.Should().Be(2);
        detail.DurationMs.Should().Be(1500);
        detail.StartedAt.Should().Be(startedAt);
        detail.CompletedAt.Should().Be(completedAt);
    }

    [Fact]
    public void TaskExecutionDetail_ShouldStore_ErrorMessages()
    {
        // Arrange & Act
        var detail = new TaskExecutionDetail
        {
            TaskId = "task-2",
            TaskRef = "failing-task",
            Success = false,
            Errors = new List<string>
            {
                "Connection timeout",
                "Retry limit exceeded"
            }
        };

        // Assert
        detail.Success.Should().BeFalse();
        detail.Errors.Should().HaveCount(2);
        detail.Errors.Should().Contain("Connection timeout");
        detail.Errors.Should().Contain("Retry limit exceeded");
    }

    [Fact]
    public void TaskExecutionDetail_ShouldHandle_NullOutput()
    {
        // Arrange & Act
        var detail = new TaskExecutionDetail
        {
            TaskId = "task-3",
            TaskRef = "no-output-task",
            Success = true,
            Output = null
        };

        // Assert
        detail.Success.Should().BeTrue();
        detail.Output.Should().BeNull();
    }

    [Fact]
    public void TaskExecutionDetail_ShouldCalculate_Duration()
    {
        // Arrange
        var startedAt = new DateTime(2025, 11, 23, 10, 0, 0, DateTimeKind.Utc);
        var completedAt = new DateTime(2025, 11, 23, 10, 0, 2, 500, DateTimeKind.Utc);
        var expectedDurationMs = 2500;

        // Act
        var detail = new TaskExecutionDetail
        {
            TaskId = "task-4",
            TaskRef = "timed-task",
            Success = true,
            DurationMs = expectedDurationMs,
            StartedAt = startedAt,
            CompletedAt = completedAt
        };

        // Assert
        detail.DurationMs.Should().Be(expectedDurationMs);
        (detail.CompletedAt - detail.StartedAt).TotalMilliseconds.Should().BeApproximately(expectedDurationMs, 10);
    }

    [Fact]
    public void TaskExecutionDetail_ShouldSupport_ZeroRetries()
    {
        // Arrange & Act
        var detail = new TaskExecutionDetail
        {
            TaskId = "task-5",
            TaskRef = "first-try-success",
            Success = true,
            RetryCount = 0
        };

        // Assert
        detail.RetryCount.Should().Be(0);
        detail.Success.Should().BeTrue();
    }
}
