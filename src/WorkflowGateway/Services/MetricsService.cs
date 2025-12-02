using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowGateway.Models;

namespace WorkflowGateway.Services;

/// <summary>
/// Service for aggregating and calculating workflow execution metrics.
/// </summary>
public class MetricsService : IMetricsService
{
    private readonly IExecutionRepository _executionRepository;

    public MetricsService(IExecutionRepository executionRepository)
    {
        _executionRepository = executionRepository ?? throw new ArgumentNullException(nameof(executionRepository));
    }

    /// <inheritdoc />
    public async Task<SystemMetrics> GetSystemMetricsAsync(TimeRange range)
    {
        var cutoffTime = GetCutoffTime(range);
        var hoursInRange = GetHoursInRange(range);

        // Get all executions and filter by time range
        var allExecutions = await _executionRepository.ListExecutionsAsync(null, null, 0, int.MaxValue);
        var executions = allExecutions.Where(e => e.StartedAt >= cutoffTime).ToList();

        if (executions.Count == 0)
        {
            return new SystemMetrics
            {
                TotalExecutions = 0,
                Throughput = 0,
                P50Ms = 0,
                P95Ms = 0,
                P99Ms = 0,
                ErrorRate = 0,
                TimeRange = range.ToString()
            };
        }

        // Calculate throughput (executions per hour)
        var throughput = (double)executions.Count / hoursInRange;

        // Get durations for completed executions (for percentiles)
        var durations = executions
            .Where(e => e.Duration.HasValue)
            .Select(e => e.Duration!.Value.TotalMilliseconds)
            .OrderBy(d => d)
            .ToList();

        var p50 = CalculatePercentile(durations, 50);
        var p95 = CalculatePercentile(durations, 95);
        var p99 = CalculatePercentile(durations, 99);

        // Calculate error rate
        var failedCount = executions.Count(e => e.Status == ExecutionStatus.Failed);
        var errorRate = (double)failedCount / executions.Count * 100;

        return new SystemMetrics
        {
            TotalExecutions = executions.Count,
            Throughput = Math.Round(throughput, 2),
            P50Ms = (long)p50,
            P95Ms = (long)p95,
            P99Ms = (long)p99,
            ErrorRate = Math.Round(errorRate, 1),
            TimeRange = range.ToString()
        };
    }

    /// <inheritdoc />
    public async Task<List<WorkflowMetrics>> GetWorkflowMetricsAsync()
    {
        var stats = await _executionRepository.GetAllWorkflowStatisticsAsync();
        var result = new List<WorkflowMetrics>();

        foreach (var (name, stat) in stats)
        {
            // Get P95 from trends
            var trends = await _executionRepository.GetWorkflowDurationTrendsAsync(name, 30);
            var p95 = CalculateWeightedP95(trends);

            result.Add(new WorkflowMetrics
            {
                Name = name,
                AvgDurationMs = stat.AverageDurationMs,
                P95Ms = p95,
                ErrorRate = Math.Round(100 - stat.SuccessRate, 1),
                ExecutionCount = stat.TotalExecutions
            });
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<List<WorkflowHistoryPoint>> GetWorkflowHistoryAsync(string workflowName, TimeRange range)
    {
        var daysBack = GetDaysBack(range);
        var trends = await _executionRepository.GetWorkflowDurationTrendsAsync(workflowName, daysBack);

        return trends.Select(t => new WorkflowHistoryPoint
        {
            Timestamp = t.Date,
            AvgDurationMs = t.AverageDurationMs,
            P95Ms = t.P95DurationMs,
            ErrorRate = t.ExecutionCount > 0 ? Math.Round((double)t.FailureCount / t.ExecutionCount * 100, 1) : 0,
            Count = t.ExecutionCount
        }).ToList();
    }

    /// <inheritdoc />
    public async Task<List<SlowestWorkflow>> GetSlowestWorkflowsAsync(int limit = 10)
    {
        var stats = await _executionRepository.GetAllWorkflowStatisticsAsync();
        var result = new List<SlowestWorkflow>();

        foreach (var (name, stat) in stats)
        {
            var trends = await _executionRepository.GetWorkflowDurationTrendsAsync(name, 30);
            var p95 = CalculateWeightedP95(trends);
            var degradation = CalculateDegradation(trends);

            result.Add(new SlowestWorkflow
            {
                Name = name,
                AvgDurationMs = stat.AverageDurationMs,
                P95Ms = p95,
                DegradationPercent = degradation
            });
        }

        // Sort by average duration descending, take top N
        return result
            .OrderByDescending(w => w.AvgDurationMs)
            .Take(limit)
            .ToList();
    }

    #region Private Helpers

    private static DateTime GetCutoffTime(TimeRange range)
    {
        return range switch
        {
            TimeRange.Hour1 => DateTime.UtcNow.AddHours(-1),
            TimeRange.Hour24 => DateTime.UtcNow.AddHours(-24),
            TimeRange.Day7 => DateTime.UtcNow.AddDays(-7),
            TimeRange.Day30 => DateTime.UtcNow.AddDays(-30),
            _ => DateTime.UtcNow.AddHours(-24)
        };
    }

    private static int GetHoursInRange(TimeRange range)
    {
        return range switch
        {
            TimeRange.Hour1 => 1,
            TimeRange.Hour24 => 24,
            TimeRange.Day7 => 168,
            TimeRange.Day30 => 720,
            _ => 24
        };
    }

    private static int GetDaysBack(TimeRange range)
    {
        return range switch
        {
            TimeRange.Hour1 => 1,
            TimeRange.Hour24 => 1,
            TimeRange.Day7 => 7,
            TimeRange.Day30 => 30,
            _ => 1
        };
    }

    private static double CalculatePercentile(List<double> sortedValues, int percentile)
    {
        if (sortedValues.Count == 0)
            return 0;

        var index = (int)Math.Ceiling(percentile / 100.0 * sortedValues.Count) - 1;
        index = Math.Max(0, Math.Min(index, sortedValues.Count - 1));
        return sortedValues[index];
    }

    private static long CalculateWeightedP95(List<DurationDataPoint> trends)
    {
        if (trends.Count == 0)
            return 0;

        var totalExecutions = trends.Sum(t => t.ExecutionCount);
        if (totalExecutions == 0)
            return 0;

        var weightedSum = trends.Sum(t => t.P95DurationMs * t.ExecutionCount);
        return (long)(weightedSum / totalExecutions);
    }

    private static double CalculateDegradation(List<DurationDataPoint> trends)
    {
        if (trends.Count < 2)
            return 0;

        // Compare first half vs second half of the time period
        var midpoint = trends.Count / 2;
        var firstHalf = trends.Take(midpoint).ToList();
        var secondHalf = trends.Skip(midpoint).ToList();

        var firstAvg = CalculateWeightedAverage(firstHalf);
        var secondAvg = CalculateWeightedAverage(secondHalf);

        if (firstAvg == 0)
            return 0;

        return Math.Round((secondAvg - firstAvg) / firstAvg * 100, 0);
    }

    private static double CalculateWeightedAverage(List<DurationDataPoint> trends)
    {
        if (trends.Count == 0)
            return 0;

        var totalExecutions = trends.Sum(t => t.ExecutionCount);
        if (totalExecutions == 0)
            return 0;

        var weightedSum = trends.Sum(t => t.AverageDurationMs * t.ExecutionCount);
        return weightedSum / totalExecutions;
    }

    #endregion
}
