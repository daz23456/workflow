using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace WorkflowCore.Services;

/// <summary>
/// Optimized JSON storage that avoids unnecessary deserialization.
/// - For passthrough: Returns raw JSON string directly (no deserialize/re-serialize)
/// - For nested access: Uses JsonDocument to navigate without full deserialization
/// </summary>
public class OptimizedJsonStorage : IDisposable
{
    private readonly ConcurrentDictionary<string, string> _rawJsonStorage = new();
    private bool _disposed;

    // Regex to match array index access like "items[0]" or "data[123]"
    private static readonly Regex ArrayIndexRegex = new(@"^(\w+)\[(\d+)\]$", RegexOptions.Compiled);
    // Regex to match root array index access like "[0]" or "[123]"
    private static readonly Regex RootArrayIndexRegex = new(@"^\[(\d+)\]", RegexOptions.Compiled);

    /// <summary>
    /// Stores raw JSON string for a task without any parsing or deserialization.
    /// </summary>
    public void Store(string taskId, string jsonContent)
    {
        ArgumentNullException.ThrowIfNull(taskId);
        ArgumentNullException.ThrowIfNull(jsonContent);

        _rawJsonStorage[taskId] = jsonContent;
    }

    /// <summary>
    /// Returns the raw JSON string for passthrough scenarios.
    /// No deserialization or re-serialization occurs - returns exact original string.
    /// </summary>
    public string? GetRawJson(string taskId)
    {
        return _rawJsonStorage.TryGetValue(taskId, out var json) ? json : null;
    }

    /// <summary>
    /// Gets a value from stored JSON using JsonDocument navigation.
    /// This is more efficient than full deserialization for accessing specific fields.
    /// </summary>
    /// <param name="taskId">The task ID whose output to access</param>
    /// <param name="path">Dot-separated path (e.g., "user.address.city" or "items[0].name")</param>
    /// <returns>The value at the path, or the JSON string if path points to an object/array</returns>
    public object? GetValue(string taskId, string path)
    {
        if (!_rawJsonStorage.TryGetValue(taskId, out var json))
        {
            throw new KeyNotFoundException($"Task '{taskId}' not found in storage");
        }

        // Empty path means return the full JSON
        if (string.IsNullOrEmpty(path))
        {
            return json;
        }

        using var doc = JsonDocument.Parse(json);
        var current = doc.RootElement;

        // Handle root array indexing (path starts with [N])
        var rootArrayMatch = RootArrayIndexRegex.Match(path);
        if (rootArrayMatch.Success)
        {
            var index = int.Parse(rootArrayMatch.Groups[1].Value);
            current = GetArrayElement(current, index, path);

            // Check if there's more path after the root index (e.g., "[0].name")
            var remainingPath = path.Substring(rootArrayMatch.Length);
            if (remainingPath.StartsWith("."))
            {
                remainingPath = remainingPath.Substring(1); // Remove leading dot
                var parts = remainingPath.Split('.');
                foreach (var part in parts)
                {
                    if (!string.IsNullOrEmpty(part))
                    {
                        current = NavigateToPart(current, part, path);
                    }
                }
            }
        }
        else
        {
            var parts = path.Split('.');
            foreach (var part in parts)
            {
                current = NavigateToPart(current, part, path);
            }
        }

        return ConvertToClrValue(current);
    }

    /// <summary>
    /// Gets an element from a JSON array by index.
    /// </summary>
    private static JsonElement GetArrayElement(JsonElement element, int index, string fullPath)
    {
        if (element.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException($"Cannot index into non-array value in path '{fullPath}'");
        }

        if (index < 0 || index >= element.GetArrayLength())
        {
            throw new IndexOutOfRangeException($"Array index {index} is out of bounds (length: {element.GetArrayLength()}) in path '{fullPath}'");
        }

        return element[index];
    }

    /// <summary>
    /// Navigates to a specific part of the JSON element.
    /// Handles both property access and array indexing.
    /// </summary>
    private static JsonElement NavigateToPart(JsonElement element, string part, string fullPath)
    {
        // Check if this part has array index access (e.g., "items[0]")
        var arrayMatch = ArrayIndexRegex.Match(part);
        if (arrayMatch.Success)
        {
            var propertyName = arrayMatch.Groups[1].Value;
            var index = int.Parse(arrayMatch.Groups[2].Value);

            // First navigate to the property
            if (!element.TryGetProperty(propertyName, out var arrayElement))
            {
                throw new KeyNotFoundException($"Property '{propertyName}' not found in path '{fullPath}'");
            }

            if (arrayElement.ValueKind != JsonValueKind.Array)
            {
                throw new InvalidOperationException($"Property '{propertyName}' is not an array in path '{fullPath}'");
            }

            if (index < 0 || index >= arrayElement.GetArrayLength())
            {
                throw new IndexOutOfRangeException($"Array index {index} is out of bounds in path '{fullPath}'");
            }

            return arrayElement[index];
        }

        // Regular property access
        if (element.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidOperationException($"Cannot navigate to '{part}' - current value is not an object");
        }

        if (!element.TryGetProperty(part, out var property))
        {
            throw new KeyNotFoundException($"Property '{part}' not found in path '{fullPath}'");
        }

        return property;
    }

    /// <summary>
    /// Converts a JsonElement to its appropriate CLR type.
    /// </summary>
    private static object? ConvertToClrValue(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.TryGetInt64(out var longVal) ? longVal : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            // For objects and arrays, return the raw JSON string
            JsonValueKind.Object or JsonValueKind.Array => element.GetRawText(),
            _ => element.GetRawText()
        };
    }

    /// <summary>
    /// Removes a specific task's data from storage.
    /// </summary>
    public void Remove(string taskId)
    {
        _rawJsonStorage.TryRemove(taskId, out _);
    }

    /// <summary>
    /// Clears all stored data.
    /// </summary>
    public void Clear()
    {
        _rawJsonStorage.Clear();
    }

    /// <summary>
    /// Checks if a task's output is stored.
    /// </summary>
    public bool Contains(string taskId)
    {
        return _rawJsonStorage.ContainsKey(taskId);
    }

    public void Dispose()
    {
        if (_disposed) return;
        _rawJsonStorage.Clear();
        _disposed = true;
    }
}
