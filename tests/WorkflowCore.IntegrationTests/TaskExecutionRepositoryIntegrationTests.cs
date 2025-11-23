using FluentAssertions;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;

namespace WorkflowCore.IntegrationTests;

/// <summary>
/// Integration tests for TaskExecutionRepository against real PostgreSQL database.
/// Tests foreign key relationships and task execution ordering.
/// </summary>
public class TaskExecutionRepositoryIntegrationTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fixture;

    public TaskExecutionRepositoryIntegrationTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task SaveTaskExecutionAsync_ShouldPersistToRealDatabase()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var executionRepo = new ExecutionRepository(context);
        var taskRepo = new TaskExecutionRepository(context);

        // Create parent execution
        var execution = new ExecutionRecord
        {
            WorkflowName = "task-test",
            Status = ExecutionStatus.Running
        };
        await executionRepo.SaveExecutionAsync(execution);

        var task = new TaskExecutionRecord
        {
            ExecutionId = execution.Id,
            TaskId = "task-1",
            TaskRef = "task-def-1",
            Status = "Succeeded",
            Output = "{\"result\":\"success\"}"
        };

        // Act
        var saved = await taskRepo.SaveTaskExecutionAsync(task);

        // Assert
        saved.Should().NotBeNull();
        saved.Id.Should().NotBe(Guid.Empty);

        // Verify with fresh context
        await using var verifyContext = await _fixture.CreateDbContextAsync();
        var retrieved = await verifyContext.TaskExecutionRecords.FindAsync(saved.Id);
        retrieved.Should().NotBeNull();
        retrieved!.TaskId.Should().Be("task-1");
        retrieved.Output.Should().Be("{\"result\":\"success\"}");
    }

    [Fact]
    public async Task SaveTaskExecutionAsync_ShouldUpdateExistingRecord()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var executionRepo = new ExecutionRepository(context);
        var taskRepo = new TaskExecutionRepository(context);

        var execution = new ExecutionRecord
        {
            WorkflowName = "update-task-test",
            Status = ExecutionStatus.Running
        };
        await executionRepo.SaveExecutionAsync(execution);

        var task = new TaskExecutionRecord
        {
            ExecutionId = execution.Id,
            TaskId = "task-1",
            Status = "Running"
        };
        var saved = await taskRepo.SaveTaskExecutionAsync(task);

        // Act - Update
        saved.Status = "Succeeded";
        saved.CompletedAt = DateTime.UtcNow;
        saved.Duration = TimeSpan.FromSeconds(5);
        saved.Output = "{\"completed\":true}";

        var updated = await taskRepo.SaveTaskExecutionAsync(saved);

        // Assert
        updated.Status.Should().Be("Succeeded");
        updated.Output.Should().Be("{\"completed\":true}");

        // Verify with fresh context
        await using var verifyContext = await _fixture.CreateDbContextAsync();
        var retrieved = await verifyContext.TaskExecutionRecords.FindAsync(saved.Id);
        retrieved!.Status.Should().Be("Succeeded");
        retrieved.Duration.Should().Be(TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task GetTaskExecutionsForExecutionAsync_ShouldOrderByStartedAtAscending()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var executionRepo = new ExecutionRepository(context);
        var taskRepo = new TaskExecutionRepository(context);

        var execution = new ExecutionRecord
        {
            WorkflowName = "order-test",
            Status = ExecutionStatus.Running
        };
        await executionRepo.SaveExecutionAsync(execution);

        var now = DateTime.UtcNow;

        await taskRepo.SaveTaskExecutionAsync(new TaskExecutionRecord
        {
            ExecutionId = execution.Id,
            TaskId = "task-3",
            Status = "Succeeded",
            StartedAt = now.AddMinutes(10)
        });

        await taskRepo.SaveTaskExecutionAsync(new TaskExecutionRecord
        {
            ExecutionId = execution.Id,
            TaskId = "task-1",
            Status = "Succeeded",
            StartedAt = now
        });

        await taskRepo.SaveTaskExecutionAsync(new TaskExecutionRecord
        {
            ExecutionId = execution.Id,
            TaskId = "task-2",
            Status = "Succeeded",
            StartedAt = now.AddMinutes(5)
        });

        // Act
        var results = await taskRepo.GetTaskExecutionsForExecutionAsync(execution.Id);

        // Assert
        results.Should().HaveCount(3);
        results[0].TaskId.Should().Be("task-1");
        results[1].TaskId.Should().Be("task-2");
        results[2].TaskId.Should().Be("task-3");
    }

    [Fact]
    public async Task GetTaskExecutionsForExecutionAsync_ShouldIsolateByExecutionId()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var executionRepo = new ExecutionRepository(context);
        var taskRepo = new TaskExecutionRepository(context);

        // Create two executions
        var execution1 = new ExecutionRecord { WorkflowName = "test1", Status = ExecutionStatus.Running };
        var execution2 = new ExecutionRecord { WorkflowName = "test2", Status = ExecutionStatus.Running };
        await executionRepo.SaveExecutionAsync(execution1);
        await executionRepo.SaveExecutionAsync(execution2);

        // Add tasks to execution1
        await taskRepo.SaveTaskExecutionAsync(new TaskExecutionRecord
        {
            ExecutionId = execution1.Id,
            TaskId = "task-1",
            Status = "Succeeded"
        });

        await taskRepo.SaveTaskExecutionAsync(new TaskExecutionRecord
        {
            ExecutionId = execution1.Id,
            TaskId = "task-2",
            Status = "Succeeded"
        });

        // Add tasks to execution2
        await taskRepo.SaveTaskExecutionAsync(new TaskExecutionRecord
        {
            ExecutionId = execution2.Id,
            TaskId = "task-3",
            Status = "Succeeded"
        });

        // Act
        var results1 = await taskRepo.GetTaskExecutionsForExecutionAsync(execution1.Id);
        var results2 = await taskRepo.GetTaskExecutionsForExecutionAsync(execution2.Id);

        // Assert
        results1.Should().HaveCount(2);
        results1.Should().AllSatisfy(t => t.ExecutionId.Should().Be(execution1.Id));

        results2.Should().HaveCount(1);
        results2.Should().AllSatisfy(t => t.ExecutionId.Should().Be(execution2.Id));
    }

    [Fact]
    public async Task SaveTaskExecutionAsync_ShouldHandleRetryCount()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var executionRepo = new ExecutionRepository(context);
        var taskRepo = new TaskExecutionRepository(context);

        var execution = new ExecutionRecord
        {
            WorkflowName = "retry-test",
            Status = ExecutionStatus.Running
        };
        await executionRepo.SaveExecutionAsync(execution);

        var task = new TaskExecutionRecord
        {
            ExecutionId = execution.Id,
            TaskId = "retry-task",
            Status = "Running",
            RetryCount = 0
        };
        var saved = await taskRepo.SaveTaskExecutionAsync(task);

        // Act - Simulate retries
        saved.RetryCount = 1;
        saved.Status = "Running";
        await taskRepo.SaveTaskExecutionAsync(saved);

        saved.RetryCount = 2;
        saved.Status = "Succeeded";
        await taskRepo.SaveTaskExecutionAsync(saved);

        // Assert
        await using var verifyContext = await _fixture.CreateDbContextAsync();
        var retrieved = await verifyContext.TaskExecutionRecords.FindAsync(saved.Id);
        retrieved!.RetryCount.Should().Be(2);
        retrieved.Status.Should().Be("Succeeded");
    }

    [Fact]
    public async Task SaveTaskExecutionAsync_ShouldHandleErrors()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var executionRepo = new ExecutionRepository(context);
        var taskRepo = new TaskExecutionRepository(context);

        var execution = new ExecutionRecord
        {
            WorkflowName = "error-test",
            Status = ExecutionStatus.Running
        };
        await executionRepo.SaveExecutionAsync(execution);

        var task = new TaskExecutionRecord
        {
            ExecutionId = execution.Id,
            TaskId = "error-task",
            Status = "Failed",
            Errors = "[\"Connection timeout\",\"Retry limit exceeded\"]"
        };

        // Act
        var saved = await taskRepo.SaveTaskExecutionAsync(task);

        // Assert
        await using var verifyContext = await _fixture.CreateDbContextAsync();
        var retrieved = await verifyContext.TaskExecutionRecords.FindAsync(saved.Id);
        retrieved!.Errors.Should().Be("[\"Connection timeout\",\"Retry limit exceeded\"]");
    }
}
