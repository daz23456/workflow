namespace WorkflowCore.Models;

/// <summary>
/// Result of evaluating a condition expression.
/// </summary>
public class ConditionResult
{
    /// <summary>
    /// Whether the task should be executed based on the condition.
    /// True means the condition passed and task should execute.
    /// False means the condition failed and task should be skipped.
    /// </summary>
    public bool ShouldExecute { get; set; }

    /// <summary>
    /// The expression after template resolution (for debugging/tracing).
    /// Shows the actual values that were compared.
    /// </summary>
    public string? EvaluatedExpression { get; set; }

    /// <summary>
    /// Error message if condition evaluation failed.
    /// Null if evaluation succeeded.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Creates a successful result indicating the task should execute.
    /// </summary>
    public static ConditionResult Execute(string? evaluatedExpression = null)
    {
        return new ConditionResult
        {
            ShouldExecute = true,
            EvaluatedExpression = evaluatedExpression
        };
    }

    /// <summary>
    /// Creates a result indicating the task should be skipped.
    /// </summary>
    public static ConditionResult Skip(string? evaluatedExpression = null)
    {
        return new ConditionResult
        {
            ShouldExecute = false,
            EvaluatedExpression = evaluatedExpression
        };
    }

    /// <summary>
    /// Creates an error result indicating evaluation failed.
    /// </summary>
    public static ConditionResult Failure(string error)
    {
        return new ConditionResult
        {
            ShouldExecute = false,
            Error = error
        };
    }
}
