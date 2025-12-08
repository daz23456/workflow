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

    /// <summary>
    /// Error quality analysis records for task error responses.
    /// </summary>
    public DbSet<ErrorQualityRecord> ErrorQualityRecords { get; set; } = null!;

    /// <summary>
    /// Workflow label data (tags and categories) for filtering and organization.
    /// </summary>
    public DbSet<WorkflowLabelEntity> WorkflowLabels { get; set; } = null!;

    /// <summary>
    /// Task label data (tags and category) for filtering and organization.
    /// </summary>
    public DbSet<TaskLabelEntity> TaskLabels { get; set; } = null!;

    /// <summary>
    /// Pre-computed label usage statistics for analytics.
    /// </summary>
    public DbSet<LabelUsageStatEntity> LabelUsageStats { get; set; } = null!;

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

        // Configure WorkflowLabelEntity (unique constraint on WorkflowName + Namespace)
        modelBuilder.Entity<WorkflowLabelEntity>()
            .HasIndex(l => new { l.WorkflowName, l.Namespace })
            .IsUnique()
            .HasDatabaseName("UQ_WorkflowLabels_Name_Namespace");

        // Configure TaskLabelEntity (unique constraint on TaskName + Namespace)
        modelBuilder.Entity<TaskLabelEntity>()
            .HasIndex(l => new { l.TaskName, l.Namespace })
            .IsUnique()
            .HasDatabaseName("UQ_TaskLabels_Name_Namespace");

        // Configure LabelUsageStatEntity (unique constraint on LabelType + LabelValue + EntityType)
        modelBuilder.Entity<LabelUsageStatEntity>()
            .HasIndex(s => new { s.LabelType, s.LabelValue, s.EntityType })
            .IsUnique()
            .HasDatabaseName("UQ_LabelUsageStats");
    }
}
