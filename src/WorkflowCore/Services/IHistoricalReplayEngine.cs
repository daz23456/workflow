using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Engine for verifying workflow optimizations by replaying historical executions.
/// </summary>
public interface IHistoricalReplayEngine
{
    /// <summary>
    /// Replays historical executions with an optimized workflow to verify output equivalence.
    /// </summary>
    /// <param name="originalWorkflow">The original workflow definition.</param>
    /// <param name="optimizedWorkflow">The optimized workflow to test.</param>
    /// <param name="availableTasks">Dictionary of available task definitions.</param>
    /// <param name="replayCount">Maximum number of historical executions to replay (default: 10).</param>
    /// <param name="options">Optional replay configuration options.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Replay result with confidence score and any mismatches found.</returns>
    Task<ReplayResult> ReplayWorkflowAsync(
        WorkflowResource originalWorkflow,
        WorkflowResource optimizedWorkflow,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        int replayCount = 10,
        ReplayOptions? options = null,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of replaying historical executions with an optimized workflow.
/// </summary>
public record ReplayResult(
    int TotalReplays,
    int MatchingOutputs,
    List<ReplayMismatch> Mismatches,
    TimeSpan AverageTimeDelta)
{
    /// <summary>
    /// Confidence score from 0.0 to 1.0 based on matching outputs.
    /// </summary>
    public double ConfidenceScore => TotalReplays > 0
        ? (double)MatchingOutputs / TotalReplays
        : 0;

    /// <summary>
    /// Whether all replayed executions produced matching outputs.
    /// </summary>
    public bool IsPerfectMatch => TotalReplays > 0 && MatchingOutputs == TotalReplays;
}

/// <summary>
/// Represents a mismatch found during replay.
/// </summary>
public record ReplayMismatch(
    string ExecutionId,
    string TaskRef,
    string Reason);

/// <summary>
/// Configuration options for replay behavior.
/// </summary>
public class ReplayOptions
{
    /// <summary>
    /// Additional field names to ignore during comparison (non-deterministic fields).
    /// Default ignored fields: timestamp, createdAt, updatedAt, id, uuid, requestId
    /// </summary>
    public string[] IgnoreFields { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Whether to ignore fields that look like timestamps (ISO 8601 format).
    /// Default: true
    /// </summary>
    public bool IgnoreTimestampValues { get; set; } = true;

    /// <summary>
    /// Whether to ignore fields that look like UUIDs.
    /// Default: true
    /// </summary>
    public bool IgnoreUuidValues { get; set; } = true;
}
