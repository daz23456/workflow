using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Path;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class GroupByOperationExecutor : IOperationExecutor<GroupByOperation>
{
    public async Task<JsonElement[]> ExecuteAsync(GroupByOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var keyPath = JsonPath.Parse(operation.Key);
        var groups = new Dictionary<string, List<JsonElement>>();

        // Group data by key
        foreach (var item in data)
        {
            var jsonNode = JsonNode.Parse(item.GetRawText());
            var keyResult = keyPath.Evaluate(jsonNode);
            if (keyResult.Matches == null || keyResult.Matches.Count == 0)
                continue;

            var key = keyResult.Matches[0].Value!.ToJsonString().Trim('"') ?? "null";

            if (!groups.ContainsKey(key))
                groups[key] = new List<JsonElement>();

            groups[key].Add(item);
        }

        // Apply aggregations to each group
        var results = new List<JsonElement>();

        foreach (var (key, items) in groups)
        {
            var groupResult = new Dictionary<string, object?>
            {
                ["key"] = key
            };

            foreach (var (aggName, aggregation) in operation.Aggregations)
            {
                groupResult[aggName] = ApplyAggregation(aggregation, items.ToArray());
            }

            results.Add(JsonSerializer.SerializeToElement(groupResult));
        }

        return await Task.FromResult(results.ToArray());
    }

    private object? ApplyAggregation(Aggregation aggregation, JsonElement[] items)
    {
        var fieldPath = JsonPath.Parse(aggregation.Field);
        var values = new List<double>();

        foreach (var item in items)
        {
            var jsonNode = JsonNode.Parse(item.GetRawText());
            var fieldResult = fieldPath.Evaluate(jsonNode);
            if (fieldResult.Matches != null && fieldResult.Matches.Count > 0)
            {
                var valueNode = fieldResult.Matches[0].Value;
                var value = JsonSerializer.Deserialize<JsonElement>(valueNode!.ToJsonString());
                if (value.ValueKind == JsonValueKind.Number)
                {
                    values.Add(value.GetDouble());
                }
            }
        }

        return aggregation.Function switch
        {
            "sum" => values.Sum(),
            "avg" => values.Count > 0 ? values.Average() : 0,
            "min" => values.Count > 0 ? values.Min() : 0,
            "max" => values.Count > 0 ? values.Max() : 0,
            "count" => items.Length,
            _ => null
        };
    }
}
