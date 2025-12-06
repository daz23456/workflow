using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using WorkflowCore.Data;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Service for calculating and managing baseline statistics for anomaly detection.
/// Uses historical execution data to compute mean, standard deviation, and percentiles.
/// </summary>
public class AnomalyBaselineService : IAnomalyBaselineService
{
    private readonly WorkflowDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _cacheExpiration = TimeSpan.FromHours(2);
    private const int DefaultMinSamples = 30;

    public AnomalyBaselineService(WorkflowDbContext context, IMemoryCache cache)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
    }

    /// <inheritdoc />
    public Task<AnomalyBaseline?> GetBaselineAsync(string workflowName, string? taskId = null)
    {
        var cacheKey = GetCacheKey(workflowName, taskId);
        _cache.TryGetValue(cacheKey, out AnomalyBaseline? baseline);
        return Task.FromResult(baseline);
    }

    /// <inheritdoc />
    public async Task<AnomalyBaseline> CalculateBaselineAsync(
        string workflowName,
        string? taskId = null,
        int windowDays = 7)
    {
        var windowStart = DateTime.UtcNow.AddDays(-windowDays);
        var windowEnd = DateTime.UtcNow;

        List<double> durations;

        if (taskId == null)
        {
            // Workflow-level baseline
            durations = await _context.ExecutionRecords
                .Where(e => e.WorkflowName == workflowName
                            && e.Status == ExecutionStatus.Succeeded
                            && e.StartedAt >= windowStart
                            && e.Duration.HasValue)
                .Select(e => e.Duration!.Value.TotalMilliseconds)
                .ToListAsync();
        }
        else
        {
            // Task-level baseline
            durations = await _context.TaskExecutionRecords
                .Where(t => t.TaskId == taskId
                            && t.Status == "Succeeded"
                            && t.StartedAt >= windowStart
                            && t.Duration.HasValue)
                .Select(t => t.Duration!.Value.TotalMilliseconds)
                .ToListAsync();
        }

        var baseline = CalculateStatistics(workflowName, taskId, durations, windowStart, windowEnd);

        // Cache the result
        var cacheKey = GetCacheKey(workflowName, taskId);
        _cache.Set(cacheKey, baseline, _cacheExpiration);

        return baseline;
    }

    /// <inheritdoc />
    public async Task RefreshAllBaselinesAsync(CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        var workflowNames = await GetAllWorkflowNamesAsync();

        foreach (var workflowName in workflowNames)
        {
            ct.ThrowIfCancellationRequested();

            var hasSufficientData = await HasSufficientDataAsync(workflowName);
            if (hasSufficientData)
            {
                await CalculateBaselineAsync(workflowName);
            }
        }
    }

    /// <inheritdoc />
    public async Task<bool> HasSufficientDataAsync(
        string workflowName,
        string? taskId = null,
        int minSamples = DefaultMinSamples)
    {
        var windowStart = DateTime.UtcNow.AddDays(-7);

        int count;
        if (taskId == null)
        {
            count = await _context.ExecutionRecords
                .CountAsync(e => e.WorkflowName == workflowName
                                 && e.Status == ExecutionStatus.Succeeded
                                 && e.StartedAt >= windowStart
                                 && e.Duration.HasValue);
        }
        else
        {
            count = await _context.TaskExecutionRecords
                .CountAsync(t => t.TaskId == taskId
                                 && t.Status == "Succeeded"
                                 && t.StartedAt >= windowStart
                                 && t.Duration.HasValue);
        }

        return count >= minSamples;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<string>> GetAllWorkflowNamesAsync()
    {
        return await _context.ExecutionRecords
            .Where(e => e.WorkflowName != null)
            .Select(e => e.WorkflowName!)
            .Distinct()
            .ToListAsync();
    }

    private static AnomalyBaseline CalculateStatistics(
        string workflowName,
        string? taskId,
        List<double> durations,
        DateTime windowStart,
        DateTime windowEnd)
    {
        var now = DateTime.UtcNow;

        if (durations.Count == 0)
        {
            return new AnomalyBaseline
            {
                WorkflowName = workflowName,
                TaskId = taskId,
                MeanDurationMs = 0,
                StdDevDurationMs = 0,
                P50DurationMs = 0,
                P95DurationMs = 0,
                P99DurationMs = 0,
                SampleCount = 0,
                CalculatedAt = now,
                WindowStart = windowStart,
                WindowEnd = windowEnd
            };
        }

        var mean = durations.Average();
        var stdDev = CalculateStandardDeviation(durations, mean);
        var sorted = durations.OrderBy(d => d).ToList();

        return new AnomalyBaseline
        {
            WorkflowName = workflowName,
            TaskId = taskId,
            MeanDurationMs = mean,
            StdDevDurationMs = stdDev,
            P50DurationMs = CalculatePercentile(sorted, 50),
            P95DurationMs = CalculatePercentile(sorted, 95),
            P99DurationMs = CalculatePercentile(sorted, 99),
            SampleCount = durations.Count,
            CalculatedAt = now,
            WindowStart = windowStart,
            WindowEnd = windowEnd
        };
    }

    private static double CalculateStandardDeviation(List<double> values, double mean)
    {
        if (values.Count <= 1)
        {
            return 0;
        }

        var sumSquaredDifferences = values.Sum(v => Math.Pow(v - mean, 2));
        var variance = sumSquaredDifferences / values.Count;
        return Math.Sqrt(variance);
    }

    private static double CalculatePercentile(List<double> sortedValues, int percentile)
    {
        if (sortedValues.Count == 0)
        {
            return 0;
        }

        var index = (percentile / 100.0) * (sortedValues.Count - 1);
        var lowerIndex = (int)Math.Floor(index);
        var upperIndex = (int)Math.Ceiling(index);

        if (lowerIndex == upperIndex)
        {
            return sortedValues[lowerIndex];
        }

        // Linear interpolation
        var fraction = index - lowerIndex;
        return sortedValues[lowerIndex] + fraction * (sortedValues[upperIndex] - sortedValues[lowerIndex]);
    }

    private static string GetCacheKey(string workflowName, string? taskId)
    {
        return $"baseline:{workflowName}:{taskId ?? string.Empty}";
    }
}
