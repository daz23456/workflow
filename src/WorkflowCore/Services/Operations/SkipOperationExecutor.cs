using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class SkipOperationExecutor : IOperationExecutor<SkipOperation>
{
    public async Task<JsonElement[]> ExecuteAsync(SkipOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        return await Task.FromResult(data.Skip(operation.Count).ToArray());
    }
}
