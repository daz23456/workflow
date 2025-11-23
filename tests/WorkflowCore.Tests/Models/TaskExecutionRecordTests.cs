using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Models;

public class TaskExecutionRecordTests
{
    [Fact]
    public void TaskExecutionRecord_ShouldInitializeWithDefaults()
    {
        // Arrange & Act
        var record = new TaskExecutionRecord();

        // Assert
        record.Id.Should().NotBeEmpty();
        record.ExecutionId.Should().BeEmpty();
        record.TaskId.Should().BeNull();
        record.TaskRef.Should().BeNull();
        record.Status.Should().BeNull();
        record.Output.Should().BeNull();
        record.Errors.Should().BeNull();
        record.Duration.Should().BeNull();
        record.RetryCount.Should().Be(0);
        record.StartedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        record.CompletedAt.Should().BeNull();
        record.ExecutionRecord.Should().BeNull();
    }

    [Fact]
    public void TaskExecutionRecord_ShouldSetAllProperties()
    {
        // Arrange
        var id = Guid.NewGuid();
        var executionId = Guid.NewGuid();
        var startedAt = DateTime.UtcNow.AddMinutes(-2);
        var completedAt = DateTime.UtcNow;
        var duration = TimeSpan.FromMinutes(2);
        var output = "{\"result\":\"success\",\"data\":{\"userId\":\"123\"}}";
        var errors = "[\"timeout on retry 1\",\"connection failed on retry 2\"]";

        // Act
        var record = new TaskExecutionRecord
        {
            Id = id,
            ExecutionId = executionId,
            TaskId = "task-1",
            TaskRef = "fetch-user",
            Status = "Succeeded",
            Output = output,
            Errors = errors,
            Duration = duration,
            RetryCount = 2,
            StartedAt = startedAt,
            CompletedAt = completedAt
        };

        // Assert
        record.Id.Should().Be(id);
        record.ExecutionId.Should().Be(executionId);
        record.TaskId.Should().Be("task-1");
        record.TaskRef.Should().Be("fetch-user");
        record.Status.Should().Be("Succeeded");
        record.Output.Should().Be(output);
        record.Errors.Should().Be(errors);
        record.Duration.Should().Be(duration);
        record.RetryCount.Should().Be(2);
        record.StartedAt.Should().Be(startedAt);
        record.CompletedAt.Should().Be(completedAt);
    }

    [Fact]
    public void TaskExecutionRecord_Output_ShouldStoreValidJson()
    {
        // Arrange
        var outputData = new Dictionary<string, object>
        {
            ["result"] = "success",
            ["count"] = 42
        };
        var json = JsonSerializer.Serialize(outputData);

        // Act
        var record = new TaskExecutionRecord
        {
            TaskId = "task-1",
            Output = json
        };

        // Assert
        record.Output.Should().Be(json);
        var deserialized = JsonSerializer.Deserialize<Dictionary<string, object>>(record.Output!);
        deserialized.Should().ContainKey("result");
        deserialized.Should().ContainKey("count");
    }

    [Fact]
    public void TaskExecutionRecord_Errors_ShouldStoreJsonArray()
    {
        // Arrange
        var errors = new List<string> { "error 1", "error 2", "error 3" };
        var json = JsonSerializer.Serialize(errors);

        // Act
        var record = new TaskExecutionRecord
        {
            TaskId = "task-1",
            Errors = json
        };

        // Assert
        record.Errors.Should().Be(json);
        var deserialized = JsonSerializer.Deserialize<List<string>>(record.Errors!);
        deserialized.Should().HaveCount(3);
        deserialized.Should().Contain("error 1");
    }

    [Fact]
    public void TaskExecutionRecord_ShouldHandleNullOutput()
    {
        // Arrange & Act
        var record = new TaskExecutionRecord
        {
            TaskId = "task-1",
            Output = null
        };

        // Assert
        record.Output.Should().BeNull();
    }

    [Fact]
    public void TaskExecutionRecord_ShouldHandleNullErrors()
    {
        // Arrange & Act
        var record = new TaskExecutionRecord
        {
            TaskId = "task-1",
            Errors = null
        };

        // Assert
        record.Errors.Should().BeNull();
    }

    [Fact]
    public void TaskExecutionRecord_ShouldHandleZeroRetryCount()
    {
        // Arrange & Act
        var record = new TaskExecutionRecord
        {
            TaskId = "task-1",
            RetryCount = 0
        };

        // Assert
        record.RetryCount.Should().Be(0);
    }

    [Fact]
    public void TaskExecutionRecord_ShouldHaveExecutionRecordNavigationProperty()
    {
        // Arrange
        var executionRecord = new ExecutionRecord
        {
            WorkflowName = "test-workflow"
        };

        // Act
        var taskRecord = new TaskExecutionRecord
        {
            TaskId = "task-1",
            ExecutionId = executionRecord.Id,
            ExecutionRecord = executionRecord
        };

        // Assert
        taskRecord.ExecutionRecord.Should().NotBeNull();
        taskRecord.ExecutionRecord!.Id.Should().Be(executionRecord.Id);
        taskRecord.ExecutionRecord.WorkflowName.Should().Be("test-workflow");
    }
}
