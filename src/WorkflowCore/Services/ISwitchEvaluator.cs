using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Evaluates switch expressions for workflow task routing.
/// Routes to different tasks based on value matching.
/// </summary>
public interface ISwitchEvaluator
{
    /// <summary>
    /// Evaluates a switch expression and returns the matched task reference.
    /// </summary>
    /// <param name="switchSpec">The switch specification with value and cases</param>
    /// <param name="context">The template context containing input and task outputs</param>
    /// <returns>A result indicating which task to execute</returns>
    /// <remarks>
    /// Behavior:
    /// - First matching case wins (in order)
    /// - Falls through to default if no match
    /// - Error if no match and no default defined
    /// - String comparison is case-insensitive
    /// - Supports: strings, numbers, booleans, null
    ///
    /// Example:
    /// switch:
    ///   value: "{{input.paymentMethod}}"
    ///   cases:
    ///     - match: "stripe"
    ///       taskRef: stripe-charge
    ///     - match: "paypal"
    ///       taskRef: paypal-charge
    ///   default:
    ///     taskRef: unknown-payment-error
    /// </remarks>
    Task<SwitchResult> EvaluateAsync(SwitchSpec? switchSpec, TemplateContext context);
}
