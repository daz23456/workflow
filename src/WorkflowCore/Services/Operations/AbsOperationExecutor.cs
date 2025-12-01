using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class AbsOperationExecutor : IOperationExecutor<AbsOperation>
{
    public Task<JsonElement[]> ExecuteAsync(AbsOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.Number)
            {
                var value = Math.Abs(element.GetDouble());
                return JsonSerializer.SerializeToElement(value);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
