namespace WorkflowCore.Interfaces;

/// <summary>
/// Factory for selecting the appropriate response handler based on Content-Type.
/// Implements the Strategy pattern for runtime handler selection.
/// </summary>
public interface IResponseHandlerFactory
{
    /// <summary>
    /// Gets the appropriate response handler for the given content type.
    /// Falls back to JSON handler if no specific handler is found.
    /// </summary>
    /// <param name="contentType">The Content-Type header value from HTTP response</param>
    /// <returns>The handler that can process this content type</returns>
    IResponseHandler GetHandler(string contentType);
}
