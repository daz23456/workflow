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

    [Fact]
    public async Task GetAverageTaskDurationsAsync_WithNoData_ShouldReturnEmptyDictionary()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_AvgDurationsNoData")
            .Options;

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetAverageTaskDurationsAsync("workflow-1", 30);

            // Assert
            result.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task GetAverageTaskDurationsAsync_WithSuccessfulTasks_ShouldReturnAverages()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_AvgDurationsSuccess")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            // Create execution records with task execution records
            var execution1 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow.AddDays(-5),
                TaskExecutionRecords = new List<TaskExecutionRecord>
                {
                    new TaskExecutionRecord { TaskRef = "task-1", Status = "Succeeded", Duration = TimeSpan.FromSeconds(10) },
                    new TaskExecutionRecord { TaskRef = "task-2", Status = "Succeeded", Duration = TimeSpan.FromSeconds(20) }
                }
            };

            var execution2 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow.AddDays(-3),
                TaskExecutionRecords = new List<TaskExecutionRecord>
                {
                    new TaskExecutionRecord { TaskRef = "task-1", Status = "Succeeded", Duration = TimeSpan.FromSeconds(12) },
                    new TaskExecutionRecord { TaskRef = "task-2", Status = "Succeeded", Duration = TimeSpan.FromSeconds(18) }
                }
            };

            context.ExecutionRecords.AddRange(execution1, execution2);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetAverageTaskDurationsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(2);
            result["task-1"].Should().Be(11000); // Average of 10s and 12s = 11s = 11000ms
            result["task-2"].Should().Be(19000); // Average of 20s and 18s = 19s = 19000ms
        }
    }

    [Fact]
    public async Task GetAverageTaskDurationsAsync_ShouldFilterByWorkflowName()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_AvgDurationsFilterWorkflow")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            var execution1 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow.AddDays(-5),
                TaskExecutionRecords = new List<TaskExecutionRecord>
                {
                    new TaskExecutionRecord { TaskRef = "task-1", Status = "Succeeded", Duration = TimeSpan.FromSeconds(10) }
                }
            };

            var execution2 = new ExecutionRecord
            {
                WorkflowName = "workflow-2",
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow.AddDays(-3),
                TaskExecutionRecords = new List<TaskExecutionRecord>
                {
                    new TaskExecutionRecord { TaskRef = "task-1", Status = "Succeeded", Duration = TimeSpan.FromSeconds(100) }
                }
            };

            context.ExecutionRecords.AddRange(execution1, execution2);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetAverageTaskDurationsAsync("workflow-1", 30);

            // Assert
            result.Should().ContainKey("task-1");
            result["task-1"].Should().Be(10000); // Only workflow-1 task should be included
        }
    }

    [Fact]
    public async Task GetAverageTaskDurationsAsync_ShouldFilterByDateRange()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_AvgDurationsFilterDate")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            var executionOld = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow.AddDays(-40), // Outside 30 day window
                TaskExecutionRecords = new List<TaskExecutionRecord>
                {
                    new TaskExecutionRecord { TaskRef = "task-1", Status = "Succeeded", Duration = TimeSpan.FromSeconds(100) }
                }
            };

            var executionRecent = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow.AddDays(-5), // Within 30 day window
                TaskExecutionRecords = new List<TaskExecutionRecord>
                {
                    new TaskExecutionRecord { TaskRef = "task-1", Status = "Succeeded", Duration = TimeSpan.FromSeconds(10) }
                }
            };

            context.ExecutionRecords.AddRange(executionOld, executionRecent);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetAverageTaskDurationsAsync("workflow-1", 30);

            // Assert
            result.Should().ContainKey("task-1");
            result["task-1"].Should().Be(10000); // Only recent execution should be included
        }
    }

    [Fact]
    public async Task GetAverageTaskDurationsAsync_ShouldOnlyIncludeSucceededExecutions()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_AvgDurationsOnlySucceeded")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            var executionFailed = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Failed,
                StartedAt = DateTime.UtcNow.AddDays(-5),
                TaskExecutionRecords = new List<TaskExecutionRecord>
                {
                    new TaskExecutionRecord { TaskRef = "task-1", Status = "Failed", Duration = TimeSpan.FromSeconds(100) }
                }
            };

            var executionSuccess = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow.AddDays(-3),
                TaskExecutionRecords = new List<TaskExecutionRecord>
                {
                    new TaskExecutionRecord { TaskRef = "task-1", Status = "Succeeded", Duration = TimeSpan.FromSeconds(10) }
                }
            };

            context.ExecutionRecords.AddRange(executionFailed, executionSuccess);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetAverageTaskDurationsAsync("workflow-1", 30);

            // Assert
            result.Should().ContainKey("task-1");
            result["task-1"].Should().Be(10000); // Only succeeded execution should be included
        }
    }

    [Fact]
    public async Task GetAverageTaskDurationsAsync_ShouldHandleNullDurations()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_AvgDurationsNullDuration")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            var execution = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow.AddDays(-5),
                TaskExecutionRecords = new List<TaskExecutionRecord>
                {
                    new TaskExecutionRecord { TaskRef = "task-1", Status = "Succeeded", Duration = null }, // Null duration
                    new TaskExecutionRecord { TaskRef = "task-2", Status = "Succeeded", Duration = TimeSpan.FromSeconds(10) }
                }
            };

            context.ExecutionRecords.Add(execution);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetAverageTaskDurationsAsync("workflow-1", 30);

            // Assert
            result.Should().NotContainKey("task-1"); // Task with null duration should be excluded
            result.Should().ContainKey("task-2");
            result["task-2"].Should().Be(10000);
        }
    }

    // ===== Duration Trends Tests =====

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_WithNoData_ShouldReturnEmptyList()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsNoData")
            .Options;

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_WithData_ShouldReturnDataPoints()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsWithData")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(10)
            };

            context.ExecutionRecords.Add(execution);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].Date.Should().Be(now.AddDays(-5));
            result[0].ExecutionCount.Should().Be(1);
            result[0].SuccessCount.Should().Be(1);
            result[0].FailureCount.Should().Be(0);
        }
    }

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_ShouldCalculateCorrectAverages()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsAverages")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            // Same day, multiple executions
            var execution1 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5).AddHours(1),
                Duration = TimeSpan.FromMilliseconds(100)
            };

            var execution2 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5).AddHours(2),
                Duration = TimeSpan.FromMilliseconds(200)
            };

            var execution3 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5).AddHours(3),
                Duration = TimeSpan.FromMilliseconds(300)
            };

            context.ExecutionRecords.AddRange(execution1, execution2, execution3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].AverageDurationMs.Should().Be(200); // (100 + 200 + 300) / 3 = 200
            result[0].MinDurationMs.Should().Be(100);
            result[0].MaxDurationMs.Should().Be(300);
            result[0].ExecutionCount.Should().Be(3);
        }
    }

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_ShouldCalculateCorrectPercentiles()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsPercentiles")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            // Create 10 executions with durations 10ms, 20ms, ..., 100ms
            var executions = Enumerable.Range(1, 10)
                .Select(i => new ExecutionRecord
                {
                    WorkflowName = "workflow-1",
                    Status = ExecutionStatus.Succeeded,
                    StartedAt = now.AddDays(-5).AddHours(i),
                    Duration = TimeSpan.FromMilliseconds(i * 10)
                })
                .ToList();

            context.ExecutionRecords.AddRange(executions);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].P50DurationMs.Should().Be(50); // Median (5th value in sorted list)
            result[0].P95DurationMs.Should().Be(100); // 95th percentile (10th value)
        }
    }

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_ShouldFilterByWorkflowName()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsFilterName")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution1 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(10)
            };

            var execution2 = new ExecutionRecord
            {
                WorkflowName = "workflow-2",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(100)
            };

            context.ExecutionRecords.AddRange(execution1, execution2);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].AverageDurationMs.Should().Be(10000); // Only workflow-1 should be included
        }
    }

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_ShouldFilterByDateRange()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsFilterDate")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var executionOld = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-40), // Outside 30 day window
                Duration = TimeSpan.FromSeconds(100)
            };

            var executionRecent = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5), // Within 30 day window
                Duration = TimeSpan.FromSeconds(10)
            };

            context.ExecutionRecords.AddRange(executionOld, executionRecent);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].AverageDurationMs.Should().Be(10000); // Only recent execution should be included
        }
    }

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_ShouldExcludeRunningExecutions()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsExcludeRunning")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var executionRunning = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Running,
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(100)
            };

            var executionSuccess = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(10)
            };

            context.ExecutionRecords.AddRange(executionRunning, executionSuccess);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].ExecutionCount.Should().Be(1); // Only succeeded execution should be counted
            result[0].AverageDurationMs.Should().Be(10000);
        }
    }

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_ShouldGroupByDate()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsGroupByDate")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            // Day 1 executions
            var execution1 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5).AddHours(1),
                Duration = TimeSpan.FromMilliseconds(100)
            };

            var execution2 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5).AddHours(2),
                Duration = TimeSpan.FromMilliseconds(200)
            };

            // Day 2 executions
            var execution3 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-4).AddHours(1),
                Duration = TimeSpan.FromMilliseconds(300)
            };

            context.ExecutionRecords.AddRange(execution1, execution2, execution3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(2);
            result[0].Date.Should().Be(now.AddDays(-5));
            result[0].ExecutionCount.Should().Be(2);
            result[0].AverageDurationMs.Should().Be(150); // (100 + 200) / 2

            result[1].Date.Should().Be(now.AddDays(-4));
            result[1].ExecutionCount.Should().Be(1);
            result[1].AverageDurationMs.Should().Be(300);
        }
    }

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_ShouldOrderByDateAscending()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsOrderByDate")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution1 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-3),
                Duration = TimeSpan.FromSeconds(10)
            };

            var execution2 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(20)
            };

            var execution3 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-1),
                Duration = TimeSpan.FromSeconds(30)
            };

            context.ExecutionRecords.AddRange(execution1, execution2, execution3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(3);
            result[0].Date.Should().Be(now.AddDays(-5)); // Oldest first
            result[1].Date.Should().Be(now.AddDays(-3));
            result[2].Date.Should().Be(now.AddDays(-1)); // Most recent last
        }
    }

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_ShouldIncludeBothSucceededAndFailed()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsSuccessAndFail")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var executionSuccess = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5).AddHours(1),
                Duration = TimeSpan.FromSeconds(10)
            };

            var executionFailed = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Failed,
                StartedAt = now.AddDays(-5).AddHours(2),
                Duration = TimeSpan.FromSeconds(20)
            };

            context.ExecutionRecords.AddRange(executionSuccess, executionFailed);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].ExecutionCount.Should().Be(2);
            result[0].SuccessCount.Should().Be(1);
            result[0].FailureCount.Should().Be(1);
            result[0].AverageDurationMs.Should().Be(15000); // (10000 + 20000) / 2
        }
    }

    [Fact]
    public async Task GetWorkflowDurationTrendsAsync_ShouldExcludeNullDurations()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowTrendsNullDuration")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var executionWithDuration = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(10)
            };

            var executionWithoutDuration = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5),
                Duration = null
            };

            context.ExecutionRecords.AddRange(executionWithDuration, executionWithoutDuration);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetWorkflowDurationTrendsAsync("workflow-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].ExecutionCount.Should().Be(1); // Only execution with duration should be counted
            result[0].AverageDurationMs.Should().Be(10000);
        }
    }

    // ===== Task Duration Trends Tests =====

    [Fact]
    public async Task GetTaskDurationTrendsAsync_WithNoData_ShouldReturnEmptyList()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskTrendsNoData")
            .Options;

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetTaskDurationTrendsAsync("task-1", 30);

            // Assert
            result.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task GetTaskDurationTrendsAsync_WithData_ShouldReturnDataPoints()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskTrendsWithData")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5)
            };

            var taskRecord = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(10)
            };

            context.ExecutionRecords.Add(execution);
            context.TaskExecutionRecords.Add(taskRecord);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetTaskDurationTrendsAsync("task-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].Date.Should().Be(now.AddDays(-5));
            result[0].ExecutionCount.Should().Be(1);
            result[0].SuccessCount.Should().Be(1);
            result[0].FailureCount.Should().Be(0);
            result[0].AverageDurationMs.Should().Be(10000);
        }
    }

    [Fact]
    public async Task GetTaskDurationTrendsAsync_ShouldAggregateAcrossWorkflows()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskTrendsAcrossWorkflows")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution1 = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5)
            };

            var execution2 = new ExecutionRecord
            {
                WorkflowName = "workflow-2",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5)
            };

            var taskRecord1 = new TaskExecutionRecord
            {
                ExecutionId = execution1.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromMilliseconds(100)
            };

            var taskRecord2 = new TaskExecutionRecord
            {
                ExecutionId = execution2.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromMilliseconds(200)
            };

            context.ExecutionRecords.AddRange(execution1, execution2);
            context.TaskExecutionRecords.AddRange(taskRecord1, taskRecord2);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetTaskDurationTrendsAsync("task-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].ExecutionCount.Should().Be(2); // Both workflows counted
            result[0].AverageDurationMs.Should().Be(150); // (100 + 200) / 2
        }
    }

    [Fact]
    public async Task GetTaskDurationTrendsAsync_ShouldFilterByTaskRef()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskTrendsFilterTaskRef")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5)
            };

            var taskRecord1 = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(10)
            };

            var taskRecord2 = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-2",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(100)
            };

            context.ExecutionRecords.Add(execution);
            context.TaskExecutionRecords.AddRange(taskRecord1, taskRecord2);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetTaskDurationTrendsAsync("task-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].AverageDurationMs.Should().Be(10000); // Only task-1 should be included
        }
    }

    [Fact]
    public async Task GetTaskDurationTrendsAsync_ShouldFilterByDateRange()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskTrendsFilterDate")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5)
            };

            var taskRecordOld = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-40), // Outside 30 day window
                Duration = TimeSpan.FromSeconds(100)
            };

            var taskRecordRecent = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5), // Within 30 day window
                Duration = TimeSpan.FromSeconds(10)
            };

            context.ExecutionRecords.Add(execution);
            context.TaskExecutionRecords.AddRange(taskRecordOld, taskRecordRecent);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetTaskDurationTrendsAsync("task-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].AverageDurationMs.Should().Be(10000); // Only recent task should be included
        }
    }

    [Fact]
    public async Task GetTaskDurationTrendsAsync_ShouldIncludeBothSucceededAndFailed()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskTrendsSuccessAndFail")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5)
            };

            var taskRecordSuccess = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(10)
            };

            var taskRecordFailed = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Failed",
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(20)
            };

            context.ExecutionRecords.Add(execution);
            context.TaskExecutionRecords.AddRange(taskRecordSuccess, taskRecordFailed);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetTaskDurationTrendsAsync("task-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].ExecutionCount.Should().Be(2);
            result[0].SuccessCount.Should().Be(1);
            result[0].FailureCount.Should().Be(1);
            result[0].AverageDurationMs.Should().Be(15000); // (10000 + 20000) / 2
        }
    }

    [Fact]
    public async Task GetTaskDurationTrendsAsync_ShouldGroupByDate()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskTrendsGroupByDate")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5)
            };

            // Day 1 tasks
            var taskRecord1 = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5).AddHours(1),
                Duration = TimeSpan.FromMilliseconds(100)
            };

            var taskRecord2 = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5).AddHours(2),
                Duration = TimeSpan.FromMilliseconds(200)
            };

            // Day 2 task
            var taskRecord3 = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-4).AddHours(1),
                Duration = TimeSpan.FromMilliseconds(300)
            };

            context.ExecutionRecords.Add(execution);
            context.TaskExecutionRecords.AddRange(taskRecord1, taskRecord2, taskRecord3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetTaskDurationTrendsAsync("task-1", 30);

            // Assert
            result.Should().HaveCount(2);
            result[0].Date.Should().Be(now.AddDays(-5));
            result[0].ExecutionCount.Should().Be(2);
            result[0].AverageDurationMs.Should().Be(150); // (100 + 200) / 2

            result[1].Date.Should().Be(now.AddDays(-4));
            result[1].ExecutionCount.Should().Be(1);
            result[1].AverageDurationMs.Should().Be(300);
        }
    }

    [Fact]
    public async Task GetTaskDurationTrendsAsync_ShouldOrderByDateAscending()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskTrendsOrderByDate")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5)
            };

            var taskRecord1 = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-3),
                Duration = TimeSpan.FromSeconds(10)
            };

            var taskRecord2 = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(20)
            };

            var taskRecord3 = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-1),
                Duration = TimeSpan.FromSeconds(30)
            };

            context.ExecutionRecords.Add(execution);
            context.TaskExecutionRecords.AddRange(taskRecord1, taskRecord2, taskRecord3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetTaskDurationTrendsAsync("task-1", 30);

            // Assert
            result.Should().HaveCount(3);
            result[0].Date.Should().Be(now.AddDays(-5)); // Oldest first
            result[1].Date.Should().Be(now.AddDays(-3));
            result[2].Date.Should().Be(now.AddDays(-1)); // Most recent last
        }
    }

    [Fact]
    public async Task GetTaskDurationTrendsAsync_ShouldExcludeNullDurations()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskTrendsNullDuration")
            .Options;

        var now = DateTime.UtcNow.Date;
        using (var context = new WorkflowDbContext(options))
        {
            var execution = new ExecutionRecord
            {
                WorkflowName = "workflow-1",
                Status = ExecutionStatus.Succeeded,
                StartedAt = now.AddDays(-5)
            };

            var taskRecordWithDuration = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5),
                Duration = TimeSpan.FromSeconds(10)
            };

            var taskRecordWithoutDuration = new TaskExecutionRecord
            {
                ExecutionId = execution.Id,
                TaskRef = "task-1",
                Status = "Succeeded",
                StartedAt = now.AddDays(-5),
                Duration = null
            };

            context.ExecutionRecords.Add(execution);
            context.TaskExecutionRecords.AddRange(taskRecordWithDuration, taskRecordWithoutDuration);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new ExecutionRepository(context);
            var result = await repository.GetTaskDurationTrendsAsync("task-1", 30);

            // Assert
            result.Should().HaveCount(1);
            result[0].ExecutionCount.Should().Be(1); // Only task with duration should be counted
            result[0].AverageDurationMs.Should().Be(10000);
        }
    }
}
