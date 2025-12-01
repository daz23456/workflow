using WorkflowCore.Interfaces;

namespace WorkflowCore.Services;

/// <summary>
/// Factory for selecting the appropriate response handler based on content type.
/// Uses Chain of Responsibility pattern to find first matching handler.
/// </summary>
public class ResponseHandlerFactory : IResponseHandlerFactory
{
    private readonly IEnumerable<IResponseHandler> _handlers;

    public ResponseHandlerFactory(IEnumerable<IResponseHandler> handlers)
    {
        _handlers = handlers;
    }

    public IResponseHandler GetHandler(string contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            throw new ArgumentException("Content type cannot be null or empty.", nameof(contentType));
        }

        // Find first handler that can handle this content type
        var handler = _handlers.FirstOrDefault(h => h.CanHandle(contentType));

        if (handler == null)
        {
            throw new InvalidOperationException(
                $"No handler found for content type '{contentType}'. " +
                $"Supported types: JSON, PDF, Excel, Word, images, and text formats.");
        }

        return handler;
    }
}
