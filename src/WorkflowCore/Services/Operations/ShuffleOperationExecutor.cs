using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

/// <summary>
/// Executor for Shuffle operation - randomly reorders all elements using Fisher-Yates algorithm
/// </summary>
public class ShuffleOperationExecutor : IOperationExecutor<ShuffleOperation>
{
    public Task<JsonElement[]> ExecuteAsync(ShuffleOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        if (data.Length <= 1)
        {
            return Task.FromResult(data.ToArray()); // Return copy for consistency
        }

        var random = operation.Seed.HasValue
            ? new Random(operation.Seed.Value)
            : Random.Shared;

        // Fisher-Yates shuffle
        var shuffled = data.ToArray(); // Copy to avoid modifying original

        for (int i = shuffled.Length - 1; i > 0; i--)
        {
            int j = random.Next(i + 1);
            // Swap
            (shuffled[i], shuffled[j]) = (shuffled[j], shuffled[i]);
        }

        return Task.FromResult(shuffled);
    }
}
