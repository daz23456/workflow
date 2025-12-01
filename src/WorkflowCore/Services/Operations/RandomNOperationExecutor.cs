using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

/// <summary>
/// Executor for RandomN operation - selects N random elements from the array without duplicates
/// Uses Fisher-Yates partial shuffle for efficiency
/// </summary>
public class RandomNOperationExecutor : IOperationExecutor<RandomNOperation>
{
    public Task<JsonElement[]> ExecuteAsync(RandomNOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        if (data.Length == 0 || operation.Count <= 0)
        {
            return Task.FromResult(Array.Empty<JsonElement>());
        }

        var count = Math.Min(operation.Count, data.Length);
        var random = operation.Seed.HasValue
            ? new Random(operation.Seed.Value)
            : Random.Shared;

        // Use Fisher-Yates partial shuffle for efficiency
        // We only need to shuffle the first 'count' positions
        var shuffled = data.ToArray(); // Copy to avoid modifying original

        for (int i = 0; i < count; i++)
        {
            int j = random.Next(i, shuffled.Length);
            // Swap
            (shuffled[i], shuffled[j]) = (shuffled[j], shuffled[i]);
        }

        return Task.FromResult(shuffled.Take(count).ToArray());
    }
}
