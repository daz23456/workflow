namespace WorkflowCore.Models;

/// <summary>
/// Result of evaluating a switch expression.
/// </summary>
public class SwitchResult
{
    /// <summary>
    /// Whether a case (or default) was matched.
    /// True if a taskRef was resolved, false if no match and no default.
    /// </summary>
    public bool Matched { get; set; }

    /// <summary>
    /// The task reference to execute.
    /// Null if no match was found.
    /// </summary>
    public string? TaskRef { get; set; }

    /// <summary>
    /// The value that was matched (the Match value from the case).
    /// Null if default was used or no match.
    /// </summary>
    public string? MatchedValue { get; set; }

    /// <summary>
    /// The actual evaluated value from the expression.
    /// Shows what the switch value resolved to.
    /// </summary>
    public string? EvaluatedValue { get; set; }

    /// <summary>
    /// Whether the default case was used.
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// Error message if switch evaluation failed.
    /// Null if evaluation succeeded.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Creates a successful match result.
    /// </summary>
    public static SwitchResult Match(string taskRef, string matchedValue, string evaluatedValue)
    {
        return new SwitchResult
        {
            Matched = true,
            TaskRef = taskRef,
            MatchedValue = matchedValue,
            EvaluatedValue = evaluatedValue,
            IsDefault = false
        };
    }

    /// <summary>
    /// Creates a result for when the default case is used.
    /// </summary>
    public static SwitchResult Default(string taskRef, string evaluatedValue)
    {
        return new SwitchResult
        {
            Matched = true,
            TaskRef = taskRef,
            EvaluatedValue = evaluatedValue,
            IsDefault = true
        };
    }

    /// <summary>
    /// Creates a result for when no match is found and no default exists.
    /// </summary>
    public static SwitchResult NoMatch(string evaluatedValue)
    {
        return new SwitchResult
        {
            Matched = false,
            EvaluatedValue = evaluatedValue,
            Error = $"No matching case found for value '{evaluatedValue}' and no default defined"
        };
    }

    /// <summary>
    /// Creates an error result.
    /// </summary>
    public static SwitchResult Failure(string error)
    {
        return new SwitchResult
        {
            Matched = false,
            Error = error
        };
    }
}
