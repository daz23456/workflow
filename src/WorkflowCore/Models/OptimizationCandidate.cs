namespace WorkflowCore.Models;

/// <summary>
/// Represents an optimization opportunity detected in a workflow.
/// </summary>
public record OptimizationCandidate(
    /// <summary>
    /// Type of optimization: "dead-task", "parallel-promotion", "filter-before-map", "transform-fusion", "redundant-select"
    /// </summary>
    string Type,

    /// <summary>
    /// The task ID affected by this optimization
    /// </summary>
    string TaskId,

    /// <summary>
    /// Human-readable description of the optimization opportunity
    /// </summary>
    string Description,

    /// <summary>
    /// Estimated performance impact (0.0-1.0). Higher values indicate greater potential improvement.
    /// </summary>
    double EstimatedImpact
);

/// <summary>
/// Result of workflow analysis containing optimization candidates and usage tracking.
/// </summary>
public record WorkflowAnalysisResult(
    /// <summary>
    /// Name of the workflow that was analyzed
    /// </summary>
    string WorkflowName,

    /// <summary>
    /// List of detected optimization opportunities
    /// </summary>
    List<OptimizationCandidate> Candidates,

    /// <summary>
    /// Maps each task ID to the set of task IDs that consume its output.
    /// "_workflow_output" is used to indicate the workflow's output mapping.
    /// </summary>
    Dictionary<string, HashSet<string>> OutputUsage
);
