using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Data;

public class WorkflowDbContextIndexTests
{
    [Fact]
    public void WorkflowDbContext_ExecutionRecord_ShouldHaveCompositeIndex_ForWorkflowNameStartedAtStatus()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_IndexComposite")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);
        var entityType = context.Model.FindEntityType(typeof(ExecutionRecord));
        var indexes = entityType!.GetIndexes();

        // Assert - Composite index should contain WorkflowName, StartedAt, and Status
        var compositeIndex = indexes.FirstOrDefault(i =>
            i.Properties.Any(p => p.Name == nameof(ExecutionRecord.WorkflowName)) &&
            i.Properties.Any(p => p.Name == nameof(ExecutionRecord.StartedAt)) &&
            i.Properties.Any(p => p.Name == nameof(ExecutionRecord.Status)));

        compositeIndex.Should().NotBeNull("Composite index for WorkflowName+StartedAt+Status should exist");
        compositeIndex!.GetDatabaseName().Should().Be("IX_ExecutionRecords_WorkflowName_StartedAt_Status");
        compositeIndex.Properties.Should().HaveCount(3);
    }

    [Fact]
    public void WorkflowDbContext_ExecutionRecord_ShouldHaveIndividualStatusIndex()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_IndexStatus")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);
        var entityType = context.Model.FindEntityType(typeof(ExecutionRecord));
        var indexes = entityType!.GetIndexes();

        // Assert - Should have an individual Status-only index (in addition to the composite)
        var statusOnlyIndex = indexes.FirstOrDefault(i =>
            i.Properties.Count == 1 &&
            i.Properties.Any(p => p.Name == nameof(ExecutionRecord.Status)));

        statusOnlyIndex.Should().NotBeNull("Individual Status index should exist for filtering by status");
        statusOnlyIndex!.GetDatabaseName().Should().Be("IX_ExecutionRecords_Status");
    }

    [Fact]
    public void WorkflowDbContext_ExecutionRecord_ShouldHaveStartedAt_InCompositeIndex()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_IndexStartedAt")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);
        var entityType = context.Model.FindEntityType(typeof(ExecutionRecord));
        var indexes = entityType!.GetIndexes();

        // Assert - StartedAt should be part of the composite index (no separate StartedAt index)
        indexes.Should().Contain(i => i.Properties.Any(p => p.Name == nameof(ExecutionRecord.StartedAt)));
        var indexWithStartedAt = indexes.First(i => i.Properties.Any(p => p.Name == nameof(ExecutionRecord.StartedAt)));
        indexWithStartedAt.GetDatabaseName().Should().Be("IX_ExecutionRecords_WorkflowName_StartedAt_Status");
    }

    [Fact]
    public void WorkflowDbContext_WorkflowVersion_ShouldHaveWorkflowNameIndex()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_VersionIndexWorkflowName")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);
        var entityType = context.Model.FindEntityType(typeof(WorkflowVersion));
        var indexes = entityType!.GetIndexes();

        // Assert
        indexes.Should().Contain(i => i.Properties.Any(p => p.Name == nameof(WorkflowVersion.WorkflowName)));
        var workflowNameIndex = indexes.First(i => i.Properties.Any(p => p.Name == nameof(WorkflowVersion.WorkflowName)));
        workflowNameIndex.GetDatabaseName().Should().Be("IX_WorkflowVersions_WorkflowName");
    }

    [Fact]
    public void WorkflowDbContext_WorkflowVersion_ShouldHaveCreatedAtIndex()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_VersionIndexCreatedAt")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);
        var entityType = context.Model.FindEntityType(typeof(WorkflowVersion));
        var indexes = entityType!.GetIndexes();

        // Assert
        indexes.Should().Contain(i => i.Properties.Any(p => p.Name == nameof(WorkflowVersion.CreatedAt)));
        var createdAtIndex = indexes.First(i => i.Properties.Any(p => p.Name == nameof(WorkflowVersion.CreatedAt)));
        createdAtIndex.GetDatabaseName().Should().Be("IX_WorkflowVersions_CreatedAt");
    }
}
