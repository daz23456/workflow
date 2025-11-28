using System;
using System.Text.Json.Serialization;

namespace WorkflowCore.Models;

/// <summary>
/// Represents a single data point in a duration trend time series.
/// Contains aggregated performance metrics for a specific date.
/// </summary>
public class DurationDataPoint
{
    /// <summary>
    /// The date for this data point (grouped by day, UTC).
    /// </summary>
    [JsonPropertyName("date")]
    public DateTime Date { get; set; }

    /// <summary>
    /// Average duration in milliseconds for all executions on this date.
    /// </summary>
    [JsonPropertyName("averageDurationMs")]
    public double AverageDurationMs { get; set; }

    /// <summary>
    /// Minimum duration in milliseconds for all executions on this date.
    /// </summary>
    [JsonPropertyName("minDurationMs")]
    public double MinDurationMs { get; set; }

    /// <summary>
    /// Maximum duration in milliseconds for all executions on this date.
    /// </summary>
    [JsonPropertyName("maxDurationMs")]
    public double MaxDurationMs { get; set; }

    /// <summary>
    /// Median (50th percentile) duration in milliseconds for all executions on this date.
    /// </summary>
    [JsonPropertyName("p50DurationMs")]
    public double P50DurationMs { get; set; }

    /// <summary>
    /// 95th percentile duration in milliseconds for all executions on this date.
    /// Useful for identifying outliers and tail latency.
    /// </summary>
    [JsonPropertyName("p95DurationMs")]
    public double P95DurationMs { get; set; }

    /// <summary>
    /// Total number of executions on this date.
    /// </summary>
    [JsonPropertyName("executionCount")]
    public int ExecutionCount { get; set; }

    /// <summary>
    /// Number of successful executions on this date.
    /// </summary>
    [JsonPropertyName("successCount")]
    public int SuccessCount { get; set; }

    /// <summary>
    /// Number of failed executions on this date.
    /// </summary>
    [JsonPropertyName("failureCount")]
    public int FailureCount { get; set; }
}
