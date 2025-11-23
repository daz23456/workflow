using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Models;

public class ExecutionRecordTests
{
    [Fact]
    public void ExecutionRecord_ShouldInitializeWithDefaults()
    {
        // Arrange & Act
        var record = new ExecutionRecord();

        // Assert
        record.Id.Should().NotBeEmpty();
        record.WorkflowName.Should().BeNull();
        record.Status.Should().Be(ExecutionStatus.Running);
        record.StartedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        record.CompletedAt.Should().BeNull();
        record.Duration.Should().BeNull();
        record.InputSnapshot.Should().BeNull();
        record.TaskExecutionRecords.Should().NotBeNull();
        record.TaskExecutionRecords.Should().BeEmpty();
    }

    [Fact]
    public void ExecutionRecord_ShouldSetAllProperties()
    {
        // Arrange
        var id = Guid.NewGuid();
        var startedAt = DateTime.UtcNow.AddMinutes(-5);
        var completedAt = DateTime.UtcNow;
        var duration = TimeSpan.FromMinutes(5);
        var inputSnapshot = "{\"userId\":\"123\",\"action\":\"test\"}";

        // Act
        var record = new ExecutionRecord
        {
            Id = id,
            WorkflowName = "test-workflow",
            Status = ExecutionStatus.Succeeded,
            StartedAt = startedAt,
            CompletedAt = completedAt,
            Duration = duration,
            InputSnapshot = inputSnapshot
        };

        // Assert
        record.Id.Should().Be(id);
        record.WorkflowName.Should().Be("test-workflow");
        record.Status.Should().Be(ExecutionStatus.Succeeded);
        record.StartedAt.Should().Be(startedAt);
        record.CompletedAt.Should().Be(completedAt);
        record.Duration.Should().Be(duration);
        record.InputSnapshot.Should().Be(inputSnapshot);
    }

    [Fact]
    public void ExecutionRecord_InputSnapshot_ShouldStoreValidJson()
    {
        // Arrange
        var input = new Dictionary<string, object>
        {
            ["userId"] = "123",
            ["count"] = 42,
            ["isActive"] = true
        };
        var json = JsonSerializer.Serialize(input);

        // Act
        var record = new ExecutionRecord
        {
            WorkflowName = "test-workflow",
            InputSnapshot = json
        };

        // Assert
        record.InputSnapshot.Should().Be(json);
        var deserialized = JsonSerializer.Deserialize<Dictionary<string, object>>(record.InputSnapshot!);
        deserialized.Should().ContainKey("userId");
        deserialized.Should().ContainKey("count");
        deserialized.Should().ContainKey("isActive");
    }

    [Fact]
    public void ExecutionRecord_ShouldHandleNullInputSnapshot()
    {
        // Arrange & Act
        var record = new ExecutionRecord
        {
            WorkflowName = "test-workflow",
            InputSnapshot = null
        };

        // Assert
        record.InputSnapshot.Should().BeNull();
    }

    [Fact]
    public void ExecutionRecord_ShouldHandleNullCompletedAt()
    {
        // Arrange & Act
        var record = new ExecutionRecord
        {
            WorkflowName = "running-workflow",
            Status = ExecutionStatus.Running,
            CompletedAt = null
        };

        // Assert
        record.CompletedAt.Should().BeNull();
        record.Status.Should().Be(ExecutionStatus.Running);
    }

    [Fact]
    public void ExecutionRecord_ShouldHaveTaskExecutionRecordsCollection()
    {
        // Arrange & Act
        var record = new ExecutionRecord();

        // Assert
        record.TaskExecutionRecords.Should().NotBeNull();
        record.TaskExecutionRecords.Should().BeEmpty();
    }
}
