using System.Text.Json;
using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Optimized template resolver that uses raw JSON storage to avoid unnecessary deserialization.
/// - For passthrough ({{tasks.X.output}}): Returns raw JSON string directly
/// - For nested access ({{tasks.X.output.field}}): Uses JsonDocument navigation
/// </summary>
public class OptimizedTemplateResolver : ITemplateResolver
{
    private readonly OptimizedJsonStorage _storage;
    private static readonly Regex TemplateRegex = new(@"\{\{([^}]+)\}\}", RegexOptions.Compiled);
    private static readonly Regex ArrayIndexRegex = new(@"^(\w+)\[(\d+)\]$", RegexOptions.Compiled);
    private static readonly Regex RootArrayIndexRegex = new(@"^output\[(\d+)\]", RegexOptions.Compiled);

    public OptimizedTemplateResolver(OptimizedJsonStorage storage)
    {
        _storage = storage ?? throw new ArgumentNullException(nameof(storage));
    }

    public Task<string> ResolveAsync(string template, TemplateContext context)
    {
        if (string.IsNullOrEmpty(template))
        {
            return Task.FromResult(template);
        }

        var result = TemplateRegex.Replace(template, match =>
        {
            var expression = match.Groups[1].Value.Trim();
            return ResolveExpression(expression, context);
        });

        return Task.FromResult(result);
    }

    private string ResolveExpression(string expression, TemplateContext context)
    {
        var parts = expression.Split('.');

        if (parts.Length < 2)
        {
            throw new TemplateResolutionException(
                $"Invalid template expression: {expression}",
                expression);
        }

        // Handle {{input.fieldName}}
        if (parts[0] == "input")
        {
            var path = string.Join(".", parts.Skip(1));
            return ResolveInputPath(path, context.Input, expression);
        }

        // Handle {{tasks.taskId.output}}, {{tasks.taskId.output.field}}, or {{tasks.taskId.output[0]}}
        if (parts[0] == "tasks" && parts.Length >= 3)
        {
            var taskId = parts[1];

            // Check for output[N] syntax (root array indexing)
            var rootArrayMatch = RootArrayIndexRegex.Match(parts[2]);
            if (rootArrayMatch.Success)
            {
                var index = rootArrayMatch.Groups[1].Value;
                // Build path as [N] for root array access, plus any remaining path
                var remainingPath = parts.Length > 3 ? "." + string.Join(".", parts.Skip(3)) : "";
                var path = $"[{index}]{remainingPath}";
                return ResolveTaskOutput(taskId, path, expression);
            }

            // Standard output access
            if (parts[2] == "output")
            {
                var path = string.Join(".", parts.Skip(3));
                return ResolveTaskOutput(taskId, path, expression);
            }
        }

        throw new TemplateResolutionException(
            $"Unknown template expression type: {expression}",
            expression);
    }

    /// <summary>
    /// Resolves task output using optimized JSON storage.
    /// </summary>
    private string ResolveTaskOutput(string taskId, string path, string originalExpression)
    {
        // Check if we have raw JSON stored for this task
        var rawJson = _storage.GetRawJson(taskId);
        if (rawJson == null)
        {
            throw new TemplateResolutionException(
                $"Task '{taskId}' output not found in execution context",
                originalExpression);
        }

        // Passthrough case - return raw JSON directly (no parsing!)
        if (string.IsNullOrEmpty(path))
        {
            return rawJson;
        }

        // Nested access - use optimized storage navigation
        try
        {
            var value = _storage.GetValue(taskId, path);
            return ConvertToString(value);
        }
        catch (KeyNotFoundException)
        {
            throw new TemplateResolutionException(
                $"Property '{path.Split('.')[0]}' not found in path '{path}'",
                originalExpression);
        }
    }

    /// <summary>
    /// Resolves input path for workflow inputs.
    /// </summary>
    private string ResolveInputPath(string path, Dictionary<string, object> data, string originalExpression)
    {
        // If path is empty, return entire object as JSON
        if (string.IsNullOrEmpty(path))
        {
            return JsonSerializer.Serialize(data);
        }

        var parts = path.Split('.');
        object? current = data;

        foreach (var part in parts)
        {
            if (current is Dictionary<string, object> dict)
            {
                if (!dict.ContainsKey(part))
                {
                    throw new TemplateResolutionException(
                        $"Field '{part}' not found in path '{path}'",
                        originalExpression);
                }
                current = dict[part];
            }
            else if (current is JsonElement jsonElement)
            {
                if (jsonElement.ValueKind == JsonValueKind.Object)
                {
                    if (!jsonElement.TryGetProperty(part, out var property))
                    {
                        throw new TemplateResolutionException(
                            $"Property '{part}' not found in JSON object at path '{path}'",
                            originalExpression);
                    }
                    current = property;
                }
                else
                {
                    throw new TemplateResolutionException(
                        $"Cannot navigate path '{part}' - current value is not an object",
                        originalExpression);
                }
            }
            else
            {
                var property = current?.GetType().GetProperty(part);
                if (property == null)
                {
                    throw new TemplateResolutionException(
                        $"Property '{part}' not found in path '{path}'",
                        originalExpression);
                }
                current = property.GetValue(current);
            }
        }

        return ConvertToString(current);
    }

    /// <summary>
    /// Converts a value to string representation.
    /// </summary>
    private static string ConvertToString(object? value)
    {
        if (value == null)
        {
            return string.Empty;
        }

        if (value is string str)
        {
            return str;
        }

        if (value is bool b)
        {
            return b.ToString().ToLowerInvariant();
        }

        if (value is int or long or double or float or decimal)
        {
            return value.ToString() ?? string.Empty;
        }

        if (value is JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString() ?? string.Empty,
                JsonValueKind.Number => element.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => string.Empty,
                _ => element.GetRawText()
            };
        }

        // For complex objects, serialize to JSON
        return JsonSerializer.Serialize(value);
    }
}
