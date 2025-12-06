using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Detects performance anomalies using Z-score (standard deviation) analysis.
/// </summary>
public class ZScoreAnomalyDetector : IAnomalyDetector
{
    private readonly IAnomalyBaselineService _baselineService;

    // Z-score thresholds for severity levels
    private const double LowThreshold = 2.0;
    private const double MediumThreshold = 3.0;
    private const double HighThreshold = 4.0;
    private const double CriticalThreshold = 5.0;

    public ZScoreAnomalyDetector(IAnomalyBaselineService baselineService)
    {
        _baselineService = baselineService ?? throw new ArgumentNullException(nameof(baselineService));
    }

    /// <inheritdoc />
    public async Task<AnomalyEvent?> EvaluateAsync(
        string workflowName,
        string? taskId,
        double actualDurationMs,
        string executionId)
    {
        // Get baseline for this workflow/task
        var baseline = await _baselineService.GetBaselineAsync(workflowName, taskId);

        // Can't detect anomaly without baseline
        if (baseline == null)
        {
            return null;
        }

        // Can't calculate Z-score with zero standard deviation
        if (baseline.StdDevDurationMs == 0)
        {
            return null;
        }

        // Calculate Z-score: how many standard deviations from the mean
        var zScore = (actualDurationMs - baseline.MeanDurationMs) / baseline.StdDevDurationMs;
        var absZScore = Math.Abs(zScore);

        // Check if this is an anomaly
        var severity = GetSeverity(absZScore);
        if (severity == null)
        {
            return null; // Within normal range
        }

        // Calculate deviation percentage
        var deviationPercent = ((actualDurationMs - baseline.MeanDurationMs) / baseline.MeanDurationMs) * 100;

        // Generate description
        var direction = zScore > 0 ? "slower" : "faster";
        var description = $"Duration {Math.Abs(deviationPercent):F1}% {direction} than expected " +
                         $"(Z-score: {Math.Abs(zScore):F2}, expected: {baseline.MeanDurationMs:F0}ms, actual: {actualDurationMs:F0}ms)";

        return new AnomalyEvent
        {
            WorkflowName = workflowName,
            TaskId = taskId,
            ExecutionId = executionId,
            Severity = severity.Value,
            MetricType = "duration",
            ActualValue = actualDurationMs,
            ExpectedValue = baseline.MeanDurationMs,
            ZScore = zScore,
            DeviationPercent = deviationPercent,
            DetectedAt = DateTime.UtcNow,
            Description = description
        };
    }

    /// <inheritdoc />
    public double GetThreshold(AnomalySeverity severity)
    {
        return severity switch
        {
            AnomalySeverity.Low => LowThreshold,
            AnomalySeverity.Medium => MediumThreshold,
            AnomalySeverity.High => HighThreshold,
            AnomalySeverity.Critical => CriticalThreshold,
            _ => throw new ArgumentOutOfRangeException(nameof(severity))
        };
    }

    /// <inheritdoc />
    public AnomalySeverity? GetSeverity(double zScore)
    {
        var absZScore = Math.Abs(zScore);

        if (absZScore < LowThreshold)
        {
            return null; // Not anomalous
        }

        if (absZScore >= CriticalThreshold)
        {
            return AnomalySeverity.Critical;
        }

        if (absZScore >= HighThreshold)
        {
            return AnomalySeverity.High;
        }

        if (absZScore >= MediumThreshold)
        {
            return AnomalySeverity.Medium;
        }

        return AnomalySeverity.Low;
    }
}
