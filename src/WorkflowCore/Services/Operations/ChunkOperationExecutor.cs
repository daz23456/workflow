using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class ChunkOperationExecutor : IOperationExecutor<ChunkOperation>
{
    public Task<JsonElement[]> ExecuteAsync(ChunkOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        if (data.Length == 0 || operation.Size <= 0)
        {
            return Task.FromResult(Array.Empty<JsonElement>());
        }

        var chunks = new List<JsonElement>();

        for (int i = 0; i < data.Length; i += operation.Size)
        {
            var chunk = data.Skip(i).Take(operation.Size).ToArray();
            chunks.Add(JsonSerializer.SerializeToElement(chunk));
        }

        return Task.FromResult(chunks.ToArray());
    }
}
