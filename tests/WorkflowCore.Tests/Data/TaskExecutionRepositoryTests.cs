using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Data;

public class TaskExecutionRepositoryTests
{
    [Fact]
    public async Task SaveTaskExecutionAsync_ShouldSaveNewTaskExecution()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveTaskNew")
            .Options;

        var executionRecord = new ExecutionRecord { WorkflowName = "test-workflow" };
        var taskRecord = new TaskExecutionRecord
        {
            ExecutionId = executionRecord.Id,
            TaskId = "task-1",
            TaskRef = "fetch-user",
            Status = "running"
        };

        // Save execution first
        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(executionRecord);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new TaskExecutionRepository(context);
            var saved = await repository.SaveTaskExecutionAsync(taskRecord);

            // Assert
            saved.Should().NotBeNull();
            saved.Id.Should().Be(taskRecord.Id);
            saved.TaskId.Should().Be("task-1");
        }

        // Verify persistence
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.TaskExecutionRecords.FindAsync(taskRecord.Id);
            retrieved.Should().NotBeNull();
            retrieved!.TaskId.Should().Be("task-1");
            retrieved.TaskRef.Should().Be("fetch-user");
            retrieved.Status.Should().Be("running");
        }
    }

    [Fact]
    public async Task SaveTaskExecutionAsync_ShouldUpdateExistingTaskExecution()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveTaskUpdate")
            .Options;

        var executionRecord = new ExecutionRecord { WorkflowName = "test-workflow" };
        var taskRecord = new TaskExecutionRecord
        {
            ExecutionId = executionRecord.Id,
            TaskId = "task-1",
            Status = "running"
        };

        // Save initially
        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(executionRecord);
            context.TaskExecutionRecords.Add(taskRecord);
            await context.SaveChangesAsync();
        }

        // Act - Update
        taskRecord.Status = "completed";
        taskRecord.Output = "{\"result\": \"success\"}";
        taskRecord.CompletedAt = DateTime.UtcNow;
        taskRecord.Duration = TimeSpan.FromSeconds(3);

        using (var context = new WorkflowDbContext(options))
        {
            var repository = new TaskExecutionRepository(context);
            var updated = await repository.SaveTaskExecutionAsync(taskRecord);

            // Assert
            updated.Should().NotBeNull();
            updated.Status.Should().Be("completed");
            updated.Output.Should().Be("{\"result\": \"success\"}");
            updated.CompletedAt.Should().NotBeNull();
            updated.Duration.Should().Be(TimeSpan.FromSeconds(3));
        }

        // Verify persistence
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.TaskExecutionRecords.FindAsync(taskRecord.Id);
            retrieved.Should().NotBeNull();
            retrieved!.Status.Should().Be("completed");
            retrieved.Output.Should().Be("{\"result\": \"success\"}");
        }
    }

    [Fact]
    public async Task GetTaskExecutionsForExecutionAsync_ShouldReturnAllTasksForExecution()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetTasks")
            .Options;

        var executionRecord = new ExecutionRecord { WorkflowName = "test-workflow" };
        var task1 = new TaskExecutionRecord { ExecutionId = executionRecord.Id, TaskId = "task-1" };
        var task2 = new TaskExecutionRecord { ExecutionId = executionRecord.Id, TaskId = "task-2" };
        var task3 = new TaskExecutionRecord { ExecutionId = executionRecord.Id, TaskId = "task-3" };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(executionRecord);
            context.TaskExecutionRecords.AddRange(task1, task2, task3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new TaskExecutionRepository(context);
            var results = await repository.GetTaskExecutionsForExecutionAsync(executionRecord.Id);

            // Assert
            results.Should().HaveCount(3);
            results.Should().Contain(t => t.TaskId == "task-1");
            results.Should().Contain(t => t.TaskId == "task-2");
            results.Should().Contain(t => t.TaskId == "task-3");
        }
    }

    [Fact]
    public async Task GetTaskExecutionsForExecutionAsync_ShouldReturnEmptyList_WhenNoTasks()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetTasksEmpty")
            .Options;

        var executionRecord = new ExecutionRecord { WorkflowName = "test-workflow" };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(executionRecord);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new TaskExecutionRepository(context);
            var results = await repository.GetTaskExecutionsForExecutionAsync(executionRecord.Id);

            // Assert
            results.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task GetTaskExecutionsForExecutionAsync_ShouldNotReturnTasksFromOtherExecutions()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetTasksIsolation")
            .Options;

        var execution1 = new ExecutionRecord { WorkflowName = "workflow-1" };
        var execution2 = new ExecutionRecord { WorkflowName = "workflow-2" };
        var task1 = new TaskExecutionRecord { ExecutionId = execution1.Id, TaskId = "task-1" };
        var task2 = new TaskExecutionRecord { ExecutionId = execution2.Id, TaskId = "task-2" };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.AddRange(execution1, execution2);
            context.TaskExecutionRecords.AddRange(task1, task2);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new TaskExecutionRepository(context);
            var results = await repository.GetTaskExecutionsForExecutionAsync(execution1.Id);

            // Assert
            results.Should().HaveCount(1);
            results[0].TaskId.Should().Be("task-1");
        }
    }

    [Fact]
    public async Task GetTaskExecutionsForExecutionAsync_ShouldOrderByStartedAt()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetTasksOrder")
            .Options;

        var executionRecord = new ExecutionRecord { WorkflowName = "test-workflow" };
        var now = DateTime.UtcNow;
        var task1 = new TaskExecutionRecord
        {
            ExecutionId = executionRecord.Id,
            TaskId = "task-1",
            StartedAt = now.AddMinutes(-10)
        };
        var task2 = new TaskExecutionRecord
        {
            ExecutionId = executionRecord.Id,
            TaskId = "task-2",
            StartedAt = now.AddMinutes(-5)
        };
        var task3 = new TaskExecutionRecord
        {
            ExecutionId = executionRecord.Id,
            TaskId = "task-3",
            StartedAt = now
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(executionRecord);
            context.TaskExecutionRecords.AddRange(task1, task2, task3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new TaskExecutionRepository(context);
            var results = await repository.GetTaskExecutionsForExecutionAsync(executionRecord.Id);

            // Assert
            results.Should().HaveCount(3);
            results[0].TaskId.Should().Be("task-1"); // Oldest first
            results[1].TaskId.Should().Be("task-2");
            results[2].TaskId.Should().Be("task-3"); // Newest last
        }
    }

    [Fact]
    public async Task SaveTaskExecutionAsync_ShouldHandleRetryCount()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveTaskRetry")
            .Options;

        var executionRecord = new ExecutionRecord { WorkflowName = "test-workflow" };
        var taskRecord = new TaskExecutionRecord
        {
            ExecutionId = executionRecord.Id,
            TaskId = "task-1",
            RetryCount = 3
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(executionRecord);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new TaskExecutionRepository(context);
            var saved = await repository.SaveTaskExecutionAsync(taskRecord);

            // Assert
            saved.RetryCount.Should().Be(3);
        }

        // Verify persistence
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.TaskExecutionRecords.FindAsync(taskRecord.Id);
            retrieved.Should().NotBeNull();
            retrieved!.RetryCount.Should().Be(3);
        }
    }

    [Fact]
    public async Task SaveTaskExecutionAsync_ShouldHandleErrors()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveTaskErrors")
            .Options;

        var executionRecord = new ExecutionRecord { WorkflowName = "test-workflow" };
        var taskRecord = new TaskExecutionRecord
        {
            ExecutionId = executionRecord.Id,
            TaskId = "task-1",
            Status = "failed",
            Errors = "Connection timeout"
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(executionRecord);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new TaskExecutionRepository(context);
            var saved = await repository.SaveTaskExecutionAsync(taskRecord);

            // Assert
            saved.Errors.Should().Be("Connection timeout");
        }

        // Verify persistence
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.TaskExecutionRecords.FindAsync(taskRecord.Id);
            retrieved.Should().NotBeNull();
            retrieved!.Errors.Should().Be("Connection timeout");
        }
    }
}
