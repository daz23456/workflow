using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Path;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class EnrichOperationExecutor : IOperationExecutor<EnrichOperation>
{
    public async Task<JsonElement[]> ExecuteAsync(EnrichOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var results = new List<JsonElement>();

        foreach (var item in data)
        {
            var jsonNode = JsonNode.Parse(item.GetRawText());
            var itemDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(item);

            // Add enriched fields to existing object
            foreach (var (fieldName, jsonPath) in operation.Fields)
            {
                var path = JsonPath.Parse(jsonPath);
                var matchResult = path.Evaluate(jsonNode);

                if (matchResult.Matches != null && matchResult.Matches.Count > 0)
                {
                    var matchedValue = matchResult.Matches[0].Value;
                    var value = JsonSerializer.Deserialize<JsonElement>(matchedValue!.ToJsonString());
                    itemDict![fieldName] = value;
                }
            }

            results.Add(JsonSerializer.SerializeToElement(itemDict));
        }

        return await Task.FromResult(results.ToArray());
    }
}
