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
    private static readonly Regex ArrayIndexRegex = new(@"^(\w+)\[(\d+)\]$", RegexOptions.Compiled);

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

        // Handle {{forEach.x}} templates (item variable or index)
        if (parts[0] == "forEach")
        {
            return ResolveForEachExpression(parts, context, expression);
        }

        throw new TemplateResolutionException(
            $"Unknown template expression type: {expression}",
            expression);
    }

    private string ResolveForEachExpression(string[] parts, TemplateContext context, string originalExpression)
    {
        if (context.ForEach == null)
        {
            throw new TemplateResolutionException(
                "forEach template used outside of forEach context",
                originalExpression);
        }

        var forEachContext = context.ForEach;

        // Handle {{forEach.index}}
        if (parts[1] == "index")
        {
            return forEachContext.Index.ToString();
        }

        // Handle {{forEach.{itemVar}}} or {{forEach.{itemVar}.property}}
        if (parts[1] == forEachContext.ItemVar)
        {
            // If just the item variable, return the whole item
            if (parts.Length == 2)
            {
                return SerializeValue(forEachContext.CurrentItem);
            }

            // Otherwise, navigate into the item
            var path = string.Join(".", parts.Skip(2));
            return ResolveItemPath(path, forEachContext.CurrentItem, originalExpression);
        }

        throw new TemplateResolutionException(
            $"Unknown forEach property: {parts[1]}. Expected 'index' or '{forEachContext.ItemVar}'",
            originalExpression);
    }

    private string ResolveItemPath(string path, object? item, string originalExpression)
    {
        if (item == null)
        {
            return string.Empty;
        }

        // If item is a dictionary, use the existing path resolution
        if (item is Dictionary<string, object> dict)
        {
            return ResolveInputPath(path, dict, originalExpression);
        }

        // Handle JsonElement
        if (item is JsonElement jsonElement)
        {
            if (jsonElement.ValueKind == JsonValueKind.Object)
            {
                // Convert to dictionary and resolve
                var itemDict = JsonElementToDictionary(jsonElement);
                return ResolveInputPath(path, itemDict, originalExpression);
            }
        }

        // For simple types, we can't navigate further
        throw new TemplateResolutionException(
            $"Cannot navigate path '{path}' on non-object item",
            originalExpression);
    }

    private static Dictionary<string, object> JsonElementToDictionary(JsonElement element)
    {
        var dict = new Dictionary<string, object>();
        foreach (var prop in element.EnumerateObject())
        {
            var value = ConvertJsonElement(prop.Value);
            if (value != null)
            {
                dict[prop.Name] = value;
            }
        }
        return dict;
    }

    private static object? ConvertJsonElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.TryGetInt64(out var l) ? l : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.Object => JsonElementToDictionary(element),
            JsonValueKind.Array => element.EnumerateArray().Select(ConvertJsonElement).ToList(),
            _ => element.GetRawText()
        };
    }

    private static string SerializeValue(object? value)
    {
        if (value == null)
        {
            return string.Empty;
        }

        if (value is string str)
        {
            return str;
        }

        if (value is int or long or double or float or decimal or bool)
        {
            return value.ToString() ?? string.Empty;
        }

        return JsonSerializer.Serialize(value);
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
            // Check for array index syntax (e.g., "items[0]")
            var arrayMatch = ArrayIndexRegex.Match(part);
            if (arrayMatch.Success)
            {
                var propertyName = arrayMatch.Groups[1].Value;
                var index = int.Parse(arrayMatch.Groups[2].Value);

                // First get the property
                current = GetProperty(current, propertyName, path, originalExpression);

                // Then index into it
                current = GetArrayElement(current, index, path, originalExpression);
            }
            else if (current is Dictionary<string, object> dict)
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

    private static object? GetProperty(object? current, string propertyName, string path, string originalExpression)
    {
        if (current is Dictionary<string, object> dict)
        {
            if (!dict.ContainsKey(propertyName))
            {
                throw new TemplateResolutionException(
                    $"Field '{propertyName}' not found in path '{path}'",
                    originalExpression);
            }
            return dict[propertyName];
        }
        else if (current is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Object)
        {
            if (!jsonElement.TryGetProperty(propertyName, out var property))
            {
                throw new TemplateResolutionException(
                    $"Property '{propertyName}' not found in path '{path}'",
                    originalExpression);
            }
            return property;
        }
        else
        {
            var property = current?.GetType().GetProperty(propertyName);
            if (property == null)
            {
                throw new TemplateResolutionException(
                    $"Property '{propertyName}' not found in path '{path}'",
                    originalExpression);
            }
            return property.GetValue(current);
        }
    }

    private static object? GetArrayElement(object? current, int index, string path, string originalExpression)
    {
        if (current is IList<object> list)
        {
            if (index < 0 || index >= list.Count)
            {
                throw new TemplateResolutionException(
                    $"Array index {index} is out of bounds (length: {list.Count}) in path '{path}'",
                    originalExpression);
            }
            return list[index];
        }
        else if (current is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Array)
        {
            if (index < 0 || index >= jsonElement.GetArrayLength())
            {
                throw new TemplateResolutionException(
                    $"Array index {index} is out of bounds (length: {jsonElement.GetArrayLength()}) in path '{path}'",
                    originalExpression);
            }
            return jsonElement[index];
        }
        else if (current is System.Collections.IList nonGenericList)
        {
            if (index < 0 || index >= nonGenericList.Count)
            {
                throw new TemplateResolutionException(
                    $"Array index {index} is out of bounds (length: {nonGenericList.Count}) in path '{path}'",
                    originalExpression);
            }
            return nonGenericList[index];
        }
        else
        {
            throw new TemplateResolutionException(
                $"Cannot index into non-array value at path '{path}'",
                originalExpression);
        }
    }
}
