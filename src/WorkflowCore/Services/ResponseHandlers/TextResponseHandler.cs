using WorkflowCore.Interfaces;

namespace WorkflowCore.Services.ResponseHandlers;

/// <summary>
/// Handles text response content (text/plain, text/html, text/xml).
/// Returns text content as string in dictionary.
/// </summary>
public class TextResponseHandler : IResponseHandler
{
    public bool CanHandle(string contentType)
    {
        return contentType.StartsWith("text/");
    }

    public async Task<Dictionary<string, object>> HandleAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        // Read text content
        var textContent = await response.Content.ReadAsStringAsync(cancellationToken);

        // Extract base content type (remove charset if present)
        var contentType = response.Content.Headers.ContentType?.MediaType ?? "text/plain";
        var baseContentType = contentType.Split(';')[0].Trim();

        return new Dictionary<string, object>
        {
            ["content_type"] = baseContentType,
            ["data"] = textContent
        };
    }
}
