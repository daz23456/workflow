using Microsoft.EntityFrameworkCore;
using WorkflowCore.Models;

namespace WorkflowCore.Data;

/// <summary>
/// Database context for workflow execution and versioning data.
/// </summary>
public class WorkflowDbContext : DbContext
{
    public WorkflowDbContext(DbContextOptions<WorkflowDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// Workflow execution records.
    /// </summary>
    public DbSet<ExecutionRecord> ExecutionRecords { get; set; } = null!;

    /// <summary>
    /// Task execution records (part of workflow executions).
    /// </summary>
    public DbSet<TaskExecutionRecord> TaskExecutionRecords { get; set; } = null!;

    /// <summary>
    /// Workflow version snapshots for change tracking.
    /// </summary>
    public DbSet<WorkflowVersion> WorkflowVersions { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure ExecutionRecord -> TaskExecutionRecords relationship (one-to-many)
        modelBuilder.Entity<ExecutionRecord>()
            .HasMany(e => e.TaskExecutionRecords)
            .WithOne(t => t.ExecutionRecord)
            .HasForeignKey(t => t.ExecutionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure indexes for ExecutionRecord (for query performance)
        modelBuilder.Entity<ExecutionRecord>()
            .HasIndex(e => e.WorkflowName)
            .HasDatabaseName("IX_ExecutionRecords_WorkflowName");

        modelBuilder.Entity<ExecutionRecord>()
            .HasIndex(e => e.Status)
            .HasDatabaseName("IX_ExecutionRecords_Status");

        modelBuilder.Entity<ExecutionRecord>()
            .HasIndex(e => e.StartedAt)
            .HasDatabaseName("IX_ExecutionRecords_StartedAt");

        // Configure indexes for WorkflowVersion (for query performance)
        modelBuilder.Entity<WorkflowVersion>()
            .HasIndex(v => v.WorkflowName)
            .HasDatabaseName("IX_WorkflowVersions_WorkflowName");

        modelBuilder.Entity<WorkflowVersion>()
            .HasIndex(v => v.CreatedAt)
            .HasDatabaseName("IX_WorkflowVersions_CreatedAt");
    }
}
