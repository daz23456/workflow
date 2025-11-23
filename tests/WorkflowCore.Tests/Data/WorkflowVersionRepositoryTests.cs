using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Data;

public class WorkflowVersionRepositoryTests
{
    [Fact]
    public async Task SaveVersionAsync_ShouldSaveNewVersion()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveVersionNew")
            .Options;

        var version = new WorkflowVersion
        {
            WorkflowName = "test-workflow",
            VersionHash = "hash123",
            DefinitionSnapshot = "workflow yaml content"
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new WorkflowVersionRepository(context);
            var saved = await repository.SaveVersionAsync(version);

            // Assert
            saved.Should().NotBeNull();
            saved.Id.Should().Be(version.Id);
            saved.WorkflowName.Should().Be("test-workflow");
        }

        // Verify persistence
        using (var context = new WorkflowDbContext(options))
        {
            var retrieved = await context.WorkflowVersions.FindAsync(version.Id);
            retrieved.Should().NotBeNull();
            retrieved!.WorkflowName.Should().Be("test-workflow");
            retrieved.VersionHash.Should().Be("hash123");
            retrieved.DefinitionSnapshot.Should().Be("workflow yaml content");
        }
    }

    [Fact]
    public async Task GetVersionsAsync_ShouldReturnAllVersionsForWorkflow()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetVersions")
            .Options;

        var now = DateTime.UtcNow;
        var version1 = new WorkflowVersion
        {
            WorkflowName = "workflow-1",
            VersionHash = "hash1",
            CreatedAt = now.AddDays(-2)
        };
        var version2 = new WorkflowVersion
        {
            WorkflowName = "workflow-1",
            VersionHash = "hash2",
            CreatedAt = now.AddDays(-1)
        };
        var version3 = new WorkflowVersion
        {
            WorkflowName = "workflow-2",
            VersionHash = "hash3",
            CreatedAt = now
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowVersions.AddRange(version1, version2, version3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new WorkflowVersionRepository(context);
            var results = await repository.GetVersionsAsync("workflow-1");

            // Assert
            results.Should().HaveCount(2);
            results.Should().Contain(v => v.VersionHash == "hash1");
            results.Should().Contain(v => v.VersionHash == "hash2");
            results.Should().NotContain(v => v.VersionHash == "hash3");
        }
    }

    [Fact]
    public async Task GetVersionsAsync_ShouldReturnEmptyList_WhenNoVersions()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetVersionsEmpty")
            .Options;

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new WorkflowVersionRepository(context);
            var results = await repository.GetVersionsAsync("non-existent");

            // Assert
            results.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task GetVersionsAsync_ShouldOrderByCreatedAtDescending()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetVersionsOrder")
            .Options;

        var now = DateTime.UtcNow;
        var version1 = new WorkflowVersion
        {
            WorkflowName = "workflow-1",
            VersionHash = "hash1",
            CreatedAt = now.AddDays(-10)
        };
        var version2 = new WorkflowVersion
        {
            WorkflowName = "workflow-1",
            VersionHash = "hash2",
            CreatedAt = now.AddDays(-5)
        };
        var version3 = new WorkflowVersion
        {
            WorkflowName = "workflow-1",
            VersionHash = "hash3",
            CreatedAt = now
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowVersions.AddRange(version1, version2, version3);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new WorkflowVersionRepository(context);
            var results = await repository.GetVersionsAsync("workflow-1");

            // Assert
            results.Should().HaveCount(3);
            results[0].VersionHash.Should().Be("hash3"); // Most recent
            results[1].VersionHash.Should().Be("hash2");
            results[2].VersionHash.Should().Be("hash1"); // Oldest
        }
    }

    [Fact]
    public async Task GetLatestVersionAsync_ShouldReturnMostRecentVersion()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetLatest")
            .Options;

        var now = DateTime.UtcNow;
        var version1 = new WorkflowVersion
        {
            WorkflowName = "workflow-1",
            VersionHash = "hash1",
            CreatedAt = now.AddDays(-2)
        };
        var version2 = new WorkflowVersion
        {
            WorkflowName = "workflow-1",
            VersionHash = "hash2",
            CreatedAt = now
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowVersions.AddRange(version1, version2);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new WorkflowVersionRepository(context);
            var result = await repository.GetLatestVersionAsync("workflow-1");

            // Assert
            result.Should().NotBeNull();
            result!.VersionHash.Should().Be("hash2");
        }
    }

    [Fact]
    public async Task GetLatestVersionAsync_ShouldReturnNull_WhenNoVersions()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetLatestNull")
            .Options;

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new WorkflowVersionRepository(context);
            var result = await repository.GetLatestVersionAsync("non-existent");

            // Assert
            result.Should().BeNull();
        }
    }

    [Fact]
    public async Task GetLatestVersionAsync_ShouldNotReturnVersionsFromOtherWorkflows()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetLatestIsolation")
            .Options;

        var now = DateTime.UtcNow;
        var version1 = new WorkflowVersion
        {
            WorkflowName = "workflow-1",
            VersionHash = "hash1",
            CreatedAt = now.AddDays(-1)
        };
        var version2 = new WorkflowVersion
        {
            WorkflowName = "workflow-2",
            VersionHash = "hash2",
            CreatedAt = now
        };

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowVersions.AddRange(version1, version2);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new WorkflowVersionRepository(context);
            var result = await repository.GetLatestVersionAsync("workflow-1");

            // Assert
            result.Should().NotBeNull();
            result!.VersionHash.Should().Be("hash1");
        }
    }

    [Fact]
    public async Task SaveVersionAsync_ShouldHandleNullWorkflowName()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_SaveNullName")
            .Options;

        var version = new WorkflowVersion
        {
            WorkflowName = null,
            VersionHash = "hash123"
        };

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new WorkflowVersionRepository(context);
            var saved = await repository.SaveVersionAsync(version);

            // Assert
            saved.Should().NotBeNull();
            saved.WorkflowName.Should().BeNull();
        }
    }

    [Fact]
    public async Task GetVersionsAsync_ShouldHandleNullWorkflowName()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_GetNullName")
            .Options;

        var version1 = new WorkflowVersion { WorkflowName = null, VersionHash = "hash1" };
        var version2 = new WorkflowVersion { WorkflowName = "workflow-1", VersionHash = "hash2" };

        using (var context = new WorkflowDbContext(options))
        {
            context.WorkflowVersions.AddRange(version1, version2);
            await context.SaveChangesAsync();
        }

        // Act
        using (var context = new WorkflowDbContext(options))
        {
            var repository = new WorkflowVersionRepository(context);
            var results = await repository.GetVersionsAsync(null);

            // Assert
            results.Should().HaveCount(1);
            results[0].VersionHash.Should().Be("hash1");
        }
    }
}
