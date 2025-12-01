using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class LastOperationExecutor : IOperationExecutor<LastOperation>
{
    public Task<JsonElement[]> ExecuteAsync(LastOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        if (data.Length == 0)
        {
            return Task.FromResult(Array.Empty<JsonElement>());
        }

        return Task.FromResult(new[] { data[^1] });
    }
}
