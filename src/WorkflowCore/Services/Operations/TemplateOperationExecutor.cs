using System.Text.Json;
using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

public class TemplateOperationExecutor : IOperationExecutor<TemplateOperation>
{
    private static readonly Regex PlaceholderRegex = new(@"\{([^}]+)\}", RegexOptions.Compiled);

    public Task<JsonElement[]> ExecuteAsync(TemplateOperation operation, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var result = data.Select(element =>
        {
            var output = PlaceholderRegex.Replace(operation.Template, match =>
            {
                var path = match.Groups[1].Value;
                var value = GetValueAtPath(element, path);
                return value?.ToString() ?? match.Value; // Keep original if not found
            });
            return JsonSerializer.SerializeToElement(output);
        }).ToArray();

        return Task.FromResult(result);
    }

    private static string? GetValueAtPath(JsonElement element, string path)
    {
        var parts = path.Split('.');
        var current = element;

        foreach (var part in parts)
        {
            if (current.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            if (!current.TryGetProperty(part, out var next))
            {
                return null;
            }

            current = next;
        }

        return current.ValueKind switch
        {
            JsonValueKind.String => current.GetString(),
            JsonValueKind.Number => current.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => "null",
            _ => current.GetRawText()
        };
    }
}
