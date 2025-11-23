using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Data;

public class WorkflowDbContextTests
{
    [Fact]
    public void WorkflowDbContext_ShouldHaveExecutionRecordsDbSet()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_ExecutionRecords")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);

        // Assert
        context.ExecutionRecords.Should().NotBeNull();
        context.ExecutionRecords.Should().BeAssignableTo<DbSet<ExecutionRecord>>();
    }

    [Fact]
    public void WorkflowDbContext_ShouldHaveTaskExecutionRecordsDbSet()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskExecutionRecords")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);

        // Assert
        context.TaskExecutionRecords.Should().NotBeNull();
        context.TaskExecutionRecords.Should().BeAssignableTo<DbSet<TaskExecutionRecord>>();
    }

    [Fact]
    public void WorkflowDbContext_ShouldHaveWorkflowVersionsDbSet()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowVersions")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);

        // Assert
        context.WorkflowVersions.Should().NotBeNull();
        context.WorkflowVersions.Should().BeAssignableTo<DbSet<WorkflowVersion>>();
    }

    [Fact]
    public async Task WorkflowDbContext_ShouldSaveExecutionRecord()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveExecution")
            .Options;

        var record = new ExecutionRecord
        {
            WorkflowName = "test-workflow",
            Status = ExecutionStatus.Running
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(record);
            await context.SaveChangesAsync();
        }

        // Assert
        using (var context = new WorkflowDbContext(options))
        {
            var saved = await context.ExecutionRecords.FindAsync(record.Id);
            saved.Should().NotBeNull();
            saved!.WorkflowName.Should().Be("test-workflow");
            saved.Status.Should().Be(ExecutionStatus.Running);
        }
    }

    [Fact]
    public async Task WorkflowDbContext_ShouldSaveTaskExecutionRecord()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveTaskExecution")
            .Options;

        var executionRecord = new ExecutionRecord
        {
            WorkflowName = "test-workflow"
        };

        var taskRecord = new TaskExecutionRecord
        {
            ExecutionId = executionRecord.Id,
            TaskId = "task-1",
            TaskRef = "fetch-user"
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(executionRecord);
            context.TaskExecutionRecords.Add(taskRecord);
            await context.SaveChangesAsync();
        }

        // Assert
        using (var context = new WorkflowDbContext(options))
        {
            var saved = await context.TaskExecutionRecords.FindAsync(taskRecord.Id);
            saved.Should().NotBeNull();
            saved!.TaskId.Should().Be("task-1");
            saved.ExecutionId.Should().Be(executionRecord.Id);
        }
    }

    [Fact]
    public async Task WorkflowDbContext_ShouldSaveWorkflowVersion()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveVersion")
            .Options;

        var version = new WorkflowVersion
        {
            WorkflowName = "test-workflow",
            VersionHash = "hash123",
            DefinitionSnapshot = "yaml content"
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowVersions.Add(version);
            await context.SaveChangesAsync();
        }

        // Assert
        using (var context = new WorkflowDbContext(options))
        {
            var saved = await context.WorkflowVersions.FindAsync(version.Id);
            saved.Should().NotBeNull();
            saved!.WorkflowName.Should().Be("test-workflow");
            saved.VersionHash.Should().Be("hash123");
        }
    }

    [Fact]
    public async Task WorkflowDbContext_ShouldLoadTaskExecutionRecords_WithExecutionRecord()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_LoadRelationship")
            .Options;

        var executionRecord = new ExecutionRecord
        {
            WorkflowName = "test-workflow"
        };

        var taskRecord1 = new TaskExecutionRecord
        {
            ExecutionId = executionRecord.Id,
            TaskId = "task-1"
        };

        var taskRecord2 = new TaskExecutionRecord
        {
            ExecutionId = executionRecord.Id,
            TaskId = "task-2"
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(executionRecord);
            context.TaskExecutionRecords.AddRange(taskRecord1, taskRecord2);
            await context.SaveChangesAsync();
        }

        // Assert
        using (var context = new WorkflowDbContext(options))
        {
            var saved = await context.ExecutionRecords
                .Include(e => e.TaskExecutionRecords)
                .FirstOrDefaultAsync(e => e.Id == executionRecord.Id);

            saved.Should().NotBeNull();
            saved!.TaskExecutionRecords.Should().HaveCount(2);
            saved.TaskExecutionRecords.Should().Contain(t => t.TaskId == "task-1");
            saved.TaskExecutionRecords.Should().Contain(t => t.TaskId == "task-2");
        }
    }

    // Note: Cascade delete testing is done in integration tests with real PostgreSQL
    // EF Core InMemory provider doesn't fully support cascade delete behavior
}
