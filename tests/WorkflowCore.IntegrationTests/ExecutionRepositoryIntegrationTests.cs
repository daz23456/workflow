using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;

namespace WorkflowCore.IntegrationTests;

/// <summary>
/// Integration tests for ExecutionRepository against real PostgreSQL database.
/// Tests real database behavior: transactions, cascade deletes, constraints, etc.
/// </summary>
public class ExecutionRepositoryIntegrationTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fixture;

    public ExecutionRepositoryIntegrationTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task SaveExecutionAsync_ShouldPersistToRealDatabase()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new ExecutionRepository(context);

        var record = new ExecutionRecord
        {
            WorkflowName = "integration-test-workflow",
            Status = ExecutionStatus.Running,
            StartedAt = DateTime.UtcNow,
            InputSnapshot = "{\"key\":\"value\"}"
        };

        // Act
        var saved = await repository.SaveExecutionAsync(record);

        // Assert
        saved.Should().NotBeNull();
        saved.Id.Should().NotBe(Guid.Empty);

        // Verify with fresh context (will use same database, cleaned tables)
        await using var verifyContext = await _fixture.CreateDbContextAsync();
        var retrieved = await verifyContext.ExecutionRecords.FindAsync(saved.Id);
        retrieved.Should().NotBeNull();
        retrieved!.WorkflowName.Should().Be("integration-test-workflow");
        retrieved.InputSnapshot.Should().Be("{\"key\":\"value\"}");
    }

    [Fact]
    public async Task SaveExecutionAsync_ShouldUpdateExistingRecord()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new ExecutionRepository(context);

        var record = new ExecutionRecord
        {
            WorkflowName = "update-test",
            Status = ExecutionStatus.Running
        };

        var saved = await repository.SaveExecutionAsync(record);

        // Act - Update
        saved.Status = ExecutionStatus.Succeeded;
        saved.CompletedAt = DateTime.UtcNow;
        saved.Duration = TimeSpan.FromSeconds(10);

        var updated = await repository.SaveExecutionAsync(saved);

        // Assert
        updated.Status.Should().Be(ExecutionStatus.Succeeded);
        updated.Duration.Should().Be(TimeSpan.FromSeconds(10));

        // Verify with fresh context
        await using var verifyContext = await _fixture.CreateDbContextAsync();
        var retrieved = await verifyContext.ExecutionRecords.FindAsync(saved.Id);
        retrieved!.Status.Should().Be(ExecutionStatus.Succeeded);
        retrieved.Duration.Should().Be(TimeSpan.FromSeconds(10));
    }

    [Fact]
    public async Task GetExecutionAsync_ShouldIncludeTaskExecutionRecords()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new ExecutionRepository(context);

        var execution = new ExecutionRecord
        {
            WorkflowName = "parent-test",
            Status = ExecutionStatus.Running
        };

        await repository.SaveExecutionAsync(execution);

        // Add task execution records
        var taskRepo = new TaskExecutionRepository(context);
        var task1 = new TaskExecutionRecord
        {
            ExecutionId = execution.Id,
            TaskId = "task-1",
            Status = "Succeeded"
        };
        var task2 = new TaskExecutionRecord
        {
            ExecutionId = execution.Id,
            TaskId = "task-2",
            Status = "Running"
        };

        await taskRepo.SaveTaskExecutionAsync(task1);
        await taskRepo.SaveTaskExecutionAsync(task2);

        // Act
        var retrieved = await repository.GetExecutionAsync(execution.Id);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.TaskExecutionRecords.Should().HaveCount(2);
        retrieved.TaskExecutionRecords.Should().Contain(t => t.TaskId == "task-1");
        retrieved.TaskExecutionRecords.Should().Contain(t => t.TaskId == "task-2");
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldFilterByWorkflowName()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new ExecutionRepository(context);

        await repository.SaveExecutionAsync(new ExecutionRecord
        {
            WorkflowName = "workflow-a",
            Status = ExecutionStatus.Running
        });

        await repository.SaveExecutionAsync(new ExecutionRecord
        {
            WorkflowName = "workflow-b",
            Status = ExecutionStatus.Running
        });

        await repository.SaveExecutionAsync(new ExecutionRecord
        {
            WorkflowName = "workflow-a",
            Status = ExecutionStatus.Succeeded
        });

        // Act
        var results = await repository.ListExecutionsAsync("workflow-a", null, 0, 100);

        // Assert
        results.Should().HaveCount(2);
        results.Should().AllSatisfy(e => e.WorkflowName.Should().Be("workflow-a"));
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldFilterByStatus()
    {
        // Arrange
        await _fixture.CleanTablesAsync();  // Ensure test isolation
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new ExecutionRepository(context);

        await repository.SaveExecutionAsync(new ExecutionRecord
        {
            WorkflowName = "test",
            Status = ExecutionStatus.Succeeded
        });

        await repository.SaveExecutionAsync(new ExecutionRecord
        {
            WorkflowName = "test",
            Status = ExecutionStatus.Failed
        });

        await repository.SaveExecutionAsync(new ExecutionRecord
        {
            WorkflowName = "test",
            Status = ExecutionStatus.Succeeded
        });

        // Act
        var results = await repository.ListExecutionsAsync(null, ExecutionStatus.Succeeded, 0, 100);

        // Assert
        results.Should().HaveCount(2);
        results.Should().AllSatisfy(e => e.Status.Should().Be(ExecutionStatus.Succeeded));
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldOrderByStartedAtDescending()
    {
        // Arrange
        await _fixture.CleanTablesAsync();  // Ensure test isolation
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new ExecutionRepository(context);

        var now = DateTime.UtcNow;

        await repository.SaveExecutionAsync(new ExecutionRecord
        {
            WorkflowName = "test",
            Status = ExecutionStatus.Running,
            StartedAt = now.AddMinutes(-10)
        });

        await repository.SaveExecutionAsync(new ExecutionRecord
        {
            WorkflowName = "test",
            Status = ExecutionStatus.Running,
            StartedAt = now.AddMinutes(-5)
        });

        await repository.SaveExecutionAsync(new ExecutionRecord
        {
            WorkflowName = "test",
            Status = ExecutionStatus.Running,
            StartedAt = now
        });

        // Act
        var results = await repository.ListExecutionsAsync("test", null, 0, 100);

        // Assert
        results.Should().HaveCount(3);
        results[0].StartedAt.Should().BeCloseTo(now, TimeSpan.FromSeconds(1));
        results[1].StartedAt.Should().BeCloseTo(now.AddMinutes(-5), TimeSpan.FromSeconds(1));
        results[2].StartedAt.Should().BeCloseTo(now.AddMinutes(-10), TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task ListExecutionsAsync_ShouldSupportPagination()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new ExecutionRepository(context);

        for (int i = 0; i < 10; i++)
        {
            await repository.SaveExecutionAsync(new ExecutionRecord
            {
                WorkflowName = "pagination-test",
                Status = ExecutionStatus.Running
            });
        }

        // Act
        var page1 = await repository.ListExecutionsAsync("pagination-test", null, 0, 3);
        var page2 = await repository.ListExecutionsAsync("pagination-test", null, 3, 3);
        var page3 = await repository.ListExecutionsAsync("pagination-test", null, 6, 3);

        // Assert
        page1.Should().HaveCount(3);
        page2.Should().HaveCount(3);
        page3.Should().HaveCount(3);

        // Verify no overlap
        var allIds = page1.Concat(page2).Concat(page3).Select(e => e.Id).ToList();
        allIds.Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public async Task SaveExecutionAsync_ShouldAddTaskExecutionRecordsOnUpdate()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new ExecutionRepository(context);

        var record = new ExecutionRecord
        {
            WorkflowName = "task-update-test",
            Status = ExecutionStatus.Running,
            StartedAt = DateTime.UtcNow
        };

        // Act - First save without tasks (workflow starting)
        var saved = await repository.SaveExecutionAsync(record);
        saved.Should().NotBeNull();
        saved.Id.Should().NotBe(Guid.Empty);

        // Act - Second save with tasks added (workflow completed)
        saved.Status = ExecutionStatus.Succeeded;
        saved.CompletedAt = DateTime.UtcNow;
        saved.Duration = TimeSpan.FromSeconds(5);
        saved.TaskExecutionRecords = new List<TaskExecutionRecord>
        {
            new TaskExecutionRecord
            {
                ExecutionId = saved.Id,
                TaskId = "task-1",
                TaskRef = "fetch-data",
                Status = "Succeeded",
                Duration = TimeSpan.FromSeconds(2)
            },
            new TaskExecutionRecord
            {
                ExecutionId = saved.Id,
                TaskId = "task-2",
                TaskRef = "process-data",
                Status = "Succeeded",
                Duration = TimeSpan.FromSeconds(3)
            }
        };

        var updated = await repository.SaveExecutionAsync(saved);

        // Assert
        updated.Should().NotBeNull();
        updated.Status.Should().Be(ExecutionStatus.Succeeded);
        updated.TaskExecutionRecords.Should().HaveCount(2);
        updated.TaskExecutionRecords.Should().Contain(t => t.TaskId == "task-1");
        updated.TaskExecutionRecords.Should().Contain(t => t.TaskId == "task-2");

        // Verify with fresh context
        await using var verifyContext = await _fixture.CreateDbContextAsync();
        var retrieved = await verifyContext.ExecutionRecords
            .Include(e => e.TaskExecutionRecords)
            .FirstOrDefaultAsync(e => e.Id == saved.Id);

        retrieved.Should().NotBeNull();
        retrieved!.Status.Should().Be(ExecutionStatus.Succeeded);
        retrieved.TaskExecutionRecords.Should().HaveCount(2);
        retrieved.TaskExecutionRecords.Should().Contain(t => t.TaskRef == "fetch-data");
        retrieved.TaskExecutionRecords.Should().Contain(t => t.TaskRef == "process-data");
    }
}
