using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Path;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class MapOperationExecutor : IOperationExecutor<MapOperation>
{
    public async Task<JsonElement[]> ExecuteAsync(MapOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var results = new List<JsonElement>();

        foreach (var item in data)
        {
            var mappedFields = new Dictionary<string, object?>();
            var jsonNode = JsonNode.Parse(item.GetRawText());

            foreach (var (outputField, jsonPath) in operation.Mappings)
            {
                var path = JsonPath.Parse(jsonPath);
                var matchResult = path.Evaluate(jsonNode);

                if (matchResult.Matches != null && matchResult.Matches.Count > 0)
                {
                    var matchedValue = matchResult.Matches[0].Value;
                    mappedFields[outputField] = JsonSerializer.Deserialize<object>(matchedValue!.ToJsonString());
                }
            }

            results.Add(JsonSerializer.SerializeToElement(mappedFields));
        }

        return await Task.FromResult(results.ToArray());
    }
}
