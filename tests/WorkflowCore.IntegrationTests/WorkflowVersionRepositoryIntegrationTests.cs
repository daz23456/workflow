using FluentAssertions;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;

namespace WorkflowCore.IntegrationTests;

/// <summary>
/// Integration tests for WorkflowVersionRepository against real PostgreSQL database.
/// Tests version tracking and ordering with real database constraints.
/// </summary>
public class WorkflowVersionRepositoryIntegrationTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fixture;

    public WorkflowVersionRepositoryIntegrationTests(PostgresFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task SaveVersionAsync_ShouldPersistToRealDatabase()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new WorkflowVersionRepository(context);

        var version = new WorkflowVersion
        {
            WorkflowName = "integration-workflow",
            VersionHash = "abc123hash",
            DefinitionSnapshot = "workflow:\n  name: test\n  tasks: []"
        };

        // Act
        var saved = await repository.SaveVersionAsync(version);

        // Assert
        saved.Should().NotBeNull();
        saved.Id.Should().NotBe(Guid.Empty);
        saved.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        // Verify with fresh context
        await using var verifyContext = await _fixture.CreateDbContextAsync();
        var retrieved = await verifyContext.WorkflowVersions.FindAsync(saved.Id);
        retrieved.Should().NotBeNull();
        retrieved!.WorkflowName.Should().Be("integration-workflow");
        retrieved.VersionHash.Should().Be("abc123hash");
    }

    [Fact]
    public async Task GetVersionsAsync_ShouldReturnAllVersionsForWorkflow()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new WorkflowVersionRepository(context);

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "multi-version-workflow",
            VersionHash = "v1",
            DefinitionSnapshot = "version 1"
        });

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "multi-version-workflow",
            VersionHash = "v2",
            DefinitionSnapshot = "version 2"
        });

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "other-workflow",
            VersionHash = "v1",
            DefinitionSnapshot = "other"
        });

        // Act
        var results = await repository.GetVersionsAsync("multi-version-workflow");

        // Assert
        results.Should().HaveCount(2);
        results.Should().AllSatisfy(v => v.WorkflowName.Should().Be("multi-version-workflow"));
        results.Should().Contain(v => v.VersionHash == "v1");
        results.Should().Contain(v => v.VersionHash == "v2");
    }

    [Fact]
    public async Task GetVersionsAsync_ShouldOrderByCreatedAtDescending()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new WorkflowVersionRepository(context);

        // Save versions with small delays to ensure different timestamps
        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "order-test",
            VersionHash = "oldest"
        });

        await Task.Delay(50); // Small delay to ensure different timestamps

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "order-test",
            VersionHash = "middle"
        });

        await Task.Delay(50);

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "order-test",
            VersionHash = "newest"
        });

        // Act
        var results = await repository.GetVersionsAsync("order-test");

        // Assert
        results.Should().HaveCount(3);
        results[0].VersionHash.Should().Be("newest");
        results[1].VersionHash.Should().Be("middle");
        results[2].VersionHash.Should().Be("oldest");
    }

    [Fact]
    public async Task GetLatestVersionAsync_ShouldReturnMostRecentVersion()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new WorkflowVersionRepository(context);

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "latest-test",
            VersionHash = "old"
        });

        await Task.Delay(50);

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "latest-test",
            VersionHash = "latest"
        });

        // Act
        var result = await repository.GetLatestVersionAsync("latest-test");

        // Assert
        result.Should().NotBeNull();
        result!.VersionHash.Should().Be("latest");
    }

    [Fact]
    public async Task GetLatestVersionAsync_ShouldReturnNullForNonExistentWorkflow()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new WorkflowVersionRepository(context);

        // Act
        var result = await repository.GetLatestVersionAsync("non-existent-workflow");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLatestVersionAsync_ShouldIsolateByWorkflowName()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new WorkflowVersionRepository(context);

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "workflow-a",
            VersionHash = "workflow-a-v1"
        });

        await Task.Delay(50);

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "workflow-b",
            VersionHash = "workflow-b-v1"
        });

        // Act
        var resultA = await repository.GetLatestVersionAsync("workflow-a");
        var resultB = await repository.GetLatestVersionAsync("workflow-b");

        // Assert
        resultA!.VersionHash.Should().Be("workflow-a-v1");
        resultB!.VersionHash.Should().Be("workflow-b-v1");
    }

    [Fact]
    public async Task SaveVersionAsync_ShouldHandleNullWorkflowName()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new WorkflowVersionRepository(context);

        var version = new WorkflowVersion
        {
            WorkflowName = null,
            VersionHash = "null-workflow-hash"
        };

        // Act
        var saved = await repository.SaveVersionAsync(version);

        // Assert
        saved.WorkflowName.Should().BeNull();

        // Verify with fresh context
        await using var verifyContext = await _fixture.CreateDbContextAsync();
        var retrieved = await verifyContext.WorkflowVersions.FindAsync(saved.Id);
        retrieved!.WorkflowName.Should().BeNull();
        retrieved.VersionHash.Should().Be("null-workflow-hash");
    }

    [Fact]
    public async Task GetVersionsAsync_ShouldHandleNullWorkflowName()
    {
        // Arrange
        await using var context = await _fixture.CreateDbContextAsync();
        var repository = new WorkflowVersionRepository(context);

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = null,
            VersionHash = "null-v1"
        });

        await repository.SaveVersionAsync(new WorkflowVersion
        {
            WorkflowName = "named-workflow",
            VersionHash = "named-v1"
        });

        // Act
        var results = await repository.GetVersionsAsync(null);

        // Assert
        results.Should().HaveCount(1);
        results[0].VersionHash.Should().Be("null-v1");
    }
}
