using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class ScaleOperationExecutor : IOperationExecutor<ScaleOperation>
{
    public Task<JsonElement[]> ExecuteAsync(ScaleOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.Number)
            {
                var value = element.GetDouble() * operation.Factor;
                return JsonSerializer.SerializeToElement(value);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
