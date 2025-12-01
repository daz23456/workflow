using System.Text.Json;
using WorkflowCore.Interfaces;

namespace WorkflowCore.Services.ResponseHandlers;

/// <summary>
/// Handles JSON response content (application/json, text/json).
/// Deserializes JSON into Dictionary or wraps arrays/primitives in "data" key.
/// </summary>
public class JsonResponseHandler : IResponseHandler
{
    public bool CanHandle(string contentType)
    {
        return contentType.StartsWith("application/json") ||
               contentType.StartsWith("text/json") ||
               contentType == "application/json; charset=utf-8";
    }

    public async Task<Dictionary<string, object>> HandleAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        using var jsonDoc = JsonDocument.Parse(responseBody);

        if (jsonDoc.RootElement.ValueKind == JsonValueKind.Array)
        {
            // Response is an array - wrap it in a dictionary
            var array = JsonSerializer.Deserialize<object>(responseBody);
            return new Dictionary<string, object> { ["data"] = array! };
        }
        else if (jsonDoc.RootElement.ValueKind == JsonValueKind.Object)
        {
            // Response is an object - deserialize as dictionary
            return JsonSerializer.Deserialize<Dictionary<string, object>>(responseBody)
                ?? new Dictionary<string, object>();
        }
        else
        {
            // Response is a primitive value - wrap it
            var value = JsonSerializer.Deserialize<object>(responseBody);
            return new Dictionary<string, object> { ["data"] = value! };
        }
    }
}
