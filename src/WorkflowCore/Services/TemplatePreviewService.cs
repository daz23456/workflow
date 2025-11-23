using System.Text.Json;
using System.Text.RegularExpressions;

namespace WorkflowCore.Services;

/// <summary>
/// Service for previewing template resolution without executing workflows.
/// Resolves input templates with actual values and shows task output templates as placeholders.
/// </summary>
public class TemplatePreviewService : ITemplatePreviewService
{
    private static readonly Regex TemplateRegex = new(@"\{\{([^}]+)\}\}", RegexOptions.Compiled);

    /// <summary>
    /// Previews template resolution for all task input templates in a workflow.
    /// Resolves {{input.*}} templates with actual values from the input.
    /// Shows {{tasks.*}} templates as placeholders like &lt;will-resolve-from-taskId.output.path&gt;.
    /// </summary>
    public Dictionary<string, string> PreviewTemplate(string templateString, JsonElement input)
    {
        var result = new Dictionary<string, string>();

        var matches = TemplateRegex.Matches(templateString);
        foreach (Match match in matches)
        {
            var fullExpression = match.Value; // e.g., "{{input.userId}}"
            var expression = match.Groups[1].Value.Trim(); // e.g., "input.userId"

            if (expression.StartsWith("input."))
            {
                // Resolve input template
                var path = expression.Substring(6); // Remove "input."
                var resolvedValue = ResolveInputPath(path, input);
                result[fullExpression] = resolvedValue;
            }
            else if (expression.StartsWith("tasks."))
            {
                // Show placeholder for task output templates
                var path = expression.Substring(6); // Remove "tasks."
                result[fullExpression] = $"<will-resolve-from-{path}>";
            }
        }

        return result;
    }

    /// <summary>
    /// Resolves a path like "userId" or "user.profile.email" from a JsonElement.
    /// Returns the string value or "&lt;null&gt;" if not found.
    /// </summary>
    private string ResolveInputPath(string path, JsonElement input)
    {
        var parts = path.Split('.');
        var current = input;

        foreach (var part in parts)
        {
            // Handle array indexing like "items[0]"
            var arrayMatch = Regex.Match(part, @"^(\w+)\[(\d+)\]$");
            if (arrayMatch.Success)
            {
                var propertyName = arrayMatch.Groups[1].Value;
                var index = int.Parse(arrayMatch.Groups[2].Value);

                if (current.TryGetProperty(propertyName, out var arrayElement) &&
                    arrayElement.ValueKind == JsonValueKind.Array &&
                    index < arrayElement.GetArrayLength())
                {
                    current = arrayElement[index];
                }
                else
                {
                    return "<null>";
                }
            }
            else
            {
                if (current.TryGetProperty(part, out var nextElement))
                {
                    current = nextElement;
                }
                else
                {
                    return "<null>";
                }
            }
        }

        // Convert final value to string
        return current.ValueKind switch
        {
            JsonValueKind.String => current.GetString() ?? "<null>",
            JsonValueKind.Number => current.ToString(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => "<null>",
            _ => current.GetRawText()
        };
    }
}
