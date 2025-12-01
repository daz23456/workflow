using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class ConcatOperationExecutor : IOperationExecutor<ConcatOperation>
{
    public Task<JsonElement[]> ExecuteAsync(ConcatOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.Array)
            {
                var parts = new List<string>();
                foreach (var item in element.EnumerateArray())
                {
                    parts.Add(item.ToString());
                }
                var joined = string.Join(operation.Delimiter, parts);
                return JsonSerializer.SerializeToElement(joined);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
