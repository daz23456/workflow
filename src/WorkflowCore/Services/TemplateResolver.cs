using System.Text.Json;
using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ITemplateResolver
{
    Task<string> ResolveAsync(string template, TemplateContext context);
}

public class TemplateResolver : ITemplateResolver
{
    private static readonly Regex TemplateRegex = new(@"\{\{([^}]+)\}\}", RegexOptions.Compiled);

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

        // Handle {{input.fieldName}} or {{input.nested.field}}
        if (parts[0] == "input")
        {
            var path = string.Join(".", parts.Skip(1));
            return ResolveInputPath(path, context.Input, expression);
        }

        // Handle {{tasks.taskId.output.fieldName}} or {{tasks.taskId.output.nested.field}}
        if (parts[0] == "tasks" && parts.Length >= 3 && parts[2] == "output")
        {
            var taskId = parts[1];
            var path = string.Join(".", parts.Skip(3));

            if (!context.TaskOutputs.ContainsKey(taskId))
            {
                throw new TemplateResolutionException(
                    $"Task '{taskId}' output not found in execution context",
                    expression);
            }

            var taskOutput = context.TaskOutputs[taskId];
            return ResolveInputPath(path, taskOutput, expression);
        }

        throw new TemplateResolutionException(
            $"Unknown template expression type: {expression}",
            expression);
    }

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
                // Handle JsonElement (nested JSON objects from deserialization)
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
                // Handle nested objects (anonymous types, POCOs)
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

        // If the result is a simple type, convert to string
        if (current is string str)
        {
            return str;
        }

        if (current is int or long or double or float or decimal or bool)
        {
            return current.ToString() ?? string.Empty;
        }

        // Handle JsonElement
        if (current is JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString() ?? string.Empty,
                JsonValueKind.Number => element.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => string.Empty,
                _ => element.GetRawText() // For objects/arrays, return JSON
            };
        }

        // For complex objects, serialize to JSON
        return JsonSerializer.Serialize(current);
    }
}
