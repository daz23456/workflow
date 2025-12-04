using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Evaluates condition expressions for workflow task execution.
/// Supports comparison and logical operators with template resolution.
/// </summary>
public class ConditionEvaluator : IConditionEvaluator
{
    private readonly ITemplateResolver _templateResolver;

    // Regex patterns for parsing
    private static readonly Regex ComparisonPattern = new(
        @"(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)",
        RegexOptions.Compiled);

    private static readonly Regex LogicalAndPattern = new(
        @"(.+?)\s*&&\s*(.+)",
        RegexOptions.Compiled);

    private static readonly Regex LogicalOrPattern = new(
        @"(.+?)\s*\|\|\s*(.+)",
        RegexOptions.Compiled);

    private static readonly Regex NotPattern = new(
        @"^\s*!\s*\((.+)\)\s*$",
        RegexOptions.Compiled);

    private static readonly Regex ParenthesesPattern = new(
        @"^\s*\((.+)\)\s*$",
        RegexOptions.Compiled);

    public ConditionEvaluator(ITemplateResolver templateResolver)
    {
        _templateResolver = templateResolver;
    }

    /// <inheritdoc />
    public async Task<ConditionResult> EvaluateAsync(string? expression, TemplateContext context)
    {
        // Empty or null expression means "always execute"
        if (string.IsNullOrWhiteSpace(expression))
        {
            return ConditionResult.Execute();
        }

        try
        {
            // Resolve all templates in the expression first
            var resolvedExpression = await ResolveTemplatesAsync(expression, context);

            // Evaluate the resolved expression
            var result = EvaluateExpression(resolvedExpression);

            return result
                ? ConditionResult.Execute(resolvedExpression)
                : ConditionResult.Skip(resolvedExpression);
        }
        catch (Exception ex)
        {
            return ConditionResult.Failure($"Failed to evaluate condition: {ex.Message}");
        }
    }

    private async Task<string> ResolveTemplatesAsync(string expression, TemplateContext context)
    {
        // Find all template expressions and resolve them
        var templatePattern = new Regex(@"\{\{(.+?)\}\}");
        var matches = templatePattern.Matches(expression);

        var result = expression;
        foreach (Match match in matches)
        {
            var templateExpr = match.Value;
            var resolved = await _templateResolver.ResolveAsync(templateExpr, context);

            // The resolver returns a string representation
            // Handle special cases for proper comparison
            string replacement;
            if (string.IsNullOrEmpty(resolved) || resolved == templateExpr)
            {
                // Template wasn't resolved (missing variable)
                throw new InvalidOperationException($"Unable to resolve template: {templateExpr}");
            }
            else
            {
                replacement = resolved;
            }

            result = result.Replace(templateExpr, replacement);
        }

        return result;
    }

    private bool EvaluateExpression(string expression)
    {
        expression = expression.Trim();

        // Handle NOT operator: !(expression)
        var notMatch = NotPattern.Match(expression);
        if (notMatch.Success)
        {
            return !EvaluateExpression(notMatch.Groups[1].Value);
        }

        // Handle parentheses: (expression)
        var parenMatch = ParenthesesPattern.Match(expression);
        if (parenMatch.Success)
        {
            return EvaluateExpression(parenMatch.Groups[1].Value);
        }

        // Handle logical OR (lowest precedence - split first)
        var orMatch = LogicalOrPattern.Match(expression);
        if (orMatch.Success)
        {
            var left = EvaluateExpression(orMatch.Groups[1].Value);
            var right = EvaluateExpression(orMatch.Groups[2].Value);
            return left || right;
        }

        // Handle logical AND
        var andMatch = LogicalAndPattern.Match(expression);
        if (andMatch.Success)
        {
            var left = EvaluateExpression(andMatch.Groups[1].Value);
            var right = EvaluateExpression(andMatch.Groups[2].Value);
            return left && right;
        }

        // Handle comparison operators
        var compMatch = ComparisonPattern.Match(expression);
        if (compMatch.Success)
        {
            var leftStr = compMatch.Groups[1].Value.Trim();
            var op = compMatch.Groups[2].Value;
            var rightStr = compMatch.Groups[3].Value.Trim();

            return EvaluateComparison(leftStr, op, rightStr);
        }

        // If no operator found, try to parse as boolean
        if (bool.TryParse(expression, out var boolResult))
        {
            return boolResult;
        }

        throw new InvalidOperationException($"Invalid expression: {expression}");
    }

    private bool EvaluateComparison(string left, string op, string right)
    {
        // Normalize values
        var leftValue = NormalizeValue(left);
        var rightValue = NormalizeValue(right);

        return op switch
        {
            "==" => AreEqual(leftValue, rightValue),
            "!=" => !AreEqual(leftValue, rightValue),
            ">" => CompareNumeric(leftValue, rightValue) > 0,
            "<" => CompareNumeric(leftValue, rightValue) < 0,
            ">=" => CompareNumeric(leftValue, rightValue) >= 0,
            "<=" => CompareNumeric(leftValue, rightValue) <= 0,
            _ => throw new InvalidOperationException($"Unknown operator: {op}")
        };
    }

    private object? NormalizeValue(string value)
    {
        value = value.Trim();

        // Handle null
        if (value.Equals("null", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        // Handle boolean
        if (value.Equals("true", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        if (value.Equals("false", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Handle quoted strings
        if ((value.StartsWith('\'') && value.EndsWith('\'')) ||
            (value.StartsWith('"') && value.EndsWith('"')))
        {
            return value[1..^1]; // Remove quotes
        }

        // Handle numbers
        if (double.TryParse(value, System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var numValue))
        {
            return numValue;
        }

        // Return as string
        return value;
    }

    private bool AreEqual(object? left, object? right)
    {
        if (left == null && right == null) return true;
        if (left == null || right == null) return false;

        // Handle numeric comparison
        if (IsNumeric(left) && IsNumeric(right))
        {
            var leftNum = Convert.ToDouble(left);
            var rightNum = Convert.ToDouble(right);
            return Math.Abs(leftNum - rightNum) < 0.0001; // Epsilon comparison
        }

        // Handle boolean comparison
        if (left is bool leftBool && right is bool rightBool)
        {
            return leftBool == rightBool;
        }

        // String comparison (case-sensitive)
        return string.Equals(left.ToString(), right.ToString(), StringComparison.Ordinal);
    }

    private int CompareNumeric(object? left, object? right)
    {
        if (left == null || right == null)
        {
            throw new InvalidOperationException("Cannot compare null values with numeric operators");
        }

        var leftNum = Convert.ToDouble(left);
        var rightNum = Convert.ToDouble(right);

        return leftNum.CompareTo(rightNum);
    }

    private static bool IsNumeric(object? value)
    {
        return value is sbyte or byte or short or ushort or int or uint or long or ulong
            or float or double or decimal;
    }
}
