namespace WorkflowCore.Models;

/// <summary>
/// Represents baseline statistics for a workflow or task, used for anomaly detection.
/// Baselines are calculated from historical execution data over a rolling time window.
/// </summary>
public class AnomalyBaseline
{
    /// <summary>
    /// Name of the workflow this baseline applies to.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// Task ID for task-level baselines. Null indicates workflow-level baseline.
    /// </summary>
    public string? TaskId { get; set; }

    /// <summary>
    /// Mean (average) duration in milliseconds.
    /// </summary>
    public double MeanDurationMs { get; set; }

    /// <summary>
    /// Standard deviation of duration in milliseconds.
    /// Used for Z-score calculation in anomaly detection.
    /// </summary>
    public double StdDevDurationMs { get; set; }

    /// <summary>
    /// 50th percentile (median) duration in milliseconds.
    /// </summary>
    public double P50DurationMs { get; set; }

    /// <summary>
    /// 95th percentile duration in milliseconds.
    /// </summary>
    public double P95DurationMs { get; set; }

    /// <summary>
    /// 99th percentile duration in milliseconds.
    /// </summary>
    public double P99DurationMs { get; set; }

    /// <summary>
    /// Number of samples used to calculate this baseline.
    /// </summary>
    public int SampleCount { get; set; }

    /// <summary>
    /// When this baseline was calculated.
    /// </summary>
    public DateTime CalculatedAt { get; set; }

    /// <summary>
    /// Start of the time window used for calculation.
    /// </summary>
    public DateTime WindowStart { get; set; }

    /// <summary>
    /// End of the time window used for calculation.
    /// </summary>
    public DateTime WindowEnd { get; set; }
}
