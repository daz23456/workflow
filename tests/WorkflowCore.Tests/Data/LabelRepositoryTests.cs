using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Data;

/// <summary>
/// Tests for label entities and repository - Stage 32.1
/// TDD: These tests are written FIRST (RED phase)
/// </summary>
public class LabelRepositoryTests
{
    // ===== Entity Tests =====

    [Fact]
    public async Task WorkflowLabelEntity_CanBeSavedAndRetrieved()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_WorkflowLabel_Save")
            .Options;

        var label = new WorkflowLabelEntity
        {
            WorkflowName = "order-processing",
            Namespace = "default",
            Tags = new List<string> { "production", "v2" },
            Categories = new List<string> { "orders", "payments" },
            SyncedAt = DateTime.UtcNow,
            VersionHash = "abc123"
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.Add(label);
            await context.SaveChangesAsync();
        }

        // Assert
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.WorkflowLabels.FindAsync(label.Id);
            retrieved.Should().NotBeNull();
            retrieved!.WorkflowName.Should().Be("order-processing");
            retrieved.Namespace.Should().Be("default");
            retrieved.Tags.Should().BeEquivalentTo(new[] { "production", "v2" });
            retrieved.Categories.Should().BeEquivalentTo(new[] { "orders", "payments" });
            retrieved.VersionHash.Should().Be("abc123");
        }
    }

    [Fact]
    public async Task TaskLabelEntity_CanBeSavedAndRetrieved()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_TaskLabel_Save")
            .Options;

        var label = new TaskLabelEntity
        {
            TaskName = "fetch-user",
            Namespace = "default",
            Category = "http",
            Tags = new List<string> { "api", "external" },
            SyncedAt = DateTime.UtcNow,
            VersionHash = "def456"
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            context.TaskLabels.Add(label);
            await context.SaveChangesAsync();
        }

        // Assert
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.TaskLabels.FindAsync(label.Id);
            retrieved.Should().NotBeNull();
            retrieved!.TaskName.Should().Be("fetch-user");
            retrieved.Namespace.Should().Be("default");
            retrieved.Category.Should().Be("http");
            retrieved.Tags.Should().BeEquivalentTo(new[] { "api", "external" });
            retrieved.VersionHash.Should().Be("def456");
        }
    }

    [Fact]
    public async Task LabelUsageStatEntity_CanBeSavedAndRetrieved()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_LabelUsageStat_Save")
            .Options;

        var stat = new LabelUsageStatEntity
        {
            LabelType = "Tag",
            LabelValue = "production",
            EntityType = "Workflow",
            UsageCount = 45,
            LastUsedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            context.LabelUsageStats.Add(stat);
            await context.SaveChangesAsync();
        }

        // Assert
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.LabelUsageStats.FindAsync(stat.Id);
            retrieved.Should().NotBeNull();
            retrieved!.LabelType.Should().Be("Tag");
            retrieved.LabelValue.Should().Be("production");
            retrieved.EntityType.Should().Be("Workflow");
            retrieved.UsageCount.Should().Be(45);
        }
    }

    // ===== Repository Tests - GetWorkflowsByTagsAsync =====

    [Fact]
    public async Task GetWorkflowsByTagsAsync_WithMatchingTag_ReturnsWorkflows()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetByTags_Match")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.AddRange(
                new WorkflowLabelEntity
                {
                    WorkflowName = "order-processing",
                    Tags = new List<string> { "production", "v2" },
                    SyncedAt = DateTime.UtcNow
                },
                new WorkflowLabelEntity
                {
                    WorkflowName = "user-service",
                    Tags = new List<string> { "beta", "v1" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetWorkflowsByTagsAsync(
                new[] { "production" }, matchAll: false);

            // Assert
            result.Should().HaveCount(1);
            result[0].WorkflowName.Should().Be("order-processing");
        }
    }

    [Fact]
    public async Task GetWorkflowsByTagsAsync_WithMatchAllTrue_RequiresAllTags()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetByTags_MatchAll")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.AddRange(
                new WorkflowLabelEntity
                {
                    WorkflowName = "order-processing",
                    Tags = new List<string> { "production", "v2", "stable" },
                    SyncedAt = DateTime.UtcNow
                },
                new WorkflowLabelEntity
                {
                    WorkflowName = "user-service",
                    Tags = new List<string> { "production", "v1" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetWorkflowsByTagsAsync(
                new[] { "production", "v2" }, matchAll: true);

            // Assert
            result.Should().HaveCount(1);
            result[0].WorkflowName.Should().Be("order-processing");
        }
    }

    [Fact]
    public async Task GetWorkflowsByTagsAsync_WithMatchAllFalse_MatchesAnyTag()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetByTags_MatchAny")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.AddRange(
                new WorkflowLabelEntity
                {
                    WorkflowName = "order-processing",
                    Tags = new List<string> { "production" },
                    SyncedAt = DateTime.UtcNow
                },
                new WorkflowLabelEntity
                {
                    WorkflowName = "user-service",
                    Tags = new List<string> { "v2" },
                    SyncedAt = DateTime.UtcNow
                },
                new WorkflowLabelEntity
                {
                    WorkflowName = "payment-service",
                    Tags = new List<string> { "beta" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetWorkflowsByTagsAsync(
                new[] { "production", "v2" }, matchAll: false);

            // Assert
            result.Should().HaveCount(2);
            result.Select(r => r.WorkflowName).Should()
                .BeEquivalentTo(new[] { "order-processing", "user-service" });
        }
    }

    [Fact]
    public async Task GetWorkflowsByTagsAsync_WithEmptyTags_ReturnsAllWorkflows()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetByTags_Empty")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.AddRange(
                new WorkflowLabelEntity
                {
                    WorkflowName = "order-processing",
                    Tags = new List<string> { "production" },
                    SyncedAt = DateTime.UtcNow
                },
                new WorkflowLabelEntity
                {
                    WorkflowName = "user-service",
                    Tags = new List<string> { "beta" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetWorkflowsByTagsAsync(
                Array.Empty<string>(), matchAll: false);

            // Assert
            result.Should().HaveCount(2);
        }
    }

    [Fact]
    public async Task GetWorkflowsByTagsAsync_IsCaseInsensitive()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetByTags_CaseInsensitive")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.Add(
                new WorkflowLabelEntity
                {
                    WorkflowName = "order-processing",
                    Tags = new List<string> { "Production", "V2" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetWorkflowsByTagsAsync(
                new[] { "production", "v2" }, matchAll: true);

            // Assert
            result.Should().HaveCount(1);
        }
    }

    // ===== Repository Tests - GetWorkflowsByCategoriesAsync =====

    [Fact]
    public async Task GetWorkflowsByCategoriesAsync_WithMatchingCategory_ReturnsWorkflows()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetByCategories_Match")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.AddRange(
                new WorkflowLabelEntity
                {
                    WorkflowName = "order-processing",
                    Categories = new List<string> { "orders", "payments" },
                    SyncedAt = DateTime.UtcNow
                },
                new WorkflowLabelEntity
                {
                    WorkflowName = "user-service",
                    Categories = new List<string> { "users" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetWorkflowsByCategoriesAsync(
                new[] { "orders" });

            // Assert
            result.Should().HaveCount(1);
            result[0].WorkflowName.Should().Be("order-processing");
        }
    }

    // ===== Repository Tests - GetTasksByTagsAsync =====

    [Fact]
    public async Task GetTasksByTagsAsync_WithMatchingTag_ReturnsTasks()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetTasksByTags_Match")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.TaskLabels.AddRange(
                new TaskLabelEntity
                {
                    TaskName = "fetch-user",
                    Tags = new List<string> { "api", "external" },
                    SyncedAt = DateTime.UtcNow
                },
                new TaskLabelEntity
                {
                    TaskName = "validate-input",
                    Tags = new List<string> { "internal" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetTasksByTagsAsync(
                new[] { "api" }, matchAll: false);

            // Assert
            result.Should().HaveCount(1);
            result[0].TaskName.Should().Be("fetch-user");
        }
    }

    // ===== Repository Tests - GetTasksByCategoryAsync =====

    [Fact]
    public async Task GetTasksByCategoryAsync_WithMatchingCategory_ReturnsTasks()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetTasksByCategory_Match")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.TaskLabels.AddRange(
                new TaskLabelEntity
                {
                    TaskName = "fetch-user",
                    Category = "http",
                    SyncedAt = DateTime.UtcNow
                },
                new TaskLabelEntity
                {
                    TaskName = "send-email",
                    Category = "notification",
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetTasksByCategoryAsync("http");

            // Assert
            result.Should().HaveCount(1);
            result[0].TaskName.Should().Be("fetch-user");
        }
    }

    // ===== Repository Tests - GetAllLabelsAsync =====

    [Fact]
    public async Task GetAllLabelsAsync_ReturnsUniqueLabelsWithCounts()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetAllLabels")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.AddRange(
                new WorkflowLabelEntity
                {
                    WorkflowName = "wf1",
                    Tags = new List<string> { "production", "v2" },
                    Categories = new List<string> { "orders" },
                    SyncedAt = DateTime.UtcNow
                },
                new WorkflowLabelEntity
                {
                    WorkflowName = "wf2",
                    Tags = new List<string> { "production" },
                    Categories = new List<string> { "users" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetAllLabelsAsync();

            // Assert
            result.Tags.Should().Contain(t => t.Value == "production" && t.WorkflowCount == 2);
            result.Tags.Should().Contain(t => t.Value == "v2" && t.WorkflowCount == 1);
            result.Categories.Should().Contain(c => c.Value == "orders" && c.WorkflowCount == 1);
            result.Categories.Should().Contain(c => c.Value == "users" && c.WorkflowCount == 1);
        }
    }

    // ===== Repository Tests - Namespace Filtering =====

    [Fact]
    public async Task GetWorkflowsByTagsAsync_WithNamespace_FiltersCorrectly()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetByTags_Namespace")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.AddRange(
                new WorkflowLabelEntity
                {
                    WorkflowName = "order-processing",
                    Namespace = "production",
                    Tags = new List<string> { "v2" },
                    SyncedAt = DateTime.UtcNow
                },
                new WorkflowLabelEntity
                {
                    WorkflowName = "order-processing",
                    Namespace = "staging",
                    Tags = new List<string> { "v2" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetWorkflowsByTagsAsync(
                new[] { "v2" }, matchAll: false, @namespace: "production");

            // Assert
            result.Should().HaveCount(1);
            result[0].Namespace.Should().Be("production");
        }
    }

    // ===== Repository Tests - SaveWorkflowLabelsAsync =====

    [Fact]
    public async Task SaveWorkflowLabelsAsync_CreatesNewRecord()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveWorkflowLabels_New")
            .Options;

        var label = new WorkflowLabelEntity
        {
            WorkflowName = "new-workflow",
            Namespace = "default",
            Tags = new List<string> { "new" },
            Categories = new List<string> { "test" },
            SyncedAt = DateTime.UtcNow
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var saved = await repository.SaveWorkflowLabelsAsync(label);

            // Assert
            saved.Should().NotBeNull();
            saved.Id.Should().NotBe(Guid.Empty);
        }

        // Verify persistence
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.WorkflowLabels
                .FirstOrDefaultAsync(l => l.WorkflowName == "new-workflow");
            retrieved.Should().NotBeNull();
        }
    }

    [Fact]
    public async Task SaveWorkflowLabelsAsync_UpdatesExistingRecord()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveWorkflowLabels_Update")
            .Options;

        var label = new WorkflowLabelEntity
        {
            WorkflowName = "existing-workflow",
            Namespace = "default",
            Tags = new List<string> { "old-tag" },
            Categories = new List<string>(),
            SyncedAt = DateTime.UtcNow.AddHours(-1)
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.Add(label);
            await context.SaveChangesAsync();
        }

        // Act - Update the same workflow
        label.Tags = new List<string> { "new-tag" };
        label.SyncedAt = DateTime.UtcNow;

        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var updated = await repository.SaveWorkflowLabelsAsync(label);

            // Assert
            updated.Tags.Should().Contain("new-tag");
        }

        // Verify only one record exists
        using (var context = new WorkflowDbContext(options))
        {
            var count = await context.WorkflowLabels
                .CountAsync(l => l.WorkflowName == "existing-workflow");
            count.Should().Be(1);
        }
    }

    // ===== Repository Tests - DeleteWorkflowLabelsAsync =====

    [Fact]
    public async Task DeleteWorkflowLabelsAsync_RemovesRecord()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_DeleteWorkflowLabels")
            .Options;

        var label = new WorkflowLabelEntity
        {
            WorkflowName = "to-delete",
            Namespace = "default",
            Tags = new List<string>(),
            SyncedAt = DateTime.UtcNow
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.Add(label);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            await repository.DeleteWorkflowLabelsAsync("to-delete", "default");
        }

        // Assert
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.WorkflowLabels
                .FirstOrDefaultAsync(l => l.WorkflowName == "to-delete");
            retrieved.Should().BeNull();
        }
    }

    // ===== Repository Tests - UpdateLabelUsageStatsAsync =====

    [Fact]
    public async Task UpdateLabelUsageStatsAsync_CreatesNewStats()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_UpdateLabelStats_New")
            .Options;

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            await repository.UpdateLabelUsageStatsAsync();
        }

        // This test will be expanded when we have actual workflows with labels
        // For now, just verify it doesn't throw
    }

    // ===== Entity Default Values =====

    [Fact]
    public void WorkflowLabelEntity_HasCorrectDefaults()
    {
        var label = new WorkflowLabelEntity();

        label.Id.Should().NotBe(Guid.Empty);
        label.Namespace.Should().Be("default");
        label.Tags.Should().BeEmpty();
        label.Categories.Should().BeEmpty();
    }

    [Fact]
    public void TaskLabelEntity_HasCorrectDefaults()
    {
        var label = new TaskLabelEntity();

        label.Id.Should().NotBe(Guid.Empty);
        label.Namespace.Should().Be("default");
        label.Tags.Should().BeEmpty();
    }

    // ===== Additional Edge Case Tests =====

    [Fact]
    public async Task SaveTaskLabelsAsync_CreatesNewRecord()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveTaskLabels_New")
            .Options;

        var label = new TaskLabelEntity
        {
            TaskName = "new-task",
            Namespace = "default",
            Category = "http",
            Tags = new List<string> { "api" },
            SyncedAt = DateTime.UtcNow
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var saved = await repository.SaveTaskLabelsAsync(label);

            // Assert
            saved.Should().NotBeNull();
            saved.Id.Should().NotBe(Guid.Empty);
        }

        // Verify persistence
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.TaskLabels
                .FirstOrDefaultAsync(l => l.TaskName == "new-task");
            retrieved.Should().NotBeNull();
        }
    }

    [Fact]
    public async Task DeleteTaskLabelsAsync_RemovesRecord()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_DeleteTaskLabels")
            .Options;

        var label = new TaskLabelEntity
        {
            TaskName = "to-delete-task",
            Namespace = "default",
            Tags = new List<string>(),
            SyncedAt = DateTime.UtcNow
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.TaskLabels.Add(label);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            await repository.DeleteTaskLabelsAsync("to-delete-task", "default");
        }

        // Assert
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.TaskLabels
                .FirstOrDefaultAsync(l => l.TaskName == "to-delete-task");
            retrieved.Should().BeNull();
        }
    }

    [Fact]
    public async Task GetTasksByCategoryAsync_IsCaseInsensitive()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetTasksByCategory_CaseInsensitive")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.TaskLabels.Add(new TaskLabelEntity
            {
                TaskName = "fetch-user",
                Category = "HTTP", // Uppercase
                SyncedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetTasksByCategoryAsync("http"); // Lowercase

            // Assert
            result.Should().HaveCount(1);
        }
    }

    [Fact]
    public async Task GetWorkflowsByCategoriesAsync_WithEmptyCategories_ReturnsAllWorkflows()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetByCategories_Empty")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowLabels.AddRange(
                new WorkflowLabelEntity
                {
                    WorkflowName = "wf1",
                    Categories = new List<string> { "cat1" },
                    SyncedAt = DateTime.UtcNow
                },
                new WorkflowLabelEntity
                {
                    WorkflowName = "wf2",
                    Categories = new List<string> { "cat2" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetWorkflowsByCategoriesAsync(Array.Empty<string>());

            // Assert
            result.Should().HaveCount(2);
        }
    }

    [Fact]
    public async Task GetTasksByTagsAsync_WithMatchAllTrue_RequiresAllTags()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetTasksByTags_MatchAll")
            .Options;

        using (var context = new WorkflowDbContext(options))
        {
            context.TaskLabels.AddRange(
                new TaskLabelEntity
                {
                    TaskName = "task1",
                    Tags = new List<string> { "api", "external", "v2" },
                    SyncedAt = DateTime.UtcNow
                },
                new TaskLabelEntity
                {
                    TaskName = "task2",
                    Tags = new List<string> { "api", "internal" },
                    SyncedAt = DateTime.UtcNow
                }
            );
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new LabelRepository(context);
            var result = await repository.GetTasksByTagsAsync(
                new[] { "api", "external" }, matchAll: true);

            // Assert
            result.Should().HaveCount(1);
            result[0].TaskName.Should().Be("task1");
        }
    }

    [Fact]
    public async Task LabelUsageStatEntity_HasCorrectDefaults()
    {
        var stat = new LabelUsageStatEntity();

        stat.Id.Should().NotBe(Guid.Empty);
        stat.UsageCount.Should().Be(0);
    }
}
