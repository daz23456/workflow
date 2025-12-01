using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class ReplaceOperationExecutor : IOperationExecutor<ReplaceOperation>
{
    public Task<JsonElement[]> ExecuteAsync(ReplaceOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.String)
            {
                var value = element.GetString() ?? "";
                var replaced = value.Replace(operation.OldValue, operation.NewValue);
                return JsonSerializer.SerializeToElement(replaced);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
