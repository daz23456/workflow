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
                $"Invalid template expression: '{expression}'. " +
                "Template expressions must have at least 2 parts separated by dots. " +
                "Valid formats: 'input.fieldName', 'tasks.taskId.output.fieldName', 'forEach.itemVar.property'. " +
                $"Got: '{expression}' which has {parts.Length} part(s).",
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
                var availableTasks = context.TaskOutputs.Keys.Any()
                    ? string.Join(", ", context.TaskOutputs.Keys.Select(k => $"'{k}'"))
                    : "(none - no tasks have completed yet)";
                throw new TemplateResolutionException(
                    $"Task '{taskId}' output not found. " +
                    $"This task either hasn't run yet, doesn't exist, or failed before producing output. " +
                    $"Available task outputs: {availableTasks}. " +
                    $"Check: (1) Task ID spelling matches exactly, (2) Task is listed in dependsOn for proper ordering, " +
                    "(3) Task completed successfully.",
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
            $"Unknown template expression type: '{expression}'. " +
            $"Expression starts with '{parts[0]}' which is not recognized. " +
            "Valid prefixes: 'input' (workflow input), 'tasks' (task outputs), 'forEach' (iteration context). " +
            "Examples: '{{input.userId}}', '{{tasks.fetch-user.output.name}}', '{{forEach.item.id}}'.",
            expression);
    }

    private string ResolveForEachExpression(string[] parts, TemplateContext context, string originalExpression)
    {
        if (context.ForEach == null)
        {
            throw new TemplateResolutionException(
                $"forEach template '{originalExpression}' used outside of a forEach loop. " +
                "The 'forEach' prefix is only valid inside a task that has a 'forEach' block defined. " +
                "If this task isn't iterating, use 'input.fieldName' or 'tasks.taskId.output.fieldName' instead. " +
                "If you meant to iterate, add a forEach block to your task: forEach: { items: '{{input.array}}', itemVar: 'item' }",
                originalExpression);
        }

        var forEachContext = context.ForEach;

        // Handle {{forEach.index}}
        if (parts[1] == "index")
        {
            return forEachContext.Index.ToString();
        }

        // Handle {{forEach.$parent.xxx}} - navigate to parent context
        if (parts[1] == "$parent")
        {
            if (forEachContext.Parent == null)
            {
                throw new TemplateResolutionException(
                    "forEach.$parent used but there is no parent forEach context. " +
                    "$parent is only valid inside a nested forEach (forEach inside another forEach). " +
                    "If you're at the outermost level, use {{forEach.{itemVar}}} directly.",
                    originalExpression);
            }

            // Resolve the rest of the expression in parent context
            var parentParts = new[] { "forEach" }.Concat(parts.Skip(2)).ToArray();
            var parentTemplateContext = new TemplateContext
            {
                Input = context.Input,
                TaskOutputs = context.TaskOutputs,
                ForEach = forEachContext.Parent
            };
            return ResolveForEachExpression(parentParts, parentTemplateContext, originalExpression);
        }

        // Handle {{forEach.$root.xxx}} - navigate to root context
        if (parts[1] == "$root")
        {
            var rootContext = forEachContext.GetRoot();

            // Resolve the rest of the expression in root context
            var rootParts = new[] { "forEach" }.Concat(parts.Skip(2)).ToArray();
            var rootTemplateContext = new TemplateContext
            {
                Input = context.Input,
                TaskOutputs = context.TaskOutputs,
                ForEach = rootContext
            };
            return ResolveForEachExpression(rootParts, rootTemplateContext, originalExpression);
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
            $"Unknown forEach property: '{parts[1]}'. " +
            $"Valid options: 'index' (current position), '$parent' (outer loop), '$root' (outermost loop), " +
            $"or '{forEachContext.ItemVar}' (current item as defined in your forEach.itemVar). " +
            $"Example: {{{{forEach.{forEachContext.ItemVar}.propertyName}}}}",
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
        var itemType = item?.GetType().Name ?? "null";
        throw new TemplateResolutionException(
            $"Cannot navigate path '{path}' on item of type '{itemType}'. " +
            "Path navigation (using dots) only works on objects/dictionaries. " +
            $"The current forEach item is a simple value ({itemType}), not an object with properties. " +
            "If iterating over simple values (strings, numbers), use '{{forEach.item}}' directly without a path.",
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
                    var availableFields = dict.Keys.Any()
                        ? string.Join(", ", dict.Keys.Take(10).Select(k => $"'{k}'")) + (dict.Keys.Count > 10 ? $"... ({dict.Keys.Count} total)" : "")
                        : "(empty object)";
                    throw new TemplateResolutionException(
                        $"Field '{part}' not found at path '{path}'. " +
                        $"Available fields: {availableFields}. " +
                        "Check spelling and case sensitivity (field names are case-sensitive).",
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
                        var availableProps = jsonElement.EnumerateObject()
                            .Take(10)
                            .Select(p => $"'{p.Name}'");
                        var propList = string.Join(", ", availableProps);
                        var totalCount = jsonElement.EnumerateObject().Count();
                        var suffix = totalCount > 10 ? $"... ({totalCount} total)" : "";
                        throw new TemplateResolutionException(
                            $"Property '{part}' not found in JSON object at path '{path}'. " +
                            $"Available properties: {propList}{suffix}. " +
                            "Check spelling and case sensitivity.",
                            originalExpression);
                    }
                    current = property;
                }
                else
                {
                    throw new TemplateResolutionException(
                        $"Cannot navigate to '{part}' - current value is {jsonElement.ValueKind}, not an object. " +
                        $"Full path: '{path}'. You may have navigated into a primitive value (string, number, boolean) " +
                        "instead of an object. Check your path structure.",
                        originalExpression);
                }
            }
            else
            {
                // Handle nested objects (anonymous types, POCOs)
                var currentType = current?.GetType();
                var property = currentType?.GetProperty(part);
                if (property == null)
                {
                    var availableProps = currentType?.GetProperties()
                        .Take(10)
                        .Select(p => $"'{p.Name}'") ?? Enumerable.Empty<string>();
                    var propList = availableProps.Any() ? string.Join(", ", availableProps) : "(no properties)";
                    throw new TemplateResolutionException(
                        $"Property '{part}' not found on object of type '{currentType?.Name ?? "null"}' at path '{path}'. " +
                        $"Available properties: {propList}. " +
                        "Check spelling and case sensitivity.",
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
                var available = dict.Keys.Any() ? string.Join(", ", dict.Keys.Take(10).Select(k => $"'{k}'")) : "(empty)";
                throw new TemplateResolutionException(
                    $"Field '{propertyName}' not found. Path: '{path}'. Available: {available}. " +
                    "Check spelling and case sensitivity.",
                    originalExpression);
            }
            return dict[propertyName];
        }
        else if (current is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Object)
        {
            if (!jsonElement.TryGetProperty(propertyName, out var property))
            {
                var available = string.Join(", ", jsonElement.EnumerateObject().Take(10).Select(p => $"'{p.Name}'"));
                throw new TemplateResolutionException(
                    $"Property '{propertyName}' not found. Path: '{path}'. Available: {available}. " +
                    "Check spelling and case sensitivity.",
                    originalExpression);
            }
            return property;
        }
        else
        {
            var currentType = current?.GetType();
            var property = currentType?.GetProperty(propertyName);
            if (property == null)
            {
                var available = currentType?.GetProperties().Take(10).Select(p => $"'{p.Name}'") ?? Enumerable.Empty<string>();
                var propList = available.Any() ? string.Join(", ", available) : "(no properties)";
                throw new TemplateResolutionException(
                    $"Property '{propertyName}' not found on type '{currentType?.Name ?? "null"}'. Path: '{path}'. Available: {propList}. " +
                    "Check spelling and case sensitivity.",
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
                var validRange = list.Count > 0 ? $"0 to {list.Count - 1}" : "N/A (array is empty)";
                throw new TemplateResolutionException(
                    $"Array index [{index}] is out of bounds. Array has {list.Count} element(s), valid indices: {validRange}. " +
                    $"Path: '{path}'. " +
                    (index < 0 ? "Negative indices are not supported." : $"Use an index less than {list.Count}."),
                    originalExpression);
            }
            return list[index];
        }
        else if (current is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Array)
        {
            var length = jsonElement.GetArrayLength();
            if (index < 0 || index >= length)
            {
                var validRange = length > 0 ? $"0 to {length - 1}" : "N/A (array is empty)";
                throw new TemplateResolutionException(
                    $"Array index [{index}] is out of bounds. Array has {length} element(s), valid indices: {validRange}. " +
                    $"Path: '{path}'. " +
                    (index < 0 ? "Negative indices are not supported." : $"Use an index less than {length}."),
                    originalExpression);
            }
            return jsonElement[index];
        }
        else if (current is System.Collections.IList nonGenericList)
        {
            if (index < 0 || index >= nonGenericList.Count)
            {
                var validRange = nonGenericList.Count > 0 ? $"0 to {nonGenericList.Count - 1}" : "N/A (array is empty)";
                throw new TemplateResolutionException(
                    $"Array index [{index}] is out of bounds. Array has {nonGenericList.Count} element(s), valid indices: {validRange}. " +
                    $"Path: '{path}'. " +
                    (index < 0 ? "Negative indices are not supported." : $"Use an index less than {nonGenericList.Count}."),
                    originalExpression);
            }
            return nonGenericList[index];
        }
        else
        {
            var actualType = current?.GetType().Name ?? "null";
            throw new TemplateResolutionException(
                $"Cannot use array index syntax on non-array value of type '{actualType}' at path '{path}'. " +
                "Array indexing (e.g., 'items[0]') only works on arrays/lists. " +
                "If this should be an array, check the upstream task output or input data.",
                originalExpression);
        }
    }
}
