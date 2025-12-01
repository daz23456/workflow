using System.ComponentModel.DataAnnotations;

namespace WorkflowCore.Models;

/// <summary>
/// Pre-computed task statistics summary for O(1) reads.
/// Updated periodically by background service to avoid full table scans.
/// </summary>
public class TaskStatisticsSummary
{
    /// <summary>
    /// Task reference name (primary key).
    /// </summary>
    [Key]
    [MaxLength(255)]
    public string TaskRef { get; set; } = string.Empty;

    /// <summary>
    /// Total number of executions across all workflows.
    /// </summary>
    public int TotalExecutions { get; set; }

    /// <summary>
    /// Number of successful executions.
    /// </summary>
    public int SuccessCount { get; set; }

    /// <summary>
    /// Number of failed executions.
    /// </summary>
    public int FailureCount { get; set; }

    /// <summary>
    /// Average duration in milliseconds (successful executions only).
    /// </summary>
    public long AverageDurationMs { get; set; }

    /// <summary>
    /// Total duration in milliseconds (for accurate running average calculation).
    /// </summary>
    public long TotalDurationMs { get; set; }

    /// <summary>
    /// Success rate as percentage (0-100).
    /// </summary>
    public double SuccessRate { get; set; }

    /// <summary>
    /// Timestamp of last execution.
    /// </summary>
    public DateTime? LastExecutedAt { get; set; }

    /// <summary>
    /// When this summary was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
