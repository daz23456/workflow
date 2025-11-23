using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Data;

public class WorkflowDbContextIndexTests
{
    [Fact]
    public void WorkflowDbContext_ExecutionRecord_ShouldHaveWorkflowNameIndex()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_IndexWorkflowName")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);
        var entityType = context.Model.FindEntityType(typeof(ExecutionRecord));
        var indexes = entityType!.GetIndexes();

        // Assert
        indexes.Should().Contain(i => i.Properties.Any(p => p.Name == nameof(ExecutionRecord.WorkflowName)));
        var workflowNameIndex = indexes.First(i => i.Properties.Any(p => p.Name == nameof(ExecutionRecord.WorkflowName)));
        workflowNameIndex.GetDatabaseName().Should().Be("IX_ExecutionRecords_WorkflowName");
    }

    [Fact]
    public void WorkflowDbContext_ExecutionRecord_ShouldHaveStatusIndex()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_IndexStatus")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);
        var entityType = context.Model.FindEntityType(typeof(ExecutionRecord));
        var indexes = entityType!.GetIndexes();

        // Assert
        indexes.Should().Contain(i => i.Properties.Any(p => p.Name == nameof(ExecutionRecord.Status)));
        var statusIndex = indexes.First(i => i.Properties.Any(p => p.Name == nameof(ExecutionRecord.Status)));
        statusIndex.GetDatabaseName().Should().Be("IX_ExecutionRecords_Status");
    }

    [Fact]
    public void WorkflowDbContext_ExecutionRecord_ShouldHaveStartedAtIndex()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<WorkflowDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb_IndexStartedAt")
            .Options;

        // Act
        using var context = new WorkflowDbContext(options);
        var entityType = context.Model.FindEntityType(typeof(ExecutionRecord));
        var indexes = entityType!.GetIndexes();

        // Assert
        indexes.Should().Contain(i => i.Properties.Any(p => p.Name == nameof(ExecutionRecord.StartedAt)));
        var startedAtIndex = indexes.First(i => i.Properties.Any(p => p.Name == nameof(ExecutionRecord.StartedAt)));
        startedAtIndex.GetDatabaseName().Should().Be("IX_ExecutionRecords_StartedAt");
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
