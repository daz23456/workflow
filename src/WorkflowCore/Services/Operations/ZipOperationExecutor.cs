using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class ZipOperationExecutor : IOperationExecutor<ZipOperation>
{
    public Task<JsonElement[]> ExecuteAsync(ZipOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        if (data.Length == 0 || operation.WithArray.ValueKind != JsonValueKind.Array)
        {
            return Task.FromResult(Array.Empty<JsonElement>());
        }

        var withArrayElements = operation.WithArray.EnumerateArray().ToArray();
        var minLength = Math.Min(data.Length, withArrayElements.Length);
        var result = new List<JsonElement>();

        for (int i = 0; i < minLength; i++)
        {
            // Create a tuple-like array [dataElement, withElement]
            var pair = new[] { data[i], withArrayElements[i] };
            result.Add(JsonSerializer.SerializeToElement(pair));
        }

        return Task.FromResult(result.ToArray());
    }
}
