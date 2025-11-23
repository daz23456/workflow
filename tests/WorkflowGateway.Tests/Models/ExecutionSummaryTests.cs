using FluentAssertions;
using WorkflowGateway.Models;

namespace WorkflowGateway.Tests.Models;

public class ExecutionSummaryTests
{
    [Fact]
    public void ExecutionSummary_ShouldInitialize_WithDefaultValues()
    {
        // Arrange & Act
        var summary = new ExecutionSummary();

        // Assert
        summary.Id.Should().BeEmpty();
        summary.WorkflowName.Should().BeNull();
        summary.Status.Should().BeNull();
        summary.DurationMs.Should().BeNull();
        summary.CompletedAt.Should().BeNull();
    }

    [Fact]
    public void ExecutionSummary_ShouldSet_AllProperties()
    {
        // Arrange
        var id = Guid.NewGuid();
        var startedAt = DateTime.UtcNow.AddMinutes(-10);
        var completedAt = DateTime.UtcNow;
        var durationMs = (long)(completedAt - startedAt).TotalMilliseconds;

        // Act
        var summary = new ExecutionSummary
        {
            Id = id,
            WorkflowName = "user-registration",
            Status = "Succeeded",
            StartedAt = startedAt,
            DurationMs = durationMs,
            CompletedAt = completedAt
        };

        // Assert
        summary.Id.Should().Be(id);
        summary.WorkflowName.Should().Be("user-registration");
        summary.Status.Should().Be("Succeeded");
        summary.StartedAt.Should().Be(startedAt);
        summary.DurationMs.Should().Be(durationMs);
        summary.CompletedAt.Should().Be(completedAt);
    }

    [Fact]
    public void ExecutionSummary_ShouldSupport_RunningStatus()
    {
        // Arrange & Act
        var summary = new ExecutionSummary
        {
            Id = Guid.NewGuid(),
            WorkflowName = "data-processing",
            Status = "Running",
            StartedAt = DateTime.UtcNow,
            DurationMs = null,  // Still running
            CompletedAt = null  // Not completed yet
        };

        // Assert
        summary.Status.Should().Be("Running");
        summary.DurationMs.Should().BeNull();
        summary.CompletedAt.Should().BeNull();
    }

    [Fact]
    public void ExecutionSummary_ShouldSupport_FailedStatus()
    {
        // Arrange
        var startedAt = DateTime.UtcNow.AddSeconds(-5);
        var completedAt = DateTime.UtcNow;

        // Act
        var summary = new ExecutionSummary
        {
            Id = Guid.NewGuid(),
            WorkflowName = "failing-workflow",
            Status = "Failed",
            StartedAt = startedAt,
            DurationMs = 5000,
            CompletedAt = completedAt
        };

        // Assert
        summary.Status.Should().Be("Failed");
        summary.DurationMs.Should().Be(5000);
        summary.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public void ExecutionSummary_ShouldSupport_CancelledStatus()
    {
        // Arrange & Act
        var summary = new ExecutionSummary
        {
            Id = Guid.NewGuid(),
            WorkflowName = "cancelled-workflow",
            Status = "Cancelled",
            StartedAt = DateTime.UtcNow.AddSeconds(-2),
            DurationMs = 2000,
            CompletedAt = DateTime.UtcNow
        };

        // Assert
        summary.Status.Should().Be("Cancelled");
    }

    [Fact]
    public void ExecutionSummary_ShouldHandle_LongRunningExecution()
    {
        // Arrange
        var startedAt = DateTime.UtcNow.AddHours(-2);
        var completedAt = DateTime.UtcNow;
        var durationMs = (long)(completedAt - startedAt).TotalMilliseconds;

        // Act
        var summary = new ExecutionSummary
        {
            Id = Guid.NewGuid(),
            WorkflowName = "long-running-job",
            Status = "Succeeded",
            StartedAt = startedAt,
            DurationMs = durationMs,
            CompletedAt = completedAt
        };

        // Assert
        summary.DurationMs.Should().BeGreaterThan(7_000_000); // > 2 hours in ms
        (summary.CompletedAt!.Value - summary.StartedAt).TotalHours.Should().BeApproximately(2, 0.1);
    }
}
