using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class RoundOperationExecutor : IOperationExecutor<RoundOperation>
{
    public Task<JsonElement[]> ExecuteAsync(RoundOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.Number)
            {
                var value = Math.Round(element.GetDouble(), operation.Decimals);
                return JsonSerializer.SerializeToElement(value);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
