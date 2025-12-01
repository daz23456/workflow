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

    /// <summary>
    /// Pre-computed workflow statistics summaries for O(1) reads.
    /// </summary>
    public DbSet<WorkflowStatisticsSummary> WorkflowStatisticsSummaries { get; set; } = null!;

    /// <summary>
    /// Pre-computed task statistics summaries for O(1) reads.
    /// </summary>
    public DbSet<TaskStatisticsSummary> TaskStatisticsSummaries { get; set; } = null!;

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
        // Composite index for duration trends queries (WorkflowName + StartedAt + Status)
        // This index supports: WHERE WorkflowName = X AND StartedAt >= Y AND Status IN (...)
        modelBuilder.Entity<ExecutionRecord>()
            .HasIndex(e => new { e.WorkflowName, e.StartedAt, e.Status })
            .HasDatabaseName("IX_ExecutionRecords_WorkflowName_StartedAt_Status");

        // Keep individual indexes for other query patterns
        modelBuilder.Entity<ExecutionRecord>()
            .HasIndex(e => e.Status)
            .HasDatabaseName("IX_ExecutionRecords_Status");

        // Configure composite index for TaskExecutionRecord (for task duration trends)
        // This index supports: WHERE TaskRef = X AND StartedAt >= Y AND Status IN (...)
        modelBuilder.Entity<TaskExecutionRecord>()
            .HasIndex(t => new { t.TaskRef, t.StartedAt, t.Status })
            .HasDatabaseName("IX_TaskExecutionRecords_TaskRef_StartedAt_Status");

        // Configure indexes for WorkflowVersion (for query performance)
        modelBuilder.Entity<WorkflowVersion>()
            .HasIndex(v => v.WorkflowName)
            .HasDatabaseName("IX_WorkflowVersions_WorkflowName");

        modelBuilder.Entity<WorkflowVersion>()
            .HasIndex(v => v.CreatedAt)
            .HasDatabaseName("IX_WorkflowVersions_CreatedAt");
    }
}
