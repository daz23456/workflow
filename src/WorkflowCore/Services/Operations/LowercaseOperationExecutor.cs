using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class LowercaseOperationExecutor : IOperationExecutor<LowercaseOperation>
{
    public Task<JsonElement[]> ExecuteAsync(LowercaseOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.String)
            {
                var value = element.GetString()?.ToLowerInvariant() ?? "";
                return JsonSerializer.SerializeToElement(value);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
