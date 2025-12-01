using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class PercentageOperationExecutor : IOperationExecutor<PercentageOperation>
{
    public Task<JsonElement[]> ExecuteAsync(PercentageOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.Number)
            {
                var value = (element.GetDouble() / operation.Total) * 100;
                return JsonSerializer.SerializeToElement(value);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
