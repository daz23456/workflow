using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Evaluates condition expressions for workflow task execution.
/// Supports comparison operators (==, !=, >, <, >=, <=) and logical operators (&&, ||, !).
/// </summary>
public interface IConditionEvaluator
{
    /// <summary>
    /// Evaluates a condition expression in the context of a workflow execution.
    /// </summary>
    /// <param name="expression">The condition expression (e.g., "{{input.approved}} == true")</param>
    /// <param name="context">The template context containing input and task outputs</param>
    /// <returns>A result indicating whether the task should execute</returns>
    /// <remarks>
    /// Supported operators:
    /// - Equality: ==, !=
    /// - Comparison: >, <, >=, <=
    /// - Logical: &&, ||, !
    ///
    /// Supported value types:
    /// - Boolean: true, false
    /// - Number: integers and decimals
    /// - String: 'value' or "value"
    /// - Null: null
    ///
    /// Examples:
    /// - "{{input.approved}} == true"
    /// - "{{input.amount}} > 100 && {{input.amount}} < 1000"
    /// - "{{tasks.check.output.status}} != 'error'"
    /// </remarks>
    Task<ConditionResult> EvaluateAsync(string? expression, TemplateContext context);
}
