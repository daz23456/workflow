namespace WorkflowCore.Models;

/// <summary>
/// Quality criteria for error responses (5-star system).
/// Each criterion met adds 1 star to the overall quality score.
/// </summary>
[Flags]
public enum ErrorQualityCriteria
{
    /// <summary>
    /// No criteria met
    /// </summary>
    None = 0,

    /// <summary>
    /// Error has a non-empty, human-readable message
    /// </summary>
    HasMessage = 1 << 0,

    /// <summary>
    /// Error has a machine-readable code (e.g., VALIDATION_ERROR, NOT_FOUND)
    /// </summary>
    HasErrorCode = 1 << 1,

    /// <summary>
    /// HTTP status code is appropriate for the error type
    /// </summary>
    AppropriateHttpStatus = 1 << 2,

    /// <summary>
    /// Error includes a request ID / correlation ID for debugging
    /// </summary>
    HasRequestId = 1 << 3,

    /// <summary>
    /// Error includes an actionable suggestion for the user
    /// </summary>
    HasActionableSuggestion = 1 << 4,

    /// <summary>
    /// All quality criteria met (5 stars)
    /// </summary>
    All = HasMessage | HasErrorCode | AppropriateHttpStatus | HasRequestId | HasActionableSuggestion
}
