using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class ReverseOperationExecutor : IOperationExecutor<ReverseOperation>
{
    public Task<JsonElement[]> ExecuteAsync(ReverseOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(data.Reverse().ToArray());
    }
}
