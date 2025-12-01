using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class UniqueOperationExecutor : IOperationExecutor<UniqueOperation>
{
    public Task<JsonElement[]> ExecuteAsync(UniqueOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var seen = new HashSet<string>();
        var result = new List<JsonElement>();

        foreach (var element in data)
        {
            // Use raw JSON text as the key for comparison
            var key = element.GetRawText();
            if (seen.Add(key))
            {
                result.Add(element);
            }
        }

        return Task.FromResult(result.ToArray());
    }
}
