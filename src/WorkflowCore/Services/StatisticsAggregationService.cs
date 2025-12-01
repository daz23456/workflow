using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Interface for statistics aggregation service that maintains pre-computed statistics.
/// </summary>
public interface IStatisticsAggregationService
{
    /// <summary>
    /// Records a workflow execution and updates the summary incrementally (O(1)).
    /// </summary>
    Task RecordWorkflowExecutionAsync(string workflowName, ExecutionStatus status, long durationMs, DateTime executedAt);

    /// <summary>
    /// Records a task execution and updates the summary incrementally (O(1)).
    /// </summary>
    Task RecordTaskExecutionAsync(string taskRef, string status, long durationMs, DateTime executedAt);

    /// <summary>
    /// Gets all workflow statistics from pre-computed summary table.
    /// </summary>
    Task<Dictionary<string, WorkflowStatisticsSummary>> GetAllWorkflowStatisticsAsync();

    /// <summary>
    /// Gets all task statistics from pre-computed summary table.
    /// </summary>
    Task<Dictionary<string, TaskStatisticsSummary>> GetAllTaskStatisticsAsync();
}

/// <summary>
/// Service that pre-computes statistics summaries to avoid full table scans.
/// Uses delta-based incremental updates for O(1) performance.
/// </summary>
public class StatisticsAggregationService : IStatisticsAggregationService
{
    private readonly WorkflowDbContext _context;

    public StatisticsAggregationService(WorkflowDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <summary>
    /// Computes workflow statistics from execution records using SQL aggregation.
    /// Returns summary objects (does not persist to database).
    /// </summary>
    public async Task<List<WorkflowStatisticsSummary>> RefreshWorkflowStatisticsAsync()
    {
        var now = DateTime.UtcNow;

        var stats = await _context.ExecutionRecords
            .GroupBy(e => e.WorkflowName)
            .Select(g => new WorkflowStatisticsSummary
            {
                WorkflowName = g.Key ?? string.Empty,
                TotalExecutions = g.Count(),
                SuccessCount = g.Count(e => e.Status == ExecutionStatus.Succeeded),
                FailureCount = g.Count(e => e.Status == ExecutionStatus.Failed),
                AverageDurationMs = (long)(g.Where(e => e.Status == ExecutionStatus.Succeeded && e.Duration.HasValue)
                                            .Select(e => (double?)e.Duration!.Value.TotalMilliseconds)
                                            .Average() ?? 0),
                LastExecutedAt = g.Max(e => (DateTime?)e.StartedAt),
                UpdatedAt = now
            })
            .ToListAsync();

        // Calculate success rate in memory (EF Core may have issues with complex expressions)
        foreach (var stat in stats)
        {
            stat.SuccessRate = stat.TotalExecutions > 0
                ? Math.Round((double)stat.SuccessCount / stat.TotalExecutions * 100.0, 2)
                : 0.0;
        }

        return stats;
    }

    /// <summary>
    /// Computes task statistics from task execution records using SQL aggregation.
    /// Returns summary objects (does not persist to database).
    /// </summary>
    public async Task<List<TaskStatisticsSummary>> RefreshTaskStatisticsAsync()
    {
        var now = DateTime.UtcNow;

        var stats = await _context.TaskExecutionRecords
            .GroupBy(t => t.TaskRef)
            .Select(g => new TaskStatisticsSummary
            {
                TaskRef = g.Key ?? string.Empty,
                TotalExecutions = g.Count(),
                SuccessCount = g.Count(t => t.Status == "Succeeded"),
                FailureCount = g.Count(t => t.Status == "Failed"),
                AverageDurationMs = (long)(g.Where(t => t.Status == "Succeeded" && t.Duration.HasValue)
                                            .Select(t => (double?)t.Duration!.Value.TotalMilliseconds)
                                            .Average() ?? 0),
                LastExecutedAt = g.Max(t => (DateTime?)t.StartedAt),
                UpdatedAt = now
            })
            .ToListAsync();

        // Calculate success rate in memory
        foreach (var stat in stats)
        {
            stat.SuccessRate = stat.TotalExecutions > 0
                ? Math.Round((double)stat.SuccessCount / stat.TotalExecutions * 100.0, 2)
                : 0.0;
        }

        return stats;
    }

    /// <summary>
    /// Saves workflow statistics summaries to database (upsert).
    /// </summary>
    public async Task SaveWorkflowSummariesAsync(List<WorkflowStatisticsSummary> summaries)
    {
        foreach (var summary in summaries)
        {
            var existing = await _context.WorkflowStatisticsSummaries
                .FirstOrDefaultAsync(s => s.WorkflowName == summary.WorkflowName);

            if (existing != null)
            {
                // Update existing
                existing.TotalExecutions = summary.TotalExecutions;
                existing.SuccessCount = summary.SuccessCount;
                existing.FailureCount = summary.FailureCount;
                existing.AverageDurationMs = summary.AverageDurationMs;
                existing.SuccessRate = summary.SuccessRate;
                existing.LastExecutedAt = summary.LastExecutedAt;
                existing.UpdatedAt = summary.UpdatedAt;
            }
            else
            {
                // Insert new
                _context.WorkflowStatisticsSummaries.Add(summary);
            }
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Saves task statistics summaries to database (upsert).
    /// </summary>
    public async Task SaveTaskSummariesAsync(List<TaskStatisticsSummary> summaries)
    {
        foreach (var summary in summaries)
        {
            var existing = await _context.TaskStatisticsSummaries
                .FirstOrDefaultAsync(s => s.TaskRef == summary.TaskRef);

            if (existing != null)
            {
                // Update existing
                existing.TotalExecutions = summary.TotalExecutions;
                existing.SuccessCount = summary.SuccessCount;
                existing.FailureCount = summary.FailureCount;
                existing.AverageDurationMs = summary.AverageDurationMs;
                existing.SuccessRate = summary.SuccessRate;
                existing.LastExecutedAt = summary.LastExecutedAt;
                existing.UpdatedAt = summary.UpdatedAt;
            }
            else
            {
                // Insert new
                _context.TaskStatisticsSummaries.Add(summary);
            }
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Full refresh: computes and saves all statistics summaries.
    /// Called periodically by background service.
    /// </summary>
    public async Task RefreshAllStatisticsAsync()
    {
        var workflowStats = await RefreshWorkflowStatisticsAsync();
        await SaveWorkflowSummariesAsync(workflowStats);

        var taskStats = await RefreshTaskStatisticsAsync();
        await SaveTaskSummariesAsync(taskStats);
    }

    #region Delta-Based Incremental Updates

    /// <summary>
    /// Records a workflow execution and updates the summary incrementally.
    /// O(1) operation - no full table scan required.
    /// </summary>
    public async Task RecordWorkflowExecutionAsync(
        string workflowName,
        ExecutionStatus status,
        long durationMs,
        DateTime executedAt)
    {
        var summary = await _context.WorkflowStatisticsSummaries
            .FirstOrDefaultAsync(s => s.WorkflowName == workflowName);

        if (summary == null)
        {
            // Create new summary
            summary = new WorkflowStatisticsSummary
            {
                WorkflowName = workflowName,
                TotalExecutions = 1,
                SuccessCount = status == ExecutionStatus.Succeeded ? 1 : 0,
                FailureCount = status == ExecutionStatus.Failed ? 1 : 0,
                TotalDurationMs = status == ExecutionStatus.Succeeded ? durationMs : 0,
                AverageDurationMs = status == ExecutionStatus.Succeeded ? durationMs : 0,
                SuccessRate = status == ExecutionStatus.Succeeded ? 100.0 : 0.0,
                LastExecutedAt = executedAt,
                UpdatedAt = DateTime.UtcNow
            };
            _context.WorkflowStatisticsSummaries.Add(summary);
        }
        else
        {
            // Update existing summary incrementally
            summary.TotalExecutions++;

            if (status == ExecutionStatus.Succeeded)
            {
                summary.SuccessCount++;
                summary.TotalDurationMs += durationMs;
                summary.AverageDurationMs = summary.TotalDurationMs / summary.SuccessCount;
            }
            else if (status == ExecutionStatus.Failed)
            {
                summary.FailureCount++;
            }

            summary.SuccessRate = summary.TotalExecutions > 0
                ? Math.Round((double)summary.SuccessCount / summary.TotalExecutions * 100.0, 2)
                : 0.0;
            summary.LastExecutedAt = executedAt;
            summary.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Records a task execution and updates the summary incrementally.
    /// O(1) operation - no full table scan required.
    /// </summary>
    public async Task RecordTaskExecutionAsync(
        string taskRef,
        string status,
        long durationMs,
        DateTime executedAt)
    {
        var summary = await _context.TaskStatisticsSummaries
            .FirstOrDefaultAsync(s => s.TaskRef == taskRef);

        bool isSuccess = status == "Succeeded";
        bool isFailure = status == "Failed";

        if (summary == null)
        {
            // Create new summary
            summary = new TaskStatisticsSummary
            {
                TaskRef = taskRef,
                TotalExecutions = 1,
                SuccessCount = isSuccess ? 1 : 0,
                FailureCount = isFailure ? 1 : 0,
                TotalDurationMs = isSuccess ? durationMs : 0,
                AverageDurationMs = isSuccess ? durationMs : 0,
                SuccessRate = isSuccess ? 100.0 : 0.0,
                LastExecutedAt = executedAt,
                UpdatedAt = DateTime.UtcNow
            };
            _context.TaskStatisticsSummaries.Add(summary);
        }
        else
        {
            // Update existing summary incrementally
            summary.TotalExecutions++;

            if (isSuccess)
            {
                summary.SuccessCount++;
                summary.TotalDurationMs += durationMs;
                summary.AverageDurationMs = summary.TotalDurationMs / summary.SuccessCount;
            }
            else if (isFailure)
            {
                summary.FailureCount++;
            }

            summary.SuccessRate = summary.TotalExecutions > 0
                ? Math.Round((double)summary.SuccessCount / summary.TotalExecutions * 100.0, 2)
                : 0.0;
            summary.LastExecutedAt = executedAt;
            summary.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Gets all workflow statistics from the pre-computed summary table.
    /// O(n) where n = number of unique workflows (NOT number of executions).
    /// </summary>
    public async Task<Dictionary<string, WorkflowStatisticsSummary>> GetAllWorkflowStatisticsAsync()
    {
        var summaries = await _context.WorkflowStatisticsSummaries.ToListAsync();
        return summaries.ToDictionary(s => s.WorkflowName, s => s);
    }

    /// <summary>
    /// Gets all task statistics from the pre-computed summary table.
    /// O(n) where n = number of unique tasks (NOT number of executions).
    /// </summary>
    public async Task<Dictionary<string, TaskStatisticsSummary>> GetAllTaskStatisticsAsync()
    {
        var summaries = await _context.TaskStatisticsSummaries.ToListAsync();
        return summaries.ToDictionary(s => s.TaskRef, s => s);
    }

    #endregion
}
