using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

/// <summary>
/// Executor for RandomOne operation - selects a single random element from the array
/// </summary>
public class RandomOneOperationExecutor : IOperationExecutor<RandomOneOperation>
{
    public Task<JsonElement[]> ExecuteAsync(RandomOneOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        if (data.Length == 0)
        {
            return Task.FromResult(Array.Empty<JsonElement>());
        }

        var random = operation.Seed.HasValue
            ? new Random(operation.Seed.Value)
            : Random.Shared;

        var index = random.Next(data.Length);
        return Task.FromResult(new[] { data[index] });
    }
}
