using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class ClampOperationExecutor : IOperationExecutor<ClampOperation>
{
    public Task<JsonElement[]> ExecuteAsync(ClampOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.Number)
            {
                var value = element.GetDouble();
                var clamped = Math.Clamp(value, operation.Min, operation.Max);
                return JsonSerializer.SerializeToElement(clamped);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
