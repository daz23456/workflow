namespace WorkflowCore.Models;

/// <summary>
/// Severity levels for detected anomalies based on Z-score deviation.
/// </summary>
public enum AnomalySeverity
{
    /// <summary>
    /// Low severity: 2-3 standard deviations from mean.
    /// May indicate minor performance variation.
    /// </summary>
    Low,

    /// <summary>
    /// Medium severity: 3-4 standard deviations from mean.
    /// Indicates notable performance deviation worth monitoring.
    /// </summary>
    Medium,

    /// <summary>
    /// High severity: 4-5 standard deviations from mean.
    /// Indicates significant performance issue requiring attention.
    /// </summary>
    High,

    /// <summary>
    /// Critical severity: >5 standard deviations from mean.
    /// Indicates severe performance anomaly requiring immediate action.
    /// </summary>
    Critical
}
