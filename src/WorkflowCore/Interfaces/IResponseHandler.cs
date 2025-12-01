namespace WorkflowCore.Interfaces;

/// <summary>
/// Defines a strategy for handling HTTP response content based on Content-Type.
/// Implementations parse different response formats (JSON, binary, text) into a standardized output dictionary.
/// </summary>
public interface IResponseHandler
{
    /// <summary>
    /// Determines if this handler can process the given content type.
    /// </summary>
    /// <param name="contentType">The normalized Content-Type header value (lowercase, without parameters)</param>
    /// <returns>True if this handler supports the content type; otherwise false</returns>
    bool CanHandle(string contentType);

    /// <summary>
    /// Parses HTTP response content into a standardized output dictionary.
    /// </summary>
    /// <param name="response">The HTTP response message to parse</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>
    /// A dictionary containing the parsed response. Structure depends on handler type:
    /// - JSON: Direct deserialization or wrapped in "data" key
    /// - Binary: content_type, encoding (base64/file), data/file_path, size_bytes
    /// - Text: content_type, content
    /// </returns>
    Task<Dictionary<string, object>> HandleAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken);
}
