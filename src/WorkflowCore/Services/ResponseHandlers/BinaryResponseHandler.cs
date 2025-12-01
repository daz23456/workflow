using WorkflowCore.Interfaces;

namespace WorkflowCore.Services.ResponseHandlers;

/// <summary>
/// Handles binary response content (PDF, Excel, Word, images).
/// Delegates storage strategy to IResponseStorage (hybrid base64/temp file).
/// </summary>
public class BinaryResponseHandler : IResponseHandler
{
    private readonly IResponseStorage _storage;

    private static readonly HashSet<string> SupportedContentTypes = new()
    {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // Word
    };

    public BinaryResponseHandler(IResponseStorage storage)
    {
        _storage = storage;
    }

    public bool CanHandle(string contentType)
    {
        // Extract base content type (remove charset, etc.)
        var baseContentType = contentType.Split(';')[0].Trim();
        return SupportedContentTypes.Contains(baseContentType);
    }

    public async Task<Dictionary<string, object>> HandleAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        // Read binary content
        var content = await response.Content.ReadAsByteArrayAsync(cancellationToken);

        // Extract base content type (remove charset if present)
        var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";
        var baseContentType = contentType.Split(';')[0].Trim();

        // Delegate to storage strategy
        return await _storage.StoreAsync(content, baseContentType, cancellationToken);
    }
}
