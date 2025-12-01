using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class SplitOperationExecutor : IOperationExecutor<SplitOperation>
{
    public Task<JsonElement[]> ExecuteAsync(SplitOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.String)
            {
                var value = element.GetString() ?? "";
                var parts = value.Split(operation.Delimiter);
                return JsonSerializer.SerializeToElement(parts);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
