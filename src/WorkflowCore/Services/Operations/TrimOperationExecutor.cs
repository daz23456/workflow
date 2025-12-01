using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class TrimOperationExecutor : IOperationExecutor<TrimOperation>
{
    public Task<JsonElement[]> ExecuteAsync(TrimOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.String)
            {
                var value = element.GetString()?.Trim() ?? "";
                return JsonSerializer.SerializeToElement(value);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
