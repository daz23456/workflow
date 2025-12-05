namespace WorkflowCore.Models;

/// <summary>
/// Result of forEach iteration execution.
/// Contains aggregated outputs and statistics from all iterations.
/// </summary>
public class ForEachResult
{
    /// <summary>
    /// Whether all iterations completed successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the forEach failed to execute (not individual item failures).
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Array of outputs from each successful iteration.
    /// </summary>
    public List<Dictionary<string, object>> Outputs { get; set; } = new();

    /// <summary>
    /// Total number of items processed.
    /// </summary>
    public int ItemCount { get; set; }

    /// <summary>
    /// Number of items that completed successfully.
    /// </summary>
    public int SuccessCount { get; set; }

    /// <summary>
    /// Number of items that failed.
    /// </summary>
    public int FailureCount { get; set; }

    /// <summary>
    /// Detailed results for each iteration.
    /// </summary>
    public List<ForEachItemResult> ItemResults { get; set; } = new();

    /// <summary>
    /// Creates a failure result with the specified error.
    /// </summary>
    public static ForEachResult Failure(string error) => new()
    {
        Success = false,
        Error = error
    };
}

/// <summary>
/// Result of a single forEach iteration.
/// </summary>
public class ForEachItemResult
{
    /// <summary>
    /// The index of this item in the original array (0-based).
    /// </summary>
    public int Index { get; set; }

    /// <summary>
    /// Whether this item's execution was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The output from this item's task execution.
    /// </summary>
    public Dictionary<string, object>? Output { get; set; }

    /// <summary>
    /// Error message if this item failed.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// The original item value being processed.
    /// </summary>
    public object? Item { get; set; }

    /// <summary>
    /// Duration of this iteration in milliseconds.
    /// </summary>
    public long DurationMs { get; set; }
}
