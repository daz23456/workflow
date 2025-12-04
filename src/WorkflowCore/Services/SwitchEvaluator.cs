using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Evaluates switch expressions for workflow task routing.
/// Routes to different tasks based on value matching.
/// </summary>
public class SwitchEvaluator : ISwitchEvaluator
{
    private readonly ITemplateResolver _templateResolver;

    public SwitchEvaluator(ITemplateResolver templateResolver)
    {
        _templateResolver = templateResolver ?? throw new ArgumentNullException(nameof(templateResolver));
    }

    /// <inheritdoc />
    public async Task<SwitchResult> EvaluateAsync(SwitchSpec? switchSpec, TemplateContext context)
    {
        // Validate switch spec
        if (switchSpec == null)
        {
            return SwitchResult.Failure("Switch specification is null");
        }

        if (string.IsNullOrWhiteSpace(switchSpec.Value))
        {
            return SwitchResult.Failure("Switch value expression is empty");
        }

        if (switchSpec.Cases == null || switchSpec.Cases.Count == 0)
        {
            return SwitchResult.Failure("No cases defined in switch statement");
        }

        try
        {
            // Resolve the value expression
            var evaluatedValue = await ResolveValueAsync(switchSpec.Value, context);

            // Try to find a matching case
            foreach (var switchCase in switchSpec.Cases)
            {
                if (ValuesMatch(evaluatedValue, switchCase.Match))
                {
                    return SwitchResult.Match(switchCase.TaskRef, switchCase.Match, evaluatedValue);
                }
            }

            // No match found - try default
            if (switchSpec.Default != null)
            {
                return SwitchResult.Default(switchSpec.Default.TaskRef, evaluatedValue);
            }

            // No match and no default
            return SwitchResult.NoMatch(evaluatedValue);
        }
        catch (Exception ex)
        {
            return SwitchResult.Failure($"Failed to evaluate switch: {ex.Message}");
        }
    }

    private async Task<string> ResolveValueAsync(string valueExpression, TemplateContext context)
    {
        // Check if the value contains template expressions
        var templatePattern = new Regex(@"\{\{(.+?)\}\}");
        if (templatePattern.IsMatch(valueExpression))
        {
            var resolved = await _templateResolver.ResolveAsync(valueExpression, context);

            // If the resolved value is the same as the template, the variable wasn't found
            if (resolved == valueExpression)
            {
                throw new InvalidOperationException($"Unable to resolve template: {valueExpression}");
            }

            return resolved;
        }

        // Return as-is if no template
        return valueExpression;
    }

    private static bool ValuesMatch(string evaluatedValue, string caseMatch)
    {
        // Handle null comparison
        if (string.Equals(caseMatch, "null", StringComparison.OrdinalIgnoreCase))
        {
            return string.IsNullOrEmpty(evaluatedValue) ||
                   string.Equals(evaluatedValue, "null", StringComparison.OrdinalIgnoreCase);
        }

        // For null evaluated value matching non-null case
        if (string.IsNullOrEmpty(evaluatedValue))
        {
            return false;
        }

        // Case-insensitive string comparison
        return string.Equals(evaluatedValue, caseMatch, StringComparison.OrdinalIgnoreCase);
    }
}
