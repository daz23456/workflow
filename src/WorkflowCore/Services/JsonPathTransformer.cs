using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Path;

namespace WorkflowCore.Services;

/// <summary>
/// Transforms data using JSONPath queries (RFC 9535).
/// </summary>
public class JsonPathTransformer : IDataTransformer
{
    /// <inheritdoc />
    public Task<object?> TransformAsync(string query, object data)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            throw new ArgumentException("Query cannot be null or whitespace", nameof(query));
        }

        if (data == null)
        {
            throw new ArgumentNullException(nameof(data));
        }

        // Convert data to JsonNode for JSONPath evaluation
        var json = JsonSerializer.Serialize(data);
        var jsonNode = JsonNode.Parse(json);

        // Parse and evaluate the JSONPath query
        var path = JsonPath.Parse(query);
        var result = path.Evaluate(jsonNode);

        // Extract the result
        if (result.Matches == null || result.Matches.Count == 0)
        {
            return Task.FromResult<object?>(null);
        }

        // For single match, return the value directly
        if (result.Matches.Count == 1)
        {
            var match = result.Matches[0].Value;
            return Task.FromResult(ConvertJsonNodeToObject(match));
        }

        // For multiple matches, return an array
        var matches = result.Matches.Select(m => ConvertJsonNodeToObject(m.Value)).ToList();
        return Task.FromResult<object?>(matches);
    }

    private static object? ConvertJsonNodeToObject(JsonNode? node)
    {
        if (node == null)
        {
            return null;
        }

        if (node is JsonValue jsonValue)
        {
            // Try to get the actual value type
            if (jsonValue.TryGetValue<string>(out var strValue))
                return strValue;
            if (jsonValue.TryGetValue<int>(out var intValue))
                return intValue;
            if (jsonValue.TryGetValue<long>(out var longValue))
                return longValue;
            if (jsonValue.TryGetValue<double>(out var doubleValue))
                return doubleValue;
            if (jsonValue.TryGetValue<bool>(out var boolValue))
                return boolValue;
        }

        if (node is JsonArray jsonArray)
        {
            return jsonArray.Select(ConvertJsonNodeToObject).ToList();
        }

        if (node is JsonObject jsonObject)
        {
            return jsonObject.ToDictionary(
                kvp => kvp.Key,
                kvp => ConvertJsonNodeToObject(kvp.Value));
        }

        return node.ToJsonString();
    }
}
