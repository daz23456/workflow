using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class CeilOperationExecutor : IOperationExecutor<CeilOperation>
{
    public Task<JsonElement[]> ExecuteAsync(CeilOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.Number)
            {
                var value = Math.Ceiling(element.GetDouble());
                return JsonSerializer.SerializeToElement(value);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
