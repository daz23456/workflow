using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class LimitOperationExecutor : IOperationExecutor<LimitOperation>
{
    public async Task<JsonElement[]> ExecuteAsync(LimitOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        return await Task.FromResult(data.Take(operation.Count).ToArray());
    }
}
