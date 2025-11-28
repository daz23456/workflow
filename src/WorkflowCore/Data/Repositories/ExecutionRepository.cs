using Microsoft.EntityFrameworkCore;
using WorkflowCore.Models;

namespace WorkflowCore.Data.Repositories;

/// <summary>
/// Repository for managing workflow execution records.
/// </summary>
public class ExecutionRepository : IExecutionRepository
{
    private readonly WorkflowDbContext _context;

    public ExecutionRepository(WorkflowDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<ExecutionRecord> SaveExecutionAsync(ExecutionRecord record)
    {
        // Don't Include TaskExecutionRecords - we'll handle them separately to avoid tracking conflicts
        var existing = await _context.ExecutionRecords
            .FirstOrDefaultAsync(e => e.Id == record.Id);

        if (existing == null)
        {
            _context.ExecutionRecords.Add(record);
        }
        else
        {
            // Update the existing tracked entity with new values
            _context.Entry(existing).CurrentValues.SetValues(record);

            // Handle TaskExecutionRecords separately - add directly to context, not through navigation property
            // This avoids Clear() generating DELETE statements for non-existent records
            if (record.TaskExecutionRecords != null && record.TaskExecutionRecords.Any())
            {
                foreach (var taskRecord in record.TaskExecutionRecords)
                {
                    _context.TaskExecutionRecords.Add(taskRecord);
                }
            }
        }

        await _context.SaveChangesAsync();
        return existing ?? record;
    }

    /// <inheritdoc />
    public async Task<ExecutionRecord?> GetExecutionAsync(Guid id)
    {
        return await _context.ExecutionRecords
            .Include(e => e.TaskExecutionRecords)
            .FirstOrDefaultAsync(e => e.Id == id);
    }

    /// <inheritdoc />
    public async Task<List<ExecutionRecord>> ListExecutionsAsync(
        string? workflowName,
        ExecutionStatus? status,
        int skip,
        int take)
    {
        var query = _context.ExecutionRecords.AsQueryable();

        if (!string.IsNullOrEmpty(workflowName))
        {
            query = query.Where(e => e.WorkflowName == workflowName);
        }

        if (status.HasValue)
        {
            query = query.Where(e => e.Status == status.Value);
        }

        return await query
            .OrderByDescending(e => e.StartedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    /// <inheritdoc />
    public async Task<Dictionary<string, long>> GetAverageTaskDurationsAsync(string workflowName, int daysBack = 30)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-daysBack);

        var taskDurations = await _context.ExecutionRecords
            .Where(e => e.WorkflowName == workflowName
                        && e.Status == ExecutionStatus.Succeeded
                        && e.StartedAt >= cutoffDate)
            .SelectMany(e => e.TaskExecutionRecords!)
            .Where(t => t.Status == "Succeeded" && t.Duration.HasValue)
            .GroupBy(t => t.TaskRef)
            .Select(g => new
            {
                TaskRef = g.Key!,
                AverageDurationMs = (long)g.Average(t => t.Duration!.Value.TotalMilliseconds)
            })
            .ToListAsync();

        return taskDurations.ToDictionary(x => x.TaskRef, x => x.AverageDurationMs);
    }

    /// <inheritdoc />
    public async Task<List<(ExecutionRecord Execution, TaskExecutionRecord Task)>> GetTaskExecutionsAsync(
        string taskName,
        int skip,
        int take)
    {
        var results = await _context.TaskExecutionRecords
            .Where(t => t.TaskRef == taskName)
            .Include(t => t.ExecutionRecord)
            .OrderByDescending(t => t.StartedAt)
            .Skip(skip)
            .Take(take)
            .Select(t => new { Execution = t.ExecutionRecord!, Task = t })
            .ToListAsync();

        return results.Select(r => (r.Execution, r.Task)).ToList();
    }

    /// <inheritdoc />
    public async Task<TaskStatistics?> GetTaskStatisticsAsync(string taskName)
    {
        // Get all task executions for this task
        var taskExecutions = await _context.TaskExecutionRecords
            .Where(t => t.TaskRef == taskName)
            .ToListAsync();

        // If no executions, return null
        if (!taskExecutions.Any())
        {
            return null;
        }

        // Calculate statistics
        var totalExecutions = taskExecutions.Count;
        var successfulExecutions = taskExecutions.Where(t => t.Status == "Succeeded").ToList();
        var successCount = successfulExecutions.Count;
        var successRate = totalExecutions > 0 ? (double)successCount / totalExecutions * 100.0 : 0.0;

        // Calculate average duration (only from successful executions with duration data)
        var executionsWithDuration = successfulExecutions.Where(t => t.Duration.HasValue).ToList();
        var avgDurationMs = executionsWithDuration.Any()
            ? (long)executionsWithDuration.Average(t => t.Duration!.Value.TotalMilliseconds)
            : 0L;

        // Get last execution timestamp
        var lastExecuted = taskExecutions
            .OrderByDescending(t => t.StartedAt)
            .Select(t => (DateTime?)t.StartedAt)
            .FirstOrDefault();

        return new TaskStatistics
        {
            TotalExecutions = totalExecutions,
            AverageDurationMs = avgDurationMs,
            SuccessRate = successRate,
            LastExecuted = lastExecuted
        };
    }

    /// <inheritdoc />
    public async Task<List<DurationDataPoint>> GetWorkflowDurationTrendsAsync(string workflowName, int daysBack = 30)
    {
        var cutoffDate = DateTime.UtcNow.Date.AddDays(-daysBack);

        // Group by date and aggregate
        var grouped = await _context.ExecutionRecords
            .Where(e => e.WorkflowName == workflowName
                     && e.StartedAt >= cutoffDate
                     && e.Duration.HasValue
                     && (e.Status == ExecutionStatus.Succeeded || e.Status == ExecutionStatus.Failed))
            .GroupBy(e => e.StartedAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                Durations = g.Select(e => e.Duration!.Value.TotalMilliseconds).ToList(),
                ExecutionCount = g.Count(),
                SuccessCount = g.Count(e => e.Status == ExecutionStatus.Succeeded),
                FailureCount = g.Count(e => e.Status == ExecutionStatus.Failed)
            })
            .ToListAsync();

        // Calculate percentiles in-memory (30 data points = trivial)
        return grouped
            .Select(g =>
            {
                var sorted = g.Durations.OrderBy(d => d).ToList();
                return new DurationDataPoint
                {
                    Date = g.Date,
                    AverageDurationMs = g.Durations.Average(),
                    MinDurationMs = g.Durations.Min(),
                    MaxDurationMs = g.Durations.Max(),
                    P50DurationMs = CalculatePercentile(sorted, 0.5),
                    P95DurationMs = CalculatePercentile(sorted, 0.95),
                    ExecutionCount = g.ExecutionCount,
                    SuccessCount = g.SuccessCount,
                    FailureCount = g.FailureCount
                };
            })
            .OrderBy(d => d.Date)
            .ToList();
    }

    /// <inheritdoc />
    public async Task<List<DurationDataPoint>> GetTaskDurationTrendsAsync(string taskName, int daysBack = 30)
    {
        var cutoffDate = DateTime.UtcNow.Date.AddDays(-daysBack);

        // Group by date and aggregate task executions across all workflows
        var grouped = await _context.TaskExecutionRecords
            .Where(t => t.TaskRef == taskName
                     && t.StartedAt >= cutoffDate
                     && t.Duration.HasValue
                     && (t.Status == "Succeeded" || t.Status == "Failed"))
            .GroupBy(t => t.StartedAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                Durations = g.Select(t => t.Duration!.Value.TotalMilliseconds).ToList(),
                ExecutionCount = g.Count(),
                SuccessCount = g.Count(t => t.Status == "Succeeded"),
                FailureCount = g.Count(t => t.Status == "Failed")
            })
            .ToListAsync();

        // Calculate percentiles in-memory
        return grouped
            .Select(g =>
            {
                var sorted = g.Durations.OrderBy(d => d).ToList();
                return new DurationDataPoint
                {
                    Date = g.Date,
                    AverageDurationMs = g.Durations.Average(),
                    MinDurationMs = g.Durations.Min(),
                    MaxDurationMs = g.Durations.Max(),
                    P50DurationMs = CalculatePercentile(sorted, 0.5),
                    P95DurationMs = CalculatePercentile(sorted, 0.95),
                    ExecutionCount = g.ExecutionCount,
                    SuccessCount = g.SuccessCount,
                    FailureCount = g.FailureCount
                };
            })
            .OrderBy(d => d.Date)
            .ToList();
    }

    /// <summary>
    /// Calculates a percentile from a sorted list of values.
    /// Uses the nearest-rank method.
    /// </summary>
    /// <param name="sortedValues">List of values in ascending order.</param>
    /// <param name="percentile">Percentile to calculate (0.0 to 1.0).</param>
    /// <returns>The value at the specified percentile.</returns>
    private double CalculatePercentile(List<double> sortedValues, double percentile)
    {
        if (sortedValues.Count == 0) return 0;
        int index = (int)Math.Ceiling(sortedValues.Count * percentile) - 1;
        index = Math.Max(0, Math.Min(index, sortedValues.Count - 1));
        return sortedValues[index];
    }
}
