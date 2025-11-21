using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ITemplateParser
{
    TemplateParseResult Parse(string template);
}

public class TemplateParser : ITemplateParser
{
    private static readonly Regex TemplateRegex = new(@"\{\{([^}]+)\}\}", RegexOptions.Compiled);

    public TemplateParseResult Parse(string template)
    {
        var expressions = new List<TemplateExpression>();
        var errors = new List<string>();

        // Check for incomplete template syntax (opening braces without closing)
        if (template.Contains("{{") && !template.Contains("}}"))
        {
            errors.Add("Invalid template syntax: Missing closing braces");
            return new TemplateParseResult
            {
                IsValid = false,
                Expressions = expressions,
                Errors = errors
            };
        }

        var matches = TemplateRegex.Matches(template);

        foreach (Match match in matches)
        {
            var expression = match.Groups[1].Value.Trim();

            try
            {
                var parsed = ParseExpression(expression);
                expressions.Add(parsed);
            }
            catch (Exception ex)
            {
                errors.Add($"Invalid template syntax: {ex.Message}");
            }
        }

        return new TemplateParseResult
        {
            IsValid = errors.Count == 0,
            Expressions = expressions,
            Errors = errors
        };
    }

    private TemplateExpression ParseExpression(string expression)
    {
        var parts = expression.Split('.');

        if (parts.Length < 2)
        {
            throw new ArgumentException($"Invalid expression: {expression}");
        }

        if (parts[0] == "input")
        {
            return new TemplateExpression
            {
                Type = TemplateExpressionType.Input,
                Path = string.Join(".", parts.Skip(1))
            };
        }

        if (parts[0] == "tasks" && parts.Length >= 3 && parts[2] == "output")
        {
            return new TemplateExpression
            {
                Type = TemplateExpressionType.TaskOutput,
                TaskId = parts[1],
                Path = parts.Length > 3 ? string.Join(".", parts.Skip(3)) : ""
            };
        }

        throw new ArgumentException($"Unknown expression type: {expression}");
    }
}
