namespace WorkflowCore.Models;

/// <summary>
/// Represents a recorded interaction for golden file testing.
/// </summary>
public class RecordedInteraction
{
    /// <summary>
    /// Name of the task that was invoked.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Unique identifier for this interaction.
    /// </summary>
    public string InteractionId { get; set; } = string.Empty;

    /// <summary>
    /// The request body sent to the task.
    /// </summary>
    public string? RequestBody { get; set; }

    /// <summary>
    /// The response body received from the task.
    /// </summary>
    public string? ResponseBody { get; set; }

    /// <summary>
    /// HTTP status code received.
    /// </summary>
    public int StatusCode { get; set; }

    /// <summary>
    /// When this interaction was recorded.
    /// </summary>
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Environment where this was recorded (dev, staging, prod).
    /// </summary>
    public string Environment { get; set; } = string.Empty;

    /// <summary>
    /// HTTP headers from the response.
    /// </summary>
    public Dictionary<string, string> Headers { get; set; } = new();

    /// <summary>
    /// Duration of the request in milliseconds.
    /// </summary>
    public long DurationMs { get; set; }

    /// <summary>
    /// Whether this interaction was successful (2xx status code).
    /// </summary>
    public bool IsSuccessful => StatusCode >= 200 && StatusCode < 300;

    /// <summary>
    /// Whether this interaction has a response body.
    /// </summary>
    public bool HasResponseBody => !string.IsNullOrEmpty(ResponseBody);

    /// <summary>
    /// Check if the given request body matches this interaction's request.
    /// </summary>
    public bool MatchesRequest(string? requestBody)
    {
        if (RequestBody == null && requestBody == null) return true;
        if (RequestBody == null || requestBody == null) return false;
        return RequestBody == requestBody;
    }
}
