using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class SubstringOperationExecutor : IOperationExecutor<SubstringOperation>
{
    public Task<JsonElement[]> ExecuteAsync(SubstringOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            if (element.ValueKind == JsonValueKind.String)
            {
                var value = element.GetString() ?? "";

                // Handle bounds checking
                if (operation.Start >= value.Length)
                {
                    return JsonSerializer.SerializeToElement("");
                }

                string substring;
                if (operation.Length.HasValue)
                {
                    var length = Math.Min(operation.Length.Value, value.Length - operation.Start);
                    substring = value.Substring(operation.Start, length);
                }
                else
                {
                    substring = value.Substring(operation.Start);
                }

                return JsonSerializer.SerializeToElement(substring);
            }
            return element;
        }).ToArray();

        return Task.FromResult(result);
    }
}
