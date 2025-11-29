using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Path;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class FilterOperationExecutor : IOperationExecutor<FilterOperation>
{
    public async Task<JsonElement[]> ExecuteAsync(FilterOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var results = new List<JsonElement>();
        var path = JsonPath.Parse(operation.Field);

        foreach (var item in data)
        {
            var jsonNode = JsonNode.Parse(item.GetRawText());
            var matchResult = path.Evaluate(jsonNode);

            if (matchResult.Matches == null || matchResult.Matches.Count == 0)
                continue;

            var fieldValueNode = matchResult.Matches[0].Value;
            var fieldValue = JsonSerializer.Deserialize<JsonElement>(fieldValueNode!.ToJsonString());

            if (EvaluateCondition(fieldValue, operation.Operator, operation.Value))
            {
                results.Add(item);
            }
        }

        return await Task.FromResult(results.ToArray());
    }

    private bool EvaluateCondition(JsonElement fieldValue, string op, object? expectedValue)
    {
        return op switch
        {
            "eq" => CompareEquals(fieldValue, expectedValue),
            "ne" => !CompareEquals(fieldValue, expectedValue),
            "gt" => CompareGreaterThan(fieldValue, expectedValue),
            "lt" => CompareLessThan(fieldValue, expectedValue),
            "gte" => CompareGreaterThanOrEqual(fieldValue, expectedValue),
            "lte" => CompareLessThanOrEqual(fieldValue, expectedValue),
            "contains" => fieldValue.ValueKind == JsonValueKind.String && fieldValue.GetString()!.Contains(expectedValue?.ToString() ?? ""),
            "startsWith" => fieldValue.ValueKind == JsonValueKind.String && fieldValue.GetString()!.StartsWith(expectedValue?.ToString() ?? ""),
            "endsWith" => fieldValue.ValueKind == JsonValueKind.String && fieldValue.GetString()!.EndsWith(expectedValue?.ToString() ?? ""),
            _ => false
        };
    }

    private bool CompareEquals(JsonElement fieldValue, object? expectedValue)
    {
        if (expectedValue == null) return fieldValue.ValueKind == JsonValueKind.Null;

        return fieldValue.ValueKind switch
        {
            JsonValueKind.String => fieldValue.GetString() == expectedValue.ToString(),
            JsonValueKind.Number => Math.Abs(fieldValue.GetDouble() - Convert.ToDouble(expectedValue)) < 0.0001,
            JsonValueKind.True => Convert.ToBoolean(expectedValue),
            JsonValueKind.False => !Convert.ToBoolean(expectedValue),
            _ => false
        };
    }

    private bool CompareGreaterThan(JsonElement fieldValue, object? expectedValue)
    {
        if (fieldValue.ValueKind != JsonValueKind.Number || expectedValue == null) return false;
        return fieldValue.GetDouble() > Convert.ToDouble(expectedValue);
    }

    private bool CompareLessThan(JsonElement fieldValue, object? expectedValue)
    {
        if (fieldValue.ValueKind != JsonValueKind.Number || expectedValue == null) return false;
        return fieldValue.GetDouble() < Convert.ToDouble(expectedValue);
    }

    private bool CompareGreaterThanOrEqual(JsonElement fieldValue, object? expectedValue)
    {
        if (fieldValue.ValueKind != JsonValueKind.Number || expectedValue == null) return false;
        return fieldValue.GetDouble() >= Convert.ToDouble(expectedValue);
    }

    private bool CompareLessThanOrEqual(JsonElement fieldValue, object? expectedValue)
    {
        if (fieldValue.ValueKind != JsonValueKind.Number || expectedValue == null) return false;
        return fieldValue.GetDouble() <= Convert.ToDouble(expectedValue);
    }
}
