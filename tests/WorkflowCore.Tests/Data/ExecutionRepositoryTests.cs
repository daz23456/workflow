using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Data;

public class ExecutionRepositoryTests
{
    [Fact]
    public async Task SaveExecutionAsync_ShouldSaveNewExecution()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveNew")
            .Options;

        var record = new ExecutionRecord
        {
            WorkflowName = "test-workflow",
            Status = ExecutionStatus.Running
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var saved = await repository.SaveExecutionAsync(record);

            // Assert
            saved.Should().NotBeNull();
            saved.Id.Should().Be(record.Id);
        }

        // Verify persistence
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.ExecutionRecords.FindAsync(record.Id);
            retrieved.Should().NotBeNull();
            retrieved!.WorkflowName.Should().Be("test-workflow");
            retrieved.Status.Should().Be(ExecutionStatus.Running);
        }
    }

    [Fact]
    public async Task SaveExecutionAsync_ShouldUpdateExistingExecution()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveUpdate")
            .Options;

        var record = new ExecutionRecord
        {
            WorkflowName = "test-workflow",
            Status = ExecutionStatus.Running
        };

        // Act - Save initially
        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(record);
            await context.SaveChangesAsync();
        }

        // Act - Update
        record.Status = ExecutionStatus.Succeeded;
        record.CompletedAt = DateTime.UtcNow;
        record.Duration = TimeSpan.FromSeconds(5);

        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var updated = await repository.SaveExecutionAsync(record);

            // Assert
            updated.Should().NotBeNull();
            updated.Status.Should().Be(ExecutionStatus.Succeeded);
            updated.CompletedAt.Should().NotBeNull();
            updated.Duration.Should().Be(TimeSpan.FromSeconds(5));
        }

        // Verify persistence
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.ExecutionRecords.FindAsync(record.Id);
            retrieved.Should().NotBeNull();
            retrieved!.Status.Should().Be(ExecutionStatus.Succeeded);
            retrieved.CompletedAt.Should().NotBeNull();
        }
    }

    [Fact]
    public async Task GetExecutionAsync_ShouldReturnExecution_WhenExists()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetExists")
            .Options;

        var record = new ExecutionRecord
        {
            WorkflowName = "test-workflow",
            Status = ExecutionStatus.Succeeded
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(record);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetExecutionAsync(record.Id);

            // Assert
            result.Should().NotBeNull();
            result!.Id.Should().Be(record.Id);
            result.WorkflowName.Should().Be("test-workflow");
            result.Status.Should().Be(ExecutionStatus.Succeeded);
        }
    }

    [Fact]
    public async Task GetExecutionAsync_ShouldReturnNull_WhenNotExists()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetNotExists")
            .Options;

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetExecutionAsync(Guid.NewGuid());

            // Assert
            result.Should().BeNull();
        }
    }

    [Fact]
    public async Task GetExecutionAsync_ShouldIncludeTaskExecutionRecords()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetWithTasks")
            .Options;

        var record = new ExecutionRecord
        {
            WorkflowName = "test-workflow"
        };

        var taskRecord = new TaskExecutionRecord
        {
            ExecutionId = record.Id,
            TaskId = "task-1"
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(record);
            context.TaskExecutionRecords.Add(taskRecord);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetExecutionAsync(record.Id);

            // Assert
            result.Should().NotBeNull();
            result!.TaskExecutionRecords.Should().HaveCount(1);
            result.TaskExecutionRecords[0].TaskId.Should().Be("task-1");
        }
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldReturnAllExecutions_WhenNoFilters()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_ListAll")
            .Options;

        var record1 = new ExecutionRecord { WorkflowName = "workflow-1" };
        var record2 = new ExecutionRecord { WorkflowName = "workflow-2" };
        var record3 = new ExecutionRecord { WorkflowName = "workflow-3" };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.AddRange(record1, record2, record3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var results = await repository.ListExecutionsAsync(null, null, 0, 10);

            // Assert
            results.Should().HaveCount(3);
        }
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldFilterByWorkflowName()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_ListFilterName")
            .Options;

        var record1 = new ExecutionRecord { WorkflowName = "workflow-1" };
        var record2 = new ExecutionRecord { WorkflowName = "workflow-2" };
        var record3 = new ExecutionRecord { WorkflowName = "workflow-1" };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.AddRange(record1, record2, record3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var results = await repository.ListExecutionsAsync("workflow-1", null, 0, 10);

            // Assert
            results.Should().HaveCount(2);
            results.Should().AllSatisfy(r => r.WorkflowName.Should().Be("workflow-1"));
        }
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldFilterByStatus()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_ListFilterStatus")
            .Options;

        var record1 = new ExecutionRecord { WorkflowName = "workflow-1", Status = ExecutionStatus.Running };
        var record2 = new ExecutionRecord { WorkflowName = "workflow-2", Status = ExecutionStatus.Succeeded };
        var record3 = new ExecutionRecord { WorkflowName = "workflow-3", Status = ExecutionStatus.Running };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.AddRange(record1, record2, record3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var results = await repository.ListExecutionsAsync(null, ExecutionStatus.Running, 0, 10);

            // Assert
            results.Should().HaveCount(2);
            results.Should().AllSatisfy(r => r.Status.Should().Be(ExecutionStatus.Running));
        }
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldFilterByWorkflowNameAndStatus()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_ListFilterBoth")
            .Options;

        var record1 = new ExecutionRecord { WorkflowName = "workflow-1", Status = ExecutionStatus.Running };
        var record2 = new ExecutionRecord { WorkflowName = "workflow-1", Status = ExecutionStatus.Succeeded };
        var record3 = new ExecutionRecord { WorkflowName = "workflow-2", Status = ExecutionStatus.Running };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.AddRange(record1, record2, record3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var results = await repository.ListExecutionsAsync("workflow-1", ExecutionStatus.Running, 0, 10);

            // Assert
            results.Should().HaveCount(1);
            results[0].WorkflowName.Should().Be("workflow-1");
            results[0].Status.Should().Be(ExecutionStatus.Running);
        }
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldRespectPagination()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_ListPagination")
            .Options;

        var records = Enumerable.Range(1, 10)
            .Select(i => new ExecutionRecord { WorkflowName = $"workflow-{i}" })
            .ToList();

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.AddRange(records);
            await context.SaveChangesAsync();
        }

        // Act - Get first page
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var page1 = await repository.ListExecutionsAsync(null, null, 0, 3);

            // Assert
            page1.Should().HaveCount(3);
        }

        // Act - Get second page
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var page2 = await repository.ListExecutionsAsync(null, null, 3, 3);

            // Assert
            page2.Should().HaveCount(3);
        }

        // Act - Get third page
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var page3 = await repository.ListExecutionsAsync(null, null, 6, 3);

            // Assert
            page3.Should().HaveCount(3);
        }

        // Act - Get fourth page (partial)
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var page4 = await repository.ListExecutionsAsync(null, null, 9, 3);

            // Assert
            page4.Should().HaveCount(1);
        }
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldOrderByStartedAtDescending()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_ListOrder")
            .Options;

        var now = DateTime.UtcNow;
        var record1 = new ExecutionRecord { WorkflowName = "workflow-1", StartedAt = now.AddMinutes(-10) };
        var record2 = new ExecutionRecord { WorkflowName = "workflow-2", StartedAt = now.AddMinutes(-5) };
        var record3 = new ExecutionRecord { WorkflowName = "workflow-3", StartedAt = now };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.AddRange(record1, record2, record3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var results = await repository.ListExecutionsAsync(null, null, 0, 10);

            // Assert
            results.Should().HaveCount(3);
            results[0].WorkflowName.Should().Be("workflow-3"); // Most recent
            results[1].WorkflowName.Should().Be("workflow-2");
            results[2].WorkflowName.Should().Be("workflow-1"); // Oldest
        }
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldReturnEmptyList_WhenNoMatches()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_ListEmpty")
            .Options;

        var record = new ExecutionRecord { WorkflowName = "workflow-1", Status = ExecutionStatus.Running };

        using (var context = new WorkflowDbContext(options))
        {
            context.ExecutionRecords.Add(record);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var results = await repository.ListExecutionsAsync("non-existent", null, 0, 10);

            // Assert
            results.Should().BeEmpty();
        }
    }
}
