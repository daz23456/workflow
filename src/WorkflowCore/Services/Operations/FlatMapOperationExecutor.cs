using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Path;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class FlatMapOperationExecutor : IOperationExecutor<FlatMapOperation>
{
    public async Task<JsonElement[]> ExecuteAsync(FlatMapOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var results = new List<JsonElement>();
        var path = JsonPath.Parse(operation.Path);

        foreach (var item in data)
        {
            var jsonNode = JsonNode.Parse(item.GetRawText());
            var matchResult = path.Evaluate(jsonNode);

            if (matchResult.Matches != null && matchResult.Matches.Count > 0)
            {
                var arrayNode = matchResult.Matches[0].Value;
                var arrayElement = JsonSerializer.Deserialize<JsonElement>(arrayNode!.ToJsonString());

                if (arrayElement.ValueKind == JsonValueKind.Array)
                {
                    foreach (var element in arrayElement.EnumerateArray())
                    {
                        results.Add(element);
                    }
                }
            }
        }

        return await Task.FromResult(results.ToArray());
    }
}
