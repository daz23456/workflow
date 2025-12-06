using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Interface for anomaly detection using statistical analysis.
/// </summary>
public interface IAnomalyDetector
{
    /// <summary>
    /// Evaluates whether a workflow execution duration is anomalous.
    /// </summary>
    /// <param name="workflowName">Name of the workflow</param>
    /// <param name="taskId">Optional task ID for task-level detection</param>
    /// <param name="actualDurationMs">Actual duration in milliseconds</param>
    /// <param name="executionId">Execution ID for tracking</param>
    /// <returns>AnomalyEvent if anomaly detected, null otherwise</returns>
    Task<AnomalyEvent?> EvaluateAsync(
        string workflowName,
        string? taskId,
        double actualDurationMs,
        string executionId);

    /// <summary>
    /// Gets the Z-score threshold for a given severity level.
    /// </summary>
    /// <param name="severity">Severity level</param>
    /// <returns>Z-score threshold</returns>
    double GetThreshold(AnomalySeverity severity);

    /// <summary>
    /// Determines severity level based on Z-score.
    /// </summary>
    /// <param name="zScore">Absolute Z-score value</param>
    /// <returns>Severity level, or null if not anomalous</returns>
    AnomalySeverity? GetSeverity(double zScore);
}
