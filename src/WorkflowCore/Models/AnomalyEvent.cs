namespace WorkflowCore.Models;

/// <summary>
/// Represents a detected performance anomaly for a workflow or task execution.
/// </summary>
public class AnomalyEvent
{
    /// <summary>
    /// Unique identifier for this anomaly event.
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Name of the workflow where the anomaly was detected.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// Task ID if this is a task-level anomaly, null for workflow-level.
    /// </summary>
    public string? TaskId { get; set; }

    /// <summary>
    /// Execution ID that triggered the anomaly detection.
    /// </summary>
    public string ExecutionId { get; set; } = string.Empty;

    /// <summary>
    /// Severity level of the anomaly.
    /// </summary>
    public AnomalySeverity Severity { get; set; }

    /// <summary>
    /// Type of metric that triggered the anomaly (e.g., "duration", "error_rate").
    /// </summary>
    public string MetricType { get; set; } = "duration";

    /// <summary>
    /// Actual observed value that triggered the anomaly.
    /// </summary>
    public double ActualValue { get; set; }

    /// <summary>
    /// Expected value based on baseline (mean).
    /// </summary>
    public double ExpectedValue { get; set; }

    /// <summary>
    /// Z-score indicating how many standard deviations from the mean.
    /// Positive = slower than expected, Negative = faster than expected.
    /// </summary>
    public double ZScore { get; set; }

    /// <summary>
    /// Percentage deviation from expected value.
    /// </summary>
    public double DeviationPercent { get; set; }

    /// <summary>
    /// When the anomaly was detected.
    /// </summary>
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Human-readable description of the anomaly.
    /// </summary>
    public string Description { get; set; } = string.Empty;
}
