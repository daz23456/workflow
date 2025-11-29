using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Path;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class JoinOperationExecutor : IOperationExecutor<JoinOperation>
{
    public async Task<JsonElement[]> ExecuteAsync(JoinOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var leftKeyPath = JsonPath.Parse(operation.LeftKey);
        var rightKeyPath = JsonPath.Parse(operation.RightKey);

        // Parse right data
        var rightDataJson = JsonSerializer.Serialize(operation.RightData);
        var rightElements = JsonSerializer.Deserialize<JsonElement[]>(rightDataJson) ?? Array.Empty<JsonElement>();

        // Build lookup dictionary for right data
        var rightLookup = new Dictionary<string, JsonElement>();
        foreach (var rightItem in rightElements)
        {
            var rightNode = JsonNode.Parse(rightItem.GetRawText());
            var keyResult = rightKeyPath.Evaluate(rightNode);
            if (keyResult.Matches != null && keyResult.Matches.Count > 0)
            {
                var key = keyResult.Matches[0].Value!.ToJsonString().Trim('"');
                rightLookup[key] = rightItem;
            }
        }

        var results = new List<JsonElement>();

        foreach (var leftItem in data)
        {
            var leftNode = JsonNode.Parse(leftItem.GetRawText());
            var leftKeyResult = leftKeyPath.Evaluate(leftNode);

            if (leftKeyResult.Matches != null && leftKeyResult.Matches.Count > 0)
            {
                var leftKey = leftKeyResult.Matches[0].Value!.ToJsonString().Trim('"');

                if (rightLookup.TryGetValue(leftKey, out var rightItem))
                {
                    // Merge left and right objects
                    var leftDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(leftItem);
                    var rightDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(rightItem);

                    var merged = new Dictionary<string, JsonElement>(leftDict!);
                    foreach (var (key, value) in rightDict!)
                    {
                        merged[key] = value; // Right side overwrites if keys conflict
                    }

                    results.Add(JsonSerializer.SerializeToElement(merged));
                }
                else if (operation.JoinType == "left")
                {
                    // Left join - include left record even without match
                    results.Add(leftItem);
                }
            }
        }

        return await Task.FromResult(results.ToArray());
    }
}
