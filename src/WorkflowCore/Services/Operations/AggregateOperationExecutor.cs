using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Path;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class AggregateOperationExecutor : IOperationExecutor<AggregateOperation>
{
    public async Task<JsonElement[]> ExecuteAsync(AggregateOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var aggregationResult = new Dictionary<string, object?>();

        foreach (var (aggName, aggregation) in operation.Aggregations)
        {
            aggregationResult[aggName] = ApplyAggregation(aggregation, data);
        }

        var result = JsonSerializer.SerializeToElement(aggregationResult);
        return await Task.FromResult(new[] { result });
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
