using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Path;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class SortByOperationExecutor : IOperationExecutor<SortByOperation>
{
    public async Task<JsonElement[]> ExecuteAsync(SortByOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var fieldPath = JsonPath.Parse(operation.Field);
        var itemsWithSortKeys = new List<(JsonElement item, IComparable? sortKey)>();

        foreach (var item in data)
        {
            var jsonNode = JsonNode.Parse(item.GetRawText());
            var fieldResult = fieldPath.Evaluate(jsonNode);
            IComparable? sortKey = null;

            if (fieldResult.Matches != null && fieldResult.Matches.Count > 0)
            {
                var valueNode = fieldResult.Matches[0].Value;
                var value = JsonSerializer.Deserialize<JsonElement>(valueNode!.ToJsonString());
                sortKey = value.ValueKind switch
                {
                    JsonValueKind.Number => value.GetDouble(),
                    JsonValueKind.String => value.GetString(),
                    _ => null
                };
            }

            itemsWithSortKeys.Add((item, sortKey));
        }

        var sorted = operation.Order == "desc"
            ? itemsWithSortKeys.OrderByDescending(x => x.sortKey).ToList()
            : itemsWithSortKeys.OrderBy(x => x.sortKey).ToList();

        return await Task.FromResult(sorted.Select(x => x.item).ToArray());
    }
}
