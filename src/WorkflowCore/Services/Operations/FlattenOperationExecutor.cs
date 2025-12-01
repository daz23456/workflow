using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class FlattenOperationExecutor : IOperationExecutor<FlattenOperation>
{
    public Task<JsonElement[]> ExecuteAsync(FlattenOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = new List<JsonElement>();

        foreach (var element in data)
        {
            if (element.ValueKind == JsonValueKind.Array)
            {
                // Flatten one level: add each element from the nested array
                foreach (var inner in element.EnumerateArray())
                {
                    result.Add(inner);
                }
            }
            else
            {
                // Non-array elements are preserved as-is
                result.Add(element);
            }
        }

        return Task.FromResult(result.ToArray());
    }
}
