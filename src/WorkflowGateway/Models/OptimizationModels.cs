namespace WorkflowGateway.Models;

/// <summary>
/// Response containing list of optimization suggestions for a workflow.
/// </summary>
public class OptimizationListResponse
{
    /// <summary>
    /// Name of the analyzed workflow.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// List of optimization suggestions.
    /// </summary>
    public List<OptimizationSuggestion> Suggestions { get; set; } = new();

    /// <summary>
    /// Timestamp when analysis was performed.
    /// </summary>
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// A single optimization suggestion for a workflow.
/// </summary>
public class OptimizationSuggestion
{
    /// <summary>
    /// Unique identifier for this optimization.
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Type of optimization (e.g., "filter-reorder", "transform-fusion").
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable description of the optimization.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Task IDs affected by this optimization.
    /// </summary>
    public List<string> AffectedTaskIds { get; set; } = new();

    /// <summary>
    /// Estimated performance impact (e.g., "High", "Medium", "Low").
    /// </summary>
    public string EstimatedImpact { get; set; } = string.Empty;

    /// <summary>
    /// Safety level: Safe, Conditional, or Unsafe.
    /// </summary>
    public string SafetyLevel { get; set; } = string.Empty;
}

/// <summary>
/// Request to test an optimization via historical replay.
/// </summary>
public class OptimizationTestRequest
{
    /// <summary>
    /// Number of historical executions to replay (default: 10).
    /// Ignored when DryRun is true.
    /// </summary>
    public int ReplayCount { get; set; } = 10;

    /// <summary>
    /// Additional fields to ignore during output comparison.
    /// </summary>
    public List<string>? IgnoreFields { get; set; }

    /// <summary>
    /// When true, performs static structure comparison only - no HTTP execution.
    /// Safe for workflows with POST/PUT/DELETE operations.
    /// Default: false
    /// </summary>
    public bool DryRun { get; set; } = false;
}

/// <summary>
/// Response from testing an optimization via replay.
/// </summary>
public class OptimizationTestResponse
{
    /// <summary>
    /// ID of the tested optimization.
    /// </summary>
    public string OptimizationId { get; set; } = string.Empty;

    /// <summary>
    /// Confidence score from 0.0 to 1.0.
    /// </summary>
    public double ConfidenceScore { get; set; }

    /// <summary>
    /// Total number of replays performed.
    /// </summary>
    public int TotalReplays { get; set; }

    /// <summary>
    /// Number of replays that produced matching outputs.
    /// </summary>
    public int MatchingOutputs { get; set; }

    /// <summary>
    /// Average time difference in milliseconds (negative = faster).
    /// </summary>
    public double AverageTimeDeltaMs { get; set; }

    /// <summary>
    /// List of mismatches found during replay.
    /// </summary>
    public List<ReplayMismatchDetail> Mismatches { get; set; } = new();

    /// <summary>
    /// Whether all replays matched (100% confidence).
    /// </summary>
    public bool IsPerfectMatch => TotalReplays > 0 && MatchingOutputs == TotalReplays;
}

/// <summary>
/// Detail about a mismatch found during replay.
/// </summary>
public class ReplayMismatchDetail
{
    /// <summary>
    /// Execution ID where mismatch was found.
    /// </summary>
    public string ExecutionId { get; set; } = string.Empty;

    /// <summary>
    /// Task reference where mismatch occurred.
    /// </summary>
    public string TaskRef { get; set; } = string.Empty;

    /// <summary>
    /// Reason for the mismatch.
    /// </summary>
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Response from applying an optimization.
/// </summary>
public class OptimizationApplyResponse
{
    /// <summary>
    /// ID of the applied optimization.
    /// </summary>
    public string OptimizationId { get; set; } = string.Empty;

    /// <summary>
    /// Whether the optimization was applied successfully.
    /// </summary>
    public bool Applied { get; set; }

    /// <summary>
    /// The optimized workflow specification.
    /// </summary>
    public object? OptimizedWorkflow { get; set; }

    /// <summary>
    /// Warning message if optimization was forced despite being unsafe.
    /// </summary>
    public string? Warning { get; set; }

    /// <summary>
    /// Error message if optimization failed.
    /// </summary>
    public string? Error { get; set; }
}
