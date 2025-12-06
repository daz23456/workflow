using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Result of a cycle detection check.
/// </summary>
public class CycleDetectionResult
{
    /// <summary>
    /// Whether execution can proceed (no cycle, within depth limit).
    /// </summary>
    public bool CanProceed { get; init; }

    /// <summary>
    /// Error message if CanProceed is false.
    /// </summary>
    public string? Error { get; init; }

    /// <summary>
    /// Type of issue detected.
    /// </summary>
    public CycleDetectionIssue Issue { get; init; }

    /// <summary>
    /// The full path showing the cycle or depth chain.
    /// </summary>
    public string? Path { get; init; }

    /// <summary>
    /// Create a success result.
    /// </summary>
    public static CycleDetectionResult Success() => new()
    {
        CanProceed = true,
        Issue = CycleDetectionIssue.None
    };

    /// <summary>
    /// Create a cycle detected result.
    /// </summary>
    public static CycleDetectionResult CycleDetected(string path, string workflowName) => new()
    {
        CanProceed = false,
        Issue = CycleDetectionIssue.CycleDetected,
        Path = path,
        Error = $"Cycle detected: {path}"
    };

    /// <summary>
    /// Create a max depth exceeded result.
    /// </summary>
    public static CycleDetectionResult MaxDepthExceeded(int maxDepth, string path) => new()
    {
        CanProceed = false,
        Issue = CycleDetectionIssue.MaxDepthExceeded,
        Path = path,
        Error = $"Maximum nesting depth ({maxDepth}) exceeded: {path}"
    };
}

/// <summary>
/// Types of cycle detection issues.
/// </summary>
public enum CycleDetectionIssue
{
    None,
    CycleDetected,
    MaxDepthExceeded
}

/// <summary>
/// Interface for detecting cycles and depth limits in sub-workflow execution.
/// Stage 21.3: Cycle Detection & Limits
/// </summary>
public interface IWorkflowCycleDetector
{
    /// <summary>
    /// Check if a sub-workflow can be executed without causing a cycle or exceeding depth limits.
    /// </summary>
    /// <param name="workflowName">The workflow to check</param>
    /// <param name="callStack">The current call stack</param>
    /// <returns>Result indicating if execution can proceed</returns>
    CycleDetectionResult CheckBeforeExecution(string workflowName, WorkflowCallStack callStack);
}
