using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class FirstOperationExecutor : IOperationExecutor<FirstOperation>
{
    public Task<JsonElement[]> ExecuteAsync(FirstOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        if (data.Length == 0)
        {
            return Task.FromResult(Array.Empty<JsonElement>());
        }

        return Task.FromResult(new[] { data[0] });
    }
}
