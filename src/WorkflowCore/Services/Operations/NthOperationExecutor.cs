using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class NthOperationExecutor : IOperationExecutor<NthOperation>
{
    public Task<JsonElement[]> ExecuteAsync(NthOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        if (operation.Index < 0 || operation.Index >= data.Length)
        {
            return Task.FromResult(Array.Empty<JsonElement>());
        }

        return Task.FromResult(new[] { data[operation.Index] });
    }
}
