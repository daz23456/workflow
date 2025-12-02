using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Time range for metrics queries.
/// </summary>
public enum TimeRange
{
    Hour1,
    Hour24,
    Day7,
    Day30
}

/// <summary>
/// System-wide metrics aggregated across all workflows.
/// </summary>
public class SystemMetrics
{
    /// <summary>
    /// Total number of workflow executions in the time range.
    /// </summary>
    [JsonPropertyName("totalExecutions")]
    public int TotalExecutions { get; set; }

    /// <summary>
    /// Average executions per hour in the time range.
    /// </summary>
    [JsonPropertyName("throughput")]
    public double Throughput { get; set; }

    /// <summary>
    /// Median (50th percentile) execution time in milliseconds.
    /// </summary>
    [JsonPropertyName("p50Ms")]
    public long P50Ms { get; set; }

    /// <summary>
    /// 95th percentile execution time in milliseconds.
    /// </summary>
    [JsonPropertyName("p95Ms")]
    public long P95Ms { get; set; }

    /// <summary>
    /// 99th percentile execution time in milliseconds.
    /// </summary>
    [JsonPropertyName("p99Ms")]
    public long P99Ms { get; set; }

    /// <summary>
    /// Percentage of failed executions (0-100).
    /// </summary>
    [JsonPropertyName("errorRate")]
    public double ErrorRate { get; set; }

    /// <summary>
    /// Time range used for these metrics.
    /// </summary>
    [JsonPropertyName("timeRange")]
    public string TimeRange { get; set; } = string.Empty;
}

/// <summary>
/// Per-workflow metrics summary.
/// </summary>
public class WorkflowMetrics
{
    /// <summary>
    /// Workflow name.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Average execution duration in milliseconds.
    /// </summary>
    [JsonPropertyName("avgDurationMs")]
    public long AvgDurationMs { get; set; }

    /// <summary>
    /// 95th percentile execution duration in milliseconds.
    /// </summary>
    [JsonPropertyName("p95Ms")]
    public long P95Ms { get; set; }

    /// <summary>
    /// Percentage of failed executions (0-100).
    /// </summary>
    [JsonPropertyName("errorRate")]
    public double ErrorRate { get; set; }

    /// <summary>
    /// Total number of executions.
    /// </summary>
    [JsonPropertyName("executionCount")]
    public int ExecutionCount { get; set; }
}

/// <summary>
/// Historical data point for workflow trends.
/// </summary>
public class WorkflowHistoryPoint
{
    /// <summary>
    /// Timestamp for this data point.
    /// </summary>
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Average execution duration in milliseconds.
    /// </summary>
    [JsonPropertyName("avgDurationMs")]
    public double AvgDurationMs { get; set; }

    /// <summary>
    /// 95th percentile execution duration in milliseconds.
    /// </summary>
    [JsonPropertyName("p95Ms")]
    public double P95Ms { get; set; }

    /// <summary>
    /// Percentage of failed executions (0-100).
    /// </summary>
    [JsonPropertyName("errorRate")]
    public double ErrorRate { get; set; }

    /// <summary>
    /// Number of executions in this time period.
    /// </summary>
    [JsonPropertyName("count")]
    public int Count { get; set; }
}

/// <summary>
/// Slowest workflow with degradation tracking.
/// </summary>
public class SlowestWorkflow
{
    /// <summary>
    /// Workflow name.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Average execution duration in milliseconds.
    /// </summary>
    [JsonPropertyName("avgDurationMs")]
    public long AvgDurationMs { get; set; }

    /// <summary>
    /// 95th percentile execution duration in milliseconds.
    /// </summary>
    [JsonPropertyName("p95Ms")]
    public long P95Ms { get; set; }

    /// <summary>
    /// Percentage change in average duration compared to baseline.
    /// Positive = slower (degradation), negative = faster (improvement).
    /// </summary>
    [JsonPropertyName("degradationPercent")]
    public double DegradationPercent { get; set; }
}
