using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Data;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Tests.Services;

/// <summary>
/// Tests for LabelSyncService - Stage 32.1
/// </summary>
public class LabelSyncServiceTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<ILogger<LabelSyncService>> _loggerMock;

    public LabelSyncServiceTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _loggerMock = new Mock<ILogger<LabelSyncService>>();
    }

    private WorkflowDbContext CreateDbContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: databaseName)
            .Options;
        return new WorkflowDbContext(options);
    }

    [Fact]
    public async Task SyncAsync_WithWorkflows_CreatesLabelEntities()
    {
        // Arrange
        var dbName = $"TestDb_SyncWorkflows_{Guid.NewGuid()}";

        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("order-processing", "default",
                tags: new[] { "production", "v2" },
                categories: new[] { "orders", "payments" })
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);
        _discoveryServiceMock.Setup(x => x.DiscoverTasksAsync(null))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        // Act
        using (var context = CreateDbContext(dbName))
        {
            var repository = new LabelRepository(context);
            var service = new LabelSyncService(
                _discoveryServiceMock.Object,
                repository,
                _loggerMock.Object);

            await service.SyncAsync();
        }

        // Assert
        using (var context = CreateDbContext(dbName))
        {
            var labels = await context.WorkflowLabels.ToListAsync();
            labels.Should().HaveCount(1);
            labels[0].WorkflowName.Should().Be("order-processing");
            labels[0].Tags.Should().BeEquivalentTo(new[] { "production", "v2" });
            labels[0].Categories.Should().BeEquivalentTo(new[] { "orders", "payments" });
        }
    }

    [Fact]
    public async Task SyncAsync_WithTasks_CreatesLabelEntities()
    {
        // Arrange
        var dbName = $"TestDb_SyncTasks_{Guid.NewGuid()}";

        var tasks = new List<WorkflowTaskResource>
        {
            CreateTask("fetch-user", "default", category: "http", tags: new[] { "api", "external" })
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource>());
        _discoveryServiceMock.Setup(x => x.DiscoverTasksAsync(null))
            .ReturnsAsync(tasks);

        // Act
        using (var context = CreateDbContext(dbName))
        {
            var repository = new LabelRepository(context);
            var service = new LabelSyncService(
                _discoveryServiceMock.Object,
                repository,
                _loggerMock.Object);

            await service.SyncAsync();
        }

        // Assert
        using (var context = CreateDbContext(dbName))
        {
            var labels = await context.TaskLabels.ToListAsync();
            labels.Should().HaveCount(1);
            labels[0].TaskName.Should().Be("fetch-user");
            labels[0].Category.Should().Be("http");
            labels[0].Tags.Should().BeEquivalentTo(new[] { "api", "external" });
        }
    }

    [Fact]
    public async Task SyncAsync_UpdatesExistingWorkflowLabels()
    {
        // Arrange
        var dbName = $"TestDb_SyncUpdate_{Guid.NewGuid()}";

        // Pre-populate with old labels
        using (var context = CreateDbContext(dbName))
        {
            context.WorkflowLabels.Add(new WorkflowLabelEntity
            {
                WorkflowName = "order-processing",
                Namespace = "default",
                Tags = new List<string> { "old-tag" },
                Categories = new List<string> { "old-category" },
                SyncedAt = DateTime.UtcNow.AddHours(-1)
            });
            await context.SaveChangesAsync();
        }

        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("order-processing", "default",
                tags: new[] { "new-tag" },
                categories: new[] { "new-category" })
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);
        _discoveryServiceMock.Setup(x => x.DiscoverTasksAsync(null))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        // Act
        using (var context = CreateDbContext(dbName))
        {
            var repository = new LabelRepository(context);
            var service = new LabelSyncService(
                _discoveryServiceMock.Object,
                repository,
                _loggerMock.Object);

            await service.SyncAsync();
        }

        // Assert
        using (var context = CreateDbContext(dbName))
        {
            var labels = await context.WorkflowLabels.ToListAsync();
            labels.Should().HaveCount(1); // Still only one record
            labels[0].Tags.Should().BeEquivalentTo(new[] { "new-tag" });
            labels[0].Categories.Should().BeEquivalentTo(new[] { "new-category" });
        }
    }

    [Fact]
    public async Task SyncAsync_RemovesDeletedWorkflows()
    {
        // Arrange
        var dbName = $"TestDb_SyncRemove_{Guid.NewGuid()}";

        // Pre-populate with workflow that will be "deleted"
        using (var context = CreateDbContext(dbName))
        {
            context.WorkflowLabels.Add(new WorkflowLabelEntity
            {
                WorkflowName = "deleted-workflow",
                Namespace = "default",
                Tags = new List<string>(),
                SyncedAt = DateTime.UtcNow.AddHours(-1)
            });
            await context.SaveChangesAsync();
        }

        // K8s returns empty list (workflow was deleted)
        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource>());
        _discoveryServiceMock.Setup(x => x.DiscoverTasksAsync(null))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        // Act
        using (var context = CreateDbContext(dbName))
        {
            var repository = new LabelRepository(context);
            var service = new LabelSyncService(
                _discoveryServiceMock.Object,
                repository,
                _loggerMock.Object);

            await service.SyncAsync();
        }

        // Assert
        using (var context = CreateDbContext(dbName))
        {
            var labels = await context.WorkflowLabels.ToListAsync();
            labels.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task SyncAsync_RemovesDeletedTasks()
    {
        // Arrange
        var dbName = $"TestDb_SyncRemoveTask_{Guid.NewGuid()}";

        // Pre-populate with task that will be "deleted"
        using (var context = CreateDbContext(dbName))
        {
            context.TaskLabels.Add(new TaskLabelEntity
            {
                TaskName = "deleted-task",
                Namespace = "default",
                Tags = new List<string>(),
                SyncedAt = DateTime.UtcNow.AddHours(-1)
            });
            await context.SaveChangesAsync();
        }

        // K8s returns empty list
        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource>());
        _discoveryServiceMock.Setup(x => x.DiscoverTasksAsync(null))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        // Act
        using (var context = CreateDbContext(dbName))
        {
            var repository = new LabelRepository(context);
            var service = new LabelSyncService(
                _discoveryServiceMock.Object,
                repository,
                _loggerMock.Object);

            await service.SyncAsync();
        }

        // Assert
        using (var context = CreateDbContext(dbName))
        {
            var labels = await context.TaskLabels.ToListAsync();
            labels.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task SyncAsync_HandlesNullTagsAndCategories()
    {
        // Arrange
        var dbName = $"TestDb_SyncNull_{Guid.NewGuid()}";

        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("minimal-workflow", "default", tags: null, categories: null)
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);
        _discoveryServiceMock.Setup(x => x.DiscoverTasksAsync(null))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        // Act
        using (var context = CreateDbContext(dbName))
        {
            var repository = new LabelRepository(context);
            var service = new LabelSyncService(
                _discoveryServiceMock.Object,
                repository,
                _loggerMock.Object);

            await service.SyncAsync();
        }

        // Assert
        using (var context = CreateDbContext(dbName))
        {
            var labels = await context.WorkflowLabels.ToListAsync();
            labels.Should().HaveCount(1);
            labels[0].Tags.Should().BeEmpty();
            labels[0].Categories.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task SyncAsync_SyncsMultipleWorkflowsAndTasks()
    {
        // Arrange
        var dbName = $"TestDb_SyncMultiple_{Guid.NewGuid()}";

        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("wf1", "default", tags: new[] { "tag1" }),
            CreateWorkflow("wf2", "default", tags: new[] { "tag2" }),
            CreateWorkflow("wf3", "production", tags: new[] { "tag3" })
        };

        var tasks = new List<WorkflowTaskResource>
        {
            CreateTask("task1", "default", category: "http"),
            CreateTask("task2", "default", category: "transform")
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);
        _discoveryServiceMock.Setup(x => x.DiscoverTasksAsync(null))
            .ReturnsAsync(tasks);

        // Act
        using (var context = CreateDbContext(dbName))
        {
            var repository = new LabelRepository(context);
            var service = new LabelSyncService(
                _discoveryServiceMock.Object,
                repository,
                _loggerMock.Object);

            await service.SyncAsync();
        }

        // Assert
        using (var context = CreateDbContext(dbName))
        {
            var workflowLabels = await context.WorkflowLabels.ToListAsync();
            workflowLabels.Should().HaveCount(3);

            var taskLabels = await context.TaskLabels.ToListAsync();
            taskLabels.Should().HaveCount(2);
        }
    }

    [Fact]
    public async Task SyncAsync_UpdatesLabelUsageStats()
    {
        // Arrange
        var dbName = $"TestDb_SyncStats_{Guid.NewGuid()}";

        var workflows = new List<WorkflowResource>
        {
            CreateWorkflow("wf1", "default", tags: new[] { "production" }),
            CreateWorkflow("wf2", "default", tags: new[] { "production", "v2" })
        };

        _discoveryServiceMock.Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);
        _discoveryServiceMock.Setup(x => x.DiscoverTasksAsync(null))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        // Act
        using (var context = CreateDbContext(dbName))
        {
            var repository = new LabelRepository(context);
            var service = new LabelSyncService(
                _discoveryServiceMock.Object,
                repository,
                _loggerMock.Object);

            await service.SyncAsync();
        }

        // Assert
        using (var context = CreateDbContext(dbName))
        {
            var stats = await context.LabelUsageStats.ToListAsync();
            stats.Should().NotBeEmpty();

            var productionStat = stats.FirstOrDefault(s =>
                s.LabelValue == "production" && s.EntityType == "Workflow");
            productionStat.Should().NotBeNull();
            productionStat!.UsageCount.Should().Be(2);
        }
    }

    // Helper methods
    private static WorkflowResource CreateWorkflow(
        string name,
        string @namespace,
        string[]? tags = null,
        string[]? categories = null)
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = name, Namespace = @namespace },
            Spec = new WorkflowSpec
            {
                Tags = tags?.ToList(),
                Categories = categories?.ToList()
            }
        };
    }

    private static WorkflowTaskResource CreateTask(
        string name,
        string @namespace,
        string? category = null,
        string[]? tags = null)
    {
        return new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = name, Namespace = @namespace },
            Spec = new WorkflowTaskSpec
            {
                Category = category,
                Tags = tags?.ToList()
            }
        };
    }
}
